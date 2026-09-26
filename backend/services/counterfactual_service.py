"""
Treatment response + counterfactual simulation (Betania's portion).

Answers "what happens to this patient's predicted journey if we change one
variable?" by running the same response heuristic on the original twin and
on a deep-copied, modified copy, then diffing the two Week 0-N trajectories.

Everything here is read-only with respect to the store: the twin is read
once, deep-copied, and never saved. The counterfactual patient only ever
exists inside simulate_counterfactual().

Data provenance:
  - Original risk_score -> the existing mock_predicted_trajectory() values
    (same numbers the Journey timeline shows), so the page never shows two
    different "original" risks.
  - Everything else, and the modified-minus-original risk effect, comes from
    a small deterministic heuristic below, labeled "mock_heuristic". It is
    NOT a clinical model and is not validated in any way.

V1 supports a single change variable: dose_pct.
"""

from __future__ import annotations

import copy

from backend.data import store
from backend.data.mock_predictions import mock_predicted_trajectory
from backend.services.checkin_service import (
    ATTENTION_SEVERITY,
    ATTENTION_WELLBEING,
    WATCH_SEVERITY,
    WATCH_WELLBEING,
)

DISCLAIMER = "Simulated what-if for demo purposes. Not clinical guidance."

# ---------- heuristic constants (all mock, tuned only to be legible) ----------

# How strongly each treatment arm drives side effects / response.
CHEMO_TOXICITY = 1.0
HORMONE_TOXICITY = 0.45
CHEMO_RESPONSE = 0.70
HORMONE_RESPONSE = 0.60

# Max symptom rise (0-10 points) by the end of the ramp, at 100% exposure.
SYMPTOM_RISE = {"fatigue": 3.0, "nausea": 2.5, "pain": 1.5}
RAMP_WEEKS = 3                 # side effects build up over the first 3 weeks
WELLBEING_PER_SYMPTOM = 0.45   # wellbeing points lost per symptom point gained
RISK_PER_SYMPTOM = 0.03        # risk change per point of total symptom burden
RESPONSE_FLOOR = 0.2           # fraction of response proxy present at "Today"
LOW_EGFR = 60                  # below this, reduced clearance raises exposure

# One entry per supported change: (label, unit, default, min, max)
CHANGE_VARIABLES = {
    "dose_pct": ("Treatment dose", "%", 100, 50, 150),
}


# ---------- prediction ----------

def _is_chemo(state: dict) -> bool:
    return "chemo" in (state["synthetic_baseline"].get("treatment") or "").lower()


def _exposure(state: dict, treatment: dict) -> float:
    """Relative drug exposure: dose scaled up slightly for reduced kidney function."""
    egfr = state["synthetic_baseline"].get("kidney_function", {}).get("egfr_ml_min_1_73m2") or LOW_EGFR
    renal = 1 + max(0.0, LOW_EGFR - egfr) / 100
    return treatment["dose_pct"] / 100 * renal


def _today(state: dict) -> dict:
    """Current patient-reported state: latest check-in if any, else synthetic baseline."""
    base = state["synthetic_baseline"]
    reported = {s["name"].lower(): s["severity"] for s in state.get("active_symptoms") or []}

    def latest(name: str) -> float:
        # Structured check-in fields (twin.fatigue etc.) win; they keep reported zeros
        # that the symptoms list drops. Then the symptoms list, then the baseline.
        if state.get(name) is not None:
            return state[name]
        return reported.get(name, base[f"baseline_{name}"])

    today = {name: latest(name) for name in ("fatigue", "nausea", "pain")}
    wellbeing = state.get("overall_wellbeing")
    if wellbeing is None:
        wellbeing = 8 - sum(today.values()) / 3
    today["wellbeing"] = wellbeing
    return today


def _status(symptoms: dict, wellbeing: float) -> str:
    # Same thresholds as checkin_service._derive_status, applied to projected values.
    worst = max(symptoms.values())
    if worst >= ATTENTION_SEVERITY or wellbeing <= ATTENTION_WELLBEING:
        return "needs_attention"
    if worst >= WATCH_SEVERITY or wellbeing <= WATCH_WELLBEING:
        return "watch"
    return "stable"


def _clamp(value: float, low: float = 0.0, high: float = 10.0) -> float:
    return max(low, min(high, value))


def predict_response(state: dict, treatment: dict, weeks: int = 4) -> list[dict]:
    """
    Pure function: projects Week 0 (Today) through Week `weeks` for one
    patient state + treatment. risk_score here is the heuristic's own symptom
    burden term; simulate_counterfactual() anchors it to the mock trajectory.
    """
    toxicity = CHEMO_TOXICITY if _is_chemo(state) else HORMONE_TOXICITY
    response_max = CHEMO_RESPONSE if _is_chemo(state) else HORMONE_RESPONSE
    exposure = _exposure(state, treatment)
    today = _today(state)

    trajectory = []
    for week in range(weeks + 1):
        ramp = min(1.0, week / RAMP_WEEKS)
        symptoms = {
            name: round(_clamp(today[name] + rise * toxicity * exposure * ramp), 1)
            for name, rise in SYMPTOM_RISE.items()
        }
        added = sum(symptoms[name] - today[name] for name in SYMPTOM_RISE)
        wellbeing = round(_clamp(today["wellbeing"] - WELLBEING_PER_SYMPTOM * added), 1)
        progress = RESPONSE_FLOOR + (1 - RESPONSE_FLOOR) * (week / weeks) * exposure ** 0.5
        trajectory.append(
            {
                "week": week,
                "label": "Today" if week == 0 else f"Week {week}",
                "symptom_burden": added,
                "response_score": round(_clamp(response_max * progress, 0, 1), 2),
                **symptoms,
                "wellbeing": wellbeing,
                "status": _status(symptoms, wellbeing),
            }
        )
    return trajectory


# ---------- counterfactual ----------

def _apply_change(state: dict, treatment: dict, variable: str, value: float) -> None:
    """Applies exactly one change to the (already copied) state/treatment."""
    if variable not in CHANGE_VARIABLES:
        raise ValueError(f"Unsupported change variable: {variable}")
    _, _, _, low, high = CHANGE_VARIABLES[variable]
    if not (low <= value <= high):
        raise ValueError(f"{variable} must be between {low} and {high}")
    if variable == "dose_pct":
        treatment["dose_pct"] = value


def simulate_counterfactual(patient_id: str, change: dict, weeks: int = 4) -> dict:
    twin = store.get_twin(patient_id)
    if twin is None:
        raise LookupError(f"No twin found for patient_id={patient_id}")

    # to_dict() returns synthetic_baseline by reference, so deep-copy before use.
    original_state = copy.deepcopy(twin.to_dict())
    original_treatment = {"dose_pct": CHANGE_VARIABLES["dose_pct"][2]}
    modified_state = copy.deepcopy(original_state)
    modified_treatment = copy.deepcopy(original_treatment)
    _apply_change(modified_state, modified_treatment, change["variable"], change["value"])

    original = predict_response(original_state, original_treatment, weeks)
    modified = predict_response(modified_state, modified_treatment, weeks)

    # Anchor risk to the existing mock trajectory; Today uses Week 1's value.
    # Same inputs as the Journey (timeline_service) so both show the same original risk.
    observed_states = {c.week: c.to_dict() for c in store.list_checkins(patient_id)}
    mock = {p["week"]: round(p["mock_risk_score"], 2) for p in mock_predicted_trajectory(
        patient_id, weeks, baseline=twin.synthetic_baseline, observed_states=observed_states
    )}
    for orig, mod in zip(original, modified):
        base_risk = mock.get(orig["week"], mock[1])
        effect = RISK_PER_SYMPTOM * (mod["symptom_burden"] - orig["symptom_burden"])
        orig["risk_score"] = base_risk
        mod["risk_score"] = round(_clamp(base_risk + effect, 0, 1), 2)
        del orig["symptom_burden"], mod["symptom_burden"]

    metrics = ["risk_score", "response_score", "fatigue", "nausea", "pain", "wellbeing"]
    deltas = [
        {"week": o["week"], **{m: round(d[m] - o[m], 2) for m in metrics}}
        for o, d in zip(original, modified)
    ]
    label, unit, default, _, _ = CHANGE_VARIABLES[change["variable"]]

    return {
        "patient_id": patient_id,
        "change": {"variable": change["variable"], "label": label, "unit": unit, "from": default, "to": change["value"]},
        "original": {"treatment": original_treatment, "trajectory": original},
        "modified": {"treatment": modified_treatment, "trajectory": modified},
        "deltas": deltas,
        "summary": {
            "week": weeks,
            "original": {m: original[-1][m] for m in metrics},
            "modified": {m: modified[-1][m] for m in metrics},
            "delta": {m: deltas[-1][m] for m in metrics},
        },
        "data_sources": {
            "patient_baseline": "synthetic",
            "original_risk": "mock",
            "counterfactual_effect": "mock_heuristic",
            "response_and_symptoms": "mock_heuristic",
        },
        "disclaimer": DISCLAIMER,
    }
