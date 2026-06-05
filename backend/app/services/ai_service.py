import json
import re
from typing import Any

import anthropic
from openai import AsyncOpenAI

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
    text = response_text.strip()
    filler_words = [
        word for word in ["um", "uh", "like", "you know", "basically"] if word in text.lower()
    ]
    
    # Check for test phrases or extremely short responses
    lower_text = text.lower()
    is_test_phrase = any(phrase in lower_text for phrase in ["test question", "testing", "this is a test", "placeholder"])
    
    if not text:
        return {
            "score": 1,
            "strengths": ["No answer provided"],
            "improvements": ["Please record a response to receive feedback."],
            "filler_words": filler_words,
        }
    
    if is_test_phrase or len(text) < 15:
        # Very short or obvious test/placeholder response
        score = 1 if (is_test_phrase or len(text) < 8) else 2
        return {
            "score": score,
            "strengths": ["Clear microphone audio capture" if text else "Audio captured"],
            "improvements": [
                "Provide a genuine professional answer instead of test/placeholder text.",
                "Aim for a comprehensive response (usually 45-90 seconds long).",
                "Use the STAR method (Situation, Task, Action, Result) to structure your answer."
            ],
            "filler_words": filler_words,
        }
        
    # Moderately short response
    if len(text) < 60:
        return {
            "score": 4,
            "strengths": ["Direct response to the prompt", "Clear sentence structure"],
            "improvements": [
                "Elaborate on your points with specific project examples.",
                "Detail your individual contributions and action steps.",
                "Include the business impact or quantitative results of your actions."
            ],
            "filler_words": filler_words,
        }
        
    # Long response (looks like a valid attempt)
    return {
        "score": 8,
        "strengths": [
            "Comprehensive response covering details of your experience",
            "Clear logical structure and progression of ideas",
            "Good relevance to the requested role context"
        ],
        "improvements": [
            "Structure your answer using the STAR method for maximum clarity.",
            "Incorporate quantitative metrics (e.g. percentages, time saved) where applicable.",
            "Refine your pacing to minimize use of filler words."
        ],
        "filler_words": filler_words,
    }


def _has_real_anthropic_key() -> bool:
    key = settings.anthropic_api_key.strip()
    return bool(key) and key not in ("", "your-key-here", "your_key_here")


def _has_real_openai_key() -> bool:
    key = settings.openai_api_key.strip()
    return bool(key) and key not in ("", "your-key-here", "your_key_here")


async def generate_interview_questions(
    role: str,
    experience_level: str = "Mid-Level",
    difficulty: str = "Medium",
    focus: str = "General",
    num_questions: int = 5,
) -> list[dict[str, str]]:
    role = role.strip()

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

    if _has_real_openai_key():
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key.strip())
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.7,
            )
            text = response.choices[0].message.content or ""
            return _normalize_questions(_extract_json(text), role, num_questions)
        except Exception as e:
            print(f"OpenAI error in generate_interview_questions: {e}")

    if _has_real_anthropic_key():
        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            text = getattr(message.content[0], "text", "")
            return _normalize_questions(_extract_json(text), role, num_questions)
        except Exception as e:
            print(f"Anthropic error in generate_interview_questions: {e}")

    return _fallback_questions(role, num_questions)


async def generate_feedback(role: str, question: str, response_text: str) -> dict[str, Any]:
    prompt = f"""You are an expert interview coach evaluating a candidate for a {role} position.

Question asked: {question}
Candidate's response: {response_text}

CRITICAL RULES FOR EVALUATION:
1. Do NOT hallucinate details. If the candidate's response is extremely short (e.g. under 15 words, a single short sentence, or just a few words), irrelevant to the question, or contains placeholder/test phrases (such as "this is a test answer" or "test question"), you MUST:
   - Assign a score of 1 or 2.
   - Set the 'strengths' to: ["Clear microphone audio capture"] (do NOT invent strengths like "Clear project description" or "Team collaboration" if no project details exist in the response).
   - Set the 'improvements' to: ["Provide a genuine professional answer instead of test/placeholder text."].
2. Evaluate actual professional responses based on clarity, structure (e.g. STAR method), technical depth, and business impact.

Return ONLY a JSON object with no extra text and exactly these keys:
- "score": integer 1-10
- "strengths": array of 1-3 short strength strings
- "improvements": array of 1-3 short improvement strings
- "filler_words": array of filler words found, or [] if none
"""

    if _has_real_openai_key():
        try:
            client = AsyncOpenAI(api_key=settings.openai_api_key.strip())
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=512,
                temperature=0.5,
            )
            text = response.choices[0].message.content or ""
            return _normalize_feedback(_extract_json(text), response_text)
        except Exception as e:
            print(f"OpenAI error in generate_feedback: {e}")

    if _has_real_anthropic_key():
        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            text = getattr(message.content[0], "text", "")
            return _normalize_feedback(_extract_json(text), response_text)
        except Exception as e:
            print(f"Anthropic error in generate_feedback: {e}")

    return _fallback_feedback(response_text)
