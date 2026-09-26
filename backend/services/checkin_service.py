"""
Weekly patient check-in: submit_patient_checkin() and apply_checkin_to_twin().

submit_patient_checkin() records the raw patient input. apply_checkin_to_twin()
derives a simple twin status update from it and writes that through
twin_service.update_patient_twin(). The derivation logic here is a small,
transparent heuristic for the demo — not a stand-in for Indu's prediction
model (that stays entirely separate, in mock_predictions.py, and is only
used by the timeline service).
"""

from __future__ import annotations

from backend.data import store
from backend.models.checkin import PatientCheckIn, SymptomEntry, new_checkin_id
from backend.models.patient_twin import TwinStatus
from backend.services import twin_service

# Any single symptom at/above this severity, or wellbeing at/below the
# wellbeing threshold, flags the twin for attention.
ATTENTION_SEVERITY = 7
ATTENTION_WELLBEING = 3

WATCH_SEVERITY = 4
WATCH_WELLBEING = 6


def submit_patient_checkin(
    patient_id: str,
    week: int,
    overall_wellbeing: int,
    symptoms: list[dict] | None = None,
    free_text: str | None = None,
) -> PatientCheckIn:
    """
    Records a patient's weekly check-in. Does not itself touch the twin —
    see apply_checkin_to_twin() for that step, kept separate so the raw
    check-in is always preserved even if twin-derivation logic changes.
    """
    if store.get_twin(patient_id) is None:
        raise ValueError(f"No twin found for patient_id={patient_id}; create the twin first")

    if not (0 <= overall_wellbeing <= 10):
        raise ValueError("overall_wellbeing must be between 0 and 10")

    symptom_entries = [
        SymptomEntry(name=s["name"], severity=s["severity"], notes=s.get("notes"))
        for s in (symptoms or [])
    ]

    checkin = PatientCheckIn(
        checkin_id=new_checkin_id(),
        patient_id=patient_id,
        week=week,
        overall_wellbeing=overall_wellbeing,
        symptoms=symptom_entries,
        free_text=free_text,
    )
    store.save_checkin(checkin)
    return checkin


def _derive_status(checkin: PatientCheckIn) -> TwinStatus:
    max_severity = max((s.severity for s in checkin.symptoms), default=0)

    if max_severity >= ATTENTION_SEVERITY or checkin.overall_wellbeing <= ATTENTION_WELLBEING:
        return TwinStatus.NEEDS_ATTENTION
    if max_severity >= WATCH_SEVERITY or checkin.overall_wellbeing <= WATCH_WELLBEING:
        return TwinStatus.WATCH
    return TwinStatus.STABLE


def apply_checkin_to_twin(checkin: PatientCheckIn):
    """
    Folds a submitted check-in into the patient's digital twin: updates
    current week, latest wellbeing/symptoms, and status, and appends a
    history entry so the Week 1-4 timeline can show what happened.
    """
    status = _derive_status(checkin)

    top_symptoms = ", ".join(s.name for s in checkin.symptoms) if checkin.symptoms else "none reported"
    summary = (
        f"Week {checkin.week} check-in: wellbeing {checkin.overall_wellbeing}/10, "
        f"symptoms: {top_symptoms}."
    )

    active_symptoms = [
        {"name": s.name, "severity": s.severity, "notes": s.notes} for s in checkin.symptoms
    ]

    return twin_service.update_patient_twin(
        checkin.patient_id,
        current_week=checkin.week,
        status=status,
        overall_wellbeing=checkin.overall_wellbeing,
        active_symptoms=active_symptoms,
        history_note=summary,
    )
