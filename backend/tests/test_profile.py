from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.interview import InterviewSession, SessionStatus

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


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
async def profile_user(client):
    await client.post(
        "/api/auth/signup",
        json={
            "full_name": "Profile Tester",
            "email": "profile@ucsc.edu",
            "password": "password123",
        },
    )
    login = await client.post(
        "/api/auth/login",
        json={
            "email": "profile@ucsc.edu",
            "password": "password123",
        },
    )
    token = login.json()["access_token"]
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    return {"token": token, "user": response.json()}


async def seed_interview_session(
    user_id: UUID,
    role: str,
    interview_type: str,
    score: int | None,
    completed_at: datetime | None,
    status: SessionStatus = SessionStatus.COMPLETED,
):
    async with TestSession() as session:
        session.add(
            InterviewSession(
                user_id=user_id,
                role=role,
                interview_type=interview_type,
                status=status,
                score=score,
                completed_at=completed_at,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_profile_loads_authenticated_user(client, profile_user):
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profile@ucsc.edu"
    assert data["full_name"] == "Profile Tester"
    assert data["is_active"] is True
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_profile_update_name_and_email(client, profile_user):
    response = await client.put(
        "/api/auth/me",
        json={
            "full_name": "Updated Profile Tester",
            "email": "updated-profile@ucsc.edu",
        },
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Profile Tester"
    assert data["email"] == "updated-profile@ucsc.edu"

    refreshed = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )
    assert refreshed.json()["email"] == "updated-profile@ucsc.edu"


@pytest.mark.asyncio
async def test_profile_update_rejects_duplicate_email(client, profile_user):
    await client.post(
        "/api/auth/signup",
        json={
            "full_name": "Existing User",
            "email": "existing@ucsc.edu",
            "password": "password123",
        },
    )

    response = await client.put(
        "/api/auth/me",
        json={
            "full_name": "Profile Tester",
            "email": "existing@ucsc.edu",
        },
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_profile_update_requires_authentication(client):
    response = await client.put(
        "/api/auth/me",
        json={
            "full_name": "Anonymous Update",
            "email": "anonymous@ucsc.edu",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_password_change_updates_login_credentials(client, profile_user):
    response = await client.put(
        "/api/auth/me/password",
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
        },
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Password updated successfully"

    old_login = await client.post(
        "/api/auth/login",
        json={
            "email": "profile@ucsc.edu",
            "password": "password123",
        },
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/auth/login",
        json={
            "email": "profile@ucsc.edu",
            "password": "newpassword123",
        },
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


@pytest.mark.asyncio
async def test_profile_password_change_rejects_wrong_current_password(client, profile_user):
    response = await client.put(
        "/api/auth/me/password",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword123",
        },
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 400
    assert "Current password is incorrect" in response.json()["detail"]


@pytest.mark.asyncio
async def test_profile_password_change_requires_authentication(client):
    response = await client.put(
        "/api/auth/me/password",
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_stats_include_only_completed_current_user_sessions(client, profile_user):
    user_id = UUID(profile_user["user"]["id"])
    now = datetime.now(timezone.utc)

    await seed_interview_session(user_id, "Software Engineer", "text", 8, now - timedelta(days=3))
    await seed_interview_session(user_id, "Software Engineer", "text", 10, now - timedelta(days=2))
    await seed_interview_session(user_id, "Product Manager", "video", 6, now - timedelta(days=1))
    await seed_interview_session(
        user_id,
        "Data Analyst",
        "text",
        2,
        now,
        status=SessionStatus.IN_PROGRESS,
    )

    other_signup = await client.post(
        "/api/auth/signup",
        json={
            "full_name": "Other User",
            "email": "other-profile@ucsc.edu",
            "password": "password123",
        },
    )
    other_user_id = UUID(other_signup.json()["id"])
    await seed_interview_session(other_user_id, "Other Role", "text", 1, now)

    response = await client.get(
        "/api/interviews/stats",
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "total_completed": 3,
        "average_text_score": 9,
        "average_video_score": 6,
        "most_interviewed_role": "Software Engineer",
    }


@pytest.mark.asyncio
async def test_profile_progress_returns_completed_scored_sessions_in_order(client, profile_user):
    user_id = UUID(profile_user["user"]["id"])
    now = datetime.now(timezone.utc)

    await seed_interview_session(user_id, "First Role", "text", 7, now - timedelta(days=2))
    await seed_interview_session(user_id, "Ignored No Score", "text", None, now - timedelta(days=1))
    await seed_interview_session(user_id, "Second Role", "video", 9, now)

    response = await client.get(
        "/api/interviews/progress",
        headers={"Authorization": f"Bearer {profile_user['token']}"},
    )

    assert response.status_code == 200
    progress = response.json()
    assert [item["role"] for item in progress] == ["First Role", "Second Role"]
    assert [item["score"] for item in progress] == [7, 9]
    assert [item["interview_type"] for item in progress] == ["text", "video"]
