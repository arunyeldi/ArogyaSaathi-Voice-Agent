import json
import logging
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    room_io,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from memory.service import MemoryService
from prompts.system_prompt import SYSTEM_PROMPT
from tools.symptom_triage import assess_symptom_urgency_local

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Initialize SQLite Database & Memory Service
MemoryService.initialize()

SYSTEM_PROMPT = SYSTEM_PROMPT


class Assistant(Agent):
    def __init__(self, room: rtc.Room | None = None) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.room = room

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
        """Save the caller's profile to persistent memory after they give explicit consent.

        WHEN TO CALL: After you have asked the caller if they would like to be remembered and
        they clearly said YES or AGREE. Pass user_consent_given=True only on explicit agreement.
        If the caller says NO or is unsure, call this with user_consent_given=False (no data will be saved).

        HEALTH ACCESS RULE: Never save detailed medical notes, diagnoses, specific medicines, or ID numbers.
        Only save: name, language preference, age band, a brief general condition, brief advice summary.

        Args:
            name: The caller's name (e.g. 'Meera', 'Lakshmi', 'Ramesh').
            user_consent_given: True only if the caller explicitly said yes to being remembered.
            language_preference: Language the caller prefers (e.g. 'Hindi', 'English', 'Hinglish').
            age_band: Age band (e.g. '60+', '30-45', 'Young Adult'). Use 'Unspecified' if unknown.
            ongoing_conditions: Brief general condition only (e.g. 'mild fever', 'cough'). Not detailed notes.
            last_triage_outcome: Brief summary of advice given (e.g. 'Advised rest and warm fluids').
            preferred_register: How they like information (e.g. 'simple explanations').
            user_id: Optional stable user ID from the session.
        """
        logger.info(
            f"Memory save requested for '{name}' (Consent: {user_consent_given})"
        )

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
        """Delete the caller's persistent memory profile ('Right to be Forgotten').

        Use this tool when a caller requests to delete their data or be forgotten.

        Args:
            name_or_id: The caller's name or ID to erase (e.g. 'Meera', 'Lakshmi').
        """
        logger.info(f"Memory deletion requested for: {name_or_id}")
        success, message = MemoryService.forget_user(name_or_id)

        if success:
            logger.info(f"Memory deleted for '{name_or_id}'")
        return message

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
        """Assess healthcare symptom urgency classification and care navigation recommendations.

        WHEN TO CALL:
        - When a caller describes symptoms or asks whether their condition requires medical attention.
        - When a caller asks how urgently they should see a doctor, visit a PHC/CHC, or go to a hospital.
        - When a caller describes potentially concerning symptoms (fever, cough, pain, weakness, breathing issues).
        - When an urgency assessment materially improves the healthcare answer.

        WHEN NOT TO CALL:
        - Casual conversation or general wellness education that does not involve symptom urgency.
        - Vaccination awareness or hygiene tips.

        DISCLAIMER: This tool assesses urgency classification ONLY. It does NOT diagnose diseases, prescribe medicines, or give dosages.

        Args:
            symptoms: Primary symptoms reported by caller (e.g. 'fever and cough', 'chest pressure').
            duration: Duration of symptoms if mentioned (e.g. '2 days', 'since morning').
            age_band: Age band if known (e.g. '60+', 'Child').
            severity: Self-reported severity ('mild', 'moderate', 'severe').
            caller_name: Optional caller name to perform Day 4 + Day 5 memory chaining.
        """
        start_time = time.time()
        logger.info(f"[TOOL] assess_symptom_urgency START - symptoms: '{symptoms}'")

        # Day 4 + Day 5 Memory Chaining: check memory if caller_name provided
        chained_age_band = age_band
        if caller_name:
            profile = MemoryService.lookup_user(caller_name)
            if profile and (not chained_age_band or chained_age_band == "Unspecified"):
                chained_age_band = profile.age_band
                logger.info(
                    f"[TOOL] Memory chained for '{caller_name}': age_band='{chained_age_band}'"
                )

        # Notify frontend: CHECKING
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

            # Notify frontend: SUCCESS
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


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="arogyasaathi")
async def my_agent(ctx: JobContext):
    # Logging setup
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up voice AI pipeline using Murf Falcon, Gemini, Deepgram, and LiveKit turn detector
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",  # streaming multilingual: English, Hindi, Spanish, French, German, Portuguese
        ),
        llm=google.LLM(
            model="gemini-3.5-flash-lite",
        ),
        tts=murf.TTS(
            voice="Anisha",  # do not hardcode the locale key
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    # Pass ctx.room to Assistant so tool events can publish real-time UI data packets
    await session.start(
        agent=Assistant(room=ctx.room),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
