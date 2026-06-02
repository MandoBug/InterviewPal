from fastapi import APIRouter

from app.api.routes import auth, interviews, recordings

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(interviews.router)
api_router.include_router(recordings.router)
