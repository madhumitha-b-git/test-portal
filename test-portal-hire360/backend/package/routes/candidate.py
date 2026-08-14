from fastapi import APIRouter, HTTPException
from models.candidate import RegisterRequest, SubmitRequest
from services import candidate_service

router = APIRouter()

@router.post("/register")
def register(request: RegisterRequest):
    """
    POST /register
    Validates input, hashes password, stores user in DynamoDB
    """
    try:
        result = candidate_service.register_candidate(
            name=request.name,
            email=request.email,
            mobile=request.mobile,
            password=request.password
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/questions")
def questions():
    """
    GET /questions
    Reads and returns all questions from questions.json
    """
    try:
        data = candidate_service.get_questions()
        duration = candidate_service.get_test_duration()
        return {"questions": data, "total_duration_minutes": duration}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit")
def submit(request: SubmitRequest):
    """
    POST /submit
    Stores candidate answers in DynamoDB Answers table
    """
    try:
        result = candidate_service.submit_answers(
            mailId=request.mailId,
            testId=request.testId,
            durationMinutes=request.durationMinutes,
            submitTime=request.submitTime,
            answers=request.answers
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/answers/{testId}")
def sync_answers(testId: str):
    """
    POST /sync/answers/{testId}
    Fetches answers from the external URL and syncs them to DynamoDB
    """
    try:
        result = candidate_service.sync_answers_from_external(testId)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
