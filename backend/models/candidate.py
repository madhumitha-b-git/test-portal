import re
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
    password: Optional[str] = None
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
        v_clean = (v or "").strip().lower()
        if not v_clean or not re.match(r"^[a-z]", v_clean):
            raise ValueError("Email address must start with a letter (a-z)")
        local_part = v_clean.split("@")[0] if "@" in v_clean else v_clean
        if re.search(r"[^a-z0-9._]", local_part):
            raise ValueError("Email contains invalid symbols. Only letters, numbers, dots, and underscores (_) are allowed")
        if not is_valid_email_domain(v_clean):
            raise ValueError("Email domain must be one of: gmail.com, yahoo.com, outlook.com, ritchennai.edu.in, rajalakshmi.edu.in, bitsathy.ac.in")
        return v_clean

    @field_validator("mobile")
    @classmethod
    def mobile_must_be_valid(cls, v):
        v_clean = (v or "").strip()
        if not v_clean.isdigit() or len(v_clean) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        if v_clean[0] not in ("6", "7", "8", "9"):
            raise ValueError("Mobile number must start with 6, 7, 8, or 9")
        if v_clean in {"1234567890", "9876543210", "0123456789"} or len(set(v_clean)) == 1:
            raise ValueError("Invalid mobile number. Please provide a valid mobile number.")
        return v_clean

    @field_validator("college")
    @classmethod
    def college_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("College name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    """Model for POST /login request body"""
    mailId: str
    password: Optional[str] = None
    testId: Optional[str] = None


    @field_validator("mailId")
    @classmethod
    def mailId_must_be_valid(cls, v):
        if not is_valid_email_domain(v):
            raise ValueError("Email domain must be one of: gmail.com, yahoo.com, outlook.com, ritchennai.edu.in, rajalakshmi.edu.in, bitsathy.ac.in")
        return v.lower().strip()


class AnswerItem(BaseModel):
    """Single question answer"""
    questionId: str
    selectedOption: Optional[str] = None
    selectedOptionId: Optional[str] = None
    selectedOptionText: Optional[str] = None
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
