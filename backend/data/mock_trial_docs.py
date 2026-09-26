"""
Small mock trial document set for the demo breast cancer trial.

Standing in for the real trial protocol / patient handbook that the
Trial Assistant would normally retrieve from. Kept as plain structured
data (not free-text PDFs) so the assistant can do simple, reliable
lookups for the demo rather than needing real retrieval infrastructure.
"""

TRIAL_ID = "trial_breastcancer_demo"

TRIAL_OVERVIEW = {
    "name": "TwinLab Demo Trial — Breast Cancer Adjuvant Therapy Study",
    "duration": "The study runs for 12 weeks of active treatment, followed by a 4-week follow-up period (16 weeks total).",
    "purpose": (
        "This study is evaluating how patients respond to a standard adjuvant "
        "therapy regimen, using weekly patient-reported check-ins alongside "
        "routine labs and clinical visits."
    ),
}

VISIT_SCHEDULE = [
    {
        "week": 1,
        "title": "Baseline Visit",
        "details": (
            "Baseline bloodwork, vitals, and treatment kickoff. Please fast for "
            "8 hours before your blood draw (water is fine)."
        ),
    },
    {
        "week": 2,
        "title": "Week 2 Check-In Visit",
        "details": (
            "Brief in-person visit: vitals, a short symptom review with your "
            "study nurse, and a blood draw. No fasting required for this visit."
        ),
    },
    {
        "week": 3,
        "title": "Week 3 Remote Check-In",
        "details": "No in-person visit. Please complete your weekly digital check-in from home.",
    },
    {
        "week": 4,
        "title": "Week 4 Visit",
        "details": (
            "Full labs and imaging review. Fasting for 8 hours is required before "
            "your blood draw."
        ),
    },
]

SYMPTOMS_TO_REPORT = [
    "Fever over 100.4°F (38°C)",
    "Unusual bruising or bleeding",
    "Severe nausea or vomiting",
    "Shortness of breath",
    "Persistent pain not relieved by prescribed medication",
    "Any symptom that feels severe, sudden, or worsening",
]

FAQ = [
    {
        "q": "do i need to fast before my blood test",
        "a": (
            "Fasting requirements depend on the visit. Week 1 and Week 4 visits "
            "require an 8-hour fast (water is fine). The Week 2 visit does not "
            "require fasting. Check your visit schedule for the specific week."
        ),
    },
    {
        "q": "how long does the trial last",
        "a": TRIAL_OVERVIEW["duration"],
    },
    {
        "q": "what symptoms should i report",
        "a": (
            "Please report any of the following as soon as possible: "
            + "; ".join(SYMPTOMS_TO_REPORT)
            + ". You can also report anything else that feels wrong, even if it's "
            "not on this list — it's always fine to check in."
        ),
    },
]

STUDY_TEAM_CONTACT = {
    "note": (
        "For any question about starting, stopping, or changing your treatment, "
        "please contact your study team directly — the Trial Assistant cannot "
        "make treatment decisions or give medical advice."
    ),
    "phone": "(555) 010-2025",
    "email": "studyteam@twinlab-demo-trial.example",
}


def get_visit(week: int) -> dict | None:
    return next((v for v in VISIT_SCHEDULE if v["week"] == week), None)
