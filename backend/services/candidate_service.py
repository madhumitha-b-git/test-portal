import hashlib
import os
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Attr

from database.dynamodb import (
    get_users_table,
    get_answers_table,
    get_questions_table,
)

from services.sns_service import publish_test_submitted_event


def hash_password(password: str) -> str:
    """Hashes a plain text password with sha256 + salt."""
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${hashed}"


def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against stored hash."""
    try:
        if not hashed_password:
            return True
        if "$" in hashed_password:
            salt, stored_hash = hashed_password.split("$", 1)
            calculated_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
            return calculated_hash == stored_hash
        try:
            import bcrypt
            return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            pass
        return password == hashed_password
    except Exception:
        return False


def register_candidate(
    name: str,
    mailId: str,
    mobile: str,
    college: str,
    password: str,
    testId: str = None,
):
    """
    Stores candidate details in Users table with hashed password.
    Scopes registrations per testId so candidate can attend multiple tests with same email.
    """

    mailId = mailId.strip().lower()
    table = get_users_table()

    existing_user = table.get_item(Key={"mailId": mailId})
    if "Item" not in existing_user:
        # Fallback check case-insensitively
        scan_res = table.scan(FilterExpression=Attr("mailId").eq(mailId))
        if scan_res.get("Items"):
            existing_user = {"Item": scan_res["Items"][0]}

    reg_entry = {
        "name": name,
        "mailId": mailId,
        "mobile": mobile,
        "college": college,
        "registeredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if testId:
        reg_entry["testId"] = testId

    if "Item" in existing_user:
        return {
            "success": False,
            "message": "Email already registered. You can log in using your 4-digit PIN."
        }

    hashed_pw = hash_password(password)
    registrations = {testId: reg_entry} if testId else {}

    table.put_item(
        Item={
            "mailId": mailId,
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
            "mailId": mailId,
            "mobile": mobile,
            "college": college,
        },
        "isSubmitted": False
    }


def login_candidate(
    mailId: str,
    password: str,
    testId: str = None,
):
    """
    Validates candidate credentials and checks submission status specifically for target testId.
    """

    mailId = mailId.strip().lower()
    table = get_users_table()

    existing_user = table.get_item(Key={"mailId": mailId})
    if "Item" not in existing_user:
        scan_res = table.scan()
        found_item = None
        for item in scan_res.get("Items", []):
            if item.get("mailId", "").strip().lower() == mailId:
                found_item = item
                break
        if found_item:
            existing_user = {"Item": found_item}
        else:
            return {
                "success": False,
                "message": "No candidate account found with this email. Please register first."
            }

    user = existing_user["Item"]
    user_mail_id = user.get("mailId", mailId).strip().lower()
    stored_hash = user.get("password")

    if stored_hash:
        if not verify_password(password, stored_hash):
            return {
                "success": False,
                "message": "Incorrect password / PIN. Please try again."
            }

    # Check if THIS specific testId has already been submitted in the answers table
    answers_table = get_answers_table()
    is_submitted = False

    ans_rec = answers_table.get_item(Key={"mailId": user_mail_id}).get("Item", {})
    if ans_rec:
        submissions = ans_rec.get("submissions", {})
        if testId and testId in submissions:
            sub = submissions[testId]
            if sub.get("isSubmitted") or sub.get("status") in ["SUBMITTED", "submitted"]:
                is_submitted = True
        elif testId and ans_rec.get("testId") == testId:
            if ans_rec.get("isSubmitted") or ans_rec.get("status") in ["SUBMITTED", "submitted"]:
                is_submitted = True
        elif not testId:
            if ans_rec.get("isSubmitted") or ans_rec.get("status") in ["SUBMITTED", "submitted"]:
                is_submitted = True

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "name": user.get("name", ""),
            "mailId": user_mail_id,
            "mobile": user.get("mobile", ""),
            "college": user.get("college", ""),
        },
        "isSubmitted": is_submitted
    }


def submit_answers(
    mailId: str,
    testId: str,
    submittedAt: str,
    sections: list,
):
    """
    Stores candidate answers per testId in DynamoDB without overwriting previous tests.
    """

    mailId = mailId.strip().lower()
    table = get_answers_table()

    sections_data = [
        section.model_dump(exclude_none=True)
        for section in sections
    ]

    # Fetch existing record to maintain testId submissions dictionary
    existing_rec = table.get_item(Key={"mailId": mailId}).get("Item", {})
    submissions = existing_rec.get("submissions", {})

    sub_entry = {
        "testId": testId,
        "sections": sections_data,
        "submittedAt": submittedAt,
        "isSubmitted": True,
        "status": "SUBMITTED",
    }
    submissions[testId] = sub_entry

    table.put_item(
        Item={
            "mailId": mailId,
            "testId": testId,
            "sections": sections_data,
            "submittedAt": submittedAt,
            "isSubmitted": True,
            "status": "SUBMITTED",
            "submissions": submissions,
        }
    )

    sns_result = publish_test_submitted_event(
        test_id=testId,
        mail_id=mailId,
        sections=sections_data,
        submitted_at=submittedAt,
    )

    return {
        "success": True,
        "message": "Answers submitted successfully",
        "sns_message_id": sns_result["message_id"],
    }



def get_answers_by_test_id(
    test_id: str,
):
    """
    Fetches answers for a specific testId
    from Answers table.
    """

    table = get_answers_table()

    response = table.scan(
        FilterExpression=Attr("testId").eq(test_id)
    )

    return response.get("Items", [])


def get_candidate_answers(
    mail_id: str,
):
    """
    Fetches candidate details from Users table
    and answers from Answers table.
    """

    mail_id = mail_id.strip().lower()
    users_table = get_users_table()
    answers_table = get_answers_table()

    user_response = users_table.get_item(
        Key={
            "mailId": mail_id,
        }
    )

    answer_response = answers_table.get_item(
        Key={
            "mailId": mail_id,
        }
    )

    return {
        "candidate": user_response.get(
            "Item",
            {}
        ),
        "testData": answer_response.get(
            "Item",
            {}
        ),
    }


def get_candidate(
    mail_id: str,
):
    """
    Fetches candidate details from Users table.
    """

    mail_id = mail_id.strip().lower()
    users_table = get_users_table()

    response = users_table.get_item(
        Key={
            "mailId": mail_id,
        }
    )

    item = response.get("Item")
    if not item:
        # Fallback scan
        scan_res = users_table.scan()
        for candidate in scan_res.get("Items", []):
            if candidate.get("mailId", "").strip().lower() == mail_id:
                return candidate

    return item or {}