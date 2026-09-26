"""
Demo prediction outputs.

This module intentionally provides a deterministic, clearly-labeled risk
model for the TwinLab demo. It is not a clinical model; it is a simple
heuristic used to populate the Week 1-4 timeline and patient twin views.
"""

from __future__ import annotations

import random


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _patient_baseline(patient: dict | object) -> dict:
    if isinstance(patient, dict):
        return patient.get("synthetic_baseline") or {}
    if hasattr(patient, "synthetic_baseline"):
        return patient.synthetic_baseline or {}
    return {}


def _patient_id(patient: dict | object) -> str:
    if isinstance(patient, dict):
        patient_id = patient.get("patient_id") or patient.get("id") or "demo-patient"
    elif hasattr(patient, "patient_id"):
        patient_id = patient.patient_id
    else:
        patient_id = "demo-patient"
    return str(patient_id)


def _treatment_profile(treatment: str | None) -> dict:
    normalized = (treatment or "").lower()

    if "chemotherapy" in normalized or "docetaxel" in normalized or "cyclophosphamide" in normalized:
        return {
            "fatigue": 0.68,
            "nausea": 0.62,
            "adverse_event": 0.58,
            "dropout_risk": 0.32,
            "pain": 0.44,
            "sleep_disruption": 0.56,
            "neuropathy": 0.46,
            "treatment_related_fatigue": 0.62,
        }
    if "anastrozole" in normalized or "aromatase" in normalized:
        return {
            "fatigue": 0.48,
            "nausea": 0.22,
            "adverse_event": 0.24,
            "dropout_risk": 0.18,
            "pain": 0.28,
            "sleep_disruption": 0.35,
            "neuropathy": 0.12,
            "treatment_related_fatigue": 0.42,
        }
    if "tamoxifen" in normalized:
        return {
            "fatigue": 0.38,
            "nausea": 0.18,
            "adverse_event": 0.17,
            "dropout_risk": 0.14,
            "pain": 0.22,
            "sleep_disruption": 0.24,
            "neuropathy": 0.08,
            "treatment_related_fatigue": 0.26,
        }
    return {
        "fatigue": 0.34,
        "nausea": 0.2,
        "adverse_event": 0.19,
        "dropout_risk": 0.15,
        "pain": 0.25,
        "sleep_disruption": 0.24,
        "neuropathy": 0.1,
        "treatment_related_fatigue": 0.21,
    }


def predict_week(patient: dict | object, treatment: str | None, week: int) -> dict:
    """
    Returns a deterministic demo risk prediction for a single week.

    Expected output shape matches the TwinLab prediction tasks:
      - fatigue, nausea, adverse_event, dropout_risk, pain,
        sleep_disruption, condition_specific_risks, uncertainty
    """
    patient_id = _patient_id(patient)
    baseline = _patient_baseline(patient)

    week = max(1, min(4, int(week)))
    treatment_profile = _treatment_profile(treatment)

    baseline_fatigue = float(baseline.get("baseline_fatigue", 2)) / 10.0
    baseline_nausea = float(baseline.get("baseline_nausea", 1)) / 10.0
    baseline_pain = float(baseline.get("baseline_pain", 1)) / 10.0
    sleep_hours = float(baseline.get("sleep_hours_per_night", 7.0))

    week_gain = 0.08 * (week - 1)
    sleep_penalty = max(0.0, (7.0 - sleep_hours) / 10.0) * 0.35
    condition_risk = 0.12 if "breast" in (str(patient.get("condition") or "").lower()) else 0.08

    fatigue = _clamp(
        treatment_profile["fatigue"]
        + baseline_fatigue * 0.7
        + week_gain
        + 0.08 * (1 if "chemotherapy" in (treatment or "").lower() else 0)
    )
    nausea = _clamp(
        treatment_profile["nausea"]
        + baseline_nausea * 0.7
        + week_gain * 0.8
        + 0.06 * (1 if "chemotherapy" in (treatment or "").lower() else 0)
    )
    adverse_event = _clamp(
        treatment_profile["adverse_event"]
        + condition_risk
        + week_gain * 0.45
    )
    dropout_risk = _clamp(
        treatment_profile["dropout_risk"]
        + (0.06 if week >= 3 else 0.03)
        + (0.04 if fatigue > 0.65 else 0.0)
    )
    pain = _clamp(
        treatment_profile["pain"]
        + baseline_pain * 0.8
        + week_gain * 0.55
    )
    sleep_disruption = _clamp(
        treatment_profile["sleep_disruption"]
        + sleep_penalty
        + week_gain * 0.6
    )

    condition_specific_risks = {
        "neuropathy": _clamp(
            treatment_profile["neuropathy"]
            + (0.08 if week >= 3 else 0.04)
            + (0.04 if "chemotherapy" in (treatment or "").lower() else 0.0)
        ),
        "treatment_related_fatigue": _clamp(treatment_profile["treatment_related_fatigue"] + week_gain * 0.5),
        "nausea": _clamp(nausea * 0.9),
        "pain": _clamp(pain * 0.9),
        "sleep_disruption": _clamp(sleep_disruption * 0.9),
    }

    rng = random.Random(f"risk:{patient_id}:{treatment}:{week}")
    uncertainty = round(_clamp(rng.uniform(0.04, 0.16) + (0.02 * (week - 1))), 3)

    return {
        "week": week,
        "fatigue": round(fatigue, 2),
        "nausea": round(nausea, 2),
        "adverse_event": round(adverse_event, 2),
        "dropout_risk": round(dropout_risk, 2),
        "pain": round(pain, 2),
        "sleep_disruption": round(sleep_disruption, 2),
        "condition_specific_risks": {key: round(value, 2) for key, value in condition_specific_risks.items()},
        "uncertainty": uncertainty,
    }


def mock_predicted_trajectory(patient_id: str, weeks: int = 4) -> list[dict]:
    """
    Returns a deterministic-per-patient, clearly-mocked risk trend for
    weeks 1..weeks. Deterministic (seeded by patient_id) so the same
    patient sees a stable trajectory across calls in a demo session.
    """
    trajectory = []
    fake_patient = {
        "patient_id": patient_id,
        "synthetic_baseline": {
            "baseline_fatigue": 3,
            "baseline_nausea": 1,
            "baseline_pain": 2,
            "sleep_hours_per_night": 6.5,
        },
        "condition": "Hormone-receptor-positive, HER2-negative breast cancer (node-negative)",
    }

    for week in range(1, weeks + 1):
        prediction = predict_week(fake_patient, "Chemotherapy (TC regimen) followed by hormone therapy", week)
        overall = round(
            (prediction["fatigue"] + prediction["nausea"] + prediction["pain"] + prediction["sleep_disruption"] + prediction["dropout_risk"]) / 5,
            2,
        )
        trajectory.append(
            {
                "week": week,
                "mock_risk_score": overall,
                "source": "mock",  # explicit: not Indu's real model
                "prediction": prediction,
            }
        )
    return trajectory
