from pydantic import BaseModel, EmailStr, field_validator
from typing import List

class RegisterRequest(BaseModel):
    """Model for POST /register request body"""
    name: str
    mailId: str
    mobile: str
    college: str

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


class AnswerItem(BaseModel):
    """Single question answer"""
    questionId: str
    selectedOption: str = ""


class SubmitRequest(BaseModel):
    """Model for POST /submit request body"""
    mailId: str
    testId: str
    responses: List[AnswerItem]
