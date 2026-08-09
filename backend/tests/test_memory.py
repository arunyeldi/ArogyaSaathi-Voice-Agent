import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from db import delete_profile, get_profile, init_db, save_profile


@pytest.fixture(autouse=True)
def setup_test_db():
    """Initialize DB before each test."""
    init_db()
    # Clean up test user
    delete_profile("test_user_ramesh")
    delete_profile("Ramesh")
    delete_profile("Anita")
    yield
    delete_profile("test_user_ramesh")
    delete_profile("Ramesh")
    delete_profile("Anita")


def test_save_and_lookup_profile():
    """Test saving a caller profile and retrieving it by name or user_id."""
    saved = save_profile(
        user_id="test_user_ramesh",
        name="Ramesh",
        age_group="45-60",
        ongoing_conditions="Seasonal cold and mild fever",
        last_triage_outcome="Advised warm fluids and rest",
        language_preference="Hindi",
    )

    assert saved["name"] == "Ramesh"
    assert saved["facts"]["ongoing_conditions"] == "Seasonal cold and mild fever"

    # Lookup by name
    profile = get_profile("Ramesh")
    assert profile is not None
    assert profile["name"] == "Ramesh"
    assert profile["facts"]["age_group"] == "45-60"
    assert profile["facts"]["last_triage_outcome"] == "Advised warm fluids and rest"

    # Lookup by user_id
    profile_by_id = get_profile("test_user_ramesh")
    assert profile_by_id is not None
    assert profile_by_id["name"] == "Ramesh"


def test_delete_profile():
    """Test the 'Forget Me' functionality."""
    save_profile(
        user_id="test_user_anita",
        name="Anita",
        age_group="30-45",
        ongoing_conditions="Hypertension",
    )

    # Verify exists
    assert get_profile("Anita") is not None

    # Delete
    deleted = delete_profile("Anita")
    assert deleted is True

    # Verify no longer exists
    assert get_profile("Anita") is None
