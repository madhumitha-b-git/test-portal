import bcrypt
import requests
from database.dynamodb import get_users_table, get_answers_table, get_questions_table, get_test_config_table, get_proctoring_sessions_table

def hash_password(password: str) -> str:
    """Hashes plain text password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def register_candidate(name: str, email: str, mobile: str, password: str):
    """
    Stores candidate details in Users table.
    Checks if email already exists before inserting.
    """
    table = get_users_table()

    # Check if user already exists
    response = table.get_item(Key={"mailId": email})
    if "Item" in response:
        return {"success": False, "message": "Email already registered"}

    # Hash password before storing
    hashed_password = hash_password(password)

    # Store in DynamoDB
    table.put_item(Item={
        "mailId": email,
        "name": name,
        "mobile": mobile,
        "password": hashed_password
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

def get_test_duration():
    """
    Reads total_duration_minutes from test-config-tests table.
    """
    try:
        table = get_test_config_table()
        response = table.scan()
        items = response.get("Items", [])
        if items and "total_duration_minutes" in items[0]:
            return int(items[0]["total_duration_minutes"])
    except Exception as e:
        print("Error fetching test duration:", e)
    return 60

def submit_answers(mailId: str, testId: str, durationMinutes: int, submitTime: str, answers: list):
    """
    Stores candidate answers in Answers table.
    """
    table = get_answers_table()

    # Convert pydantic models to plain dicts
    answers_data = [a.model_dump() for a in answers]

    table.put_item(Item={
        "mailId": mailId,
        "testId": testId,
        "durationMinutes": durationMinutes,
        "submitTime": submitTime,
        "answers": answers_data,
        "status": "submitted"
    })

    return {"success": True, "message": "Answers submitted successfully"}

def sync_answers_from_external(test_id: str):
    """
    Fetches answers from the external URL and syncs to both answers and proctoring tables.
    """
    url = f"https://ylmuevgvjd.execute-api.ap-southeast-1.amazonaws.com/answers/{test_id}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return {"success": False, "message": f"Failed to fetch from external API: {str(e)}"}

    if not isinstance(data, list):
        return {"success": False, "message": "Unexpected data format from external API"}

    answers_table = get_answers_table()
    proctoring_table = get_proctoring_sessions_table()
    
    count = 0
    for record in data:
        mail_id = record.get("mailId")
        if not mail_id:
            continue
            
        t_id = record.get("testId", test_id)
        duration_minutes = int(record.get("durationMinutes", 60))
        submit_time = record.get("submitTime", "")
        answers = record.get("answers", [])
        status = record.get("status", "submitted")

        # 1. Store in Answers table
        answers_table.put_item(Item={
            "mailId": mail_id,
            "testId": t_id,
            "durationMinutes": duration_minutes,
            "submitTime": submit_time,
            "answers": answers,
            "status": status
        })

        # 2. Store a dummy successful session in ProctoringSessions table
        proctoring_table.put_item(Item={
            "mailId": mail_id,
            "testId": t_id,
            "durationMinutes": duration_minutes,
            "starttime": submit_time,  # Using submitTime as fallback since real start time is unknown
            "endtime": submit_time,
            "warningCount": 0,
            "status": "SUCCESS",
        })
        count += 1

    return {"success": True, "message": f"Successfully synced {count} records into the databases."}
