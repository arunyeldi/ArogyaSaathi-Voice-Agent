import json
import logging
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("arogya_database")

# Recommended database location: backend/data/arogyasaathi.db
DATA_DIR = Path(__file__).parent.parent.parent / "data"
DB_PATH = DATA_DIR / "arogyasaathi.db"


def get_db_connection() -> sqlite3.Connection:
    """Get a thread-safe connection to the SQLite database."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the SQLite database schema if tables do not exist."""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with get_db_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    language_preference TEXT DEFAULT 'Hindi/English',
                    age_band TEXT DEFAULT 'Unspecified',
                    facts_json TEXT NOT NULL,
                    last_interaction TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS outbound_calls (
                    call_id TEXT PRIMARY KEY,
                    phone_number TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    status TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS phone_opt_outs (
                    phone_number TEXT PRIMARY KEY,
                    reason TEXT DEFAULT 'User requested opt-out',
                    opted_out_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS escalation_requests (
                    reference_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    caller_name TEXT,
                    phone_number TEXT,
                    reason TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    what_was_checked TEXT NOT NULL,
                    urgency TEXT NOT NULL,
                    language TEXT DEFAULT 'English',
                    preferred_follow_up TEXT DEFAULT 'phone',
                    status TEXT DEFAULT 'open',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS call_analytics (
                    call_id TEXT PRIMARY KEY,
                    room_name TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'browser',
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_seconds INTEGER NOT NULL DEFAULT 0,
                    outcome TEXT NOT NULL,
                    failure_category TEXT DEFAULT 'none',
                    outcome_reason TEXT,
                    tools_used TEXT DEFAULT '[]',
                    triage_level TEXT DEFAULT 'NONE',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS clinic_appointments (
                    booking_id TEXT PRIMARY KEY,
                    patient_name TEXT NOT NULL,
                    clinic_name TEXT NOT NULL,
                    doctor_specialty TEXT NOT NULL,
                    appointment_time TEXT NOT NULL,
                    symptom_notes TEXT,
                    status TEXT DEFAULT 'confirmed',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()
        logger.info(f"SQLite DB initialized successfully at: {DB_PATH}")
    except Exception as e:
        logger.error(f"Error initializing SQLite DB at {DB_PATH}: {e}")


def db_is_phone_opted_out(phone_number: str) -> bool:
    """Check if a phone number has permanently opted out of outbound calls."""
    clean_phone = phone_number.strip()
    if not clean_phone:
        return False
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT 1 FROM phone_opt_outs WHERE phone_number = ?", (clean_phone,)
            )
            return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Error checking opt-out for '{phone_number}': {e}")
        return False


def db_record_opt_out(
    phone_number: str, reason: str = "User requested opt-out"
) -> bool:
    """Record a phone number as permanently opted out in SQLite."""
    clean_phone = phone_number.strip()
    if not clean_phone:
        return False
    timestamp = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO phone_opt_outs (phone_number, reason, opted_out_at)
                VALUES (?, ?, ?)
                ON CONFLICT(phone_number) DO UPDATE SET
                    reason = excluded.reason,
                    opted_out_at = excluded.opted_out_at
                """,
                (clean_phone, reason, timestamp),
            )
            conn.commit()
            logger.info(f"Database recorded opt-out for phone '{clean_phone}'")
            return True
    except Exception as e:
        logger.error(f"Error recording opt-out for '{phone_number}': {e}")
        return False


def db_remove_opt_out(phone_number: str) -> bool:
    """Remove an opt-out record for a phone number."""
    clean_phone = phone_number.strip()
    if not clean_phone:
        return False
    try:
        with get_db_connection() as conn:
            conn.execute(
                "DELETE FROM phone_opt_outs WHERE phone_number = ?",
                (clean_phone,),
            )
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"Error removing opt-out for '{phone_number}': {e}")
        return False


def db_record_call_status(
    call_id: str,
    phone_number: str,
    purpose: str,
    status: str,
    retry_count: int = 0,
) -> bool:
    """Record or update outbound call status in SQLite."""
    timestamp = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO outbound_calls (call_id, phone_number, purpose, status, retry_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(call_id) DO UPDATE SET
                    status = excluded.status,
                    retry_count = excluded.retry_count,
                    updated_at = excluded.updated_at
                """,
                (
                    call_id,
                    phone_number,
                    purpose,
                    status,
                    retry_count,
                    timestamp,
                    timestamp,
                ),
            )
            conn.commit()
            logger.info(f"Database updated call '{call_id}' status to '{status}'")
            return True
    except Exception as e:
        logger.error(f"Error recording call status for '{call_id}': {e}")
        return False


def db_get_call_info(call_id: str) -> Optional[dict[str, Any]]:
    """Retrieve call details by call_id."""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM outbound_calls WHERE call_id = ?", (call_id,)
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
    except Exception as e:
        logger.error(f"Error fetching call info for '{call_id}': {e}")
    return None


def db_lookup_user(identifier: str) -> Optional[dict[str, Any]]:
    """Look up a user profile by user_id or name (case-insensitive)."""
    clean_id = identifier.strip().lower()
    if not clean_id:
        return None

    try:
        with get_db_connection() as conn:
            # 1. Primary lookup by exact user_id or name
            cursor = conn.execute(
                """
                SELECT * FROM user_profiles
                WHERE LOWER(user_id) = ? OR LOWER(name) = ?
                ORDER BY last_interaction DESC LIMIT 1
                """,
                (clean_id, clean_id),
            )
            row = cursor.fetchone()

            # 2. Secondary lookup by partial name match
            if not row:
                cursor = conn.execute(
                    """
                    SELECT * FROM user_profiles
                    WHERE LOWER(name) LIKE ?
                    ORDER BY last_interaction DESC LIMIT 1
                    """,
                    (f"%{clean_id}%",),
                )
                row = cursor.fetchone()

            if row:
                facts = json.loads(row["facts_json"]) if row["facts_json"] else {}
                return {
                    "user_id": row["user_id"],
                    "name": row["name"],
                    "language_preference": row["language_preference"],
                    "age_band": row["age_band"],
                    "facts": facts,
                    "last_interaction": row["last_interaction"],
                }
    except Exception as e:
        logger.error(f"Database error during lookup for '{identifier}': {e}")

    return None


def db_save_user(
    user_id: str,
    name: str,
    language_preference: str,
    age_band: str,
    facts: dict[str, Any],
    timestamp: str,
) -> bool:
    """Save or update a user profile in SQLite."""
    clean_id = user_id.strip().lower() or name.strip().lower().replace(" ", "_")
    facts_json = json.dumps(facts)

    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO user_profiles (user_id, name, language_preference, age_band, facts_json, last_interaction)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    name = excluded.name,
                    language_preference = excluded.language_preference,
                    age_band = excluded.age_band,
                    facts_json = excluded.facts_json,
                    last_interaction = excluded.last_interaction
                """,
                (clean_id, name, language_preference, age_band, facts_json, timestamp),
            )
            conn.commit()
            logger.info(f"Database saved profile for user '{name}' ({clean_id})")
            return True
    except Exception as e:
        logger.error(f"Database error saving user '{name}': {e}")
        return False


def db_delete_user(identifier: str) -> bool:
    """Delete a user profile from SQLite ('Forget Me')."""
    clean_id = identifier.strip().lower()
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                """
                DELETE FROM user_profiles
                WHERE LOWER(user_id) = ? OR LOWER(name) = ? OR LOWER(name) LIKE ?
                """,
                (clean_id, clean_id, f"%{clean_id}%"),
            )
            conn.commit()
            deleted = cursor.rowcount > 0
            if deleted:
                logger.info(f"Database deleted profile for '{identifier}'")
            return deleted
    except Exception as e:
        logger.error(f"Database error deleting user '{identifier}': {e}")
        return False


def db_save_escalation(data: dict[str, Any]) -> bool:
    """Save or update an escalation request record in SQLite."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO escalation_requests (
                    reference_id, user_id, caller_name, phone_number, reason, summary,
                    what_was_checked, urgency, language, preferred_follow_up, status, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(reference_id) DO UPDATE SET
                    summary = excluded.summary,
                    what_was_checked = excluded.what_was_checked,
                    urgency = excluded.urgency,
                    updated_at = excluded.updated_at
                """,
                (
                    data["reference_id"],
                    data["user_id"],
                    data.get("caller_name", "Anonymous"),
                    data.get("phone_number", ""),
                    data["reason"],
                    data["summary"],
                    data["what_was_checked"],
                    data["urgency"],
                    data.get("language", "English"),
                    data.get("preferred_follow_up", "phone"),
                    data.get("status", "open"),
                    data.get("created_at", now),
                    now,
                ),
            )
            conn.commit()
            logger.info(
                f"Database saved escalation '{data['reference_id']}' for user '{data['user_id']}'"
            )
            return True
    except Exception as e:
        logger.error(
            f"Database error saving escalation '{data.get('reference_id')}': {e}"
        )
        return False


def db_get_escalation(reference_id: str) -> Optional[dict[str, Any]]:
    """Fetch an escalation request by reference_id."""
    clean_ref = reference_id.strip().upper()
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM escalation_requests WHERE UPPER(reference_id) = ?",
                (clean_ref,),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
    except Exception as e:
        logger.error(f"Database error fetching escalation '{reference_id}': {e}")
    return None


def db_list_escalations(
    status_filter: Optional[str] = None,
) -> list[dict[str, Any]]:
    """List escalation requests optionally filtered by status ('open', 'in_progress', 'resolved')."""
    try:
        with get_db_connection() as conn:
            if status_filter and status_filter.strip():
                clean_status = status_filter.strip().lower()
                cursor = conn.execute(
                    "SELECT * FROM escalation_requests WHERE LOWER(status) = ? ORDER BY created_at DESC",
                    (clean_status,),
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM escalation_requests ORDER BY created_at DESC"
                )
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Database error listing escalations: {e}")
        return []


def db_update_escalation_status(reference_id: str, new_status: str) -> bool:
    """Update the status of an escalation request ('open', 'in_progress', 'resolved', 'cancelled')."""
    clean_ref = reference_id.strip().upper()
    clean_status = new_status.strip().lower()
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE escalation_requests
                SET status = ?, updated_at = ?
                WHERE UPPER(reference_id) = ?
                """,
                (clean_status, now, clean_ref),
            )
            conn.commit()
            updated = cursor.rowcount > 0
            if updated:
                logger.info(
                    f"Database updated escalation '{clean_ref}' status to '{clean_status}'"
                )
            return updated
    except Exception as e:
        logger.error(
            f"Database error updating status for escalation '{reference_id}': {e}"
        )
        return False


def db_find_open_escalation(user_id: str, reason: str) -> Optional[dict[str, Any]]:
    """Check if the user has an open or in_progress escalation for substantially the same reason."""
    clean_uid = user_id.strip().lower()
    clean_reason = reason.strip().lower()
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM escalation_requests
                WHERE LOWER(user_id) = ? AND LOWER(reason) = ? AND LOWER(status) IN ('open', 'in_progress')
                ORDER BY created_at DESC LIMIT 1
                """,
                (clean_uid, clean_reason),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
    except Exception as e:
        logger.error(f"Database error checking duplicate escalation: {e}")
    return None


def db_record_call_analytics(data: dict[str, Any]) -> bool:
    """Record or update a call analytics record in SQLite.

    Args:
        data: Dictionary containing call_id, room_name, channel, start_time, end_time,
              duration_seconds, outcome ('success'/'failed'), failure_category,
              outcome_reason, tools_used (list or JSON string), triage_level.
    """
    now = datetime.now(timezone.utc).isoformat()
    tools_json = (
        json.dumps(data.get("tools_used", []))
        if isinstance(data.get("tools_used"), list)
        else (data.get("tools_used") or "[]")
    )
    call_id = data.get("call_id") or f"call_{datetime.now(timezone.utc).timestamp()}"

    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO call_analytics (
                    call_id, room_name, channel, start_time, end_time, duration_seconds,
                    outcome, failure_category, outcome_reason, tools_used, triage_level, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(call_id) DO UPDATE SET
                    end_time = excluded.end_time,
                    duration_seconds = excluded.duration_seconds,
                    outcome = excluded.outcome,
                    failure_category = excluded.failure_category,
                    outcome_reason = excluded.outcome_reason,
                    tools_used = excluded.tools_used,
                    triage_level = excluded.triage_level
                """,
                (
                    call_id,
                    data.get("room_name", "unknown_room"),
                    data.get("channel", "browser"),
                    data.get("start_time", now),
                    data.get("end_time", now),
                    int(data.get("duration_seconds", 0)),
                    data.get("outcome", "failed"),
                    data.get("failure_category", "none"),
                    data.get("outcome_reason", ""),
                    tools_json,
                    data.get("triage_level", "NONE"),
                    data.get("created_at", now),
                ),
            )
            conn.commit()
            logger.info(
                f"Database recorded call analytics for '{call_id}' (Outcome: {data.get('outcome')})"
            )
            return True
    except Exception as e:
        logger.error(f"Database error saving call analytics for '{call_id}': {e}")
        return False


def db_get_call_analytics_summary() -> dict[str, Any]:
    """Calculate summary statistics for Day 8 Call Analytics Dashboard."""
    try:
        with get_db_connection() as conn:
            # 1. Total calls
            cursor = conn.execute("SELECT COUNT(*) FROM call_analytics")
            total_calls = cursor.fetchone()[0]

            # 2. Successful calls
            cursor = conn.execute(
                "SELECT COUNT(*) FROM call_analytics WHERE outcome = 'success'"
            )
            successful_calls = cursor.fetchone()[0]

            # 3. Failed calls
            cursor = conn.execute(
                "SELECT COUNT(*) FROM call_analytics WHERE outcome = 'failed'"
            )
            failed_calls = cursor.fetchone()[0]

            # 4. Success rate
            success_rate = (
                round((successful_calls / total_calls) * 100, 1)
                if total_calls > 0
                else 0.0
            )

            # 5. Breakdown by failure category
            cursor = conn.execute(
                """
                SELECT failure_category, COUNT(*) as cnt
                FROM call_analytics
                WHERE outcome = 'failed'
                GROUP BY failure_category
                """
            )
            failure_categories = {
                row["failure_category"]: row["cnt"] for row in cursor.fetchall()
            }

            # 6. Breakdown by channel
            cursor = conn.execute(
                """
                SELECT channel, COUNT(*) as cnt
                FROM call_analytics
                GROUP BY channel
                """
            )
            channels = {row["channel"]: row["cnt"] for row in cursor.fetchall()}

            # 7. Breakdown by triage level
            cursor = conn.execute(
                """
                SELECT triage_level, COUNT(*) as cnt
                FROM call_analytics
                GROUP BY triage_level
                """
            )
            triage_breakdown = {
                row["triage_level"]: row["cnt"] for row in cursor.fetchall()
            }

            # 8. Avg duration
            cursor = conn.execute("SELECT AVG(duration_seconds) FROM call_analytics")
            avg_row = cursor.fetchone()
            avg_duration = (
                round(avg_row[0], 1) if avg_row and avg_row[0] is not None else 0.0
            )

            return {
                "total_calls": total_calls,
                "successful_calls": successful_calls,
                "failed_calls": failed_calls,
                "success_rate": success_rate,
                "failure_categories": failure_categories,
                "channels": channels,
                "triage_breakdown": triage_breakdown,
                "avg_duration_seconds": avg_duration,
            }
    except Exception as e:
        logger.error(f"Database error calculating call analytics summary: {e}")
        return {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "success_rate": 0.0,
            "failure_categories": {},
            "channels": {},
            "triage_breakdown": {},
            "avg_duration_seconds": 0.0,
        }


def db_list_recent_calls(
    limit: int = 20,
    channel: Optional[str] = None,
    outcome: Optional[str] = None,
) -> list[dict[str, Any]]:
    """List recent call analytics records (sanitized, privacy compliant)."""
    try:
        with get_db_connection() as conn:
            query = "SELECT * FROM call_analytics WHERE 1=1"
            params: list[Any] = []

            if channel and channel.strip() and channel.strip() != "all":
                query += " AND channel = ?"
                params.append(channel.strip().lower())

            if outcome and outcome.strip() and outcome.strip() != "all":
                query += " AND outcome = ?"
                params.append(outcome.strip().lower())

            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor = conn.execute(query, tuple(params))
            results = []
            for row in cursor.fetchall():
                r = dict(row)
                try:
                    r["tools_used"] = json.loads(r.get("tools_used") or "[]")
                except Exception:
                    r["tools_used"] = []
                results.append(r)
            return results
    except Exception as e:
        logger.error(f"Database error listing recent calls: {e}")
        return []


def db_book_clinic_appointment(
    patient_name: str,
    clinic_name: str,
    doctor_specialty: str,
    appointment_time: str,
    symptom_notes: str = "",
) -> dict[str, Any]:
    """Persist a clinic appointment booking record in SQLite."""
    now_str = datetime.now(timezone.utc).isoformat()
    booking_id = f"APT-2026-{int(time.time() * 1000) % 100000:05d}"
    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO clinic_appointments (
                    booking_id, patient_name, clinic_name, doctor_specialty,
                    appointment_time, symptom_notes, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
                """,
                (
                    booking_id,
                    patient_name,
                    clinic_name,
                    doctor_specialty,
                    appointment_time,
                    symptom_notes,
                    now_str,
                ),
            )
            conn.commit()
            logger.info(
                f"[CLINIC_DB] Booked appointment '{booking_id}' for '{patient_name}' at '{clinic_name}'"
            )
            return {
                "booking_id": booking_id,
                "patient_name": patient_name,
                "clinic_name": clinic_name,
                "doctor_specialty": doctor_specialty,
                "appointment_time": appointment_time,
                "symptom_notes": symptom_notes,
                "status": "confirmed",
                "created_at": now_str,
            }
    except Exception as e:
        logger.error(f"Error booking clinic appointment in DB: {e}")
        return {
            "booking_id": booking_id,
            "patient_name": patient_name,
            "clinic_name": clinic_name,
            "doctor_specialty": doctor_specialty,
            "appointment_time": appointment_time,
            "status": "error",
            "error": str(e),
        }


def db_list_clinic_appointments(limit: int = 10) -> list[dict[str, Any]]:
    """Retrieve recent clinic appointments."""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM clinic_appointments ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
            return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error listing clinic appointments: {e}")
        return []
