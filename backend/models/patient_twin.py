"""
Patient data model and digital twin state.

This module owns the core representation of a patient's "digital twin":
a continuously-updated snapshot of their clinical data, treatment info,
labs, and patient-reported state, built from their weekly check-ins.

Disease-independent by design: nothing here assumes breast cancer
specifically. The demo trial config (real trial grounding + simulated
visit schedule) lives in backend/data/trial_docs.py; synthetic baseline
patient data lives in backend/data/synthetic_patient_profiles.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid


class TwinStatus(str, Enum):
    """High-level status flag for a patient's twin, surfaced in the UI."""

    STABLE = "stable"
    WATCH = "watch"          # something worth keeping an eye on
    NEEDS_ATTENTION = "needs_attention"


@dataclass
class PatientTwin:
    """
    The digital twin: current state for one patient in the trial.

    This is intentionally a plain, serializable snapshot rather than a
    full event-sourced model — enough to demo "the twin updates as the
    patient reports data," without building out Indu's prediction engine
    or Betania's counterfactual model.
    """

    patient_id: str
    trial_id: str
    current_week: int = 1

    status: TwinStatus = TwinStatus.STABLE

    # Synthetic baseline profile (age, treatment, labs, etc.) generated at
    # twin creation — see backend/data/synthetic_patient_profiles.py.
    # None until create_patient_twin() sets it. Always fabricated data,
    # never a real patient record; kept distinct from active_symptoms /
    # overall_wellbeing below, which come from the (simulated) check-ins.
    synthetic_baseline: Optional[dict] = None

    # Rolling patient-reported state, most recent values.
    # Each entry: {"name": str, "severity": int, "notes": str | None}
    active_symptoms: list[dict] = field(default_factory=list)
    overall_wellbeing: Optional[int] = None  # 0-10 self-reported, most recent

    # Simple longitudinal trace so the timeline/UI has something to show.
    # Each entry: {"week": int, "status": TwinStatus, "summary": str, "at": iso str}
    history: list[dict] = field(default_factory=list)

    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "patient_id": self.patient_id,
            "trial_id": self.trial_id,
            "current_week": self.current_week,
            "status": self.status.value,
            "synthetic_baseline": self.synthetic_baseline,
            "active_symptoms": self.active_symptoms,
            "overall_wellbeing": self.overall_wellbeing,
            "history": self.history,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


def new_patient_id() -> str:
    return f"pt_{uuid.uuid4().hex[:10]}"
