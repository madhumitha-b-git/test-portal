from pydantic import BaseModel, field_validator

class ExecuteRequest(BaseModel):
    """Request model for POST /execute endpoint"""
    code: str
    input: str = ""

    @field_validator("code")
    @classmethod
    def code_length_must_not_exceed_limit(cls, v: str) -> str:
        if len(v) > 10000:
            raise ValueError("Source code exceeds maximum allowed length of 10,000 characters.")
        return v


class ExecuteResponse(BaseModel):
    """Response model for POST /execute endpoint"""
    status: str  # "success", "error", "timeout"
    output: str
    executionTimeMs: int
