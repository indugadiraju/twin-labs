"""Small demo store with optional JSON persistence for API sessions.

This is not a production database. Services still use this narrow module API,
so the implementation can be replaced without changing application logic.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Optional

from backend.models.patient_twin import PatientTwin, TwinStatus
from backend.models.checkin import PatientCheckIn, SymptomEntry

_twins: dict[str, PatientTwin] = {}
_checkins: dict[str, list[PatientCheckIn]] = {}  # patient_id -> check-ins, oldest first
_persistence_enabled = False
_state_file = Path(
    os.environ.get(
        "TWINLABS_STATE_FILE",
        Path(__file__).resolve().parents[2] / ".twinlabs" / "patient_state.json",
    )
)


def _twin_from_dict(data: dict) -> PatientTwin:
    return PatientTwin(
        patient_id=data["patient_id"],
        trial_id=data["trial_id"],
        current_week=int(data.get("current_week", 1)),
        status=TwinStatus(data.get("status", TwinStatus.STABLE.value)),
        synthetic_baseline=data.get("synthetic_baseline"),
        active_symptoms=list(data.get("active_symptoms") or []),
        overall_wellbeing=data.get("overall_wellbeing"),
        sleep_quality=data.get("sleep_quality"),
        mood=data.get("mood"),
        anxiety=data.get("anxiety"),
        fatigue=data.get("fatigue"),
        nausea=data.get("nausea"),
        pain=data.get("pain"),
        new_symptoms=list(data.get("new_symptoms") or []),
        history=list(data.get("history") or []),
        created_at=data.get("created_at") or datetime.now(timezone.utc).isoformat(),
        updated_at=data.get("updated_at") or datetime.now(timezone.utc).isoformat(),
    )


def _checkin_from_dict(data: dict) -> PatientCheckIn:
    return PatientCheckIn(
        checkin_id=data["checkin_id"],
        patient_id=data["patient_id"],
        week=int(data["week"]),
        overall_wellbeing=int(data["overall_wellbeing"]),
        sleep_quality=data.get("sleep_quality"),
        mood=data.get("mood"),
        anxiety=data.get("anxiety"),
        fatigue=data.get("fatigue"),
        nausea=data.get("nausea"),
        pain=data.get("pain"),
        new_symptoms=list(data.get("new_symptoms") or []),
        symptoms=[SymptomEntry(**item) for item in data.get("symptoms") or []],
        free_text=data.get("free_text"),
        submitted_at=data.get("submitted_at") or datetime.now(timezone.utc).isoformat(),
    )


def _persist() -> None:
    if not _persistence_enabled:
        return
    try:
        _state_file.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "twins": [twin.to_dict() for twin in _twins.values()],
            "checkins": {
                patient_id: [checkin.to_dict() for checkin in checkins]
                for patient_id, checkins in _checkins.items()
            },
        }
        temporary = _state_file.with_suffix(".tmp")
        temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        temporary.replace(_state_file)
    except OSError:
        # The JSON file is only a demo cache: if it can't be written (e.g. a
        # read-only filesystem), keep serving from memory rather than failing.
        pass


def enable_persistence(path: str | Path | None = None) -> None:
    """Load and persist demo state when the API server is running."""
    global _persistence_enabled, _state_file
    if path is not None:
        _state_file = Path(path)
    _persistence_enabled = True
    if not _state_file.exists():
        return
    try:
        payload = json.loads(_state_file.read_text(encoding="utf-8"))
        _twins.clear()
        _twins.update((item["patient_id"], _twin_from_dict(item)) for item in payload.get("twins", []))
        _checkins.clear()
        _checkins.update(
            (patient_id, [_checkin_from_dict(item) for item in items])
            for patient_id, items in payload.get("checkins", {}).items()
        )
    except (OSError, ValueError, KeyError, TypeError):
        # A corrupt demo cache should never prevent the hackathon API from starting.
        _twins.clear()
        _checkins.clear()

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
    _persist()


def get_twin(patient_id: str) -> Optional[PatientTwin]:
    if patient_id == DEMO_PATIENT_ID and patient_id not in _twins:
        _bootstrap_demo_twin()
    return _twins.get(patient_id)


def list_twins() -> list[PatientTwin]:
    get_twin(DEMO_PATIENT_ID)  # make sure the demo patient is always listed
    return list(_twins.values())


def save_checkin(checkin: PatientCheckIn) -> None:
    _checkins.setdefault(checkin.patient_id, []).append(checkin)
    _persist()


def list_checkins(patient_id: str) -> list[PatientCheckIn]:
    return list(_checkins.get(patient_id, []))


def reset() -> None:
    """Clears all in-memory state. Useful for tests / demo resets."""
    _twins.clear()
    _checkins.clear()
    _persist()
