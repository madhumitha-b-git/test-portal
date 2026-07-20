from fastapi import APIRouter, HTTPException
from models.proctoring import (
    SessionStartRequest,
    WarningIncrementRequest,
    ProctoringReportRequest,
)
from services import proctoring_service

router = APIRouter(prefix="/proctoring", tags=["proctoring"])


@router.get("/sessions")
def get_all_sessions():
    try:
        return proctoring_service.get_all_sessions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session")
def start_session(request: SessionStartRequest):
    try:
        result = proctoring_service.start_session(request.email)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{email}")
def get_session(email: str):
    try:
        result = proctoring_service.get_session(email.lower().strip())
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/warning")
def increment_warning(request: WarningIncrementRequest):
    try:
        result = proctoring_service.increment_warning(request.email)
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report")
def submit_report(request: ProctoringReportRequest):
    try:
        session = proctoring_service.end_session(
            request.email, request.status
        )
        report = {
            "email": session["email"],
            "startedTime": session["startedTime"],
            "endedTime": session["endedTime"],
            "status": session["status"],
            "warningCount": session["warningCount"],
        }
        external_result = proctoring_service.submit_report_to_external(report)
        return {"session": report, "externalSubmission": external_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
