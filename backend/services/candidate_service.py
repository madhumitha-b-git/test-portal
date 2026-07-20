from database.dynamodb import get_users_table, get_answers_table, get_questions_table

def register_candidate(name: str, email: str, mobile: str, college: str):
    """
    Stores candidate details in Users table.
    Checks if email already exists before inserting.
    """
    table = get_users_table()

    # Check if user already exists
    response = table.get_item(Key={"email": email})
    if "Item" in response:
        return {"success": False, "message": "Email already registered"}

    # Store in DynamoDB
    table.put_item(Item={
        "email": email,
        "name": name,
        "mobile": mobile,
        "college": college
    })

    return {"success": True, "message": "Registered successfully"}

def get_questions():
    """
    Reads all questions from DynamoDB Questions table.
    Returns list of questions.
    """
    table = get_questions_table()

    # Scan fetches all items from the table
    response = table.scan()
    questions = response.get("Items", [])

    # Sort questions by questionId (q001, q002 ...)
    questions.sort(key=lambda x: x["questionId"])

    return questions

def submit_answers(name: str, email: str, responses: list):
    """
    Stores candidate answers in Answers table.
    """
    table = get_answers_table()

    # Convert pydantic models to plain dicts
    responses_data = [r.model_dump() for r in responses]

    import datetime
    submit_time = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    table.put_item(Item={
        "mailId": email,
        "testId": "TEST-001",
        "durationMinutes": 90,
        "submitTime": submit_time,
        "answers": responses_data
    })

    return {"success": True, "message": "Answers submitted successfully"}

def get_answers_by_test_id(test_id: str):
    """
    Fetches answers for a specific testId from Answers table.
    """
    from boto3.dynamodb.conditions import Attr
    table = get_answers_table()
    
    response = table.scan(
        FilterExpression=Attr("testId").eq(test_id)
    )
    
    return response.get("Items", [])
