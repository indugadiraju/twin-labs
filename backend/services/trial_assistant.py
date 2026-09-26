"""
Patient-facing Trial Assistant.

Answers study logistics / trial questions using two sources, kept
clearly separate in the answers themselves:

  - Real trial grounding (purpose, sponsor, eligibility, treatment arms,
    duration/follow-up) from trial_docs.REAL_TRIAL — the public TAILORx
    (NCT00310180) ClinicalTrials.gov record.
  - A simulated Week 1-4 visit schedule (trial_docs.SIMULATED_VISIT_SCHEDULE)
    for anything at the level of "what happens at my Week 2 visit" or
    "do I need to fast", since that granularity isn't in the public
    record. Answers drawing on it say so explicitly.

Deliberately simple keyword matching for the demo — no real LLM/retrieval
dependency required to show the interaction pattern.

Hard rule: this assistant never makes or suggests treatment decisions.
Any question about stopping or changing medication/treatment is
redirected to the study team, with relevant study info only.
"""

from __future__ import annotations

import re

from backend.data.trial_docs import (
    REAL_TRIAL,
    STUDY_TEAM_CONTACT,
    SYMPTOMS_TO_REPORT,
    SIMULATED_VISIT_SCHEDULE,
    get_visit,
)

# Any of these appearing in a question routes to the study-team redirect,
# regardless of anything else in the question. This check runs first.
TREATMENT_DECISION_PATTERNS = [
    r"\bstop\b.*\b(medication|treatment|drug|therapy|dosing|taking)\b",
    r"\b(should|can|could)\s+i\s+(stop|skip|change|switch|reduce|lower|increase)\b",
    r"\bchange\b.*\b(treatment|medication|dose|dosage|therapy)\b",
    r"\bside effects?\b.*\b(stop|quit)\b",
]

WEEK_PATTERN = re.compile(r"week\s*(\d+)", re.IGNORECASE)

# Real-trial-grounded FAQ. Matched before the simulated-schedule FAQ so
# real info wins when a question could plausibly hit either.
REAL_TRIAL_FAQ = [
    {
        "keywords": ["purpose", "what is this trial", "what is this study", "about this trial", "about this study"],
        "a": lambda: (
            f"{REAL_TRIAL['short_name']} ({REAL_TRIAL['nct_id']}) is a real, "
            f"{REAL_TRIAL['phase']} trial sponsored by {REAL_TRIAL['sponsor']}. "
            f"{REAL_TRIAL['purpose']} Source: ClinicalTrials.gov, {REAL_TRIAL['source']['url']}"
        ),
    },
    {
        "keywords": ["sponsor", "who is running", "who runs this"],
        "a": lambda: f"This trial is sponsored by {REAL_TRIAL['sponsor']}. Source: {REAL_TRIAL['source']['url']}",
    },
    {
        "keywords": ["eligib", "qualify", "who can join", "am i eligible"],
        "a": lambda: (
            "Key eligibility highlights from the public trial record: "
            + "; ".join(REAL_TRIAL["eligibility"]["inclusion_highlights"])
            + f". Age range: {REAL_TRIAL['eligibility']['min_age']}-{REAL_TRIAL['eligibility']['max_age']}, "
            f"{REAL_TRIAL['eligibility']['sex'].lower()} only. This is general information, not an "
            "eligibility determination — your study team confirms actual eligibility. "
            f"Source: {REAL_TRIAL['source']['url']}"
        ),
    },
    {
        "keywords": ["arm", "treatment group", "what treatments", "randomiz"],
        "a": lambda: (
            "This trial has three treatment groups based on Oncotype DX recurrence score: "
            + " | ".join(f"{a['group']}: {a['treatment']}" for a in REAL_TRIAL["arms"])
            + f". Source: {REAL_TRIAL['source']['url']}"
        ),
    },
    {
        "keywords": ["how long does the trial last", "trial last", "study last", "follow-up", "follow up"],
        "a": lambda: (
            f"Active treatment and follow-up: {REAL_TRIAL['follow_up']} "
            f"The trial began {REAL_TRIAL['started']}, with an estimated completion of "
            f"{REAL_TRIAL['estimated_completion']}. Source: {REAL_TRIAL['source']['url']}"
        ),
    },
]


def _matches_treatment_decision(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in TREATMENT_DECISION_PATTERNS)


def _keyword_matches(keyword: str, q: str) -> bool:
    # Short keywords ("arm") use word boundaries to avoid matching inside
    # unrelated words (e.g. "pharmacy", "alarm"); longer phrases are safe
    # as plain substrings.
    if len(keyword) <= 4:
        return re.search(rf"\b{re.escape(keyword)}s?\b", q) is not None
    return keyword in q


def _answer_real_trial_faq(question: str) -> str | None:
    q = question.lower()
    for entry in REAL_TRIAL_FAQ:
        if any(_keyword_matches(kw, q) for kw in entry["keywords"]):
            return entry["a"]()
    return None


def _answer_visit_question(question: str) -> str | None:
    match = WEEK_PATTERN.search(question)
    if not match:
        return None
    week = int(match.group(1))
    visit = get_visit(week)
    if not visit:
        return (
            f"I don't have visit details for Week {week} in this demo's simulated schedule "
            f"(it covers Week 1-{SIMULATED_VISIT_SCHEDULE[-1]['week']}). "
            "For anything outside that range, please check with your study team."
        )
    return (
        f"Week {week} — {visit['title']}: {visit['details']} "
        "(This weekly visit schedule is simulated for this demo — the real trial's actual "
        "visit cadence is less frequent; see the trial's real follow-up schedule if you ask "
        "how long the trial lasts.)"
    )


def _answer_next_visit_question(question: str, current_week: int | None) -> str | None:
    if "next visit" not in question.lower() and "when is my" not in question.lower():
        return None
    if current_week is None:
        return "I don't have your current week on file yet — once your twin is set up I can tell you your next visit."
    upcoming = next((v for v in SIMULATED_VISIT_SCHEDULE if v["week"] >= current_week), None)
    if not upcoming:
        return "You've completed all scheduled visits in this demo's simulated schedule. Please confirm your follow-up plan with your study team."
    return (
        f"Your next visit is Week {upcoming['week']} — {upcoming['title']}: {upcoming['details']} "
        "(simulated schedule for this demo)."
    )


def _answer_fasting_or_symptom_faq(question: str) -> str | None:
    q = question.lower()
    if "fast" in q and ("blood" in q or "test" in q or "draw" in q):
        return (
            "In this demo's simulated visit schedule: Week 1 and Week 4 visits require an "
            "8-hour fast (water is fine); the Week 2 visit does not require fasting. "
            "(Simulated schedule for this demo — always follow your actual study team's "
            "instructions for a real visit.)"
        )
    if "symptom" in q and "report" in q:
        return (
            "Please report any of the following as soon as possible: "
            + "; ".join(SYMPTOMS_TO_REPORT)
            + ". You can also report anything else that feels wrong, even if it's "
            "not on this list — it's always fine to check in."
        )
    return None


def ask_trial_assistant(question: str, current_week: int | None = None) -> dict:
    """
    Returns {"answer": str, "redirected_to_study_team": bool}.

    Order of precedence:
      1. Treatment-decision questions -> always redirect, no exceptions.
      2. Real-trial-grounded FAQ (purpose, sponsor, eligibility, arms, duration).
      3. "next visit" style questions (simulated schedule; uses current_week if given).
      4. Specific week lookups ("what happens at my Week 2 visit") -> simulated schedule.
      5. Fasting / symptoms-to-report FAQ (fasting is simulated; symptoms is general guidance).
      6. Fallback -> point to study team.
    """
    if not question or not question.strip():
        return {"answer": "Please ask a question about your visits, schedule, or symptoms to report.", "redirected_to_study_team": False}

    if _matches_treatment_decision(question):
        return {
            "answer": (
                "I can't help with decisions about starting, stopping, or changing your "
                f"treatment. {STUDY_TEAM_CONTACT['note']} "
                f"You can reach your study team at {STUDY_TEAM_CONTACT['phone']} or "
                f"{STUDY_TEAM_CONTACT['email']}."
            ),
            "redirected_to_study_team": True,
        }

    real_faq_answer = _answer_real_trial_faq(question)
    if real_faq_answer:
        return {"answer": real_faq_answer, "redirected_to_study_team": False}

    next_visit_answer = _answer_next_visit_question(question, current_week)
    if next_visit_answer:
        return {"answer": next_visit_answer, "redirected_to_study_team": False}

    visit_answer = _answer_visit_question(question)
    if visit_answer:
        return {"answer": visit_answer, "redirected_to_study_team": False}

    faq_answer = _answer_fasting_or_symptom_faq(question)
    if faq_answer:
        return {"answer": faq_answer, "redirected_to_study_team": False}

    return {
        "answer": (
            "I don't have a specific answer to that in this demo's study materials. "
            f"{REAL_TRIAL['short_name']} ({REAL_TRIAL['nct_id']}) is a real trial — you can read "
            f"more at {REAL_TRIAL['source']['url']}. For anything I can't answer, please reach "
            f"your study team at {STUDY_TEAM_CONTACT['phone']} or {STUDY_TEAM_CONTACT['email']}."
        ),
        "redirected_to_study_team": False,
    }
