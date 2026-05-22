from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.interview import InterviewSession, SessionStatus
from app.schemas.interview import (
    StartInterviewRequest,
    SubmitAnswerRequest,
    InterviewSessionResponse,
    InterviewQuestion,
)
from app.services.ai_service import generate_interview_questions, generate_feedback

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.post("/start", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    payload: StartInterviewRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = InterviewSession(
        user_id=current_user["user_id"],
        role=payload.role.strip(),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    questions = await generate_interview_questions(
        role=payload.role.strip(),
        experience_level=payload.experience_level,
        difficulty=payload.difficulty,
        focus=payload.interview_focus,
    )

    return InterviewSessionResponse(
        id=session.id,
        user_id=session.user_id,
        role=session.role,
        status=session.status,
        score=session.score,
        feedback=session.feedback,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[InterviewQuestion(**q) for q in questions],
    )


@router.get("/{session_id}", response_model=InterviewSessionResponse)
async def get_interview(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    return session


@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: UUID,
    payload: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != SessionStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Session is not in progress")

    feedback = await generate_feedback(session.role, payload.question, payload.answer)
    return {"feedback": feedback}


@router.post("/{session_id}/end", response_model=InterviewSessionResponse)
async def end_interview(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)

    return session
