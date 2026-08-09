import logging
from datetime import datetime, timezone
from typing import Any, Optional

from .database import db_delete_user, db_lookup_user, db_save_user, init_db
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
