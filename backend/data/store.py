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


def save_twin(twin: PatientTwin) -> None:
    _twins[twin.patient_id] = twin


def get_twin(patient_id: str) -> Optional[PatientTwin]:
    return _twins.get(patient_id)


def list_twins() -> list[PatientTwin]:
    return list(_twins.values())


def save_checkin(checkin: PatientCheckIn) -> None:
    _checkins.setdefault(checkin.patient_id, []).append(checkin)


def list_checkins(patient_id: str) -> list[PatientCheckIn]:
    return list(_checkins.get(patient_id, []))


def reset() -> None:
    """Clears all in-memory state. Useful for tests / demo resets."""
    _twins.clear()
    _checkins.clear()
