from fastapi import APIRouter

router = APIRouter(prefix="/interviews", tags=["Interviews"])


# TODO (Sprint 2): Add these endpoints
# POST   /interviews/start       - Start a new interview session
# GET    /interviews/{id}        - Get session details
# POST   /interviews/{id}/answer - Submit an answer
# POST   /interviews/{id}/end    - End the session
