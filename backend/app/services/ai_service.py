import json
import anthropic
from app.core.config import get_settings

settings = get_settings()
_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_FALLBACK_QUESTIONS = [
    {"question": "Tell me about yourself and your background.", "category": "behavioral", "difficulty": "easy"},
    {"question": "Describe a challenging project you worked on and how you handled it.", "category": "behavioral", "difficulty": "medium"},
    {"question": "Where do you see yourself in five years?", "category": "situational", "difficulty": "easy"},
    {"question": "Tell me about a time you had a conflict with a teammate and how you resolved it.", "category": "behavioral", "difficulty": "medium"},
    {"question": "Walk me through how you would design a URL shortener.", "category": "technical", "difficulty": "hard"},
    {"question": "What is your greatest weakness and what are you doing about it?", "category": "behavioral", "difficulty": "medium"},
    {"question": "Describe a time you had to learn something quickly under pressure.", "category": "situational", "difficulty": "medium"},
]


async def generate_interview_questions(role: str, num_questions: int = 5) -> list[dict]:
    prompt = f"""Generate {num_questions} mock interview questions for a {role} position.

Return ONLY a JSON array with no extra text. Each object must have exactly these keys:
- "question": the interview question (string)
- "category": one of "behavioral", "technical", or "situational" (string)
- "difficulty": one of "easy", "medium", or "hard" (string)

Example format:
[
  {{"question": "Tell me about yourself.", "category": "behavioral", "difficulty": "easy"}}
]"""

    try:
        message = await _client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return _FALLBACK_QUESTIONS[:num_questions]


async def generate_feedback(role: str, question: str, response_text: str) -> dict:
    prompt = f"""You are an expert interview coach evaluating a candidate for a {role} position.

Question asked: {question}
Candidate's response: {response_text}

Return ONLY a JSON object with no extra text and exactly these keys:
- "score": integer 1-10
- "strengths": array of 1-3 short strength strings
- "improvements": array of 1-3 short improvement strings
- "filler_words": array of filler words found (e.g. "um", "like", "you know"), empty array if none

Example:
{{"score": 7, "strengths": ["Clear structure"], "improvements": ["Add specific examples"], "filler_words": ["um"]}}"""

    try:
        message = await _client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        filler_words = [w for w in ["um", "uh", "like", "you know", "basically"] if w in response_text.lower()]
        return {
            "score": 7,
            "strengths": ["You provided a response", "Showed engagement with the question"],
            "improvements": ["Add more specific examples", "Structure your answer using the STAR method"],
            "filler_words": filler_words,
        }
