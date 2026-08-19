from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional

ALLOWED_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "ritchennai.edu.in",
    "rajalakshmi.edu.in",
    "bitsathy.ac.in",
}

def is_valid_email_domain(email: str) -> bool:
    email_clean = (email or "").strip().lower()
    if "@" not in email_clean:
        return False
    parts = email_clean.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return False
    return parts[1] in ALLOWED_EMAIL_DOMAINS

class RegisterRequest(BaseModel):
    """Model for POST /register request body"""
    name: str
    mailId: str
    mobile: str
    college: str
    regNo: Optional[str] = ""
    password: str
    testId: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("mailId")
    @classmethod
    def mailId_must_be_valid(cls, v):
        if not is_valid_email_domain(v):
            raise ValueError("Email domain must be one of: gmail.com, yahoo.com, outlook.com, ritchennai.edu.in, rajalakshmi.edu.in, bitsathy.ac.in")
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
    def password_must_be_4_digit_pin(cls, v):
        if not v.isdigit() or len(v) != 4:
            raise ValueError("Password must be a 4-digit number")
        return v


class LoginRequest(BaseModel):
    """Model for POST /login request body"""
    mailId: str
    password: str
    testId: Optional[str] = None


    @field_validator("mailId")
    @classmethod
    def mailId_must_be_valid(cls, v):
        if not is_valid_email_domain(v):
            raise ValueError("Email domain must be one of: gmail.com, yahoo.com, outlook.com, ritchennai.edu.in, rajalakshmi.edu.in, bitsathy.ac.in")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_must_be_4_digit_pin(cls, v):
        if not v.isdigit() or len(v) != 4:
            raise ValueError("Password must be a 4-digit number")
        return v


class AnswerItem(BaseModel):
    """Single question answer"""
    questionId: str
    selectedOption: Optional[str] = None
    typedAnswer: Optional[str] = None

class SectionResponses(BaseModel):
    """Group of answers for a section"""
    sectionId: str
    sectionName: Optional[str] = None
    questionType: Optional[str] = None
    responses: List[AnswerItem]

class SubmitRequest(BaseModel):
    """Model for POST /submit request body"""
    mailId: str
    testId: str
    submittedAt: str = ""
    sections: List[SectionResponses]
