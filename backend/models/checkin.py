"""
Weekly patient check-in data model.

A check-in is the raw patient-reported input for a given week. It is
kept separate from PatientTwin (the derived/rolling state) so the
history of what the patient actually reported is preserved as-is, and
so apply_checkin_to_twin() has a clear, single input to work from.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


@dataclass
class SymptomEntry:
    """One symptom reported in a check-in."""

    name: str
    severity: int  # 0-10
    notes: Optional[str] = None


@dataclass
class PatientCheckIn:
    """A single weekly patient-reported check-in."""

    checkin_id: str
    patient_id: str
    week: int

    overall_wellbeing: int  # 0-10 self-reported
    symptoms: list[SymptomEntry] = field(default_factory=list)
    free_text: Optional[str] = None  # anything else the patient wants to say

    submitted_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "checkin_id": self.checkin_id,
            "patient_id": self.patient_id,
            "week": self.week,
            "overall_wellbeing": self.overall_wellbeing,
            "symptoms": [s.__dict__ for s in self.symptoms],
            "free_text": self.free_text,
            "submitted_at": self.submitted_at,
        }


def new_checkin_id() -> str:
    return f"chk_{uuid.uuid4().hex[:10]}"
