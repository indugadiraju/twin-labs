"""
In-memory data store for the demo.

Not a real database — just enough persistence for a single-process demo
session. Swappable for a real DB later without touching the service
layer, since services only talk to the functions below.
"""

from __future__ import annotations

from typing import Optional

from backend.models.patient_twin import PatientTwin
from backend.models.checkin import PatientCheckIn

_twins: dict[str, PatientTwin] = {}
_checkins: dict[str, list[PatientCheckIn]] = {}  # patient_id -> check-ins, oldest first

# The shared demo patient used by both portals. Because this store is in-memory,
# a backend restart (e.g. `uvicorn --reload`) or a second worker process would
# otherwise lose the twin and every request would fail with "No twin found".
# Its synthetic baseline is deterministic, so recreating it on demand is safe.
DEMO_PATIENT_ID = "pt_demo_patient"
_bootstrapping = False


def _bootstrap_demo_twin() -> None:
    global _bootstrapping
    if _bootstrapping:
        return
    _bootstrapping = True
    try:
        # Imported lazily: twin_service imports this module.
        from backend.data.trial_docs import TRIAL_ID
        from backend.services.twin_service import create_patient_twin
        create_patient_twin(trial_id=TRIAL_ID, patient_id=DEMO_PATIENT_ID)
    finally:
        _bootstrapping = False


def save_twin(twin: PatientTwin) -> None:
    _twins[twin.patient_id] = twin


def get_twin(patient_id: str) -> Optional[PatientTwin]:
    if patient_id == DEMO_PATIENT_ID and patient_id not in _twins:
        _bootstrap_demo_twin()
    return _twins.get(patient_id)


def list_twins() -> list[PatientTwin]:
    get_twin(DEMO_PATIENT_ID)  # make sure the demo patient is always listed
    return list(_twins.values())


def save_checkin(checkin: PatientCheckIn) -> None:
    _checkins.setdefault(checkin.patient_id, []).append(checkin)


def list_checkins(patient_id: str) -> list[PatientCheckIn]:
    return list(_checkins.get(patient_id, []))


def reset() -> None:
    """Clears all in-memory state. Useful for tests / demo resets."""
    _twins.clear()
    _checkins.clear()
