from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.interview import SessionStatus


class StartInterviewRequest(BaseModel):
    role: str


class SubmitAnswerRequest(BaseModel):
    question: str
    answer: str


class InterviewQuestion(BaseModel):
    question: str
    category: str
    difficulty: str


class InterviewSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    status: SessionStatus
    score: int | None
    feedback: str | None
    created_at: datetime
    completed_at: datetime | None
    questions: list[InterviewQuestion] = []

    model_config = {"from_attributes": True}
