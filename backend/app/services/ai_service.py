import json
import re
from typing import Any

import anthropic

from app.core.config import get_settings

settings = get_settings()

_VALID_CATEGORIES = {"behavioral", "technical", "situational"}
_VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _fallback_questions(role: str, num_questions: int = 5) -> list[dict[str, str]]:
    clean_role = role.strip() or "this role"
    return [
        {
            "question": f"Tell me about yourself and why you are interested in a {clean_role} position.",
            "category": "behavioral",
            "difficulty": "easy",
        },
        {
            "question": f"Describe a project or experience that prepared you for a {clean_role} role.",
            "category": "behavioral",
            "difficulty": "medium",
        },
        {
            "question": f"What technical skills are most important for a {clean_role}, and how have you used them?",
            "category": "technical",
            "difficulty": "medium",
        },
        {
            "question": "Tell me about a time you had a conflict with a teammate and how you resolved it.",
            "category": "behavioral",
            "difficulty": "medium",
        },
        {
            "question": f"Imagine you are given an unclear task as a {clean_role}. How would you clarify requirements and move forward?",
            "category": "situational",
            "difficulty": "hard",
        },
    ][:num_questions]


def _extract_json(text: str) -> Any:
    """Extract JSON from a raw model response, including fenced code blocks."""
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    # If the model added text before/after JSON, keep only the outer JSON payload.
    first_array = text.find("[")
    first_object = text.find("{")
    starts = [idx for idx in [first_array, first_object] if idx != -1]
    if starts:
        start = min(starts)
        end_char = "]" if text[start] == "[" else "}"
        end = text.rfind(end_char)
        if end != -1:
            text = text[start : end + 1]

    return json.loads(text)


def _normalize_questions(raw: Any, role: str, num_questions: int) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return _fallback_questions(role, num_questions)

    questions: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        category = str(item.get("category", "behavioral")).strip().lower()
        difficulty = str(item.get("difficulty", "medium")).strip().lower()

        if not question:
            continue
        if category not in _VALID_CATEGORIES:
            category = "behavioral"
        if difficulty not in _VALID_DIFFICULTIES:
            difficulty = "medium"

        questions.append(
            {"question": question, "category": category, "difficulty": difficulty}
        )

    return questions[:num_questions] or _fallback_questions(role, num_questions)


def _normalize_feedback(raw: Any, response_text: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return _fallback_feedback(response_text)

    try:
        score = int(raw.get("score", 7))
    except (TypeError, ValueError):
        score = 7

    def string_list(value: Any, default: list[str]) -> list[str]:
        if not isinstance(value, list):
            return default
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return cleaned or default

    return {
        "score": max(1, min(score, 10)),
        "strengths": string_list(raw.get("strengths"), ["You provided a clear response"]),
        "improvements": string_list(
            raw.get("improvements"), ["Add one specific example using the STAR method"]
        ),
        "filler_words": string_list(raw.get("filler_words"), []),
    }


def _fallback_feedback(response_text: str) -> dict[str, Any]:
    filler_words = [
        word for word in ["um", "uh", "like", "you know", "basically"] if word in response_text.lower()
    ]
    return {
        "score": 7,
        "strengths": ["You answered the question", "Your response shows engagement"],
        "improvements": ["Add more specific examples", "Structure the answer using the STAR method"],
        "filler_words": filler_words,
    }


def _has_real_anthropic_key() -> bool:
    key = settings.anthropic_api_key.strip()
    return bool(key) and key != "your-key-here"


async def generate_interview_questions(
    role: str,
    experience_level: str = "Mid-Level",
    difficulty: str = "Medium",
    focus: str = "General",
    num_questions: int = 5,
) -> list[dict[str, str]]:
    role = role.strip()
    if not _has_real_anthropic_key():
        return _fallback_questions(role, num_questions)

    prompt = f"""Generate {num_questions} mock interview questions for a {role} position.

CONTEXT:
- Experience Level: {experience_level}
- Target Difficulty: {difficulty}
- Interview Focus: {focus}

Return ONLY a JSON array with no extra text. Each object must have exactly these keys:
- "question": the interview question as a string
- "category": one of "behavioral", "technical", or "situational"
- "difficulty": one of "easy", "medium", or "hard"
"""

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = getattr(message.content[0], "text", "")
        return _normalize_questions(_extract_json(text), role, num_questions)
    except Exception:
        return _fallback_questions(role, num_questions)


async def generate_feedback(role: str, question: str, response_text: str) -> dict[str, Any]:
    if not _has_real_anthropic_key():
        return _fallback_feedback(response_text)

    prompt = f"""You are an expert interview coach evaluating a candidate for a {role} position.

Question asked: {question}
Candidate's response: {response_text}

Return ONLY a JSON object with no extra text and exactly these keys:
- "score": integer 1-10
- "strengths": array of 1-3 short strength strings
- "improvements": array of 1-3 short improvement strings
- "filler_words": array of filler words found, or [] if none
"""

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = getattr(message.content[0], "text", "")
        return _normalize_feedback(_extract_json(text), response_text)
    except Exception:
        return _fallback_feedback(response_text)
