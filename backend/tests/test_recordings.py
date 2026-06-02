import io
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from unittest.mock import patch

from app.main import app
from app.core.database import Base, get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

MOCK_QUESTIONS = [
    {"question": "Tell me about yourself.", "category": "behavioral", "difficulty": "easy"},
]


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_token(client):
    await client.post("/api/auth/signup", json={
        "full_name": "Recording Tester",
        "email": "recorder@ucsc.edu",
        "password": "password123",
    })
    res = await client.post("/api/auth/login", json={
        "email": "recorder@ucsc.edu",
        "password": "password123",
    })
    return res.json()["access_token"]


@pytest.fixture
async def session_id(client, auth_token):
    with patch("app.api.routes.interviews.generate_interview_questions", return_value=MOCK_QUESTIONS):
        res = await client.post(
            "/api/interviews/start",
            json={"role": "Software Engineer"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    return res.json()["id"]


@pytest.mark.asyncio
async def test_upload_recording(client, auth_token, session_id):
    fake_video = io.BytesIO(b"fake video content")
    response = await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "45",
        },
        files={"file": ("recording.webm", fake_video, "video/webm")},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["question_index"] == 0
    assert data["duration_seconds"] == 45
    assert data["session_id"] == session_id


@pytest.mark.asyncio
async def test_upload_invalid_file_type(client, auth_token, session_id):
    fake_file = io.BytesIO(b"not a video")
    response = await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "10",
        },
        files={"file": ("recording.txt", fake_file, "text/plain")},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_recordings_by_session(client, auth_token, session_id):
    fake_video = io.BytesIO(b"fake video content")
    await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "30",
        },
        files={"file": ("recording.webm", fake_video, "video/webm")},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    response = await client.get(
        f"/api/recordings/session/{session_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["question_text"] == "Tell me about yourself."


@pytest.mark.asyncio
async def test_delete_recording(client, auth_token, session_id):
    fake_video = io.BytesIO(b"fake video content")
    upload = await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "20",
        },
        files={"file": ("recording.webm", fake_video, "video/webm")},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    recording_id = upload.json()["id"]

    response = await client.delete(
        f"/api/recordings/{recording_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 204

    # Confirm it's gone
    check = await client.get(
        f"/api/recordings/session/{session_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert check.json() == []


@pytest.mark.asyncio
async def test_delete_recording_unauthenticated(client, auth_token, session_id):
    fake_video = io.BytesIO(b"fake video content")
    upload = await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "20",
        },
        files={"file": ("recording.webm", fake_video, "video/webm")},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    recording_id = upload.json()["id"]

    response = await client.delete(f"/api/recordings/{recording_id}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_unauthenticated(client, session_id):
    fake_video = io.BytesIO(b"fake video content")
    response = await client.post(
        "/api/recordings/upload",
        data={
            "session_id": session_id,
            "question_index": "0",
            "question_text": "Tell me about yourself.",
            "duration_seconds": "10",
        },
        files={"file": ("recording.webm", fake_video, "video/webm")},
    )
    assert response.status_code == 401
