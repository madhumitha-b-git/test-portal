from database.dynamodb import get_users_table, get_answers_table, get_questions_table

def register_candidate(name: str, mailId: str, mobile: str, college: str):
    """
    Stores candidate details in Users table.
    """
    table = get_users_table()

    # Store in DynamoDB (this will insert or update existing candidate)
    table.put_item(Item={
        "mailId": mailId,
        "name": name,
        "mobile": mobile,
        "college": college
    })

    return {"success": True, "message": "Registered successfully"}

def submit_answers(name: str, mailId: str, responses: list):
    """
    Stores candidate answers in Answers table.
    """
    table = get_answers_table()

    # Convert pydantic models to plain dicts
    responses_data = [r.model_dump() for r in responses]

    import datetime
    submit_time = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    table.put_item(Item={
        "mailId": mailId,
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

def get_candidate_answers(mail_id: str):
    """
    Fetches candidate details from users table and their answers from answers table.
    """
    users_table = get_users_table()
    answers_table = get_answers_table()
    
    user_resp = users_table.get_item(Key={"mailId": mail_id})
    ans_resp = answers_table.get_item(Key={"mailId": mail_id})
    
    return {
        "candidate": user_resp.get("Item", {}),
        "testData": ans_resp.get("Item", {})
    }

def get_candidate(mail_id: str):
    """
    Fetches candidate details from users table.
    """
    users_table = get_users_table()
    user_resp = users_table.get_item(Key={"mailId": mail_id})
    return user_resp.get("Item", {})

