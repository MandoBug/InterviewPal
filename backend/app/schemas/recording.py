from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class RecordingResponse(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    question_index: int
    question_text: str
    filename: str
    duration_seconds: int
    created_at: datetime

    model_config = {"from_attributes": True}
