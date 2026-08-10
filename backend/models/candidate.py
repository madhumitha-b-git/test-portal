from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional

class RegisterRequest(BaseModel):
    """Model for POST /register request body"""
    name: str
    mailId: str
    mobile: str
    college: str
    password: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("mailId")
    @classmethod
    def mailId_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid mailId address")
        return v.lower().strip()

    @field_validator("mobile")
    @classmethod
    def mobile_must_be_valid(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError("Mobile must be 10 digits")
        return v

    @field_validator("college")
    @classmethod
    def college_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("College name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_must_not_be_empty(cls, v):
        if not v.strip() or len(v.strip()) < 4:
            raise ValueError("Password must be at least 4 characters long")
        return v.strip()


class LoginRequest(BaseModel):
    """Model for POST /login request body"""
    mailId: str
    password: str

    @field_validator("mailId")
    @classmethod
    def mailId_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid mailId address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Password cannot be empty")
        return v.strip()


class AnswerItem(BaseModel):
    """Single question answer"""
    questionId: str
    selectedOption: Optional[str] = None
    typedAnswer: Optional[str] = None

class SectionResponses(BaseModel):
    """Group of answers for a section"""
    sectionId: str
    responses: List[AnswerItem]

class SubmitRequest(BaseModel):
    """Model for POST /submit request body"""
    mailId: str
    testId: str
    submittedAt: str = ""
    sections: List[SectionResponses]
