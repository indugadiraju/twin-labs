"""Crystal-owned in-memory state for researcher demo events.

Lab updates are intentionally kept separate from the patient twin store so the
researcher prototype can evolve without changing Samhita's patient model.
"""

from __future__ import annotations

from datetime import datetime, timezone


_lab_updates: dict[str, list[dict]] = {}


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
    return dict(update)


def list_lab_updates(patient_id: str) -> list[dict]:
    return [dict(item) for item in _lab_updates.get(patient_id, [])]


def reset() -> None:
    _lab_updates.clear()
