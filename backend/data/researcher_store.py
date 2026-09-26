"""Crystal-owned state for researcher demo events.

Lab updates are intentionally kept separate from the patient twin store so the
researcher prototype can evolve without changing Samhita's patient model. API
sessions persist these simulated events to a local, git-ignored JSON cache.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path


_lab_updates: dict[str, list[dict]] = {}
_persistence_enabled = False
_state_file = Path(
    os.environ.get(
        "TWINLABS_RESEARCHER_STATE_FILE",
        Path(__file__).resolve().parents[2] / ".twinlabs" / "researcher_state.json",
    )
)


def _persist() -> None:
    if not _persistence_enabled:
        return
    _state_file.parent.mkdir(parents=True, exist_ok=True)
    temporary = _state_file.with_suffix(".tmp")
    temporary.write_text(json.dumps({"lab_updates": _lab_updates}, indent=2), encoding="utf-8")
    temporary.replace(_state_file)


def enable_persistence(path: str | Path | None = None) -> None:
    """Load and persist researcher demo events for API server sessions."""
    global _persistence_enabled, _state_file
    if path is not None:
        _state_file = Path(path)
    _persistence_enabled = True
    if not _state_file.exists():
        return
    try:
        payload = json.loads(_state_file.read_text(encoding="utf-8"))
        _lab_updates.clear()
        _lab_updates.update(
            (patient_id, [dict(item) for item in items])
            for patient_id, items in payload.get("lab_updates", {}).items()
        )
    except (OSError, ValueError, TypeError):
        _lab_updates.clear()


def save_lab_update(
    patient_id: str,
    *,
    week: int,
    name: str,
    value: float,
    unit: str | None = None,
    source: str = "simulated_for_demo",
) -> dict:
    update = {
        "patient_id": patient_id,
        "week": week,
        "name": name,
        "value": value,
        "unit": unit,
        "source": source,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    _lab_updates.setdefault(patient_id, []).append(update)
    _persist()
    return dict(update)


def list_lab_updates(patient_id: str) -> list[dict]:
    return [dict(item) for item in _lab_updates.get(patient_id, [])]


def reset() -> None:
    _lab_updates.clear()
    _persist()
