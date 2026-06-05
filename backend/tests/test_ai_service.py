import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.ai_service import (
    generate_interview_questions,
    generate_feedback,
    _has_real_openai_key,
    _has_real_anthropic_key,
)

@pytest.mark.asyncio
async def test_has_real_keys():
    with patch("app.services.ai_service.settings") as mock_settings:
        mock_settings.openai_api_key = "your-key-here"
        mock_settings.anthropic_api_key = ""
        assert not _has_real_openai_key()
        assert not _has_real_anthropic_key()

        mock_settings.openai_api_key = "sk-proj-xyz"
        mock_settings.anthropic_api_key = "sk-ant-xyz"
        assert _has_real_openai_key()
        assert _has_real_anthropic_key()

@pytest.mark.asyncio
async def test_openai_priority_generation():
    with patch("app.services.ai_service.settings") as mock_settings, \
         patch("app.services.ai_service.AsyncOpenAI") as mock_openai_cls:
        
        mock_settings.openai_api_key = "sk-proj-xyz"
        mock_settings.anthropic_api_key = "sk-ant-xyz"
        
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        
        mock_choice = MagicMock()
        mock_choice.message.content = '[{"question": "How do you handle conflict?", "category": "behavioral", "difficulty": "medium"}]'
        
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        res = await generate_interview_questions("Software Engineer", num_questions=1)
        assert len(res) == 1
        assert res[0]["question"] == "How do you handle conflict?"
        
        mock_openai_cls.assert_called_once_with(api_key="sk-proj-xyz")

@pytest.mark.asyncio
async def test_openai_priority_feedback():
    with patch("app.services.ai_service.settings") as mock_settings, \
         patch("app.services.ai_service.AsyncOpenAI") as mock_openai_cls:
        
        mock_settings.openai_api_key = "sk-proj-xyz"
        mock_settings.anthropic_api_key = "sk-ant-xyz"
        
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        
        mock_choice = MagicMock()
        mock_choice.message.content = '{"score": 9, "strengths": ["Clear communication"], "improvements": ["More code detail"], "filler_words": []}'
        
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        res = await generate_feedback("Software Engineer", "Why python?", "Because it is simple.")
        assert res["score"] == 9
        assert res["strengths"] == ["Clear communication"]
        assert res["improvements"] == ["More code detail"]
        
        mock_openai_cls.assert_called_once_with(api_key="sk-proj-xyz")

@pytest.mark.asyncio
async def test_fallback_to_anthropic():
    with patch("app.services.ai_service.settings") as mock_settings, \
         patch("app.services.ai_service.anthropic.AsyncAnthropic") as mock_anthropic_cls:
        
        mock_settings.openai_api_key = "your-key-here"  # Invalid/Not real
        mock_settings.anthropic_api_key = "sk-ant-xyz"
        
        mock_client = MagicMock()
        mock_anthropic_cls.return_value = mock_client
        
        mock_content = MagicMock()
        mock_content.text = '[{"question": "What is clean code?", "category": "technical", "difficulty": "hard"}]'
        
        mock_message = MagicMock()
        mock_message.content = [mock_content]
        
        mock_client.messages.create = AsyncMock(return_value=mock_message)
        
        res = await generate_interview_questions("Developer", num_questions=1)
        assert len(res) == 1
        assert res[0]["question"] == "What is clean code?"
        mock_anthropic_cls.assert_called_once_with(api_key="sk-ant-xyz")


@pytest.mark.asyncio
async def test_end_interview_video_batch():
    from app.api.routes.interviews import end_interview
    from app.models.interview import InterviewSession, SessionStatus
    from app.models.recording import Recording
    from uuid import uuid4
    from unittest.mock import mock_open
    
    session_id = uuid4()
    user_id = uuid4()
    
    mock_session = InterviewSession(
        id=session_id,
        user_id=user_id,
        role="Developer",
        interview_type="video",
        status=SessionStatus.IN_PROGRESS,
    )
    
    mock_recording = Recording(
        session_id=session_id,
        user_id=user_id,
        question_index=0,
        question_text="Describe OOP",
        filename="test_file.webm",
        duration_seconds=10,
        transcript=None,
        feedback=None,
    )
    
    # Mock DB session
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    mock_result_session = MagicMock()
    mock_result_session.scalar_one_or_none.return_value = mock_session
    
    mock_result_recs = MagicMock()
    mock_result_recs.scalars.return_value.all.return_value = [mock_recording]
    
    mock_db.execute.side_effect = [mock_result_session, mock_result_recs, MagicMock()]
    
    with patch("app.api.routes.interviews.os.path.exists", return_value=True), \
         patch("app.api.routes.interviews.open", mock_open(read_data=b"fake audio")), \
         patch("app.api.routes.interviews.transcribe_recording_assemblyai", return_value="OOP stands for object oriented programming.") as mock_transcribe, \
         patch("app.api.routes.interviews.generate_feedback", return_value={"score": 8, "strengths": ["Clear definition"], "improvements": [], "filler_words": []}) as mock_grade, \
         patch("app.api.routes.interviews.os.remove") as mock_remove:
        
        res = await end_interview(
            session_id=session_id,
            current_user={"user_id": str(user_id)},
            db=mock_db
        )
        
        assert res.status == SessionStatus.COMPLETED
        assert mock_recording.transcript == "OOP stands for object oriented programming."
        assert "Clear definition" in mock_recording.feedback
        assert res.score == 8
        mock_transcribe.assert_called_once()
        mock_grade.assert_called_once()
        mock_remove.assert_called_once()
