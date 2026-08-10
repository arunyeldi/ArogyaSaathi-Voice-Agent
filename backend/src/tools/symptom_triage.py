"""ArogyaSaathi Symptom Urgency Triage Tool Engine.

Provides conservative symptom urgency classification for Bharat health access.

IMPORTANT HEALTHCARE SAFETY DISCLAIMER:
- This is NOT a medical diagnosis tool.
- It DOES NOT diagnose diseases, prescribe medication, recommend dosages, or replace professional doctors.
- It classifies urgency levels (ROUTINE, SOON, URGENT, EMERGENCY) to guide care navigation safely.
"""

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("symptom_triage")

# Red flag keyword triggers requiring immediate EMERGENCY or URGENT care
EMERGENCY_RED_FLAGS = [
    "chest pain",
    "chest pressure",
    "chest tightness",
    "difficulty breathing",
    "shortness of breath",
    "breathing difficulty",
    "trouble breathing",
    "heart attack",
    "stroke",
    "face drooping",
    "sudden paralysis",
    "numbness on one side",
    "slurred speech",
    "loss of speech",
    "unconscious",
    "fainting",
    "passed out",
    "coughing blood",
    "vomiting blood",
    "severe bleeding",
    "sudden vision loss",
    "choking",
]

URGENT_FLAGS = [
    "high fever",
    "fever for 4 days",
    "fever for 5 days",
    "fever for 3 days",
    "stiff neck",
    "neck stiffness",
    "severe abdominal pain",
    "severe stomach pain",
    "unable to keep fluids down",
    "severe dehydration",
    "confusion",
    "disorientation",
    "severe infection",
]

SOON_FLAGS = [
    "fever",
    "weakness",
    "persistent cough",
    "sore throat",
    "ear ache",
    "earache",
    "vomiting",
    "diarrhea",
    "dizziness",
    "body ache",
    "joint pain",
    "headache",
    "rash",
]


def assess_symptom_urgency_local(
    symptoms: str,
    duration: str | None = None,
    age_band: str | None = None,
    severity: str | None = None,
    simulate_failure: bool = False,
) -> dict[str, Any]:
    """Classify symptom urgency based on transparent, conservative local rules.

    Args:
        symptoms: Description of symptoms reported by caller.
        duration: Duration of symptoms (e.g., '2 days', 'since morning').
        age_band: Caller age band if known from memory (e.g., '60+', 'child').
        severity: Self-reported severity ('mild', 'moderate', 'severe').
        simulate_failure: If True, simulates a service timeout/failure for testing.

    Returns:
        Structured JSON dictionary containing triage_level, reason, recommended_action, and metadata.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    source_info = "ArogyaSaathi local prototype triage rules v1.0"

    # Handle simulated failure or unexpected error state
    if simulate_failure:
        logger.error("[TOOL] assess_symptom_urgency service simulated failure")
        return {
            "status": "error",
            "triage_level": "UNAVAILABLE",
            "reason": "The health assessment service is temporarily unavailable.",
            "recommended_action": "If symptoms are severe, worsening, or concerning, please consult a qualified healthcare professional or visit a local primary health center immediately.",
            "source": source_info,
            "data_status": "unavailable",
            "data_as_of": timestamp,
        }

    symptoms_text = (symptoms or "").strip().lower()
    duration_text = (duration or "").strip().lower()
    age_text = (age_band or "").strip().lower()
    severity_text = (severity or "").strip().lower()

    if not symptoms_text:
        return {
            "status": "success",
            "triage_level": "ROUTINE",
            "reason": "No specific symptoms reported.",
            "recommended_action": "Share any specific health symptoms or questions for guidance.",
            "source": source_info,
            "data_status": "local",
            "data_as_of": timestamp,
        }

    # 1. EMERGENCY Escalation check
    for red_flag in EMERGENCY_RED_FLAGS:
        if red_flag in symptoms_text or red_flag in severity_text:
            logger.warning(
                f"[TOOL] Emergency red-flag detected: '{red_flag}' in symptoms"
            )
            return {
                "status": "success",
                "triage_level": "EMERGENCY",
                "reason": f"Potential red-flag emergency symptoms reported ('{red_flag}').",
                "recommended_action": "Seek immediate emergency medical attention or visit the nearest hospital emergency department right away.",
                "source": source_info,
                "data_status": "local",
                "data_as_of": timestamp,
            }

    # 2. URGENT Assessment check (vulnerable age band or persistent/severe flags)
    is_vulnerable = any(v in age_text for v in ["60+", "infant", "child", "elderly"])
    has_urgent_flag = any(uf in symptoms_text for uf in URGENT_FLAGS) or (
        "fever" in symptoms_text
        and ("3" in duration_text or "4" in duration_text or "5" in duration_text)
    )
    is_severe = "severe" in severity_text or "high" in symptoms_text

    if has_urgent_flag or (is_vulnerable and ("fever" in symptoms_text or is_severe)):
        reason = "Symptoms require prompt medical evaluation by a doctor."
        if is_vulnerable:
            reason += f" Vulnerable age category ({age_band}) requires extra caution."

        return {
            "status": "success",
            "triage_level": "URGENT",
            "reason": reason,
            "recommended_action": "Visit a doctor, Community Health Center (CHC), or Primary Health Center (PHC) today.",
            "source": source_info,
            "data_status": "local",
            "data_as_of": timestamp,
        }

    # 3. SOON Assessment check
    has_soon_flag = (
        any(sf in symptoms_text for sf in SOON_FLAGS) or "moderate" in severity_text
    )
    if has_soon_flag:
        return {
            "status": "success",
            "triage_level": "SOON",
            "reason": f"Common symptoms reported ({symptoms_text}).",
            "recommended_action": "Rest, maintain good hydration, and consult a doctor or local ASHA worker if symptoms persist past 2-3 days.",
            "source": source_info,
            "data_status": "local",
            "data_as_of": timestamp,
        }

    # 4. ROUTINE Default
    return {
        "status": "success",
        "triage_level": "ROUTINE",
        "reason": "Mild or general health symptoms reported.",
        "recommended_action": "Monitor symptoms, stay hydrated, and consult a healthcare provider if symptoms worsen.",
        "source": source_info,
        "data_status": "local",
        "data_as_of": timestamp,
    }
