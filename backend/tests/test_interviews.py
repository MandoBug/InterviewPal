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
    {"question": "Describe a challenge you overcame.", "category": "behavioral", "difficulty": "medium"},
    {"question": "How do you handle tight deadlines?", "category": "situational", "difficulty": "medium"},
]

MOCK_FEEDBACK = {
    "score": 8,
    "strengths": ["Clear communication", "Good examples"],
    "improvements": ["Be more concise"],
    "filler_words": [],
}


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
        "full_name": "Interview Tester",
        "email": "interviewer@ucsc.edu",
        "password": "password123",
    })
    res = await client.post("/api/auth/login", json={
        "email": "interviewer@ucsc.edu",
        "password": "password123",
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_start_interview_authenticated(client, auth_token):
    with patch("app.api.routes.interviews.generate_interview_questions", return_value=MOCK_QUESTIONS):
        response = await client.post(
            "/api/interviews/start",
            json={"role": "Software Engineer"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "Software Engineer"
    assert data["status"] == "in_progress"
    assert len(data["questions"]) == 3


@pytest.mark.asyncio
async def test_start_interview_unauthenticated(client):
    response = await client.post("/api/interviews/start", json={"role": "Software Engineer"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_submit_answer(client, auth_token):
    with patch("app.api.routes.interviews.generate_interview_questions", return_value=MOCK_QUESTIONS):
        start = await client.post(
            "/api/interviews/start",
            json={"role": "Software Engineer"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    session_id = start.json()["id"]

    with patch("app.api.routes.interviews.generate_feedback", return_value=MOCK_FEEDBACK):
        response = await client.post(
            f"/api/interviews/{session_id}/answer",
            json={"question": "Tell me about yourself.", "answer": "I am a software engineer."},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    assert response.status_code == 200
    feedback = response.json()["feedback"]
    assert feedback["score"] == 8
    assert "strengths" in feedback


@pytest.mark.asyncio
async def test_end_interview(client, auth_token):
    with patch("app.api.routes.interviews.generate_interview_questions", return_value=MOCK_QUESTIONS):
        start = await client.post(
            "/api/interviews/start",
            json={"role": "Software Engineer"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    session_id = start.json()["id"]

    response = await client.post(
        f"/api/interviews/{session_id}/end",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_get_interview_session(client, auth_token):
    with patch("app.api.routes.interviews.generate_interview_questions", return_value=MOCK_QUESTIONS):
        start = await client.post(
            "/api/interviews/start",
            json={"role": "Data Analyst"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    session_id = start.json()["id"]

    response = await client.get(
        f"/api/interviews/{session_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "Data Analyst"
