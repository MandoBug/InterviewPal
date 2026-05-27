from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.interview import SessionStatus


class StartInterviewRequest(BaseModel):
    role: str = Field(..., min_length=1, max_length=255)
    interview_type: Literal["text", "video"] = "text"
    experience_level: str = "Mid-Level"
    difficulty: str = "Medium"
    interview_focus: str = "General"


class SubmitAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class InterviewStatsResponse(BaseModel):
    total_completed: int
    average_text_score: int | None
    average_video_score: int | None
    most_interviewed_role: str | None


class InterviewProgressPoint(BaseModel):
    id: UUID
    role: str
    interview_type: str
    score: int
    completed_at: datetime

    model_config = {"from_attributes": True}


class InterviewQuestion(BaseModel):
    question: str
    category: str
    difficulty: str


class InterviewSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    interview_type: str
    status: SessionStatus
    score: int | None
    feedback: str | None
    created_at: datetime
    completed_at: datetime | None
    questions: list[InterviewQuestion] = []

    model_config = {"from_attributes": True}
