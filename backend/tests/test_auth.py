import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db

# Use an in-memory SQLite database for tests
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


@pytest.mark.asyncio
async def test_signup_success(client):
    response = await client.post("/api/auth/signup", json={
        "full_name": "Test User",
        "email": "test@ucsc.edu",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@ucsc.edu"
    assert data["full_name"] == "Test User"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_email(client):
    payload = {"full_name": "Test User", "email": "dupe@ucsc.edu", "password": "password123"}
    await client.post("/api/auth/signup", json=payload)
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/auth/signup", json={
        "full_name": "Test User",
        "email": "login@ucsc.edu",
        "password": "password123",
    })
    response = await client.post("/api/auth/login", json={
        "email": "login@ucsc.edu",
        "password": "password123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/signup", json={
        "full_name": "Test User",
        "email": "wrong@ucsc.edu",
        "password": "password123",
    })
    response = await client.post("/api/auth/login", json={
        "email": "wrong@ucsc.edu",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    response = await client.post("/api/auth/login", json={
        "email": "nobody@ucsc.edu",
        "password": "password123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client):
    await client.post("/api/auth/signup", json={
        "full_name": "Me User",
        "email": "me@ucsc.edu",
        "password": "password123",
    })
    login = await client.post("/api/auth/login", json={
        "email": "me@ucsc.edu",
        "password": "password123",
    })
    token = login.json()["access_token"]
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@ucsc.edu"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
