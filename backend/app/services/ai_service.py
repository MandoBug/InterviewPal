"""
AI service for generating interview questions and feedback.
This will be the main integration point for Claude/OpenAI APIs.

Expand this in Sprint 2 (question generation) and Sprint 4 (feedback).
"""

from app.core.config import get_settings

settings = get_settings()


async def generate_interview_questions(role: str, num_questions: int = 5) -> list[dict]:
    """
    Generate interview questions tailored to a specific job role.

    TODO (Sprint 2):
    - Call Claude/OpenAI API with a structured prompt
    - Include role context for personalized questions
    - Cache common role questions in Redis

    Args:
        role: The job role (e.g., "Software Engineer", "Product Manager")
        num_questions: Number of questions to generate

    Returns:
        List of question dicts with 'question', 'category', and 'difficulty' keys
    """
    # Placeholder - replace with actual AI call
    return [
        {
            "question": f"Sample question {i+1} for {role}",
            "category": "behavioral",
            "difficulty": "medium",
        }
        for i in range(num_questions)
    ]


async def generate_feedback(role: str, question: str, response_text: str) -> dict:
    """
    Analyze a user's interview response and provide feedback.

    TODO (Sprint 4):
    - Send question + response to AI for analysis
    - Return structured feedback with scores
    - Detect filler words and speech patterns

    Returns:
        Dict with 'score', 'strengths', 'improvements', 'filler_words' keys
    """
    # Placeholder
    return {
        "score": 0,
        "strengths": [],
        "improvements": [],
        "filler_words": [],
    }
