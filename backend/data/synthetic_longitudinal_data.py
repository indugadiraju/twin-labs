"""Predefined synthetic Week 0-4 observations, separate from submitted check-ins.

These states are fabricated narrative fixtures, not observations, predictions,
medical advice, or automatically submitted patient reports.
"""

from __future__ import annotations

from copy import deepcopy

from backend.data.synthetic_patient_profiles import archetype_for, generate_synthetic_baseline

# Values in each tuple: wellbeing, fatigue, nausea, pain, anxiety, sleep,
# appetite, energy, mobility, adherence, mood. All scores are demo 0-10.
STORIES = {
    "chemo_recovery": [
        (8, 2, 1, 2, 2, 7, 8, 8, 9, 10, "Calm"),
        (7, 4, 3, 2, 3, 6, 7, 6, 8, 10, "Tired"),
        (5, 6, 6, 3, 5, 4, 5, 4, 7, 9, "Anxious"),
        (4, 7, 4, 3, 4, 3, 6, 3, 7, 9, "Low"),
        (6, 5, 2, 2, 3, 6, 7, 5, 8, 10, "Hopeful"),
    ],
    "hormone_joint_pain": [
        (8, 3, 0, 2, 2, 7, 8, 7, 9, 10, "Calm"),
        (8, 3, 1, 3, 2, 6, 8, 7, 9, 10, "Calm"),
        (7, 4, 0, 4, 3, 6, 8, 6, 8, 10, "Okay"),
        (7, 4, 1, 5, 2, 5, 8, 6, 8, 10, "Okay"),
        (7, 4, 0, 6, 2, 6, 8, 6, 7, 10, "Okay"),
    ],
    "isolated_concern": [
        (8, 2, 0, 1, 2, 7, 8, 8, 9, 10, "Calm"),
        (8, 2, 1, 1, 2, 7, 8, 8, 9, 10, "Calm"),
        (8, 3, 1, 1, 2, 7, 8, 7, 9, 10, "Okay"),
        (3, 7, 2, 2, 7, 3, 4, 3, 5, 9, "Worried"),
        (7, 3, 1, 1, 3, 6, 7, 7, 8, 10, "Relieved"),
    ],
    "improving_wellbeing": [
        (5, 1, 0, 1, 8, 3, 8, 6, 9, 10, "Anxious"),
        (6, 2, 0, 1, 6, 4, 8, 6, 9, 10, "Uneasy"),
        (7, 2, 0, 1, 5, 5, 8, 7, 9, 10, "Okay"),
        (8, 1, 0, 1, 3, 7, 8, 8, 9, 10, "Calm"),
        (9, 1, 0, 1, 2, 8, 8, 8, 9, 10, "Optimistic"),
    ],
    "variable_adherence": [
        (7, 3, 1, 2, 3, 7, 7, 7, 8, 10, "Okay"),
        (5, 5, 5, 3, 4, 5, 5, 5, 7, 9, "Tired"),
        (6, 4, 2, 2, 4, 6, 7, 6, 8, 8, "Okay"),
        (4, 6, 4, 4, 6, 4, 5, 4, 6, 6, "Frustrated"),
        (6, 4, 2, 3, 4, 6, 7, 6, 7, 5, "Hopeful"),
    ],
    "condition_demo": [
        (7, 2, 1, 2, 3, 6, 7, 7, 7, 10, "Okay"),
        (7, 3, 1, 3, 3, 6, 7, 7, 7, 10, "Okay"),
        (6, 4, 1, 4, 4, 5, 7, 6, 6, 9, "Tired"),
        (7, 3, 1, 3, 3, 6, 7, 7, 7, 9, "Okay"),
        (8, 2, 0, 2, 2, 7, 8, 8, 8, 10, "Calm"),
    ],
}

NOTES = {
    "chemo_recovery": ["Starting the demo treatment journey.", "More tired in the afternoon.", "Nausea made meals difficult this week.", "Sleep was disrupted; fatigue lingered.", "Appetite and sleep felt better this week."],
    "hormone_joint_pain": ["Starting with mild discomfort.", "Joints feel a little stiff.", "Joint pain is more noticeable.", "Sleep was lighter this week.", "Joint discomfort persists despite stable wellbeing."],
    "isolated_concern": ["Feeling steady at baseline.", "No new concerns.", "Mostly stable this week.", "Noticed fever and shortness of breath.", "The isolated symptoms have resolved in this demo story."],
    "improving_wellbeing": ["Worried about starting the study.", "Still anxious, but sleeping a little more.", "Feeling more settled.", "Sleep and confidence improved.", "Feeling steadier now."],
    "variable_adherence": ["Beginning treatment routine.", "Nausea affected the routine.", "Felt somewhat better midweek.", "Side effects made the routine difficult.", "Symptoms eased, but keeping up with medication is still difficult."],
    "condition_demo": ["Synthetic starting point.", "Mild changes this week.", "More noticeable symptoms.", "Some symptoms improved.", "Feeling more settled."],
}


def synthetic_weekly_states(patient_id: str, baseline: dict | None = None) -> list[dict]:
    """Return deep-copied, deterministic Week 0-4 story; no store mutation."""
    baseline = baseline or generate_synthetic_baseline(patient_id)
    archetype = archetype_for(patient_id, baseline["condition"])
    rows = STORIES[archetype]
    states = []
    for week, row in enumerate(rows):
        wellbeing, fatigue, nausea, pain, anxiety, sleep, appetite, energy, mobility, adherence, mood = row
        labs = deepcopy(baseline["labs"])
        if "chemotherapy" in baseline["treatment"].lower():
            # A small deterministic dip then recovery; synthetic measurements only.
            labs["hemoglobin_g_dl"] = round(labs["hemoglobin_g_dl"] + [0, -0.3, -0.7, -0.6, -0.2][week], 1)
            labs["wbc_10e9_l"] = round(labs["wbc_10e9_l"] + [0, -0.5, -1.1, -0.6, -0.2][week], 1)
            labs["platelets_10e9_l"] += [0, -8, -20, -12, -4][week]
        labs["creatinine_mg_dl"] = round(labs["creatinine_mg_dl"] + [0, 0, 0.02, 0.02, 0][week], 2)
        labs["egfr_ml_min_1_73m2"] = baseline["kidney_function"]["egfr_ml_min_1_73m2"] - [0, 0, 2, 2, 0][week]
        new_symptoms = ["Fever", "Shortness of breath"] if archetype == "isolated_concern" and week == 3 else []
        if archetype == "hormone_joint_pain" and week == 2:
            new_symptoms = ["Joint stiffness"]
        state = {
            "week": week, "source": "synthetic", "archetype": archetype,
            "overall_wellbeing": wellbeing, "fatigue": fatigue, "nausea": nausea,
            "pain": pain, "anxiety": anxiety, "sleep_quality": sleep, "mood": mood,
            "appetite": appetite, "energy": energy, "mobility": mobility,
            "medication_adherence": adherence, "new_symptoms": new_symptoms,
            "temperature_c": 38.4 if archetype == "isolated_concern" and week == 3 else 36.7,
            "weight_kg": round(68.0 + [0, -0.2, -0.5, -0.6, -0.3][week], 1),
            "labs": labs, "free_text": NOTES[archetype][week],
            "status": "needs_attention" if new_symptoms and "Fever" in new_symptoms else
                      "watch" if fatigue >= 6 or pain >= 6 or wellbeing <= 5 or adherence <= 6 or anxiety >= 7 else "stable",
        }
        states.append(state)
    return states
