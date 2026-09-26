"""
Digital twin lifecycle: create_patient_twin() and update_patient_twin().

update_patient_twin() is the generic state-update entrypoint; the
check-in-specific update logic lives in checkin_service.apply_checkin_to_twin(),
which calls into this module rather than duplicating twin-mutation logic.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from backend.data import store
from backend.data.synthetic_patient_profiles import DEFAULT_CONDITION, generate_synthetic_baseline
from backend.models.patient_twin import PatientTwin, TwinStatus, new_patient_id


def create_patient_twin(
    trial_id: str,
    patient_id: Optional[str] = None,
    condition: str = DEFAULT_CONDITION,
) -> PatientTwin:
    """
    Creates a new digital twin for a patient entering the trial.
    Idempotent by patient_id: re-calling with an existing patient_id
    returns the existing twin rather than clobbering it.

    Attaches a synthetic baseline profile (age, treatment, labs, etc.) —
    fabricated for the demo, never real patient data. See
    backend/data/synthetic_patient_profiles.py.
    """
    if patient_id:
        existing = store.get_twin(patient_id)
        if existing:
            return existing
    else:
        patient_id = new_patient_id()

    twin = PatientTwin(patient_id=patient_id, trial_id=trial_id)
    twin.synthetic_baseline = generate_synthetic_baseline(patient_id, condition=condition)
    twin.history.append(
        {
            "week": 1,
            "status": twin.status.value,
            "summary": "Twin created at trial enrollment.",
            "at": twin.created_at,
        }
    )
    store.save_twin(twin)
    return twin


def update_patient_twin(
    patient_id: str,
    *,
    current_week: Optional[int] = None,
    status: Optional[TwinStatus] = None,
    overall_wellbeing: Optional[int] = None,
    sleep_quality: Optional[int] = None,
    mood: Optional[str] = None,
    anxiety: Optional[int] = None,
    fatigue: Optional[int] = None,
    nausea: Optional[int] = None,
    pain: Optional[int] = None,
    new_symptoms: Optional[list[str]] = None,
    active_symptoms: Optional[list] = None,
    history_note: Optional[str] = None,
) -> PatientTwin:
    """
    Generic patient twin update. Only provided fields are changed.
    Appends a history entry when history_note is given, so the timeline
    has a trace of what changed and why.
    """
    twin = store.get_twin(patient_id)
    if twin is None:
        raise ValueError(f"No twin found for patient_id={patient_id}")

    if current_week is not None:
        twin.current_week = current_week
    if status is not None:
        twin.status = status
    if overall_wellbeing is not None:
        twin.overall_wellbeing = overall_wellbeing
    for name, value in (
        ("sleep_quality", sleep_quality), ("mood", mood), ("anxiety", anxiety),
        ("fatigue", fatigue), ("nausea", nausea), ("pain", pain),
        ("new_symptoms", new_symptoms),
    ):
        if value is not None:
            setattr(twin, name, value)
    if active_symptoms is not None:
        twin.active_symptoms = active_symptoms

    twin.updated_at = datetime.now(timezone.utc).isoformat()

    if history_note:
        twin.history.append(
            {
                "week": twin.current_week,
                "status": twin.status.value,
                "summary": history_note,
                "at": twin.updated_at,
            }
        )

    store.save_twin(twin)
    return twin


def advance_patient_week(patient_id: str) -> PatientTwin:
    """Move the demo clock forward without creating or changing a patient report."""
    twin = store.get_twin(patient_id)
    if twin is None:
        raise ValueError(f"No twin found for patient_id={patient_id}")
    if twin.current_week >= 4:
        raise ValueError("The four-week demo is complete")
    if not any(checkin.week == twin.current_week for checkin in store.list_checkins(patient_id)):
        raise ValueError(f"Submit the Week {twin.current_week} check-in before continuing")
    return update_patient_twin(
        patient_id,
        current_week=twin.current_week + 1,
        history_note=f"Demo progressed to Week {twin.current_week + 1}; no check-in created.",
    )
