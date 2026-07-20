from pydantic import BaseModel, field_validator


class SessionStartRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class WarningIncrementRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class ProctoringReportRequest(BaseModel):
    email: str
    startedTime: str
    endedTime: str
    status: str
    warningCount: int

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v):
        if v not in ("SUCCESS", "TERMINATED"):
            raise ValueError("Status must be SUCCESS or TERMINATED")
        return v
