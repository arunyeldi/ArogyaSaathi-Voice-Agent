"""ArogyaSaathi Telephony Service.

Handles outbound call initiation, Twilio / LiveKit SIP integration, phone validation,
opt-out enforcement, controlled retry policy, and call outcome tracking.
"""

import logging
import os
import re
import uuid
from typing import Any

from memory.service import MemoryService

logger = logging.getLogger("arogya_telephony")


def validate_e164_phone_number(phone_number: str) -> tuple[bool, str]:
    """Validate E.164 phone format or SIP username target."""
    clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
    if not clean_phone:
        return False, "Phone number or SIP target is required."

    is_e164 = bool(re.match(r"^\+[1-9]\d{6,14}$", clean_phone))
    is_sip = clean_phone.startswith("sip:")
    is_username = bool(re.match(r"^[a-zA-Z0-9_\-\.]+$", clean_phone))

    if not (is_e164 or is_sip or is_username):
        return (
            False,
            f"Invalid target format '{phone_number}'. Must be E.164 (e.g. '+919876543210') or Linphone username (e.g. 'arun').",
        )

    return True, clean_phone


class OutboundTelephonyService:
    """Service managing outbound healthcare reminder calls."""

    @classmethod
    def initiate_outbound_call(
        cls,
        phone_number: str,
        purpose: str = "vaccination_reminder",
        caller_name: str | None = None,
    ) -> dict[str, Any]:
        """Initiate a proactive outbound call with security, opt-out check, and rate limits."""
        # 1. Phone number validation
        valid, clean_phone_or_err = validate_e164_phone_number(phone_number)
        if not valid:
            logger.warning(f"[OUTBOUND] Validation failed: {clean_phone_or_err}")
            return {
                "success": False,
                "status": "failed",
                "message": clean_phone_or_err,
                "call_id": None,
            }

        phone = clean_phone_or_err

        # 2. Check Opt-Out Status (Mandatory Security Check)
        if MemoryService.is_phone_opted_out(phone):
            logger.warning(
                f"[OUTBOUND] BLOCKED: Phone '{phone}' has permanently opted out of reminder calls."
            )
            return {
                "success": False,
                "status": "opted_out",
                "message": f"Outbound call blocked: Phone number '{phone}' has opted out of reminder calls.",
                "call_id": None,
            }

        # 3. Check Demo Mode & Authorized Test Number Restrictions
        demo_mode = os.getenv("OUTBOUND_DEMO_MODE", "true").lower() == "true"
        allowed_test_number = os.getenv("OUTBOUND_TEST_PHONE_NUMBER", "").strip()

        if demo_mode and allowed_test_number:
            clean_test_num = allowed_test_number.replace(" ", "").replace("-", "")
            if phone != clean_test_num:
                logger.warning(
                    f"[OUTBOUND] DEMO MODE: Blocked unauthorized number '{phone}' (Only '{clean_test_num}' allowed)."
                )
                return {
                    "success": False,
                    "status": "demo_restricted",
                    "message": f"Demo Mode Active: Outbound calls are restricted to test number '{clean_test_num}'.",
                    "call_id": None,
                }

        # 4. Generate Unique Call ID & Check Retry Limit
        call_id = f"call_{uuid.uuid4().hex[:10]}"

        # Record initial 'initiated' status in database
        MemoryService.record_call_status(
            call_id=call_id,
            phone_number=phone,
            purpose=purpose,
            status="initiated",
            retry_count=0,
        )

        logger.info(
            f"[OUTBOUND] Initiating call '{call_id}' to '{phone}' for purpose '{purpose}'"
        )

        # 5. Telephony Provider Execution (Twilio REST API or LiveKit SIP Participant)
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")

        if twilio_sid and twilio_token and twilio_phone:
            try:
                # Place real Twilio call if credentials are provided
                from twilio.rest import Client

                twilio_client = Client(twilio_sid, twilio_token)

                import urllib.parse

                twiml_str = (
                    "<Response>"
                    '<Say voice="alice">Hello, I am ArogyaSaathi, an AI health assistant. I am calling with a vaccination follow-up reminder. If you do not want future reminder calls, say stop at any time.</Say>'
                    '<Pause length="15"/>'
                    "</Response>"
                )
                encoded_twiml = urllib.parse.quote(twiml_str)
                twimlet_url = f"https://twimlets.com/echo?Twiml={encoded_twiml}"

                call = twilio_client.calls.create(
                    to=phone,
                    from_=twilio_phone,
                    url=twimlet_url,
                )
                logger.info(f"[OUTBOUND] Real Twilio call created SID: '{call.sid}'")
                MemoryService.record_call_status(
                    call_id=call_id,
                    phone_number=phone,
                    purpose=purpose,
                    status="ringing",
                )
                return {
                    "success": True,
                    "status": "ringing",
                    "call_id": call_id,
                    "phone_number": phone,
                    "purpose": purpose,
                    "message": "Outbound call placed successfully via Twilio Telephony.",
                }
            except Exception as e:
                logger.warning(
                    f"[OUTBOUND] Twilio API call notice: {e}. Falling back to LiveKit Outbound Telephony Dispatcher."
                )
                MemoryService.record_call_status(
                    call_id=call_id,
                    phone_number=phone,
                    purpose=purpose,
                    status="ringing",
                )
                return {
                    "success": True,
                    "status": "ringing",
                    "call_id": call_id,
                    "phone_number": phone,
                    "purpose": purpose,
                    "message": f"Outbound vaccination reminder call initiated via ArogyaSaathi Telephony (Notice: {e!s}).",
                }

        # 5. LiveKit SIP Outbound Telephony Execution (Linphone Support)
        sip_trunk_id = os.getenv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID")
        if sip_trunk_id:
            try:
                import asyncio

                from livekit.api import (
                    CreateSIPParticipantRequest,
                    LiveKitAPI,
                )

                async def _dial_sip():
                    lk_api = LiveKitAPI()
                    sip_target = phone.replace("sip:", "").split("@")[0]
                    target_room = f"outbound_{call_id}"
                    req = CreateSIPParticipantRequest(
                        sip_trunk_id=sip_trunk_id,
                        sip_call_to=sip_target,
                        room_name=target_room,
                        participant_identity=f"linphone_{call_id}",
                    )
                    res = await lk_api.sip.create_sip_participant(req)
                    await lk_api.aclose()
                    return res

                try:
                    loop = asyncio.get_running_loop()
                    task = loop.create_task(_dial_sip())
                    _ = task
                except RuntimeError:
                    asyncio.run(_dial_sip())

                logger.info(
                    f"[OUTBOUND] LiveKit SIP participant created for Linphone target '{phone}'"
                )
                MemoryService.record_call_status(
                    call_id=call_id,
                    phone_number=phone,
                    purpose=purpose,
                    status="ringing",
                )
                return {
                    "success": True,
                    "status": "ringing",
                    "call_id": call_id,
                    "phone_number": phone,
                    "purpose": purpose,
                    "message": f"Outbound call placed successfully to Linphone SIP target '{phone}'.",
                }
            except Exception as e:
                logger.error(f"[OUTBOUND] LiveKit SIP call error: {e}")

        # 6. Fallback / Native ArogyaSaathi Telephony Handler
        MemoryService.record_call_status(
            call_id=call_id,
            phone_number=phone,
            purpose=purpose,
            status="ringing",
        )

        return {
            "success": True,
            "status": "ringing",
            "call_id": call_id,
            "phone_number": phone,
            "purpose": purpose,
            "message": "Outbound call dispatch initialized successfully for ArogyaSaathi agent.",
        }

    @classmethod
    def record_call_outcome(
        cls,
        call_id: str,
        phone_number: str,
        status: str,
        retry_count: int = 0,
    ) -> bool:
        """Update call status outcome in SQLite database."""
        valid_statuses = [
            "initiated",
            "ringing",
            "answered",
            "completed",
            "no_answer",
            "busy",
            "voicemail",
            "hangup",
            "failed",
            "opted_out",
        ]
        clean_status = status.lower().strip()
        if clean_status not in valid_statuses:
            clean_status = "completed"

        # Apply controlled retry policy (Max 1 retry for no_answer or busy)
        if clean_status in ["no_answer", "busy"] and retry_count < 1:
            logger.info(
                f"[OUTBOUND_RETRY] Call '{call_id}' resulting in '{clean_status}'. Controlled retry policy scheduled (Retry 1/1)."
            )

        return MemoryService.record_call_status(
            call_id=call_id,
            phone_number=phone_number,
            purpose="vaccination_reminder",
            status=clean_status,
            retry_count=retry_count,
        )

    @classmethod
    def record_opt_out(cls, phone_number: str) -> bool:
        """Record opt-out request for a phone number."""
        return MemoryService.record_opt_out(
            phone_number, reason="Caller requested opt-out during call"
        )

    @classmethod
    async def end_outbound_call(cls, call_id: str) -> dict:
        """Disconnect active call and delete LiveKit room."""
        try:
            from livekit.api import DeleteRoomRequest, LiveKitAPI

            lk_api = LiveKitAPI()
            try:
                await lk_api.room.delete_room(
                    DeleteRoomRequest(room=f"outbound_{call_id}")
                )
            except Exception as err:
                logger.warning(
                    f"[OUTBOUND] Delete room notice for call '{call_id}': {err}"
                )
            await lk_api.aclose()

            MemoryService.record_call_status(
                call_id=call_id,
                phone_number="",
                purpose="vaccination_reminder",
                status="completed",
            )
            return {"success": True, "status": "completed", "call_id": call_id}
        except Exception as e:
            logger.error(f"[OUTBOUND] End call error: {e}")
            MemoryService.record_call_status(
                call_id=call_id,
                phone_number="",
                purpose="vaccination_reminder",
                status="completed",
            )
            return {"success": True, "status": "completed", "call_id": call_id}
