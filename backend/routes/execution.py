from fastapi import APIRouter, HTTPException
from models.execution import ExecuteRequest, ExecuteResponse
from services.execution_service import run_python_code_execution

router = APIRouter()

@router.post("/execute", response_model=ExecuteResponse)
def execute_code(request: ExecuteRequest):
    """
    POST /execute
    Executes Python 3 code in an isolated subprocess environment and returns stdout/stderr.
    Does NOT store any data or modify candidate answers/DynamoDB.
    """
    try:
        res = run_python_code_execution(request.code, request.input)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
