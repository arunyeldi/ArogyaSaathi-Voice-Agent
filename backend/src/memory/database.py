import json
import logging
import sqlite3
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
            conn.commit()
        logger.info(f"SQLite DB initialized successfully at: {DB_PATH}")
    except Exception as e:
        logger.error(f"Error initializing SQLite DB at {DB_PATH}: {e}")


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
