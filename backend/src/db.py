import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("arogya_db")

# SQLite database file path in backend directory
DB_PATH = Path(__file__).parent.parent / "arogya_memory.db"


def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database tables if they do not exist."""
    logger.info(f"Initializing ArogyaSaathi SQLite DB at: {DB_PATH}")
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                language_preference TEXT DEFAULT 'Hindi/English',
                facts_json TEXT NOT NULL,
                last_interaction TEXT NOT NULL
            )
            """
        )
        conn.commit()


def get_profile(identifier: str) -> Optional[dict[str, Any]]:
    """Look up a caller profile by user_id or name (case-insensitive)."""
    clean_id = identifier.strip().lower()
    if not clean_id:
        return None

    with get_db_connection() as conn:
        # Search by exact user_id or matching name
        cursor = conn.execute(
            """
            SELECT * FROM user_profiles
            WHERE LOWER(user_id) = ? OR LOWER(name) = ?
            ORDER BY last_interaction DESC LIMIT 1
            """,
            (clean_id, clean_id),
        )
        row = cursor.fetchone()

        if not row:
            # Fallback partial name match
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
                "facts": facts,
                "last_interaction": row["last_interaction"],
            }
    return None


def save_profile(
    user_id: str,
    name: str,
    age_group: str = "Unspecified",
    ongoing_conditions: str = "None mentioned",
    last_triage_outcome: str = "General Consultation",
    language_preference: str = "Hindi/English",
) -> dict[str, Any]:
    """Save or update a caller profile in the database."""
    clean_id = user_id.strip().lower() or name.strip().lower().replace(" ", "_")
    timestamp = datetime.now(timezone.utc).isoformat()

    facts = {
        "age_group": age_group,
        "ongoing_conditions": ongoing_conditions,
        "last_triage_outcome": last_triage_outcome,
    }
    facts_json = json.dumps(facts)

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_profiles (user_id, name, language_preference, facts_json, last_interaction)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                language_preference = excluded.language_preference,
                facts_json = excluded.facts_json,
                last_interaction = excluded.last_interaction
            """,
            (clean_id, name, language_preference, facts_json, timestamp),
        )
        conn.commit()

    logger.info(f"Saved caller profile for '{name}' (ID: {clean_id})")
    return {
        "user_id": clean_id,
        "name": name,
        "language_preference": language_preference,
        "facts": facts,
        "last_interaction": timestamp,
    }


def delete_profile(identifier: str) -> bool:
    """Delete a caller profile from the database ('Forget Me' tool)."""
    clean_id = identifier.strip().lower()
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
            logger.info(f"Deleted profile matching '{identifier}'")
        return deleted
