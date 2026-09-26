"""Crystal's disease-independent longitudinal journey engine."""

from __future__ import annotations

from copy import deepcopy
import re
from typing import Any, Callable, Mapping

from backend.services.prediction_adapter import normalize_prediction, predict_week


SYMPTOM_WORSENING_DELTA = 3
KIDNEY_DECLINE_DELTA = 10
HIGH_ADVERSE_EVENT_RISK = 0.18
HIGH_DROPOUT_RISK = 0.13


def _as_dict(patient: Any) -> dict:
    if hasattr(patient, "to_dict"):
        return deepcopy(patient.to_dict())
    return deepcopy(dict(patient))


def _kidney_value(baseline: Mapping[str, Any]) -> float:
    value = baseline.get("kidney_function", 78)
    if isinstance(value, Mapping):
        value = value.get("egfr_ml_min_1_73m2", 78)
    return float(value)


def _baseline_sleep(baseline: Mapping[str, Any]) -> float:
    if baseline.get("sleep_quality") is not None:
        return float(baseline["sleep_quality"])
    return 7.0


def _initial_state(patient: Mapping[str, Any], use_current_state: bool) -> dict:
    baseline = patient.get("synthetic_baseline") or patient.get("baseline") or patient
    baseline_symptoms = {
        "fatigue": float(baseline.get("baseline_fatigue", 0)),
        "nausea": float(baseline.get("baseline_nausea", 0)),
        "pain": float(baseline.get("baseline_pain", 0)),
    }
    symptoms = dict(baseline_symptoms)
    if use_current_state:
        for item in patient.get("active_symptoms") or []:
            if isinstance(item, Mapping) and item.get("name"):
                symptoms[str(item["name"]).lower()] = float(item.get("severity", 0))

    kidney = _kidney_value(baseline)
    condition_features = deepcopy(
        baseline.get("condition_features") or baseline.get("condition_specific") or {}
    )
    return {
        "patient_id": patient.get("patient_id"),
        "condition": baseline.get("condition") or patient.get("condition"),
        "treatment": baseline.get("treatment") or patient.get("treatment"),
        "dose": baseline.get("dose") or patient.get("dose"),
        "condition_features": condition_features,
        "baseline_symptoms": baseline_symptoms,
        "symptoms": symptoms,
        "baseline_sleep_quality": _baseline_sleep(baseline),
        "sleep_quality": _baseline_sleep(baseline),
        "baseline_kidney_function": kidney,
        "labs": {"kidney_function": kidney, **deepcopy(baseline.get("labs") or {})},
        "overall_wellbeing": patient.get("overall_wellbeing") if use_current_state else None,
        "mood": None,
        "patient_concern": None,
        "free_text": None,
        "checkin_observed": use_current_state and bool(patient.get("active_symptoms")),
        "lab_change_observed": False,
    }


def _parse_sleep(checkin: Mapping[str, Any]) -> float | None:
    if checkin.get("sleep_quality") is not None:
        return float(checkin["sleep_quality"])
    text = str(checkin.get("free_text") or "")
    match = re.search(r"sleep quality:\s*(\d+(?:\.\d+)?)", text, flags=re.IGNORECASE)
    return float(match.group(1)) if match else None


def _parse_mood(checkin: Mapping[str, Any]) -> str | None:
    if checkin.get("mood"):
        return str(checkin["mood"]).strip().lower()
    text = str(checkin.get("free_text") or "")
    match = re.search(r"mood:\s*([^\n]+)", text, flags=re.IGNORECASE)
    return match.group(1).strip().lower() if match else None


def _concern_from(checkin: Mapping[str, Any], mood: str | None) -> str | None:
    text = str(checkin.get("free_text") or "").lower()
    if mood in {"anxious", "low"}:
        return "anxiety" if mood == "anxious" else "low mood"
    if any(word in text for word in ("anxious", "anxiety", "worried", "worry")):
        return "anxiety"
    return None


def _symptom_items(checkin: Mapping[str, Any]) -> list[dict]:
    symptoms = checkin.get("symptoms") or []
    if isinstance(symptoms, Mapping):
        return [{"name": name, "severity": value} for name, value in symptoms.items()]
    return [dict(item) for item in symptoms if isinstance(item, Mapping)]


def _apply_checkin(state: dict, checkin: Mapping[str, Any]) -> list[dict]:
    changes = []
    for item in _symptom_items(checkin):
        name = str(item.get("name") or "").strip().lower()
        if not name:
            continue
        after = float(item.get("severity", 0))
        before = float(state["symptoms"].get(name, 0))
        state["symptoms"][name] = after
        if after != before:
            changes.append({"field": name, "before": before, "after": after, "source": "patient_reported_simulated"})

    sleep = _parse_sleep(checkin)
    if sleep is not None and sleep != state["sleep_quality"]:
        changes.append(
            {
                "field": "sleep_quality",
                "before": state["sleep_quality"],
                "after": sleep,
                "source": "patient_reported_simulated",
            }
        )
        state["sleep_quality"] = sleep

    mood = _parse_mood(checkin)
    concern = _concern_from(checkin, mood)
    state.update(
        {
            "overall_wellbeing": checkin.get("overall_wellbeing"),
            "mood": mood,
            "patient_concern": concern or state.get("patient_concern"),
            "free_text": checkin.get("free_text"),
            "checkin_observed": True,
        }
    )
    if concern:
        changes.append(
            {"field": "patient_concern", "before": None, "after": concern, "source": "patient_reported_simulated"}
        )
    return changes


def _apply_lab_updates(state: dict, updates: list[Mapping[str, Any]]) -> list[dict]:
    changes = []
    for update in updates:
        name = str(update.get("name") or "").strip()
        if not name:
            continue
        normalized = "kidney_function" if name.lower() in {"egfr", "kidney", "kidney_function"} else name
        before = state["labs"].get(normalized)
        after = float(update["value"])
        state["labs"][normalized] = after
        state["lab_change_observed"] = True
        changes.append(
            {
                "field": normalized,
                "before": before,
                "after": after,
                "unit": update.get("unit"),
                "source": update.get("source", "simulated_for_demo"),
            }
        )
    return changes


def _alert(severity: str, alert_type: str, title: str, explanation: str, week: int, patient_id: str) -> dict:
    return {
        "severity": severity,
        "type": alert_type,
        "title": title,
        "explanation": explanation,
        "week": week,
        "patient_id": patient_id,
        "source": "transparent_demo_rule",
    }


def _alerts_for_week(
    *,
    state: Mapping[str, Any],
    changes: list[dict],
    before_prediction: Mapping[str, Any],
    prediction: Mapping[str, Any],
    week: int,
    patient_id: str,
) -> list[dict]:
    alerts = []
    baseline_symptoms = state["baseline_symptoms"]
    for change in changes:
        field = change["field"]
        before, after = change.get("before"), change.get("after")
        if field == "patient_concern":
            alerts.append(_alert("medium", "patient_concern", "New patient concern", f"Patient reported {after}.", week, patient_id))
        elif field == "kidney_function" and before is not None and (
            float(before) - float(after) >= KIDNEY_DECLINE_DELTA or float(after) < 65
        ):
            alerts.append(
                _alert(
                    "high" if float(after) < 65 else "medium",
                    "lab_change",
                    "Kidney function declined",
                    f"Kidney function changed from {before:g} to {after:g}.",
                    week,
                    patient_id,
                )
            )
        elif field in state["symptoms"]:
            baseline_value = float(baseline_symptoms.get(field, 0))
            delta = float(after) - baseline_value
            if field not in baseline_symptoms and float(after) > 0:
                alerts.append(_alert("medium", "new_symptom", f"New symptom: {field}", f"Patient reported {field} at {after:g}/10.", week, patient_id))
            elif delta >= SYMPTOM_WORSENING_DELTA or float(after) >= 6:
                alerts.append(_alert("medium", "symptom_worsening", f"{field.title()} is worsening", f"{field.title()} changed from {baseline_value:g} to {after:g}.", week, patient_id))

    risks_changed = any(change["field"] in state["symptoms"] or change["field"] in {"sleep_quality", "patient_concern", "kidney_function"} for change in changes)
    if risks_changed and prediction["adverse_event_risk"] >= HIGH_ADVERSE_EVENT_RISK:
        alerts.append(
            _alert(
                "high",
                "rising_adverse_event_risk",
                "Adverse-event risk increased",
                f"Prototype risk changed from {before_prediction['adverse_event_risk']:.0%} to {prediction['adverse_event_risk']:.0%}.",
                week,
                patient_id,
            )
        )
    if risks_changed and prediction["dropout_risk"] >= HIGH_DROPOUT_RISK:
        alerts.append(
            _alert(
                "medium",
                "rising_dropout_risk",
                "Dropout risk increased",
                f"Prototype risk changed from {before_prediction['dropout_risk']:.0%} to {prediction['dropout_risk']:.0%}.",
                week,
                patient_id,
            )
        )
    return alerts


def _changes_from_baseline(state: Mapping[str, Any]) -> list[dict]:
    changes = []
    for name, after in state["symptoms"].items():
        before = float(state["baseline_symptoms"].get(name, 0))
        if float(after) != before:
            changes.append({"field": name, "before": before, "after": after})
    if state["sleep_quality"] != state["baseline_sleep_quality"]:
        changes.append(
            {
                "field": "sleep_quality",
                "before": state["baseline_sleep_quality"],
                "after": state["sleep_quality"],
            }
        )
    kidney = state["labs"]["kidney_function"]
    if kidney != state["baseline_kidney_function"]:
        changes.append(
            {
                "field": "kidney_function",
                "before": state["baseline_kidney_function"],
                "after": kidney,
            }
        )
    return changes


def _main_driver(state: Mapping[str, Any]) -> str:
    kidney_decline = state["baseline_kidney_function"] - state["labs"]["kidney_function"]
    if state.get("lab_change_observed") and (kidney_decline >= KIDNEY_DECLINE_DELTA or state["labs"]["kidney_function"] < 65):
        return "declining kidney function"
    fatigue_delta = state["symptoms"].get("fatigue", 0) - state["baseline_symptoms"].get("fatigue", 0)
    if fatigue_delta >= 2:
        return "worsening fatigue"
    if state["baseline_sleep_quality"] - state["sleep_quality"] >= 3:
        return "sleep disruption"
    if state.get("patient_concern"):
        return f"patient-reported {state['patient_concern']}"
    return "no material change detected"


def simulate_journey(
    patient: Any,
    treatment: Any = None,
    weeks: int = 4,
    *,
    checkins: list[Any] | None = None,
    lab_updates: list[Mapping[str, Any]] | None = None,
    prediction_provider: Callable[[Mapping[str, Any], Any, int], Mapping[str, Any]] | None = None,
) -> dict:
    """Simulate an immutable Week 1-4 journey from patient events."""
    if weeks < 1:
        raise ValueError("weeks must be at least 1")
    patient_dict = _as_dict(patient)
    normalized_checkins = [item.to_dict() if hasattr(item, "to_dict") else deepcopy(dict(item)) for item in (checkins or [])]
    updates = [deepcopy(dict(item)) for item in (lab_updates or [])]
    state = _initial_state(patient_dict, use_current_state=not normalized_checkins)
    patient_id = str(patient_dict.get("patient_id") or "unknown_patient")
    predictor = prediction_provider or predict_week

    checkins_by_week = {int(item.get("week", 1)): item for item in normalized_checkins}
    updates_by_week: dict[int, list[dict]] = {}
    for update in updates:
        updates_by_week.setdefault(int(update.get("week", 1)), []).append(update)

    journey_weeks = []
    all_alerts = []
    for week in range(1, weeks + 1):
        before_prediction = normalize_prediction(predictor(deepcopy(state), treatment, week), week)
        changes = []
        checkin = checkins_by_week.get(week)
        if checkin:
            changes.extend(_apply_checkin(state, checkin))
        week_updates = updates_by_week.get(week, [])
        changes.extend(_apply_lab_updates(state, week_updates))
        prediction = normalize_prediction(predictor(deepcopy(state), treatment, week), week)
        alerts = _alerts_for_week(
            state=state,
            changes=changes,
            before_prediction=before_prediction,
            prediction=prediction,
            week=week,
            patient_id=patient_id,
        )
        all_alerts.extend(alerts)
        journey_weeks.append(
            {
                "week": week,
                "state": {
                    "symptoms": deepcopy(state["symptoms"]),
                    "sleep_quality": state["sleep_quality"],
                    "mood": state["mood"],
                    "patient_concern": state["patient_concern"],
                    "labs": deepcopy(state["labs"]),
                    "condition_features": deepcopy(state["condition_features"]),
                },
                "checkin": deepcopy(checkin),
                "lab_updates": deepcopy(week_updates),
                "changes": changes,
                "prediction_before_updates": before_prediction,
                "prediction": prediction,
                "alerts": alerts,
            }
        )

    unique_alerts = []
    seen = set()
    for alert in all_alerts:
        key = (alert["type"], alert["title"])
        if key not in seen:
            seen.add(key)
            unique_alerts.append(alert)

    peak_fatigue = max(journey_weeks, key=lambda item: item["prediction"]["fatigue_risk"])
    highest_risk = max(
        journey_weeks,
        key=lambda item: max(
            item["prediction"]["adverse_event_risk"],
            item["prediction"]["dropout_risk"],
            item["prediction"]["fatigue_risk"],
        ),
    )
    medium_count = sum(alert["severity"] == "medium" for alert in unique_alerts)
    requires_review = any(alert["severity"] == "high" for alert in unique_alerts) or medium_count >= 2

    return {
        "patient_id": patient_id,
        "condition": state["condition"],
        "treatment": treatment or state["treatment"],
        "weeks": journey_weeks,
        "peak_fatigue_week": peak_fatigue["week"],
        "highest_risk_week": highest_risk["week"],
        "main_risk_driver": _main_driver(state),
        "new_patient_concern": state.get("patient_concern"),
        "requires_review": requires_review,
        "alerts": unique_alerts,
        "changes_from_baseline": _changes_from_baseline(state),
        "data_sources": {
            "patient_baseline": "synthetic",
            "checkins": "patient_reported_simulated",
            "lab_updates": "simulated_for_demo",
            "predictions": "deterministic_prototype_not_clinically_validated",
            "alerts": "transparent_demo_rules",
        },
        "disclaimer": "Prototype simulation for hackathon demonstration only; not medical advice or a treatment recommendation.",
    }
