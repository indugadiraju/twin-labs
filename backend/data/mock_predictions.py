"""
Mock prediction outputs.

Stands in for Indu's real prediction model and Betania's counterfactual
model, neither of which is implemented here. This module only produces
small, clearly-labeled placeholder numbers so the Week 1-4 timeline has
something to display in the demo.
"""

from __future__ import annotations

import random


def mock_predicted_trajectory(patient_id: str, weeks: int = 4) -> list[dict]:
    """
    Returns a deterministic-per-patient, clearly-mocked risk trend for
    weeks 1..weeks. Deterministic (seeded by patient_id) so the same
    patient sees a stable trajectory across calls in a demo session.
    """
    rng = random.Random(patient_id)
    base = rng.uniform(0.2, 0.4)
    trajectory = []
    for week in range(1, weeks + 1):
        drift = rng.uniform(-0.05, 0.08)
        base = max(0.0, min(1.0, base + drift))
        trajectory.append(
            {
                "week": week,
                "mock_risk_score": round(base, 2),
                "source": "mock",  # explicit: not Indu's real model
            }
        )
    return trajectory
