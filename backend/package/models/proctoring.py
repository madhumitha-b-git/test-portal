from pydantic import BaseModel, field_validator


class SessionStartRequest(BaseModel):
    mailId: str
    testId: str
    durationMinutes: int

    @field_validator("mailId")
    @classmethod
    def mailid_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class WarningIncrementRequest(BaseModel):
    mailId: str
    testId: str

    @field_validator("mailId")
    @classmethod
    def mailid_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class ProctoringReportRequest(BaseModel):
    mailId: str
    testId: str
    durationMinutes: int
    starttime: str
    endtime: str
    status: str
    warningCount: int

    @field_validator("mailId")
    @classmethod
    def mailid_must_be_valid(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v):
        if v not in ("SUCCESS", "TERMINATED"):
            raise ValueError("Status must be SUCCESS or TERMINATED")
        return v
