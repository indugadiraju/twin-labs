"""
Synthetic demo patient baseline profiles.

Explicitly NOT real patient data and NOT drawn from any public dataset
(the UCI Wisconsin diagnostic tumor-morphology dataset was considered and
rejected: it measures tumor cell nuclei, not the longitudinal
patient-state variables — labs, symptoms, treatment, sleep — that a
TwinLabs digital twin actually needs). Every value here is generated.

Kept condition-specific-but-extensible: BASELINE_CONDITIONS maps a
condition key to the treatment arms/doses appropriate to it, so a new
condition can be added without touching the generator logic. The demo
condition matches the eligibility profile of the real trial in
trial_docs.py (hormone-receptor-positive, HER2-negative, node-negative
breast cancer) purely so the synthetic profile reads coherently next to
the real trial info — it is still fabricated data, not a real patient.
"""

from __future__ import annotations

import random

DEFAULT_CONDITION = "Hormone-receptor-positive, HER2-negative breast cancer (node-negative)"

# Condition -> plausible treatment arms/doses for that condition.
# Only breast cancer is populated for this demo; add more conditions here
# to extend the generator without changing generate_synthetic_baseline().
BASELINE_CONDITIONS = {
    DEFAULT_CONDITION: [
        {"treatment": "Tamoxifen (hormone therapy alone)", "dose": "20 mg oral, once daily"},
        {"treatment": "Anastrozole (aromatase inhibitor, hormone therapy alone)", "dose": "1 mg oral, once daily"},
        {"treatment": "Chemotherapy (TC regimen) followed by hormone therapy", "dose": "Docetaxel 75 mg/m^2 + Cyclophosphamide 600 mg/m^2, IV, every 3 weeks x4"},
    ],
}


def generate_synthetic_baseline(patient_id: str, condition: str = DEFAULT_CONDITION) -> dict:
    """
    Deterministically generates a synthetic baseline patient profile for
    the digital twin, seeded by patient_id so the same demo patient gets
    a stable profile across calls in a session.

    Every field here is synthetic/fabricated for demo purposes — see
    module docstring.
    """
    rng = random.Random(f"baseline:{patient_id}")

    arm = rng.choice(BASELINE_CONDITIONS.get(condition, BASELINE_CONDITIONS[DEFAULT_CONDITION]))

    return {
        "is_synthetic": True,
        "age": rng.randint(34, 74),
        "condition": condition,
        "treatment": arm["treatment"],
        "dose": arm["dose"],
        "kidney_function": {
            "egfr_ml_min_1_73m2": round(rng.uniform(58, 105), 1),
            "note": "Estimated glomerular filtration rate; >=60 is generally considered normal.",
        },
        "labs": {
            "hemoglobin_g_dl": round(rng.uniform(10.5, 14.5), 1),
            "wbc_10e9_l": round(rng.uniform(3.5, 9.5), 1),
            "platelets_10e9_l": round(rng.uniform(150, 400), 0),
            "creatinine_mg_dl": round(rng.uniform(0.6, 1.1), 2),
        },
        "baseline_fatigue": rng.randint(0, 4),   # 0-10, pre-treatment
        "baseline_nausea": rng.randint(0, 2),    # 0-10, pre-treatment
        "baseline_pain": rng.randint(0, 3),      # 0-10, pre-treatment
        "sleep_hours_per_night": round(rng.uniform(5.5, 8.0), 1),
        "condition_specific": {
            "tumor_size_cm": round(rng.uniform(1.1, 4.5), 1),
            "hormone_receptor_status": "ER+/PR+",
            "her2_status": "negative",
            "node_status": "node-negative",
            "oncotype_dx_recurrence_score": rng.randint(5, 30),
        },
    }
