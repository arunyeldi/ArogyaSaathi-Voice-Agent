import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from .database import (
    db_delete_user,
    db_find_open_escalation,
    db_get_call_analytics_summary,
    db_get_call_info,
    db_get_escalation,
    db_is_phone_opted_out,
    db_list_escalations,
    db_list_recent_calls,
    db_lookup_user,
    db_record_call_analytics,
    db_record_call_status,
    db_record_opt_out,
    db_remove_opt_out,
    db_save_escalation,
    db_save_user,
    db_update_escalation_status,
    init_db,
)
from .models import UserProfile

logger = logging.getLogger("arogya_memory_service")

# Prohibited sensitive medical keywords (Health Access Track Privacy Rules)
PROHIBITED_HEALTH_KEYWORDS = [
    "medical_notes",
    "diagnosis",
    "prescription",
    "medicine",
    "medication",
    "dosage",
    "chest pain",
    "cancer",
    "aadhaar",
    "ssn",
    "credit_card",
    "bank_account",
    "lab_report",
]


class MemoryService:
    """Service layer managing consent verification, privacy validation, and caller persistence."""

    @staticmethod
    def initialize() -> None:
        """Initialize the underlying database."""
        init_db()

    @staticmethod
    def lookup_user(name_or_id: str) -> Optional[UserProfile]:
        """Look up a user's persistent profile safely."""
        if not name_or_id or not name_or_id.strip():
            return None

        data = db_lookup_user(name_or_id)
        if data:
            return UserProfile.from_dict(data)
        return None

    @staticmethod
    def sanitize_facts(facts: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        """Defense-in-Depth Privacy Validator: Filters out prohibited medical notes or sensitive fields."""
        sanitized = {}
        has_rejected_items = False

        for key, value in facts.items():
            key_lower = str(key).lower()
            val_lower = str(value).lower()

            # Check if key or value contains prohibited medical notes / sensitive keywords
            is_prohibited = any(
                keyword in key_lower or keyword in val_lower
                for keyword in PROHIBITED_HEALTH_KEYWORDS
            )

            if is_prohibited:
                logger.warning(
                    f"PRIVACY GUARDRAIL TRIGGERED: Rejected sensitive field '{key}: {value}' from persistent memory."
                )
                has_rejected_items = True
            else:
                sanitized[key] = value

        return sanitized, has_rejected_items

    @classmethod
    def save_user_memory(
        cls,
        user_id: str,
        name: str,
        user_consent_given: bool,
        language_preference: str = "Hindi/English",
        age_band: str = "Unspecified",
        facts: Optional[dict[str, Any]] = None,
    ) -> tuple[bool, str]:
        """Save a user's profile with explicit consent check and privacy sanitization."""
        # 1. CONSENT CHECK (Mandatory Rule)
        if not user_consent_given:
            logger.info(f"Save memory for '{name}' cancelled: Consent not granted.")
            return (
                False,
                "CANCELLED: User did not grant explicit consent to store profile data.",
            )

        if not name or not name.strip():
            return False, "ERROR: Name is required to save caller memory."

        facts_to_save = facts or {}

        # 2. DEFENSE-IN-DEPTH PRIVACY SANITIZATION
        sanitized_facts, was_filtered = cls.sanitize_facts(facts_to_save)

        timestamp = datetime.now(timezone.utc).isoformat()
        clean_uid = (
            user_id.strip().lower()
            if user_id
            else name.strip().lower().replace(" ", "_")
        )

        # 3. DB PERSISTENCE
        success = db_save_user(
            user_id=clean_uid,
            name=name.strip(),
            language_preference=language_preference,
            age_band=age_band,
            facts=sanitized_facts,
            timestamp=timestamp,
        )

        if success:
            msg = f"SUCCESS: Memory saved for '{name}'."
            if was_filtered:
                msg += " (Note: Sensitive medical notes were filtered out for privacy)."
            return True, msg

        return False, "ERROR: Memory operation failed gracefully due to database error."

    @staticmethod
    def forget_user(name_or_id: str) -> tuple[bool, str]:
        """Delete caller profile completely ('Right to be Forgotten')."""
        if not name_or_id or not name_or_id.strip():
            return False, "ERROR: Name or ID required to forget user profile."

        deleted = db_delete_user(name_or_id)
        if deleted:
            return (
                True,
                f"SUCCESS: All saved records for '{name_or_id}' have been permanently deleted.",
            )
        return False, f"NOTICE: No existing records found for '{name_or_id}'."

    @staticmethod
    def is_phone_opted_out(phone_number: str) -> bool:
        """Check if a phone number has opted out of outbound calls."""
        return db_is_phone_opted_out(phone_number)

    @staticmethod
    def record_opt_out(
        phone_number: str, reason: str = "User requested opt-out"
    ) -> bool:
        """Permanently record a phone number opt-out."""
        return db_record_opt_out(phone_number, reason)

    @staticmethod
    def remove_opt_out(phone_number: str) -> bool:
        """Remove an opt-out record for a phone number."""
        return db_remove_opt_out(phone_number)

    @staticmethod
    def record_call_status(
        call_id: str,
        phone_number: str,
        purpose: str,
        status: str,
        retry_count: int = 0,
    ) -> bool:
        """Record or update outbound call status in database."""
        return db_record_call_status(
            call_id=call_id,
            phone_number=phone_number,
            purpose=purpose,
            status=status,
            retry_count=retry_count,
        )

    @staticmethod
    def get_call_info(call_id: str) -> Optional[dict[str, Any]]:
        """Retrieve call info by call_id."""
        return db_get_call_info(call_id)

    @staticmethod
    def sanitize_escalation_summary(summary_text: str) -> str:
        """Deterministic Privacy Sanitizer: Strips sensitive credentials, OTPs, PINs, bank numbers, SSN/Aadhaar."""
        if not summary_text:
            return ""
        text = summary_text

        # 1. Strip OTP / PIN / Credentials (e.g. "OTP is 123456", "PIN: 9876", "password=1234")
        text = re.sub(
            r"(?i)\b(otp|pin|password|passwd|token)\b(?:\s+\w+){0,2}\s*[:=]?\s*\d{4,8}\b",
            "[REDACTED_CREDENTIAL]",
            text,
        )

        # 2. Strip 12-digit Aadhaar / 16-digit Card / Bank Account Numbers
        text = re.sub(
            r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}(?:[-\s]?\d{4})?\b",
            "[REDACTED_ID]",
            text,
        )

        # 3. Strip 9-digit SSN numbers
        text = re.sub(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b", "[REDACTED_SSN]", text)

        return text.strip()

    @staticmethod
    def generate_reference_id() -> str:
        """Generate collision-safe reference ID in format AS-YYYY-XXXX (e.g. AS-2026-1042)."""
        year = datetime.now(timezone.utc).year
        suffix = secrets.token_hex(2).upper()
        return f"AS-{year}-{suffix}"

    @classmethod
    def create_escalation_request(
        cls,
        user_id: str,
        reason: str,
        summary: str,
        what_was_checked: str,
        urgency: str,
        user_permission_granted: bool,
        caller_name: str = "Anonymous",
        phone_number: str = "",
        language: str = "English",
        preferred_follow_up: str = "phone",
    ) -> tuple[bool, str, dict[str, Any]]:
        """Create or update a human escalation request with permission check & duplicate prevention."""
        # 1. PERMISSION CHECK (MANDATORY Day 7 Rule)
        if not user_permission_granted:
            logger.info(
                f"Escalation request for user '{user_id}' cancelled: User denied permission."
            )
            return (
                False,
                "CANCELLED: User denied permission to create human-help request. No request was created or stored.",
                {},
            )

        clean_uid = user_id.strip().lower() if user_id else "anonymous_caller"
        clean_reason = reason.strip().lower()
        clean_urgency = urgency.strip().upper()
        if clean_urgency not in ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]:
            clean_urgency = "MEDIUM"

        # 2. PRIVACY SANITIZATION
        sanitized_summary = cls.sanitize_escalation_summary(summary)
        sanitized_checked = cls.sanitize_escalation_summary(what_was_checked)

        # 3. DUPLICATE CHECK (Advanced Requirement)
        existing = db_find_open_escalation(clean_uid, clean_reason)
        if existing:
            ref_id = existing["reference_id"]
            updated_summary = f"{existing['summary']} | Update: {sanitized_summary}"
            update_payload = {
                "reference_id": ref_id,
                "user_id": clean_uid,
                "caller_name": caller_name or existing.get("caller_name"),
                "phone_number": phone_number or existing.get("phone_number"),
                "reason": clean_reason,
                "summary": updated_summary,
                "what_was_checked": sanitized_checked,
                "urgency": clean_urgency,
                "language": language,
                "preferred_follow_up": preferred_follow_up,
                "status": existing.get("status", "open"),
                "created_at": existing["created_at"],
            }
            db_save_escalation(update_payload)
            logger.info(
                f"Updated existing open escalation request '{ref_id}' for user '{clean_uid}'"
            )
            return (
                True,
                f"Your existing request {ref_id} is already open, so I added your latest information to it.",
                update_payload,
            )

        # 4. NEW ESCALATION CREATION
        ref_id = cls.generate_reference_id()
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "reference_id": ref_id,
            "user_id": clean_uid,
            "caller_name": caller_name,
            "phone_number": phone_number,
            "reason": clean_reason,
            "summary": sanitized_summary,
            "what_was_checked": sanitized_checked,
            "urgency": clean_urgency,
            "language": language,
            "preferred_follow_up": preferred_follow_up,
            "status": "open",
            "created_at": now,
        }

        success = db_save_escalation(payload)
        if success:
            return (
                True,
                f"Your human-help request has been created. Your reference number is {ref_id}.",
                payload,
            )

        return (
            False,
            "ERROR: Failed to persist escalation request due to database error.",
            {},
        )

    @staticmethod
    def get_escalation(reference_id: str) -> Optional[dict[str, Any]]:
        """Fetch escalation request by reference ID."""
        return db_get_escalation(reference_id)

    @staticmethod
    def list_escalations(
        status_filter: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """List escalation requests."""
        return db_list_escalations(status_filter)

    @staticmethod
    def update_escalation_status(reference_id: str, new_status: str) -> bool:
        """Update escalation status ('open', 'in_progress', 'resolved', 'cancelled')."""
        return db_update_escalation_status(reference_id, new_status)

    @staticmethod
    def record_call_analytics(data: dict[str, Any]) -> bool:
        """Record or update a call analytics record in database."""
        return db_record_call_analytics(data)

    @staticmethod
    def get_call_analytics_summary() -> dict[str, Any]:
        """Fetch summary statistics for Day 8 Call Analytics Dashboard."""
        return db_get_call_analytics_summary()

    @staticmethod
    def list_recent_calls(
        limit: int = 20,
        channel: Optional[str] = None,
        outcome: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """List recent calls for Day 8 Call Analytics Dashboard."""
        return db_list_recent_calls(limit=limit, channel=channel, outcome=outcome)
