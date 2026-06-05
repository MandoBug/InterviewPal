import json
import os
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.interview import InterviewSession, SessionStatus
from app.models.recording import Recording
from app.schemas.interview import (
    StartInterviewRequest,
    SubmitAnswerRequest,
    InterviewProgressPoint,
    InterviewSessionResponse,
    InterviewStatsResponse,
    InterviewQuestion,
)
from app.services.ai_service import generate_interview_questions, generate_feedback
from app.services.transcription_service import transcribe_recording_assemblyai
from app.services.email_service import send_session_summary
from app.models.user import User

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
        interview_type=payload.interview_type,
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
        interview_type=session.interview_type,
        status=session.status,
        score=session.score,
        feedback=session.feedback,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[InterviewQuestion(**q) for q in questions],
    )


@router.get("/stats", response_model=InterviewStatsResponse)
async def get_interview_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = UUID(current_user["user_id"])
    completed_filter = (
        InterviewSession.user_id == user_id,
        InterviewSession.status == SessionStatus.COMPLETED,
    )

    total_completed_result = await db.execute(
        select(func.count()).select_from(InterviewSession).where(*completed_filter)
    )

    average_text_result = await db.execute(
        select(func.avg(InterviewSession.score)).where(
            *completed_filter,
            InterviewSession.interview_type == "text",
            InterviewSession.score.is_not(None),
        )
    )

    average_video_result = await db.execute(
        select(func.avg(InterviewSession.score)).where(
            *completed_filter,
            InterviewSession.interview_type == "video",
            InterviewSession.score.is_not(None),
        )
    )

    most_role_result = await db.execute(
        select(InterviewSession.role, func.count(InterviewSession.id).label("role_count"))
        .where(*completed_filter)
        .group_by(InterviewSession.role)
        .order_by(desc("role_count"), InterviewSession.role)
        .limit(1)
    )

    average_text = average_text_result.scalar_one_or_none()
    average_video = average_video_result.scalar_one_or_none()
    most_role = most_role_result.first()

    return InterviewStatsResponse(
        total_completed=total_completed_result.scalar_one(),
        average_text_score=round(average_text) if average_text is not None else None,
        average_video_score=round(average_video) if average_video is not None else None,
        most_interviewed_role=most_role[0] if most_role else None,
    )


@router.get("/progress", response_model=list[InterviewProgressPoint])
async def get_interview_progress(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = UUID(current_user["user_id"])
    result = await db.execute(
        select(InterviewSession)
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == SessionStatus.COMPLETED,
            InterviewSession.score.is_not(None),
            InterviewSession.completed_at.is_not(None),
        )
        .order_by(InterviewSession.completed_at.asc())
    )

    return result.scalars().all()


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

    previous_feedback: list[dict] = []
    if session.feedback:
        try:
            loaded_feedback = json.loads(session.feedback)
            if isinstance(loaded_feedback, list):
                previous_feedback = [
                    item for item in loaded_feedback if isinstance(item, dict)
                ]
        except json.JSONDecodeError:
            previous_feedback = []

    previous_feedback.append(feedback)
    session.feedback = json.dumps(previous_feedback)

    scores = [
        int(item["score"])
        for item in previous_feedback
        if isinstance(item.get("score"), int)
    ]
    if scores:
        session.score = round(sum(scores) / len(scores))

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

    # For video interviews, batch transcribe and grade all recordings at the end
    if session.interview_type == "video":
        recs_result = await db.execute(
            select(Recording)
            .where(Recording.session_id == session_id)
            .order_by(Recording.question_index)
        )
        recordings = recs_result.scalars().all()

        feedback_list = []

        for recording in recordings:
            if not recording.transcript or not recording.feedback:
                file_path = os.path.join("recordings_media", recording.filename)
                if os.path.exists(file_path):
                    try:
                        with open(file_path, "rb") as f:
                            file_bytes = f.read()

                        # 1. Transcribe
                        transcript_text = await transcribe_recording_assemblyai(file_bytes)
                        recording.transcript = transcript_text

                        # 2. Grade
                        feedback_result = await generate_feedback(session.role, recording.question_text, transcript_text)
                        recording.feedback = json.dumps(feedback_result)
                        db.add(recording)

                        feedback_list.append(feedback_result)

                        # 3. Clean up raw file
                        try:
                            os.remove(file_path)
                        except Exception:
                            pass
                    except Exception:
                        from app.services.ai_service import _fallback_feedback
                        mock_feedback = _fallback_feedback("")
                        recording.transcript = "Transcription unavailable."
                        recording.feedback = json.dumps(mock_feedback)
                        db.add(recording)
                        feedback_list.append(mock_feedback)
                else:
                    from app.services.ai_service import _fallback_feedback
                    mock_feedback = _fallback_feedback("")
                    recording.transcript = "Transcription file missing."
                    recording.feedback = json.dumps(mock_feedback)
                    db.add(recording)
                    feedback_list.append(mock_feedback)
            else:
                try:
                    loaded = json.loads(recording.feedback)
                    feedback_list.append(loaded)
                except Exception:
                    pass

        # Save aggregated feedback and session score
        session.feedback = json.dumps(feedback_list)
        scores = [
            int(item["score"])
            for item in feedback_list
            if isinstance(item.get("score"), int)
        ]
        if scores:
            session.score = round(sum(scores) / len(scores))

    await db.flush()
    await db.refresh(session)

    # Send summary email — fire and forget, don't block the response
    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        await send_session_summary(
            to_email=user.email,
            full_name=user.full_name,
            role=session.role,
            interview_type=session.interview_type,
            score=session.score,
            feedback_json=session.feedback,
        )

    return session
