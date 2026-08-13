from datetime import datetime, timezone

from memory.database import (
    db_record_call_analytics,
    init_db,
)
from memory.service import MemoryService


def test_call_analytics_lifecycle():
    init_db()

    timestamp1 = datetime.now(timezone.utc).isoformat()
    timestamp2 = datetime.now(timezone.utc).isoformat()

    # 1. Record a successful browser call
    success_call = {
        "call_id": "test_success_room_101",
        "room_name": "test_success_room_101",
        "channel": "browser",
        "start_time": timestamp1,
        "end_time": timestamp1,
        "duration_seconds": 45,
        "outcome": "success",
        "failure_category": "none",
        "outcome_reason": "Symptom urgency triage completed (Level: ROUTINE)",
        "tools_used": ["assess_symptom_urgency", "lookup_user"],
        "triage_level": "ROUTINE",
    }
    recorded = db_record_call_analytics(success_call)
    assert recorded is True

    # 2. Record a failed call (user hung up early)
    failed_call = {
        "call_id": "test_failed_room_102",
        "room_name": "test_failed_room_102",
        "channel": "browser",
        "start_time": timestamp2,
        "end_time": timestamp2,
        "duration_seconds": 3,
        "outcome": "failed",
        "failure_category": "quick_disconnect",
        "outcome_reason": "Caller disconnected immediately before completing consultation (< 5s)",
        "tools_used": [],
        "triage_level": "NONE",
    }
    recorded_failed = db_record_call_analytics(failed_call)
    assert recorded_failed is True

    # 3. Query summary
    summary = MemoryService.get_call_analytics_summary()
    assert summary["total_calls"] >= 2
    assert summary["successful_calls"] >= 1
    assert summary["failed_calls"] >= 1
    assert summary["success_rate"] > 0

    # 4. List recent calls
    calls = MemoryService.list_recent_calls(limit=10)
    assert len(calls) >= 2
    call_ids = [c["call_id"] for c in calls]
    assert "test_success_room_101" in call_ids
    assert "test_failed_room_102" in call_ids

    # 5. Check privacy rule (Step 6): Ensure no transcripts or sensitive medical notes exist
    for call in calls:
        assert "transcript" not in call
        assert "password" not in call
        assert "otp" not in call
        assert "aadhaar" not in call
