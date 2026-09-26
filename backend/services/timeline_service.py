"""
Week 1-4 patient journey timeline.

Combines four kinds of data, each labeled by source so the UI/API never
blur them together:

  - "real"      -> trial name/sponsor/purpose etc., from trial_docs.REAL_TRIAL
                   (sourced from the public TAILORx ClinicalTrials.gov record)
  - "simulated_for_demo" -> the Week 1-4 visit schedule itself, since the
                   public trial record has no such granular detail
  - "patient_reported (simulated)" -> check-ins actually submitted through
                   this demo's UI; real code path, but no real trial
                   participants are behind them yet
  - "mock"      -> the predicted risk trajectory, standing in for Indu's
                   prediction model, which is not implemented here
"""

from __future__ import annotations

from backend.data import store
from backend.data.mock_predictions import mock_predicted_trajectory
from backend.data.synthetic_longitudinal_data import synthetic_weekly_states
from backend.data.trial_docs import REAL_TRIAL, get_visit


def get_patient_journey(patient_id: str, weeks: int = 4) -> dict:
    twin = store.get_twin(patient_id)
    if twin is None:
        raise ValueError(f"No twin found for patient_id={patient_id}")

    weeks = max(1, min(4, weeks))
    checkins_by_week = {c.week: c for c in store.list_checkins(patient_id)}
    demo_states = synthetic_weekly_states(patient_id, twin.synthetic_baseline)
    observed_states = {week: checkin.to_dict() for week, checkin in checkins_by_week.items()}
    predictions_by_week = {p["week"]: p for p in mock_predicted_trajectory(
        patient_id, weeks, baseline=twin.synthetic_baseline, observed_states=observed_states
    )}

    timeline = []
    for week in range(1, weeks + 1):
        checkin = checkins_by_week.get(week)
        visit = get_visit(week)  # tagged "source": "simulated_for_demo"
        prediction = predictions_by_week.get(week)  # tagged "source": "mock"

        timeline.append(
            {
                "week": week,
                "visit": visit,
                "checkin": checkin.to_dict() if checkin else None,
                "synthetic_state": demo_states[week],
                "prediction": prediction,
            }
        )

    return {
        "patient_id": patient_id,
        "trial_id": twin.trial_id,
        "current_week": twin.current_week,
        "status": twin.status.value,
        # Real trial grounding — see trial_docs.REAL_TRIAL for the full record.
        "trial": {
            "nct_id": REAL_TRIAL["nct_id"],
            "short_name": REAL_TRIAL["short_name"],
            "official_title": REAL_TRIAL["official_title"],
            "sponsor": REAL_TRIAL["sponsor"],
            "purpose": REAL_TRIAL["purpose"],
            "follow_up": REAL_TRIAL["follow_up"],
            "source_url": REAL_TRIAL["source"]["url"],
        },
        "weeks": timeline,
        "synthetic_baseline_state": demo_states[0],
        # Explicit provenance so the UI can label every section correctly.
        "data_sources": {
            "trial_info": "real (TAILORx, NCT00310180, ClinicalTrials.gov)",
            "visit_schedule": "simulated_for_demo",
            "patient_baseline": "synthetic",
            "weekly_states": "synthetic_predefined_demo_not_submitted_checkins",
            "labs": "synthetic",
            "checkins": "patient_reported_simulated",
            "predictions": "mock",
        },
    }
