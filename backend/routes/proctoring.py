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
        result = proctoring_service.start_session(request.mailId)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{mail_id}")
def get_session(mail_id: str):
    try:
        result = proctoring_service.get_session(mail_id.lower().strip())
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
        result = proctoring_service.increment_warning(request.mailId)
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
            request.mailId, request.status
        )
        report = {
            "mailId": session["email"],
            "startedTime": session["startedTime"],
            "endedTime": session["endedTime"],
            "status": session["status"],
            "warningCount": session["warningCount"],
        }
        external_result = proctoring_service.submit_report_to_external(report)
        return {"session": report, "externalSubmission": external_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
