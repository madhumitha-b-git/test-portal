from pydantic import BaseModel, EmailStr, field_validator
from typing import List

class RegisterRequest(BaseModel):
    """Model for POST /register request body"""
    name: str
    email: str
    mobile: str
    password: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("mobile")
    @classmethod
    def mobile_must_be_valid(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Mobile must be 10 digits")
        return v

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class AnswerItem(BaseModel):
    """Single question answer"""
    questionId: str
    selectedOption: str


class SubmitRequest(BaseModel):
    """Model for POST /submit request body"""
    name: str
    email: str
    responses: List[AnswerItem]
