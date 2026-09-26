"""Replaceable boundary around Indu's future prediction service.

The adapter normalizes schema aliases and provides transparent deterministic
prototype predictions while the team's forecasting service is unavailable.
The calculations are demonstration heuristics, not clinically validated.
"""

from __future__ import annotations

from typing import Any, Mapping


PREDICTION_SOURCE = "deterministic_prototype_not_clinically_validated"


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _probability(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number > 1:
        number /= 100
    return round(_clamp(number), 3)


def _first(raw: Mapping[str, Any], names: tuple[str, ...], default: Any) -> Any:
    return next((raw[name] for name in names if raw.get(name) is not None), default)


def normalize_prediction(raw: Mapping[str, Any] | None, week: int | None = None) -> dict:
    """Return the shared schema while accepting teammate/mock aliases."""
    raw = raw or {}
    fallback = raw.get("mock_risk_score", 0.0)
    return {
        "week": int(_first(raw, ("week",), week or 1)),
        "fatigue_risk": _probability(_first(raw, ("fatigue_risk", "fatigue"), fallback)),
        "nausea_risk": _probability(_first(raw, ("nausea_risk", "nausea"), fallback)),
        "adverse_event_risk": _probability(
            _first(raw, ("adverse_event_risk", "adverse_event", "safety_risk"), fallback)
        ),
        "dropout_risk": _probability(_first(raw, ("dropout_risk", "dropout"), fallback)),
        "response_score": _probability(_first(raw, ("response_score", "response"), 0.6)),
        "uncertainty": _probability(_first(raw, ("uncertainty",), 0.1)),
        "condition_specific_risks": dict(raw.get("condition_specific_risks") or {}),
        "source": raw.get("source", "normalized_external_or_mock_prediction"),
    }


def _symptom_map(state: Mapping[str, Any]) -> dict[str, float]:
    symptoms = state.get("symptoms") or {}
    if isinstance(symptoms, Mapping):
        return {str(name).lower(): float(value) for name, value in symptoms.items()}
    return {
        str(item.get("name", "")).lower(): float(item.get("severity", 0))
        for item in symptoms
        if isinstance(item, Mapping) and item.get("name")
    }


def predict_week(patient: Mapping[str, Any], treatment: Any = None, week: int = 1) -> dict:
    """Generate a deterministic, explainable prototype forecast."""
    symptoms = _symptom_map(patient)
    baseline_symptoms = patient.get("baseline_symptoms") or {}
    fatigue = symptoms.get("fatigue", float(baseline_symptoms.get("fatigue", 0)))
    nausea = symptoms.get("nausea", float(baseline_symptoms.get("nausea", 0)))
    pain = symptoms.get("pain", float(baseline_symptoms.get("pain", 0)))
    sleep_quality = float(patient.get("sleep_quality", 7))
    mood = str(patient.get("mood") or "").lower()
    concern = str(patient.get("patient_concern") or "").lower()
    anxiety = max(symptoms.get("anxiety", 0), 5 if "anx" in mood or "anx" in concern else 0)

    baseline_fatigue = float(baseline_symptoms.get("fatigue", fatigue))
    baseline_kidney = float(patient.get("baseline_kidney_function", 78))
    kidney = float((patient.get("labs") or {}).get("kidney_function", baseline_kidney))
    poor_sleep = max(0.0, 7 - sleep_quality)
    week_drift = max(0, week - 1) * 0.01

    fatigue_risk = (
        0.62
        + baseline_fatigue * 0.025
        + max(0.0, fatigue - baseline_fatigue) * 0.025
        + poor_sleep * 0.01
        + (0.02 if anxiety >= 3 else 0)
        + week_drift
    )
    nausea_risk = 0.34 + nausea * 0.025 + max(0.0, pain - 3) * 0.005 + week_drift
    kidney_decline = max(0.0, baseline_kidney - kidney)
    # The low-value term makes a newly observed eGFR of 61 clinically salient
    # in the demo even when a synthetic baseline happened to start near 65.
    kidney_signal = max(kidney_decline * 0.0053, max(0.0, 65 - kidney) * 0.0225)
    adverse_event_risk = 0.12 + kidney_signal + max(0.0, pain - 6) * 0.01
    dropout_risk = 0.05 + fatigue * 0.007 + poor_sleep * 0.008 + (0.02 if anxiety >= 3 else 0)
    response_score = 0.67 - fatigue * 0.008 - nausea * 0.006 - kidney_decline * 0.001
    uncertainty = 0.08 + (0.015 if not patient.get("checkin_observed") else 0) + week_drift / 2

    condition_risks = dict(patient.get("condition_specific_risks") or {})
    if "neuropathy" in symptoms:
        condition_risks["neuropathy"] = round(_clamp(0.1 + symptoms["neuropathy"] * 0.04), 3)

    return normalize_prediction(
        {
            "week": week,
            "fatigue_risk": fatigue_risk,
            "nausea_risk": nausea_risk,
            "adverse_event_risk": adverse_event_risk,
            "dropout_risk": dropout_risk,
            "response_score": response_score,
            "uncertainty": uncertainty,
            "condition_specific_risks": condition_risks,
            "source": PREDICTION_SOURCE,
        },
        week=week,
    )
