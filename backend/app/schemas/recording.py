from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class RecordingResponse(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    question_index: int
    question_text: str
    filename: str
    duration_seconds: int
    transcript: str | None = None
    feedback: Any | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
