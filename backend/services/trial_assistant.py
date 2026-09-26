"""
Patient-facing Trial Assistant.

Answers study logistics / trial questions from the mock trial document
set (backend/data/mock_trial_docs.py). Deliberately simple keyword
matching for the demo — no real LLM/retrieval dependency required to
show the interaction pattern.

Hard rule: this assistant never makes or suggests treatment decisions.
Any question about stopping or changing medication/treatment is
redirected to the study team, with relevant study info only.
"""

from __future__ import annotations

import re

from backend.data.mock_trial_docs import (
    FAQ,
    STUDY_TEAM_CONTACT,
    TRIAL_OVERVIEW,
    VISIT_SCHEDULE,
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


def _matches_treatment_decision(question: str) -> bool:
    q = question.lower()
    return any(re.search(p, q) for p in TREATMENT_DECISION_PATTERNS)


def _answer_visit_question(question: str) -> str | None:
    match = WEEK_PATTERN.search(question)
    if not match:
        return None
    week = int(match.group(1))
    visit = get_visit(week)
    if not visit:
        return (
            f"I don't have visit details for Week {week} in this demo trial "
            f"(scheduled visits run Week 1-{VISIT_SCHEDULE[-1]['week']}). "
            "For anything outside that range, please check with your study team."
        )
    return f"Week {week} — {visit['title']}: {visit['details']}"


def _answer_next_visit_question(question: str, current_week: int | None) -> str | None:
    if "next visit" not in question.lower() and "when is my" not in question.lower():
        return None
    if current_week is None:
        return "I don't have your current week on file yet — once your twin is set up I can tell you your next visit."
    upcoming = next((v for v in VISIT_SCHEDULE if v["week"] >= current_week), None)
    if not upcoming:
        return "You've completed all scheduled visits in this demo trial. Please confirm your follow-up plan with your study team."
    return f"Your next visit is Week {upcoming['week']} — {upcoming['title']}: {upcoming['details']}"


def _answer_faq(question: str) -> str | None:
    q = question.lower()
    for entry in FAQ:
        if entry["q"] in q or all(word in q for word in entry["q"].split()[:3]):
            return entry["a"]
    return None


def ask_trial_assistant(question: str, current_week: int | None = None) -> dict:
    """
    Returns {"answer": str, "redirected_to_study_team": bool}.

    Order of precedence:
      1. Treatment-decision questions -> always redirect, no exceptions.
      2. "next visit" style questions (uses current_week if given).
      3. Specific week lookups ("what happens at my Week 2 visit").
      4. FAQ keyword matches (fasting, trial length, symptoms to report).
      5. Fallback -> point to study team.
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

    next_visit_answer = _answer_next_visit_question(question, current_week)
    if next_visit_answer:
        return {"answer": next_visit_answer, "redirected_to_study_team": False}

    visit_answer = _answer_visit_question(question)
    if visit_answer:
        return {"answer": visit_answer, "redirected_to_study_team": False}

    faq_answer = _answer_faq(question)
    if faq_answer:
        return {"answer": faq_answer, "redirected_to_study_team": False}

    return {
        "answer": (
            "I don't have a specific answer to that in this demo trial's study "
            f"materials. {TRIAL_OVERVIEW['name']} — for anything I can't answer, "
            f"please reach your study team at {STUDY_TEAM_CONTACT['phone']} or "
            f"{STUDY_TEAM_CONTACT['email']}."
        ),
        "redirected_to_study_team": False,
    }
