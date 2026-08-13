import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from memory.service import MemoryService
from telephony.service import OutboundTelephonyService, validate_e164_phone_number


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database is initialized and clean before running tests."""
    MemoryService.initialize()
    from memory.database import get_db_connection

    with get_db_connection() as conn:
        conn.execute(
            "DELETE FROM phone_opt_outs WHERE phone_number LIKE '+91999%' OR phone_number LIKE '+91977%'"
        )
        conn.execute(
            "DELETE FROM outbound_calls WHERE phone_number LIKE '+91999%' OR phone_number LIKE '+91977%'"
        )
        conn.commit()
    yield
    with get_db_connection() as conn:
        conn.execute(
            "DELETE FROM phone_opt_outs WHERE phone_number LIKE '+91999%' OR phone_number LIKE '+91977%'"
        )
        conn.execute(
            "DELETE FROM outbound_calls WHERE phone_number LIKE '+91999%' OR phone_number LIKE '+91977%'"
        )
        conn.commit()


def test_e164_phone_number_validation():
    """Test 1: Validates E.164 phone numbers accurately."""
    # Valid E.164
    valid, phone = validate_e164_phone_number("+919876543210")
    assert valid is True
    assert phone == "+919876543210"

    # Valid Linphone username target
    valid, user = validate_e164_phone_number("arun")
    assert valid is True
    assert user == "arun"

    # Invalid targets
    valid, _ = validate_e164_phone_number("!!! invalid !!!")
    assert valid is False


def test_opt_out_persistence_and_blocking():
    """Test 2: Opt-out is persisted in SQLite and blocks future outbound calls."""
    test_phone = "+919999988888"

    # Ensure not opted out initially
    assert MemoryService.is_phone_opted_out(test_phone) is False

    # Record opt-out
    success = MemoryService.record_opt_out(test_phone, reason="Test opt-out")
    assert success is True
    assert MemoryService.is_phone_opted_out(test_phone) is True

    # Initiate call to opted out number -> must be BLOCKED
    res = OutboundTelephonyService.initiate_outbound_call(
        phone_number=test_phone, purpose="vaccination_reminder"
    )
    assert res["success"] is False
    assert res["status"] == "opted_out"
    assert "blocked" in res["message"].lower()


def test_outbound_call_status_tracking():
    """Test 3: Outbound call state transitions are recorded accurately in SQLite."""
    test_phone = "+919123456789"
    res = OutboundTelephonyService.initiate_outbound_call(
        phone_number=test_phone, purpose="vaccination_reminder"
    )
    assert res["success"] is True
    call_id = res["call_id"]
    assert call_id is not None

    # Update call status to answered -> completed
    OutboundTelephonyService.record_call_outcome(
        call_id=call_id, phone_number=test_phone, status="answered"
    )
    info = MemoryService.get_call_info(call_id)
    assert info is not None
    assert info["status"] == "answered"

    OutboundTelephonyService.record_call_outcome(
        call_id=call_id, phone_number=test_phone, status="completed"
    )
    info = MemoryService.get_call_info(call_id)
    assert info["status"] == "completed"


def test_controlled_retry_policy():
    """Test 4: Controlled retry policy caps retries at max 1 for no_answer or busy."""
    test_phone = "+919777766666"
    res = OutboundTelephonyService.initiate_outbound_call(
        phone_number=test_phone, purpose="vaccination_reminder"
    )
    call_id = res["call_id"]

    # Record no_answer retry 0
    OutboundTelephonyService.record_call_outcome(
        call_id=call_id, phone_number=test_phone, status="no_answer", retry_count=0
    )
    info = MemoryService.get_call_info(call_id)
    assert info["status"] == "no_answer"
    assert info["retry_count"] == 0

    # Record no_answer retry 1
    OutboundTelephonyService.record_call_outcome(
        call_id=call_id, phone_number=test_phone, status="no_answer", retry_count=1
    )
    info = MemoryService.get_call_info(call_id)
    assert info["retry_count"] == 1


def test_demo_mode_test_number_restriction():
    """Test 5: Demo mode restricts outbound calls to configured test number."""
    os.environ["OUTBOUND_DEMO_MODE"] = "true"
    os.environ["OUTBOUND_TEST_PHONE_NUMBER"] = "+919876543210"
    MemoryService.remove_opt_out("+919876543210")

    # Authorized test number call -> succeeds
    res_auth = OutboundTelephonyService.initiate_outbound_call(
        phone_number="+919876543210", purpose="vaccination_reminder"
    )
    assert res_auth["success"] is True

    # Unauthorized number call -> blocked by demo restriction
    res_unauth = OutboundTelephonyService.initiate_outbound_call(
        phone_number="+919111122222", purpose="vaccination_reminder"
    )
    assert res_unauth["success"] is False
    assert res_unauth["status"] == "demo_restricted"
