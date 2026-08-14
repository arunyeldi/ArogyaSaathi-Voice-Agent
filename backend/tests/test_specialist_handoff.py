"""Automated test suite for Day 9 Specialist Agent Handoff logic."""

import pytest

from agent import Assistant, CallTracker, ClinicAppointmentSpecialist
from memory.service import MemoryService
from tools.clinic_booking import (
    book_clinic_appointment_local,
    search_nearby_clinics_local,
)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database is initialized prior to running tests."""
    MemoryService.initialize()


def test_clinic_search_local():
    """Verify local clinic search tool returns matching clinics and doctor slots."""
    result = search_nearby_clinics_local(
        location="Hyderabad", specialty="General Medicine"
    )
    assert result["status"] == "success"
    assert result["results_count"] > 0
    clinics = result["clinics"]
    assert len(clinics) > 0
    assert "clinic_name" in clinics[0]
    assert "available_doctors" in clinics[0]


def test_clinic_appointment_booking():
    """Verify booking an appointment persists a confirmed record in SQLite."""
    res = book_clinic_appointment_local(
        patient_name="Ramesh Test",
        clinic_name="Arogya PHC Hyderabad",
        doctor_specialty="General Medicine",
        appointment_time="10:30 AM",
        symptom_notes="Fever and cough for 2 days",
    )
    assert res["status"] == "confirmed"
    assert res["booking_id"].startswith("APT-2026-")
    assert res["patient_name"] == "Ramesh Test"

    # Verify retrieval from database
    appointments = MemoryService.list_clinic_appointments(limit=10)
    assert any(a["patient_name"] == "Ramesh Test" for a in appointments)


def test_specialist_agent_initialization():
    """Verify ClinicAppointmentSpecialist initializes with instructions and context data."""
    tracker = CallTracker(call_id="test_handoff_session", room_name="test_room")
    main_agent = Assistant(tracker=tracker)
    specialist = ClinicAppointmentSpecialist(
        tracker=tracker,
        main_agent=main_agent,
        context_data={
            "caller_name": "Ramesh",
            "location": "Bengaluru",
            "specialty": "Pediatrics",
        },
    )

    assert specialist.context_data["caller_name"] == "Ramesh"
    assert specialist.context_data["location"] == "Bengaluru"
    assert specialist.main_agent == main_agent
    assert tracker is not None


def test_call_tracker_records_specialist_tools():
    """Verify CallTracker records handoff and specialist tool executions."""
    tracker = CallTracker(call_id="test_tracker_session", room_name="test_room")
    tracker.record_tool("transfer_to_clinic_specialist")
    tracker.record_tool("search_nearby_clinics")
    tracker.record_tool("book_clinic_appointment")
    tracker.record_tool("transfer_back_to_main_agent")

    final_payload = tracker.finalize(is_final=True)
    assert "transfer_to_clinic_specialist" in final_payload["tools_used"]
    assert "book_clinic_appointment" in final_payload["tools_used"]
    assert final_payload["outcome"] == "success"
