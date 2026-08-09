import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from memory.database import DB_PATH, db_delete_user
from memory.service import MemoryService


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Ensure database is initialized and cleaned before each test."""
    MemoryService.initialize()
    db_delete_user("meera")
    db_delete_user("lakshmi")
    db_delete_user("test_user_privacy")
    yield
    db_delete_user("meera")
    db_delete_user("lakshmi")
    db_delete_user("test_user_privacy")


def test_new_user_lookup():
    """Test 1: New user lookup returns None."""
    profile = MemoryService.lookup_user("non_existent_user_999")
    assert profile is None


def test_save_user_memory_with_consent():
    """Test 2: Save memory with consent succeeds."""
    success, msg = MemoryService.save_user_memory(
        user_id="user_meera",
        name="Meera",
        user_consent_given=True,
        language_preference="Hindi",
        age_band="60+",
        facts={"preferred_register": "simple explanations"},
    )
    assert success is True
    assert "SUCCESS" in msg

    # Lookup saved user
    profile = MemoryService.lookup_user("Meera")
    assert profile is not None
    assert profile.name == "Meera"
    assert profile.language_preference == "Hindi"
    assert profile.age_band == "60+"
    assert profile.facts.get("preferred_register") == "simple explanations"


def test_save_user_memory_without_consent():
    """Test 3: Save memory without consent is cancelled."""
    success, msg = MemoryService.save_user_memory(
        user_id="user_lakshmi",
        name="Lakshmi",
        user_consent_given=False,
        language_preference="Hindi",
    )
    assert success is False
    assert "CANCELLED" in msg

    # Verify NOT in database
    profile = MemoryService.lookup_user("Lakshmi")
    assert profile is None


def test_privacy_defense_in_depth_filtering():
    """Test 4: Defense-in-depth filters out sensitive medical notes and diagnoses."""
    facts = {
        "preferred_register": "simple explanations",
        "medical_notes": "User has severe chest pain and takes medicine X",
        "diagnosis": "Diabetes Type 2",
    }
    success, _msg = MemoryService.save_user_memory(
        user_id="test_user_privacy",
        name="TestPrivacyUser",
        user_consent_given=True,
        facts=facts,
    )
    assert success is True

    profile = MemoryService.lookup_user("TestPrivacyUser")
    assert profile is not None
    # Medical notes & diagnosis must be REJECTED by Privacy Guardrail
    assert "medical_notes" not in profile.facts
    assert "diagnosis" not in profile.facts
    # Non-sensitive preference allowed
    assert profile.facts.get("preferred_register") == "simple explanations"


def test_forget_user():
    """Test 5 & 6: Forget user deletes record permanently."""
    # First save
    MemoryService.save_user_memory(
        user_id="user_meera",
        name="Meera",
        user_consent_given=True,
        language_preference="Hindi",
    )
    assert MemoryService.lookup_user("Meera") is not None

    # Forget
    success, _msg = MemoryService.forget_user("Meera")
    assert success is True

    # Verify deleted
    assert MemoryService.lookup_user("Meera") is None


def test_sqlite_persistence_file_exists():
    """Test 7: SQLite DB file exists at backend/data/arogyasaathi.db."""
    assert DB_PATH.exists()
