"""Deterministic synthetic-story-driven mock risk outputs; not a clinical model."""

from __future__ import annotations

from backend.data.synthetic_longitudinal_data import synthetic_weekly_states
from backend.data.synthetic_patient_profiles import generate_synthetic_baseline


def _clamp(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 2)


def _baseline(patient: dict | object) -> dict:
    return (patient.get("synthetic_baseline") if isinstance(patient, dict) else getattr(patient, "synthetic_baseline", None)) or {}


def _patient_id(patient: dict | object) -> str:
    return str(patient.get("patient_id", patient.get("id", "demo-patient")) if isinstance(patient, dict) else getattr(patient, "patient_id", "demo-patient"))


def predict_week(patient: dict | object, treatment: str | None, week: int, *, state: dict | None = None, prior_state: dict | None = None) -> dict:
    """Compute illustrative risks from the synthetic state or supplied observed state.

    The optional state/prior_state boundary permits future integration while the
    fallback uses predefined demo data. Values are neither validated nor advice.
    """
    patient_id = _patient_id(patient)
    baseline = {**generate_synthetic_baseline(patient_id), **_baseline(patient)}
    week = max(1, min(4, int(week)))
    story = synthetic_weekly_states(patient_id, baseline)
    state = state or story[week]
    prior_state = prior_state or story[week - 1]
    chemo = "chemotherapy" in (treatment or baseline.get("treatment", "")).lower()
    fatigue = float(state.get("fatigue", baseline.get("baseline_fatigue", 2)))
    nausea = float(state.get("nausea", baseline.get("baseline_nausea", 1)))
    pain = float(state.get("pain", baseline.get("baseline_pain", 2)))
    sleep = float(state.get("sleep_quality", 7))
    wellbeing = float(state.get("overall_wellbeing", 7))
    adherence = float(state.get("medication_adherence", 10))
    anxiety = float(state.get("anxiety", 2))
    prior_fatigue = float(prior_state.get("fatigue", fatigue))
    labs = state.get("labs") or baseline.get("labs") or {}
    baseline_labs = baseline.get("labs") or {}
    hemoglobin_change = max(0.0, float(baseline_labs.get("hemoglobin_g_dl", 12.8)) - float(labs.get("hemoglobin_g_dl", 12.8)))
    wbc_change = max(0.0, float(baseline_labs.get("wbc_10e9_l", 6.3)) - float(labs.get("wbc_10e9_l", 6.3)))
    concern = bool(state.get("new_symptoms") and any(s.lower() in {"fever", "shortness of breath"} for s in state["new_symptoms"]))
    archetype = baseline.get("archetype", "")
    archetype_adjustment = 0.04 if archetype == "variable_adherence" else 0
    fatigue_risk = _clamp(0.12 + fatigue * 0.083 + max(0, fatigue - prior_fatigue) * 0.025 + hemoglobin_change * 0.06 + (0.04 if chemo else 0))
    nausea_risk = _clamp(0.06 + nausea * 0.105 + (0.08 if chemo else 0))
    pain_risk = _clamp(0.08 + pain * 0.09)
    sleep_risk = _clamp(0.07 + (10 - sleep) * 0.075 + anxiety * 0.018)
    adverse = _clamp(0.09 + max(fatigue, nausea, pain) * 0.027 + wbc_change * 0.035 + (0.5 if concern else 0))
    dropout = _clamp(0.05 + (10 - adherence) * 0.095 + (10 - wellbeing) * 0.026 + anxiety * 0.012 + archetype_adjustment)
    return {
        "week": week, "fatigue": fatigue_risk, "nausea": nausea_risk,
        "adverse_event": adverse, "dropout_risk": dropout, "pain": pain_risk,
        "sleep_disruption": sleep_risk,
        "condition_specific_risks": {
            "neuropathy": _clamp(0.07 + pain * 0.025 + (0.08 if chemo else 0)),
            "treatment_related_fatigue": fatigue_risk,
            "nausea": nausea_risk, "pain": pain_risk, "sleep_disruption": sleep_risk,
        },
        "uncertainty": 0.12 if state.get("source") == "synthetic" else 0.16,
        "source": "mock", "disclaimer": "Illustrative demo heuristic, not a clinical prediction.",
    }


def mock_predicted_trajectory(patient_id: str, weeks: int = 4, *, baseline: dict | None = None, observed_states: dict[int, dict] | None = None) -> list[dict]:
    """Stable mock trajectory; observed states can override demo weeks explicitly."""
    baseline = baseline or generate_synthetic_baseline(patient_id)
    story = synthetic_weekly_states(patient_id, baseline)
    observed_states = observed_states or {}
    trajectory = []
    for week in range(1, min(4, weeks) + 1):
        state = {**story[week], **{k: v for k, v in observed_states.get(week, {}).items() if v is not None}}
        prior = {**story[week - 1], **{k: v for k, v in observed_states.get(week - 1, {}).items() if v is not None}}
        prediction = predict_week({"patient_id": patient_id, "synthetic_baseline": baseline}, baseline["treatment"], week, state=state, prior_state=prior)
        score = _clamp(0.35 * prediction["adverse_event"] + 0.25 * prediction["fatigue"] + 0.15 * prediction["nausea"] + 0.25 * prediction["dropout_risk"])
        trajectory.append({"week": week, "mock_risk_score": score, "source": "mock", "prediction": prediction})
    return trajectory
