"""Researcher-facing orchestration and cohort intelligence."""

from __future__ import annotations

from collections import Counter

from backend.data import researcher_store, store
from backend.services.journey_engine import simulate_journey


DEMO_COHORT_SIZE = 124


def get_patient_journey(patient_id: str, weeks: int = 4) -> dict:
    twin = store.get_twin(patient_id)
    if twin is None:
        raise ValueError(f"No twin found for patient_id={patient_id}")
    return simulate_journey(
        twin,
        treatment=(twin.synthetic_baseline or {}).get("treatment"),
        weeks=weeks,
        checkins=store.list_checkins(patient_id),
        lab_updates=researcher_store.list_lab_updates(patient_id),
    )


def get_patient_summary(patient_id: str) -> dict:
    journey = get_patient_journey(patient_id)
    latest = journey["weeks"][-1]
    return {
        "patient_id": patient_id,
        "requires_review": journey["requires_review"],
        "main_risk_driver": journey["main_risk_driver"],
        "new_patient_concern": journey["new_patient_concern"],
        "peak_fatigue_week": journey["peak_fatigue_week"],
        "highest_risk_week": journey["highest_risk_week"],
        "latest_prediction": latest["prediction"],
        "alerts": journey["alerts"],
        "changes_from_baseline": journey["changes_from_baseline"],
        "data_sources": journey["data_sources"],
    }


def list_patients() -> list[dict]:
    patients = []
    for twin in store.list_twins():
        summary = get_patient_summary(twin.patient_id)
        baseline = twin.synthetic_baseline or {}
        patients.append(
            {
                "patient_id": twin.patient_id,
                "display_name": "Patient 024" if twin.patient_id == "pt_demo_patient" else twin.patient_id,
                "condition": baseline.get("condition"),
                "treatment": baseline.get("treatment"),
                "twin_status": twin.status.value,
                "requires_review": summary["requires_review"],
                "main_risk_driver": summary["main_risk_driver"],
                "alert_count": len(summary["alerts"]),
                "source": "synthetic_patient_demo",
            }
        )
    return sorted(patients, key=lambda item: (not item["requires_review"], item["patient_id"]))


def _synthetic_cohort_rows(size: int) -> list[dict]:
    changes = ["fatigue", "sleep disruption", "nausea", "anxiety"]
    rows = []
    for index in range(size):
        rows.append(
            {
                "worsening": index % 7 == 0,
                "requires_review": index % 14 == 0,
                "new_symptom": index % 9 == 0,
                "change": changes[index % len(changes)],
            }
        )
    return rows


def get_cohort_summary() -> dict:
    live_patients = list_patients()
    if len(live_patients) >= 5:
        journeys = [get_patient_journey(item["patient_id"]) for item in live_patients]
        change_counts = Counter(
            change["field"]
            for journey in journeys
            for change in journey["changes_from_baseline"]
        )
        return {
            "active_patients": len(journeys),
            "worsening_symptom_trajectories": sum(bool(journey["changes_from_baseline"]) for journey in journeys),
            "patients_requiring_review": sum(journey["requires_review"] for journey in journeys),
            "new_symptoms_reported": sum(
                alert["type"] == "new_symptom" for journey in journeys for alert in journey["alerts"]
            ),
            "common_changes": [name for name, _ in change_counts.most_common(4)],
            "source": "available_demo_patient_collection",
            "synthetic_patient_count": len(journeys),
        }

    rows = _synthetic_cohort_rows(DEMO_COHORT_SIZE)
    counts = Counter(row["change"] for row in rows)
    return {
        "active_patients": len(rows),
        "worsening_symptom_trajectories": sum(row["worsening"] for row in rows),
        "patients_requiring_review": sum(row["requires_review"] for row in rows),
        "new_symptoms_reported": sum(row["new_symptom"] for row in rows),
        "common_changes": [name for name, _ in counts.most_common()],
        "source": "deterministic_synthetic_cohort_aggregate",
        "synthetic_patient_count": len(rows),
        "live_demo_patients": len(live_patients),
        "disclaimer": "Fabricated aggregate for hackathon demonstration; not real trial data.",
    }
