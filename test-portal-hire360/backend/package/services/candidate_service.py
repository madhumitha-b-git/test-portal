import hashlib
import os
from datetime import datetime, timezone
import requests
from database.dynamodb import get_users_table, get_answers_table, get_questions_table, get_test_config_table, get_proctoring_sessions_table

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        if not stored_hash:
            return True
        if "$" in stored_hash:
            salt, calc_hash = stored_hash.split("$", 1)
            return hashlib.sha256((salt + password).encode("utf-8")).hexdigest() == calc_hash
        try:
            import bcrypt
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except Exception:
            pass
        return password == stored_hash
    except Exception:
        return False

def register_candidate(name: str, mailId: str, mobile: str, college: str = "", password: str = "", testId: str = None, email: str = None):
    mail_addr = (mailId or email or "").strip().lower()
    table = get_users_table()

    existing_user = table.get_item(Key={"mailId": mail_addr})
    if "Item" in existing_user:
        return {
            "success": False,
            "message": "Email already registered. You can log in using your 4-digit PIN."
        }

    hashed_pw = hash_password(password) if password else ""
    registrations = {testId: reg_entry} if testId else {}

    table.put_item(
        Item={
            "mailId": mail_addr,
            "name": name,
            "mobile": mobile,
            "college": college,
            "password": hashed_pw,
            "registeredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "registrations": registrations,
        }
    )

    return {
        "success": True,
        "message": "Registered successfully",
        "user": {
            "name": name,
            "mailId": mail_addr,
            "mobile": mobile,
            "college": college,
        },
        "isSubmitted": False
    }


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

def submit_answers(mailId: str, testId: str, durationMinutes: int = 60, submitTime: str = "", answers: list = []):
    """
    Stores candidate answers in Answers table scoped per testId in submissions dictionary.
    """
    table = get_answers_table()
    mailId = mailId.strip().lower()

    answers_data = [a.model_dump() if hasattr(a, "model_dump") else a for a in answers]

    existing_rec = table.get_item(Key={"mailId": mailId}).get("Item", {})
    submissions = existing_rec.get("submissions", {})

    sub_entry = {
        "testId": testId,
        "durationMinutes": durationMinutes,
        "submitTime": submitTime,
        "answers": answers_data,
        "isSubmitted": True,
        "status": "SUBMITTED"
    }
    submissions[testId] = sub_entry

    table.put_item(Item={
        "mailId": mailId,
        "testId": testId,
        "durationMinutes": durationMinutes,
        "submitTime": submitTime,
        "answers": answers_data,
        "isSubmitted": True,
        "status": "SUBMITTED",
        "submissions": submissions
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
