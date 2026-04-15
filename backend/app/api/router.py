from fastapi import APIRouter

from app.api.routes import auth, interviews

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(interviews.router)
