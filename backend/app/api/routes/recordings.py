import json
import uuid
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.recording import Recording
from app.models.interview import InterviewSession
from app.schemas.recording import RecordingResponse

router = APIRouter(prefix="/recordings", tags=["Recordings"])

ALLOWED_TYPES = {"video/webm", "video/mp4", "audio/webm", "audio/mp4", "audio/ogg"}
MAX_SIZE_MB = 100
RECORDINGS_DIR = "recordings_media"
os.makedirs(RECORDINGS_DIR, exist_ok=True)


@router.post("/upload", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    session_id: UUID = Form(...),
    question_index: int = Form(...),
    question_text: str = Form(...),
    duration_seconds: int = Form(0),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session belongs to user
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    # Validate file type (split on ';' to ignore codecs parameter)
    base_type = file.content_type.split(";")[0].strip()
    if base_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: {', '.join(ALLOWED_TYPES)}"
        )

    # Validate file size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_SIZE_MB}MB.")

    # Save to local directory
    filename = f"{uuid.uuid4()}_{file.filename or 'recording.webm'}"
    file_path = os.path.join(RECORDINGS_DIR, filename)
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write recording to disk: {str(e)}"
        )

    # Save metadata into database. Transcript & feedback are pending until session end.
    recording = Recording(
        session_id=session_id,
        user_id=uuid.UUID(current_user["user_id"]),
        question_index=question_index,
        question_text=question_text,
        filename=filename,
        duration_seconds=duration_seconds,
        transcript=None,
        feedback=None,
    )
    db.add(recording)
    await db.flush()
    await db.refresh(recording)
    return recording


@router.get("/session/{session_id}", response_model=list[RecordingResponse])
async def get_recordings_by_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session belongs to user
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    result = await db.execute(
        select(Recording)
        .where(Recording.session_id == session_id)
        .order_by(Recording.question_index)
    )
    return result.scalars().all()


@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    recording_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if str(recording.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your recording")

    # Clean up local file
    file_path = os.path.join(RECORDINGS_DIR, recording.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await db.delete(recording)
