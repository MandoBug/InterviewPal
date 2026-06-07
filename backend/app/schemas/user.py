from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


# ── Request Schemas ──

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class PasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


# ── Response Schemas ──

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    password_updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
