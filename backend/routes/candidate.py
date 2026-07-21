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
            mailId=request.mailId,
            mobile=request.mobile,
            college=request.college
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
        return {"questions": data}
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
            name=request.name,
            mailId=request.mailId,
            responses=request.responses
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/answers/{test_id}")
def get_answers(test_id: str):
    """
    GET /answers/{test_id}
    Retrieves candidate answers from DynamoDB by testId
    """
    try:
        data = candidate_service.get_answers_by_test_id(test_id)
        return {"answers": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/answer/{mail_id}")
def get_candidate_data(mail_id: str):
    """
    GET /answer/{mail_id}
    Retrieves both candidate profile from candidate_table and their test answers from answer_table.
    """
    try:
        data = candidate_service.get_candidate_answers(mail_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{mail_id}")
def get_user_details(mail_id: str):
    """
    GET /user/{mail_id}
    Retrieves candidate profile from candidate_table.
    """
    try:
        data = candidate_service.get_candidate(mail_id)
        if not data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"user": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
