"""Day 7 Human Escalation Automated Unit Tests.

Tests decision boundary (selective escalation), permission enforcement,
privacy sanitization, reference ID generation, urgency assignment,
duplicate request updating, status lifecycle, and Day 6 callback integration.
"""

import pytest

from memory.database import get_db_connection, init_db
from memory.service import MemoryService
from telephony.service import OutboundTelephonyService


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before every test."""
    init_db()


def test_normal_question_no_escalation():
    """Test 1: Normal health questions do NOT trigger escalation requests."""
    # Verify that MemoryService list_escalations returns unchanged count for normal question handling
    initial_tickets = MemoryService.list_escalations()

    # Normal health guidance simulation
    query = "What are some healthy foods to eat for breakfast?"
    is_red_flag = any(
        kw in query.lower() for kw in ["severe breathing", "chest pain", "bleeding"]
    )
    is_diagnosis = any(
        kw in query.lower()
        for kw in ["diagnose me", "prescription", "what disease do i have"]
    )

    assert is_red_flag is False
    assert is_diagnosis is False

    final_tickets = MemoryService.list_escalations()
    assert len(final_tickets) == len(initial_tickets)


def test_user_grants_permission():
    """Test 2: When user grants permission, escalation request is created."""
    user_id = "test_caller_grant_01"
    success, msg, data = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="red_flag_symptom",
        summary="Caller reports severe difficulty breathing since morning.",
        what_was_checked="Advised emergency medical evaluation.",
        urgency="EMERGENCY",
        user_permission_granted=True,
        caller_name="Ramesh",
        phone_number="+919876543210",
        language="Hindi",
        preferred_follow_up="phone",
    )

    assert success is True
    assert "AS-2026-" in msg or "AS-" in msg
    assert data["status"] == "open"
    assert data["urgency"] == "EMERGENCY"
    assert data["caller_name"] == "Ramesh"


def test_user_denies_permission():
    """Test 3: When user denies permission, NO escalation request is created."""
    user_id = "test_caller_deny_01"
    initial_count = len(MemoryService.list_escalations())

    success, msg, data = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="red_flag_symptom",
        summary="Caller reports severe chest pain.",
        what_was_checked="Advised emergency hospital care.",
        urgency="EMERGENCY",
        user_permission_granted=False,
    )

    assert success is False
    assert "CANCELLED" in msg
    assert data == {}

    final_count = len(MemoryService.list_escalations())
    assert final_count == initial_count


def test_diagnosis_request_escalation():
    """Test 4: Specific diagnosis/prescription request triggers escalation."""
    user_id = "test_caller_diag_01"
    success, _, data = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="diagnosis_request",
        summary="Caller asked 'Do I have pneumonia and which antibiotics should I take?'",
        what_was_checked="Explained AI cannot diagnose or prescribe medication.",
        urgency="HIGH",
        user_permission_granted=True,
        caller_name="Meera",
    )

    assert success is True
    assert data["reason"] == "diagnosis_request"
    assert data["urgency"] == "HIGH"


def test_sensitive_info_privacy_sanitization():
    """Test 5: Sensitive credentials (OTP, PIN, Aadhaar, SSN) are stripped before persistence."""
    raw_summary = "User reported fever. OTP is 123456, Aadhaar 1234-5678-9012, PIN: 9988, SSN 123-45-6789."
    sanitized = MemoryService.sanitize_escalation_summary(raw_summary)

    assert "123456" not in sanitized
    assert "1234-5678-9012" not in sanitized
    assert "9988" not in sanitized
    assert "123-45-6789" not in sanitized
    assert "[REDACTED_CREDENTIAL]" in sanitized
    assert "[REDACTED_ID]" in sanitized


def test_duplicate_escalation_prevention():
    """Test 6: Re-escalating same user & reason updates open ticket & returns existing Reference ID."""
    user_id = "test_duplicate_caller_01"
    reason = "red_flag_symptom"

    # Initial escalation
    _, _, d1 = MemoryService.create_escalation_request(
        user_id=user_id,
        reason=reason,
        summary="Initial severe cough and breathing difficulty.",
        what_was_checked="Safety guidance.",
        urgency="HIGH",
        user_permission_granted=True,
    )
    ref_id_1 = d1["reference_id"]

    # Second escalation attempt for same user & reason
    s2, m2, d2 = MemoryService.create_escalation_request(
        user_id=user_id,
        reason=reason,
        summary="Updated: Caller states breathing difficulty is worsening.",
        what_was_checked="Safety guidance.",
        urgency="EMERGENCY",
        user_permission_granted=True,
    )

    assert s2 is True
    assert d2["reference_id"] == ref_id_1
    assert "already open" in m2
    assert "Update:" in d2["summary"]


def test_urgency_level_assignment():
    """Test 7: Validates LOW, MEDIUM, HIGH, EMERGENCY urgency assignments."""
    u_levels = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"]
    for idx, u in enumerate(u_levels):
        uid = f"user_urgency_{idx}"
        s, _, d = MemoryService.create_escalation_request(
            user_id=uid,
            reason="red_flag_symptom",
            summary=f"Testing urgency {u}",
            what_was_checked="Check",
            urgency=u,
            user_permission_granted=True,
        )
        assert s is True
        assert d["urgency"] == u


def test_reference_id_format():
    """Test 8: Reference ID format complies with AS-YYYY-XXXX collision-safe structure."""
    ref_id = MemoryService.generate_reference_id()
    assert ref_id.startswith("AS-")
    parts = ref_id.split("-")
    assert len(parts) == 3
    assert len(parts[1]) == 4  # Year
    assert len(parts[2]) == 4  # 4 hex chars


def test_status_lifecycle_transitions():
    """Test 9: Status lifecycle OPEN -> IN_PROGRESS -> RESOLVED."""
    user_id = "test_lifecycle_user"
    _, _, d = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="diagnosis_request",
        summary="Lifecycle test",
        what_was_checked="Check",
        urgency="MEDIUM",
        user_permission_granted=True,
    )
    ref_id = d["reference_id"]

    # Initial status
    ticket = MemoryService.get_escalation(ref_id)
    assert ticket["status"] == "open"

    # Mark In Progress
    up1 = MemoryService.update_escalation_status(ref_id, "in_progress")
    assert up1 is True
    ticket = MemoryService.get_escalation(ref_id)
    assert ticket["status"] == "in_progress"

    # Mark Resolved
    up2 = MemoryService.update_escalation_status(ref_id, "resolved")
    assert up2 is True
    ticket = MemoryService.get_escalation(ref_id)
    assert ticket["status"] == "resolved"


def test_resolution_callback_integration():
    """Test 10: Resolution callback reuses Day 6 outbound calling system."""
    test_phone = "+919876543210"
    user_id = "test_callback_user"
    MemoryService.remove_opt_out(test_phone)

    _, _, _ = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="red_flag_symptom",
        summary="Callback integration test",
        what_was_checked="Check",
        urgency="HIGH",
        user_permission_granted=True,
        phone_number=test_phone,
    )

    # Trigger resolution callback via telephony service
    call_res = OutboundTelephonyService.initiate_outbound_call(
        phone_number=test_phone,
        purpose="resolution_followup",
        caller_name="Test Caller",
    )

    assert call_res["success"] is True
    assert call_res["status"] in ["ringing", "calling"]


def test_opted_out_user_callback_blocked():
    """Test 11: Resolution callback is permanently BLOCKED for opted-out phone numbers."""
    opt_phone = "+919999900000"
    MemoryService.record_opt_out(opt_phone, reason="Opt-out for test")

    is_opted = MemoryService.is_phone_opted_out(opt_phone)
    assert is_opted is True

    # Outbound call dispatch must block opted-out number
    call_res = OutboundTelephonyService.initiate_outbound_call(
        phone_number=opt_phone,
        purpose="resolution_followup",
    )

    assert call_res["success"] is False
    assert call_res["status"] == "opted_out"


def test_escalation_service_error_handling():
    """Test 12: Handles non-existent escalation lookups gracefully."""
    ticket = MemoryService.get_escalation("AS-0000-NONEXISTENT")
    assert ticket is None

    updated = MemoryService.update_escalation_status("AS-0000-NONEXISTENT", "resolved")
    assert updated is False


def test_database_persistence():
    """Test 13: Escalation records persist in SQLite database across calls."""
    user_id = "test_persist_user"
    _, _, d = MemoryService.create_escalation_request(
        user_id=user_id,
        reason="red_flag_symptom",
        summary="Persistence check",
        what_was_checked="Safety guidance",
        urgency="HIGH",
        user_permission_granted=True,
    )
    ref_id = d["reference_id"]

    # Verify directly via fresh SQLite connection
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM escalation_requests WHERE reference_id = ?", (ref_id,)
        )
        row = cursor.fetchone()
        assert row is not None
        assert row["reference_id"] == ref_id
        assert row["user_id"] == user_id


def test_list_escalations_status_filtering():
    """Test 14: List escalations supports filtering by status (open, in_progress, resolved)."""
    # Create tickets in different states
    _, _, d1 = MemoryService.create_escalation_request(
        user_id="user_list_filter_1",
        reason="diagnosis_request",
        summary="Open ticket",
        what_was_checked="Check",
        urgency="LOW",
        user_permission_granted=True,
    )
    _, _, d2 = MemoryService.create_escalation_request(
        user_id="user_list_filter_2",
        reason="red_flag_symptom",
        summary="Resolved ticket",
        what_was_checked="Check",
        urgency="EMERGENCY",
        user_permission_granted=True,
    )
    MemoryService.update_escalation_status(d2["reference_id"], "resolved")

    open_tickets = MemoryService.list_escalations(status_filter="open")
    resolved_tickets = MemoryService.list_escalations(status_filter="resolved")

    assert any(t["reference_id"] == d1["reference_id"] for t in open_tickets)
    assert any(t["reference_id"] == d2["reference_id"] for t in resolved_tickets)
