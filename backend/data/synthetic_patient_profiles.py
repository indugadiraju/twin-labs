"""Deterministic, entirely fabricated baseline profiles; no patient records."""

from __future__ import annotations

import random
from copy import deepcopy

from backend.data.condition_configs import BASELINE_CONDITIONS, CONDITION_CONFIGS, DEFAULT_CONDITION

# Stable archetype IDs make demo narratives repeatable and easy to inspect.
DEMO_ARCHETYPES = {
    "pt_demo_patient": "chemo_recovery",
    "pt_demo_hormone": "hormone_joint_pain",
    "pt_demo_attention": "isolated_concern",
    "pt_demo_anxiety": "improving_wellbeing",
    "pt_demo_adherence": "variable_adherence",
}
ARCHETYPE_ORDER = tuple(dict.fromkeys(DEMO_ARCHETYPES.values()))
ARCHETYPE_TREATMENT = {
    "chemo_recovery": 2, "hormone_joint_pain": 1, "isolated_concern": 2,
    "improving_wellbeing": 0, "variable_adherence": 2,
}


def archetype_for(patient_id: str, condition: str = DEFAULT_CONDITION) -> str:
    if condition != DEFAULT_CONDITION:
        return "condition_demo"
    if patient_id in DEMO_ARCHETYPES:
        return DEMO_ARCHETYPES[patient_id]
    # Stable choice independent of Python's randomized hash seed.
    return ARCHETYPE_ORDER[random.Random(f"archetype:{patient_id}").randrange(len(ARCHETYPE_ORDER))]


def generate_synthetic_baseline(patient_id: str, condition: str = DEFAULT_CONDITION) -> dict:
    """Return a deterministic synthetic baseline; reject unknown conditions explicitly."""
    if condition not in CONDITION_CONFIGS:
        raise ValueError(f"Unsupported demo condition: {condition}")
    rng = random.Random(f"baseline:{patient_id}:{condition}")
    archetype = archetype_for(patient_id, condition)
    arms = BASELINE_CONDITIONS[condition]
    arm = arms[ARCHETYPE_TREATMENT[archetype]] if archetype in ARCHETYPE_TREATMENT else arms[rng.randrange(len(arms))]
    baseline = {
        "is_synthetic": True, "source": "synthetic", "age": rng.randint(34, 74),
        "condition": condition, "archetype": archetype,
        "treatment": arm["treatment"], "dose": arm["dose"],
        "kidney_function": {"egfr_ml_min_1_73m2": 86.0},
        "labs": {"hemoglobin_g_dl": 12.8, "wbc_10e9_l": 6.3, "platelets_10e9_l": 255, "creatinine_mg_dl": 0.85},
        "baseline_fatigue": 2, "baseline_nausea": 1, "baseline_pain": 2,
        "sleep_hours_per_night": 7.1,
        "condition_specific": deepcopy(CONDITION_CONFIGS[condition]["condition_specific"]),
    }
    if archetype == "improving_wellbeing":
        baseline.update(baseline_fatigue=1, baseline_nausea=0, baseline_pain=1, sleep_hours_per_night=5.7)
    elif archetype == "hormone_joint_pain":
        baseline.update(baseline_fatigue=3, baseline_nausea=0, baseline_pain=2)
    elif archetype == "variable_adherence":
        baseline.update(baseline_fatigue=3, baseline_nausea=1, baseline_pain=2)
    # Controlled variation in non-story attributes, stable across calls.
    baseline["condition_specific"] = deepcopy(baseline["condition_specific"])
    baseline["age"] = rng.randint(38, 71)
    return baseline
