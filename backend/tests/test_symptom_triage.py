import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from tools.symptom_triage import assess_symptom_urgency_local


def test_routine_symptom_triage():
    """Test 1: Non-red-flag routine scenario returns ROUTINE/SOON."""
    res = assess_symptom_urgency_local(symptoms="mild cold", duration="1 day")
    assert res["status"] == "success"
    assert res["triage_level"] in ["ROUTINE", "SOON"]
    assert "local" in res["data_status"]
    assert "source" in res
    assert "data_as_of" in res


def test_concerning_symptom_triage():
    """Test 2: Concerning symptoms (fever for 4 days) return URGENT or SOON."""
    res = assess_symptom_urgency_local(symptoms="fever and weakness", duration="4 days")
    assert res["status"] == "success"
    assert res["triage_level"] in ["SOON", "URGENT"]


def test_emergency_red_flag_chest_pain():
    """Test 3: Red-flag chest pain triggers EMERGENCY classification immediately."""
    res = assess_symptom_urgency_local(
        symptoms="severe chest pain and shortness of breath"
    )
    assert res["status"] == "success"
    assert res["triage_level"] == "EMERGENCY"
    assert "chest pain" in res["reason"].lower()
    assert (
        "hospital" in res["recommended_action"].lower()
        or "emergency" in res["recommended_action"].lower()
    )


def test_emergency_red_flag_breathing():
    """Test 3b: Difficulty breathing red-flag triggers EMERGENCY."""
    res = assess_symptom_urgency_local(symptoms="difficulty breathing and dizziness")
    assert res["status"] == "success"
    assert res["triage_level"] == "EMERGENCY"


def test_empty_or_invalid_input():
    """Test 4: Empty input handles gracefully without crashing."""
    res = assess_symptom_urgency_local(symptoms="")
    assert res["status"] == "success"
    assert res["triage_level"] == "ROUTINE"


def test_simulated_tool_failure():
    """Test 5: Tool failure returns status=error and UNAVAILABLE triage level."""
    res = assess_symptom_urgency_local(symptoms="fever", simulate_failure=True)
    assert res["status"] == "error"
    assert res["triage_level"] == "UNAVAILABLE"
    assert "temporarily unavailable" in res["reason"].lower()


def test_memory_chaining_vulnerable_age_band():
    """Test 7: Memory chained age_band (60+) escalates fever to URGENT."""
    res = assess_symptom_urgency_local(symptoms="fever", age_band="60+")
    assert res["status"] == "success"
    assert res["triage_level"] == "URGENT"
    assert "60+" in res["reason"]


def test_multilingual_code_mixed_input():
    """Test 8: Handles code-mixed/Hinglish symptom descriptions safely."""
    res = assess_symptom_urgency_local(symptoms="mujhe chest pain ho raha hai")
    assert res["status"] == "success"
    assert res["triage_level"] == "EMERGENCY"
