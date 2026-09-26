"""
Trial grounding data for the Trial Assistant and the Week 1-4 timeline.

Two clearly separate kinds of data live here:

1. REAL_TRIAL — sourced from the public ClinicalTrials.gov registry record
   for TAILORx (NCT00310180), a real, completed NCI-sponsored Phase 3
   breast cancer trial. Every field under REAL_TRIAL is grounded in that
   public record (see REAL_TRIAL["source"] for the citation). Nothing in
   this block is invented.

2. SIMULATED_VISIT_SCHEDULE — a demo-only Week 1-4 visit cadence.
   ClinicalTrials.gov registry records do not publish granular,
   visit-by-visit protocol detail (fasting instructions, what happens at
   each specific visit) — that level of detail lives in the internal
   study protocol, not the public registry. TAILORx's real follow-up
   cadence is "every 3-6 months for 5 years, then annually for 15 years"
   (see REAL_TRIAL["follow_up"]), not weekly. TwinLabs' demo still wants
   to show a Week 1-4 patient journey, so this schedule is explicitly
   simulated for that purpose and is labeled as such everywhere it is
   used (data, API responses, and UI).

STUDY_TEAM_CONTACT is also a demo placeholder, not real TAILORx contact
information (that trial is closed to new enrollment) — see its own note.
"""

TRIAL_ID = "NCT00310180"

REAL_TRIAL = {
    "nct_id": "NCT00310180",
    "short_name": "TAILORx",
    "official_title": (
        "Program for the Assessment of Clinical Cancer Tests (PACCT-1): "
        "Trial Assigning Individualized Options for Treatment: The TAILORx Trial"
    ),
    "sponsor": "National Cancer Institute (NCI)",
    "phase": "Phase 3",
    "status": "Active, long-term follow-up ongoing (not accepting new patients)",
    "condition": "Node-negative, hormone-receptor-positive, HER2-negative breast cancer",
    "enrollment": "Approximately 10,273 participants",
    "started": "April 2006",
    "estimated_completion": "September 2030",
    "purpose": (
        "TAILORx is a randomized Phase 3 trial studying how to best individualize "
        "treatment for women with node-negative, hormone-receptor-positive, "
        "HER2-negative breast cancer, using the Oncotype DX 21-gene recurrence "
        "score to decide whether chemotherapy adds benefit on top of hormone "
        "therapy alone."
    ),
    "detailed_description": (
        "The trial evaluates whether adjuvant hormone therapy alone is "
        "non-inferior to combined chemotherapy plus hormone therapy for patients "
        "whose Oncotype DX recurrence score falls in the mid-range (11-25). It "
        "also tracks outcomes for patients with low (<=10) and high (>=26) "
        "recurrence scores, who receive hormone therapy alone or chemotherapy "
        "plus hormone therapy respectively, and compares outcomes projected by "
        "Oncotype DX against classical pathologic staging."
    ),
    "follow_up": (
        "Every 3-6 months for the first 5 years after treatment, then annually "
        "for 15 years."
    ),
    "eligibility": {
        "sex": "Female",
        "min_age": 18,
        "max_age": 75,
        "inclusion_highlights": [
            "Operable, histologically confirmed adenocarcinoma of the breast",
            "Hormone-receptor-positive (ER and/or PR positive) disease",
            "Node-negative (by sentinel node biopsy or axillary dissection)",
            "Tumor size 1.1-5.0 cm (or 0.5-1.0 cm with unfavorable features)",
            "HER2/neu negative",
            "Must pre-register within 84 days of the final surgical procedure",
            "No prior chemotherapy or radiation for this cancer",
            "Life expectancy of at least 10 years",
        ],
        "exclusion_highlights": [
            "Chronic obstructive pulmonary disease requiring treatment",
            "Chronic liver disease",
            "Prior cerebrovascular accident",
            "Congestive heart failure or cardiac disease contraindicating anthracyclines",
            "Chronic psychiatric condition that would affect compliance",
            "Pregnant or breastfeeding",
            "Prior Oncotype DX testing (except scores 11-25)",
        ],
    },
    "arms": [
        {
            "group": "Recurrence score <= 10",
            "treatment": "Hormone therapy alone (tamoxifen and/or an aromatase inhibitor) for 5-10 years",
        },
        {
            "group": "Recurrence score 11-25 (randomized, primary study group)",
            "treatment": "Arm I: hormone therapy alone. Arm II: standard chemotherapy followed by hormone therapy.",
        },
        {
            "group": "Recurrence score >= 26",
            "treatment": "Chemotherapy followed by hormone therapy",
        },
    ],
    "source": {
        "registry": "ClinicalTrials.gov",
        "nct_id": "NCT00310180",
        "url": "https://clinicaltrials.gov/study/NCT00310180",
    },
}

# ---------------------------------------------------------------------------
# SIMULATED for this demo only — see module docstring. Not part of the
# public TAILORx record.
# ---------------------------------------------------------------------------

SIMULATED_VISIT_SCHEDULE = [
    {
        "week": 1,
        "title": "Baseline Visit",
        "details": (
            "Baseline bloodwork, vitals, and treatment kickoff. Please fast for "
            "8 hours before your blood draw (water is fine)."
        ),
        "source": "simulated_for_demo",
    },
    {
        "week": 2,
        "title": "Week 2 Check-In Visit",
        "details": (
            "Brief in-person visit: vitals, a short symptom review with your "
            "study nurse, and a blood draw. No fasting required for this visit."
        ),
        "source": "simulated_for_demo",
    },
    {
        "week": 3,
        "title": "Week 3 Remote Check-In",
        "details": "No in-person visit. Please complete your weekly digital check-in from home.",
        "source": "simulated_for_demo",
    },
    {
        "week": 4,
        "title": "Week 4 Visit",
        "details": (
            "Full labs and imaging review. Fasting for 8 hours is required before "
            "your blood draw."
        ),
        "source": "simulated_for_demo",
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

# Demo placeholder — TAILORx is closed to new enrollment and has no
# patient-facing contact desk; a real deployment would use the enrolling
# site's real study team contact here instead.
STUDY_TEAM_CONTACT = {
    "note": (
        "For any question about starting, stopping, or changing your treatment, "
        "please contact your study team directly — the Trial Assistant cannot "
        "make treatment decisions or give medical advice."
    ),
    "phone": "(555) 010-2025",
    "email": "studyteam@twinlab-demo-trial.example",
    "is_demo_placeholder": True,
}


def get_visit(week: int) -> dict | None:
    return next((v for v in SIMULATED_VISIT_SCHEDULE if v["week"] == week), None)
