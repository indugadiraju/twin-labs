"""
Week 1-4 patient journey timeline.

Combines each week's real check-in history (from the twin) with mock
prediction output (standing in for Indu's model, which is not
implemented here) so the demo can show a "journey" view without
depending on the real prediction/counterfactual systems.
"""

from __future__ import annotations

from backend.data import store
from backend.data.mock_predictions import mock_predicted_trajectory
from backend.data.mock_trial_docs import get_visit


def get_patient_journey(patient_id: str, weeks: int = 4) -> dict:
    twin = store.get_twin(patient_id)
    if twin is None:
        raise ValueError(f"No twin found for patient_id={patient_id}")

    checkins_by_week = {c.week: c for c in store.list_checkins(patient_id)}
    predictions_by_week = {p["week"]: p for p in mock_predicted_trajectory(patient_id, weeks)}

    timeline = []
    for week in range(1, weeks + 1):
        checkin = checkins_by_week.get(week)
        visit = get_visit(week)
        prediction = predictions_by_week.get(week)

        timeline.append(
            {
                "week": week,
                "visit": visit,
                "checkin": checkin.to_dict() if checkin else None,
                "prediction": prediction,  # explicitly mock, see mock_predictions.py
            }
        )

    return {
        "patient_id": patient_id,
        "trial_id": twin.trial_id,
        "current_week": twin.current_week,
        "status": twin.status.value,
        "weeks": timeline,
    }
