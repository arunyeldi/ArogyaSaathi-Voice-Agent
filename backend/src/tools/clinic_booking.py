"""Clinic and appointment booking search and scheduling logic for Day 9 Specialist Agent."""

import logging
from typing import Any

from memory.service import MemoryService

logger = logging.getLogger("clinic_booking_tools")

# Mock database of regional Primary Health Centers & Clinics across Bharat
SAMPLE_CLINICS = [
    {
        "clinic_id": "PHC-HYD-01",
        "name": "Arogya Primary Health Center - Jubilee Hills",
        "city": "Hyderabad",
        "doctors": [
            {
                "name": "Dr. Ananya Reddy",
                "specialty": "General Medicine",
                "slots": ["10:00 AM", "02:30 PM", "05:00 PM"],
            },
            {
                "name": "Dr. K. Srinivas",
                "specialty": "Pediatrics",
                "slots": ["11:30 AM", "04:00 PM"],
            },
        ],
        "timings": "09:00 AM - 06:00 PM",
        "address": "Road No. 36, Jubilee Hills, Hyderabad",
    },
    {
        "clinic_id": "PHC-DEL-02",
        "name": "Jan Swasthya Kendra - Connaught Place",
        "city": "Delhi",
        "doctors": [
            {
                "name": "Dr. Rajesh Sharma",
                "specialty": "General Medicine",
                "slots": ["09:30 AM", "11:00 AM", "03:00 PM"],
            },
            {
                "name": "Dr. Sunita Gupta",
                "specialty": "Gynecology",
                "slots": ["10:30 AM", "02:00 PM"],
            },
        ],
        "timings": "08:30 AM - 05:30 PM",
        "address": "Block B, Connaught Place, New Delhi",
    },
    {
        "clinic_id": "PHC-BLR-03",
        "name": "Namma Swasthya Clinic - Indiranagar",
        "city": "Bengaluru",
        "doctors": [
            {
                "name": "Dr. Vikram Rao",
                "specialty": "General Physician",
                "slots": ["10:00 AM", "01:00 PM", "04:30 PM"],
            },
            {
                "name": "Dr. Meera Nair",
                "specialty": "Dermatology",
                "slots": ["12:00 PM", "03:30 PM"],
            },
        ],
        "timings": "09:00 AM - 07:00 PM",
        "address": "100 Feet Road, Indiranagar, Bengaluru",
    },
]


def search_nearby_clinics_local(
    location: str | None = None, specialty: str | None = None
) -> dict[str, Any]:
    """Search available clinics, doctors, and appointment slots by location or specialty."""
    logger.info(
        f"[CLINIC_SEARCH] Search requested - Location: '{location}', Specialty: '{specialty}'"
    )

    matched_clinics = []
    loc_clean = (location or "").strip().lower()
    spec_clean = (specialty or "").strip().lower()

    for clinic in SAMPLE_CLINICS:
        city_match = (
            not loc_clean
            or loc_clean in clinic["city"].lower()
            or loc_clean in clinic["name"].lower()
            or loc_clean in clinic["address"].lower()
        )

        filtered_doctors = []
        for doc in clinic["doctors"]:
            doc_spec_match = (
                not spec_clean
                or spec_clean in doc["specialty"].lower()
                or spec_clean in doc["name"].lower()
            )
            if doc_spec_match:
                filtered_doctors.append(doc)

        if city_match or (spec_clean and filtered_doctors):
            matched_clinics.append(
                {
                    "clinic_name": clinic["name"],
                    "address": clinic["address"],
                    "timings": clinic["timings"],
                    "available_doctors": filtered_doctors
                    if filtered_doctors
                    else clinic["doctors"],
                }
            )

    if not matched_clinics:
        # Default fallback clinic if no match found
        matched_clinics = [
            {
                "clinic_name": SAMPLE_CLINICS[0]["name"],
                "address": SAMPLE_CLINICS[0]["address"],
                "timings": SAMPLE_CLINICS[0]["timings"],
                "available_doctors": SAMPLE_CLINICS[0]["doctors"],
            }
        ]

    return {
        "status": "success",
        "query_location": location or "General",
        "query_specialty": specialty or "General Medicine",
        "results_count": len(matched_clinics),
        "clinics": matched_clinics,
    }


def book_clinic_appointment_local(
    patient_name: str,
    clinic_name: str,
    doctor_specialty: str,
    appointment_time: str,
    symptom_notes: str = "",
) -> dict[str, Any]:
    """Book an appointment with a specialist or clinic doctor and return confirmation details."""
    logger.info(
        f"[CLINIC_BOOKING] Booking requested for '{patient_name}' at '{clinic_name}' (Time: '{appointment_time}')"
    )

    booking_record = MemoryService.book_clinic_appointment(
        patient_name=patient_name,
        clinic_name=clinic_name,
        doctor_specialty=doctor_specialty,
        appointment_time=appointment_time,
        symptom_notes=symptom_notes,
    )

    return {
        "status": "confirmed",
        "booking_id": booking_record.get("booking_id", "APT-2026-9999"),
        "patient_name": patient_name,
        "clinic_name": clinic_name,
        "doctor_specialty": doctor_specialty,
        "appointment_time": appointment_time,
        "symptom_notes": symptom_notes,
        "instructions": "Please arrive 10 minutes prior to your scheduled appointment time with your ID or Health Card.",
    }
