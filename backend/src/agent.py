import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

from aiohttp import web
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
    llm,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from memory.service import MemoryService
from outbound_api import create_app
from prompts.specialist_instructions import SPECIALIST_SYSTEM_PROMPT
from prompts.system_prompt import SYSTEM_PROMPT
from tools.clinic_booking import (
    book_clinic_appointment_local,
    search_nearby_clinics_local,
)
from tools.symptom_triage import assess_symptom_urgency_local

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Initialize SQLite Database & Memory Service
MemoryService.initialize()


def _ensure_api_server_running():
    """Start the REST API HTTP server (port 8088) in a background thread if not already running."""

    def run_server():
        try:
            app = create_app()
            runner = web.AppRunner(app)
            import asyncio

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(runner.setup())
            site = web.TCPSite(runner, "127.0.0.1", 8088)
            loop.run_until_complete(site.start())
            logger.info("ArogyaSaathi REST API server active on http://127.0.0.1:8088")
            print(
                "[REST_API] ArogyaSaathi REST API server active on http://127.0.0.1:8088"
            )
            loop.run_forever()
        except Exception as e:
            logger.info(f"API server thread notice (may already be running): {e}")

    t = threading.Thread(target=run_server, daemon=True)
    t.start()


_ensure_api_server_running()

SYSTEM_PROMPT = SYSTEM_PROMPT


class CallTracker:
    """Tracks session metrics, tool executions, and call outcomes for Day 8 Call Analytics."""

    def __init__(self, call_id: str, room_name: str, channel: str = "browser") -> None:
        self.call_id = call_id
        self.room_name = room_name
        self.channel = channel
        self.start_time = datetime.now(timezone.utc)
        self.tools_used: set[str] = set()
        self.guidance_provided: bool = False
        self.escalation_created: bool = False
        self.triage_level: str = "NONE"
        self.user_opt_out: bool = False
        self.is_saved: bool = False

    def record_tool(
        self,
        tool_name: str,
        triage_level: str | None = None,
        escalation: bool = False,
        opt_out: bool = False,
    ) -> None:
        self.tools_used.add(tool_name)
        if triage_level and triage_level != "NONE":
            self.triage_level = triage_level
            self.guidance_provided = True
        if escalation:
            self.escalation_created = True
            self.guidance_provided = True
        if opt_out:
            self.user_opt_out = True
        if tool_name in [
            "assess_symptom_urgency",
            "lookup_user",
            "save_user_memory",
            "create_escalation",
            "search_nearby_clinics",
            "book_clinic_appointment",
            "transfer_to_clinic_specialist",
            "transfer_back_to_main_agent",
        ]:
            self.guidance_provided = True

        try:
            MemoryService.record_call_analytics(self.finalize(is_final=False))
        except Exception as e:
            logger.warning(f"Failed to auto-persist call tracker tool execution: {e}")

    def finalize(self, is_final: bool = True) -> dict[str, Any]:
        end_time = datetime.now(timezone.utc)
        duration_seconds = max(0, int((end_time - self.start_time).total_seconds()))

        if (
            self.guidance_provided
            or self.escalation_created
            or self.triage_level != "NONE"
        ):
            outcome = "success"
            failure_category = "none"
            if self.escalation_created:
                outcome_reason = (
                    "Human healthcare escalation ticket created successfully"
                )
            elif self.triage_level != "NONE":
                outcome_reason = (
                    f"Symptom urgency triage completed (Level: {self.triage_level})"
                )
            else:
                outcome_reason = (
                    "Healthcare guidance and profile memory provided successfully"
                )
        elif self.user_opt_out:
            outcome = "failed"
            failure_category = "user_opt_out"
            outcome_reason = "Caller registered phone opt-out during conversation"
        elif not is_final:
            outcome = "success"
            failure_category = "none"
            outcome_reason = "Voice consultation active in progress..."
        elif duration_seconds < 5:
            outcome = "failed"
            failure_category = "quick_disconnect"
            outcome_reason = (
                "Caller disconnected immediately before completing consultation (< 5s)"
            )
        else:
            outcome = "failed"
            failure_category = "user_hangup_early"
            outcome_reason = (
                "Caller ended call before symptom triage or guidance completed"
            )

        return {
            "call_id": self.call_id,
            "room_name": self.room_name,
            "channel": self.channel,
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": duration_seconds,
            "outcome": outcome,
            "failure_category": failure_category,
            "outcome_reason": outcome_reason,
            "tools_used": list(self.tools_used),
            "triage_level": self.triage_level,
        }


class Assistant(Agent):
    def __init__(
        self,
        room: rtc.Room | None = None,
        tracker: CallTracker | None = None,
    ) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.room = room
        self.tracker = tracker

    async def _publish_tool_event(
        self, event_type: str, data: dict[str, object]
    ) -> None:
        """Publish real-time tool state events to frontend via LiveKit Data Packet."""
        if self.room and self.room.local_participant:
            try:
                payload = {
                    "type": event_type,
                    "tool": "assess_symptom_urgency",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": data,
                }
                await self.room.local_participant.publish_data(
                    json.dumps(payload).encode("utf-8"),
                    topic="arogya_tool",
                )
                logger.info(
                    f"[TOOL_EVENT] Published '{event_type}' event to topic 'arogya_tool'"
                )
            except Exception as e:
                logger.warning(f"[TOOL_EVENT] Failed to publish tool event: {e}")

    @function_tool
    async def lookup_user(self, context: RunContext, name_or_id: str) -> str:
        """Look up whether a caller has been here before and retrieve their saved profile.

        WHEN TO CALL: Call this tool IMMEDIATELY whenever the caller says their name for the first time
        in the conversation (e.g. "My name is Ramesh", "I am Meera", "This is Raj",
        "Do you remember me?", "Call me Lakshmi").
        Do NOT wait. Call this before responding to the caller.

        Args:
            name_or_id: The caller's name exactly as they said it (e.g. 'Lakshmi', 'Ramesh', 'Meera').
        """
        search_term = name_or_id.strip()
        logger.info(f"Memory lookup requested for: {search_term}")
        if self.tracker:
            self.tracker.record_tool("lookup_user")

        if not search_term:
            return "No identifier provided for lookup."

        profile = MemoryService.lookup_user(search_term)

        if not profile:
            logger.info(f"User not found: '{search_term}'")
            return f"No previous record found for '{search_term}'. Treat them as a first-time caller."

        logger.info(f"User found: '{profile.name}'")
        return (
            f"FOUND CALLER PROFILE:\n"
            f"Name: {profile.name}\n"
            f"Language Preference: {profile.language_preference}\n"
            f"Age Band: {profile.age_band}\n"
            f"Facts: {profile.facts}\n"
            f"Last Interaction: {profile.last_interaction}"
        )

    @function_tool
    async def save_user_memory(
        self,
        context: RunContext,
        name: str,
        user_consent_given: bool,
        language_preference: str = "Hindi/English",
        age_band: str = "Unspecified",
        ongoing_conditions: str = "None mentioned",
        last_triage_outcome: str = "General Consultation",
        preferred_register: str = "simple explanations",
        user_id: str = "",
    ) -> str:
        """Save the caller's profile to persistent memory after they give explicit consent."""
        logger.info(
            f"Memory save requested for '{name}' (Consent: {user_consent_given})"
        )
        if self.tracker:
            self.tracker.record_tool("save_user_memory")

        facts = {
            "ongoing_conditions": ongoing_conditions,
            "last_triage_outcome": last_triage_outcome,
            "preferred_register": preferred_register,
        }

        success, message = MemoryService.save_user_memory(
            user_id=user_id,
            name=name,
            user_consent_given=user_consent_given,
            language_preference=language_preference,
            age_band=age_band,
            facts=facts,
        )

        if success:
            logger.info(f"Memory saved for '{name}'")
        else:
            logger.warning(f"Memory save failed for '{name}': {message}")

        return message

    @function_tool
    async def forget_user(self, context: RunContext, name_or_id: str) -> str:
        """Delete the caller's persistent memory profile ('Right to be Forgotten')."""
        logger.info(f"Memory deletion requested for: {name_or_id}")
        if self.tracker:
            self.tracker.record_tool("forget_user")
        success, message = MemoryService.forget_user(name_or_id)

        if success:
            logger.info(f"Memory deleted for '{name_or_id}'")
        return message

    @function_tool
    async def register_opt_out(self, context: RunContext, phone_number: str) -> str:
        """Register a phone number opt-out request permanently in the ArogyaSaathi database."""
        logger.info(f"[OPT_OUT] Registering opt-out for phone: {phone_number}")
        if self.tracker:
            self.tracker.record_tool("register_opt_out", opt_out=True)
        success = MemoryService.record_opt_out(
            phone_number, reason="User requested opt-out during call"
        )
        if success:
            logger.info(f"[OPT_OUT] Successfully opted out phone: {phone_number}")
            return f"SUCCESS: Phone number {phone_number} has been permanently registered as opted-out. Future reminder calls are blocked."
        return f"NOTICE: Opt-out registered for {phone_number}."

    @function_tool
    async def assess_symptom_urgency(
        self,
        context: RunContext,
        symptoms: str,
        duration: str | None = None,
        age_band: str | None = None,
        severity: str | None = None,
        caller_name: str | None = None,
    ) -> str:
        """Assess healthcare symptom urgency classification and care navigation recommendations."""
        start_time = time.time()
        logger.info(f"[TOOL] assess_symptom_urgency START - symptoms: '{symptoms}'")

        chained_age_band = age_band
        if caller_name:
            profile = MemoryService.lookup_user(caller_name)
            if profile and (not chained_age_band or chained_age_band == "Unspecified"):
                chained_age_band = profile.age_band
                logger.info(
                    f"[TOOL] Memory chained for '{caller_name}': age_band='{chained_age_band}'"
                )

        await self._publish_tool_event(
            "tool_start", {"symptoms": symptoms, "status": "CHECKING"}
        )

        try:
            result = assess_symptom_urgency_local(
                symptoms=symptoms,
                duration=duration,
                age_band=chained_age_band,
                severity=severity,
            )

            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"[TOOL] assess_symptom_urgency SUCCESS - level: {result.get('triage_level')} ({duration_ms}ms)"
            )

            if self.tracker:
                self.tracker.record_tool(
                    "assess_symptom_urgency",
                    triage_level=result.get("triage_level"),
                )

            await self._publish_tool_event("tool_result", result)

            return (
                f"ASSESSMENT RESULT:\n"
                f"Triage Level: {result.get('triage_level')}\n"
                f"Reason: {result.get('reason')}\n"
                f"Recommended Action: {result.get('recommended_action')}\n"
                f"Source: {result.get('source')} ({result.get('data_status')}, as of {result.get('data_as_of')})"
            )
        except Exception as e:
            logger.error(f"[TOOL] assess_symptom_urgency FAILED: {e}")
            fallback_payload = {
                "status": "error",
                "triage_level": "UNAVAILABLE",
                "reason": "Health assessment service temporarily unavailable.",
                "recommended_action": "If symptoms are severe, worsening, or concerning, please consult a healthcare professional immediately.",
                "source": "ArogyaSaathi local prototype triage rules v1.0",
                "data_status": "unavailable",
                "data_as_of": datetime.now(timezone.utc).isoformat(),
            }
            await self._publish_tool_event("tool_error", fallback_payload)
            return (
                "ASSESSMENT ERROR: The health assessment service is currently unavailable. "
                "Do not guess. Inform the caller warmly that the automated assessment service is down, "
                "and advise them to seek professional medical evaluation if they feel unwell or concerned."
            )

    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        user_id: str,
        reason: str,
        summary: str,
        what_was_checked: str,
        urgency: str,
        user_permission_granted: bool,
        caller_name: str | None = None,
        phone_number: str | None = None,
        language: str | None = "English",
        preferred_follow_up: str | None = "phone",
    ) -> str:
        """Create a human healthcare escalation request for professional review."""
        logger.info(
            f"[ESCALATION_TOOL] Requested for user '{user_id}', reason '{reason}', permission '{user_permission_granted}'"
        )
        if self.tracker:
            self.tracker.record_tool(
                "create_escalation", escalation=user_permission_granted
            )

        if not user_permission_granted:
            logger.info("[ESCALATION_TOOL] Blocked: Permission not granted.")
            return (
                "ESCALATION CANCELLED: The user did not grant permission to share their details. "
                "Do NOT create or mention any reference ID. Respect their privacy and advise direct medical care if symptoms worsen."
            )

        success, message, data = MemoryService.create_escalation_request(
            user_id=user_id,
            reason=reason,
            summary=summary,
            what_was_checked=what_was_checked,
            urgency=urgency,
            user_permission_granted=user_permission_granted,
            caller_name=caller_name or "Anonymous",
            phone_number=phone_number or "",
            language=language or "English",
            preferred_follow_up=preferred_follow_up or "phone",
        )

        if success and data:
            ref_id = data.get("reference_id", "AS-2026-UNKNOWN")
            await self._publish_tool_event("escalation_created", data)
            return (
                f"ESCALATION CREATED SUCCESSFULLY:\n"
                f"Reference ID: {ref_id}\n"
                f"Urgency: {data.get('urgency')}\n"
                f"Reason: {data.get('reason')}\n"
                f"Message to caller: {message}\n"
                f"NEXT STEP INSTRUCTIONS: Inform the caller warmly of their Reference ID ({ref_id}) "
                f"and explain that their request is open for human review. Remind them that emergency care should NOT be delayed while waiting."
            )

        return f"ESCALATION ERROR: {message}"


def sanitize_chat_context(chat_ctx: llm.ChatContext):
    """Sanitize ChatContext by removing internal raw function call/result items that lack Gemini thought signatures."""
    if not chat_ctx or not hasattr(chat_ctx, "_items"):
        return
    chat_ctx._items = [
        item
        for item in chat_ctx._items
        if not isinstance(
            item, (llm.FunctionCall, llm.FunctionCallOutput, llm.FunctionCallResult)
        )
    ]

    @function_tool
    async def transfer_to_clinic_specialist(
        self,
        context: RunContext,
        reason: str,
        caller_name: str | None = None,
        location_or_city: str | None = None,
        symptoms_or_specialty: str | None = None,
    ) -> str:
        """Transfer the conversation to the Clinic and Appointment Booking Specialist Agent (Day 9).

        WHEN TO CALL: Call this tool IMMEDIATELY whenever the caller asks to book a doctor appointment,
        find a nearby clinic or Primary Health Center (PHC), schedule a consultation, check doctor availability, or visit a hospital.

        Args:
            reason: Why handoff is needed (e.g. 'Caller wants to book a clinic consultation for fever').
            caller_name: The caller's name if known.
            location_or_city: The caller's city or area if known (e.g. 'Hyderabad', 'Delhi').
            symptoms_or_specialty: Symptoms or doctor specialty requested (e.g. 'General Physician', 'Pediatrics').
        """
        logger.info(
            f"[HANDOFF] Transfer to Clinic Specialist requested - Reason: '{reason}', Name: '{caller_name}', Location: '{location_or_city}'"
        )
        if self.tracker:
            self.tracker.record_tool("transfer_to_clinic_specialist")

        try:
            specialist = ClinicAppointmentSpecialist(
                room=self.room,
                tracker=self.tracker,
                main_agent=self,
                context_data={
                    "caller_name": caller_name,
                    "location": location_or_city,
                    "specialty": symptoms_or_specialty,
                    "reason": reason,
                },
            )

            if context.session:
                # Step 5 Announcement: Tell the user BEFORE switching
                await context.session.say(
                    "I will connect you to our Clinic and Appointment Specialist who can help you find nearby doctors and book your visit.",
                    add_to_chat_ctx=True,
                )
                if hasattr(context.session, "chat_ctx"):
                    sanitize_chat_context(context.session.chat_ctx)
                context.session.update_agent(specialist)

                intro = (
                    "Namaste! I am your ArogyaSaathi Clinic & Appointment Specialist. "
                )
                if caller_name:
                    intro += (
                        f"I see you are looking for a consultation for {caller_name}. "
                    )
                intro += "How can I help you find a clinic or book an appointment slot today?"

                await context.session.say(intro, add_to_chat_ctx=True)

            return (
                f"HANDOFF SUCCESSFUL: Connected to Clinic & Appointment Specialist. "
                f"Context passed - Caller: '{caller_name or 'Unspecified'}', Location: '{location_or_city or 'General'}', Specialty: '{symptoms_or_specialty or 'General'}'. "
                f"DO NOT repeat asking questions already answered."
            )
        except Exception as e:
            logger.error(f"[HANDOFF_ERROR] Failed handoff: {e}")
            return (
                f"HANDOFF NOTICE: The specialist service is currently unavailable ({e}). "
                f"I will continue assisting you directly as your main health agent."
            )


class ClinicAppointmentSpecialist(Agent):
    """Specialist Agent for Clinic Search & Doctor Appointment Booking (Day 9)."""

    def __init__(
        self,
        room: rtc.Room | None = None,
        tracker: CallTracker | None = None,
        main_agent: Agent | None = None,
        context_data: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(instructions=SPECIALIST_SYSTEM_PROMPT)
        self.room = room
        self.tracker = tracker
        self.main_agent = main_agent
        self.context_data = context_data or {}

    @function_tool
    async def search_nearby_clinics(
        self,
        context: RunContext,
        location: str | None = None,
        specialty: str | None = None,
    ) -> str:
        """Search for nearby Primary Health Centers (PHCs), clinics, and doctor availability slots."""
        search_loc = location or self.context_data.get("location")
        search_spec = specialty or self.context_data.get("specialty")
        logger.info(
            f"[SPECIALIST_TOOL] search_nearby_clinics - Location: '{search_loc}', Specialty: '{search_spec}'"
        )
        if self.tracker:
            self.tracker.record_tool("search_nearby_clinics")

        res = search_nearby_clinics_local(location=search_loc, specialty=search_spec)
        clinics = res.get("clinics", [])
        output = [f"FOUND {len(clinics)} CLINIC(S) NEAR {search_loc or 'your area'}:"]
        for c in clinics:
            docs_str = ", ".join(
                [f"{d['name']} ({d['specialty']})" for d in c["available_doctors"]]
            )
            output.append(
                f"• {c['clinic_name']} ({c['address']})\n  Timings: {c['timings']}\n  Available Doctors: {docs_str}"
            )
        return "\n".join(output)

    @function_tool
    async def book_clinic_appointment(
        self,
        context: RunContext,
        patient_name: str,
        clinic_name: str,
        doctor_specialty: str,
        appointment_time: str,
        symptom_notes: str = "",
    ) -> str:
        """Book a doctor appointment at a clinic and return confirmation reference details."""
        name = patient_name or self.context_data.get("caller_name") or "Patient"
        logger.info(
            f"[SPECIALIST_TOOL] book_clinic_appointment - Patient: '{name}', Clinic: '{clinic_name}', Time: '{appointment_time}'"
        )
        if self.tracker:
            self.tracker.record_tool("book_clinic_appointment")

        res = book_clinic_appointment_local(
            patient_name=name,
            clinic_name=clinic_name,
            doctor_specialty=doctor_specialty,
            appointment_time=appointment_time,
            symptom_notes=symptom_notes,
        )

        return (
            f"APPOINTMENT BOOKED SUCCESSFULLY:\n"
            f"Booking Reference ID: {res.get('booking_id')}\n"
            f"Patient Name: {name}\n"
            f"Clinic Name: {clinic_name}\n"
            f"Doctor Specialty: {doctor_specialty}\n"
            f"Scheduled Time: {appointment_time}\n"
            f"Instructions: {res.get('instructions')}"
        )

    @function_tool
    async def transfer_back_to_main_agent(
        self,
        context: RunContext,
        reason: str = "Clinic appointment work completed",
    ) -> str:
        """Hand the conversation back to the Main ArogyaSaathi Agent after appointment work is complete or if non-clinic health queries are asked."""
        logger.info(
            f"[SPECIALIST_HANDOFF_BACK] Transferring back to main agent - Reason: '{reason}'"
        )
        if self.tracker:
            self.tracker.record_tool("transfer_back_to_main_agent")

        if context.session and self.main_agent:
            try:
                await context.session.say(
                    "I am transferring you back to your Main ArogyaSaathi Health Companion. Thank you!",
                    add_to_chat_ctx=True,
                )
                if hasattr(context.session, "chat_ctx"):
                    sanitize_chat_context(context.session.chat_ctx)
                context.session.update_agent(self.main_agent)
                return "HANDOFF BACK SUCCESSFUL: Switched active agent back to Main Health Companion."
            except Exception as e:
                logger.error(f"[HANDOFF_BACK_ERROR] Failed to switch agent: {e}")
                return f"HANDOFF NOTICE: Returning to main conversation ({e})"

        return "HANDOFF BACK COMPLETED."


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    google_key = os.getenv("GOOGLE_API_KEY")
    if not google_key:
        raise RuntimeError("GOOGLE_API_KEY is missing from .env.local")

    llm_engine = google.LLM(
        model="gemini-flash-latest",
        api_key=google_key,
    )

    is_sip = (
        any(
            p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
            for p in ctx.room.remote_participants.values()
        )
        or "outbound_" in ctx.room.name
    )

    channel = "sip" if is_sip else "browser"
    tracker = CallTracker(
        call_id=ctx.room.name, room_name=ctx.room.name, channel=channel
    )

    def save_analytics(is_final: bool = False):
        if tracker.is_saved and not is_final:
            return
        if is_final:
            tracker.is_saved = True
        analytics_payload = tracker.finalize(is_final=is_final)
        logger.info(
            f"[DAY8_ANALYTICS] Recording call analytics to SQLite (is_final={is_final}): {analytics_payload}"
        )
        MemoryService.record_call_analytics(analytics_payload)

    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),
        llm=llm_engine,
        tts=murf.TTS(
            voice="Anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=3),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=False,
    )

    try:
        await session.start(
            agent=Assistant(room=ctx.room, tracker=tracker),
            room=ctx.room,
        )

        await ctx.connect()
        save_analytics(is_final=False)

        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            save_analytics(is_final=True)
            if "outbound_" in ctx.room.name:
                call_id = ctx.room.name.replace("outbound_", "")
                logger.info(
                    f"[OUTBOUND] Participant disconnected from '{ctx.room.name}'. Updating call status to 'completed'."
                )
                MemoryService.record_call_status(
                    call_id=call_id,
                    phone_number="",
                    purpose="vaccination_reminder",
                    status="completed",
                )

        @ctx.room.on("disconnected")
        def on_disconnected():
            save_analytics(is_final=True)

        if is_sip or "outbound_" in ctx.room.name:
            await session.say(
                "Hello, I am ArogyaSaathi, an AI health assistant. I am calling with a vaccination follow-up reminder. If you do not want future reminder calls, just say stop at any time.",
                add_to_chat_ctx=True,
            )
        else:
            await session.say(
                "Namaste! I am ArogyaSaathi, your AI health companion for Bharat. How can I help you with your health today?",
                add_to_chat_ctx=True,
            )
    finally:
        save_analytics(is_final=True)


if __name__ == "__main__":
    agent_name = (
        os.getenv("LIVEKIT_AGENT_NAME") or os.getenv("AGENT_NAME") or "arogyasaathi"
    )
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=my_agent,
            prewarm_fnc=prewarm,
            agent_name=agent_name,
        )
    )
