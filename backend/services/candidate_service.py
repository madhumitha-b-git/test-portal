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
from services.sqs_service import publish_descriptive_section_event


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
    regNo: str = "",
    testId: str = None,
):
    """
    Stores candidate details in Users table without password.
    Scopes registrations per testId so candidate can attend multiple tests with same email without error.
    """

    mailId = mailId.strip().lower()
    table = get_users_table()
    clean_test_id = (testId or "").strip()

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
        "regNo": regNo,
        "registeredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if clean_test_id:
        reg_entry["testId"] = clean_test_id

    # Check if THIS specific testId has already been submitted in the answers table
    if clean_test_id:
        try:
            answers_table = get_answers_table()
            ans_rec = answers_table.get_item(Key={"mailId": mailId}).get("Item", {})
            if ans_rec:
                submissions = ans_rec.get("submissions", {})
                if clean_test_id in submissions:
                    sub = submissions[clean_test_id]
                    if sub.get("isSubmitted") or sub.get("status") in ["SUBMITTED", "submitted"]:
                        return {
                            "success": False,
                            "message": "You have already completed/submitted this assessment."
                        }
                elif ans_rec.get("testId") == clean_test_id:
                    if ans_rec.get("isSubmitted") or ans_rec.get("status") in ["SUBMITTED", "submitted"]:
                        return {
                            "success": False,
                            "message": "You have already completed/submitted this assessment."
                        }
        except Exception as e:
            print("Error checking answers table during registration:", e)

    if "Item" in existing_user:
        user_item = existing_user["Item"]
        registrations = user_item.get("registrations", {})
        if not isinstance(registrations, dict):
            registrations = {}

        # If candidate already registered for THIS exact testId, show already registered message
        if clean_test_id and clean_test_id in registrations:
            return {
                "success": False,
                "message": "You are already registered for this assessment."
            }

        if clean_test_id:
            registrations[clean_test_id] = reg_entry

        # Update candidate profile in candidate_table and append new testId registration
        try:
            table.update_item(
                Key={"mailId": user_item.get("mailId", mailId)},
                UpdateExpression="SET #n = :n, mobile = :m, college = :c, regNo = :rg, registerNo = :rg, registrations = :r",
                ExpressionAttributeNames={"#n": "name"},
                ExpressionAttributeValues={
                    ":n": name,
                    ":m": mobile,
                    ":c": college,
                    ":rg": regNo,
                    ":r": registrations,
                }
            )
        except Exception:
            table.put_item(
                Item={
                    "mailId": mailId,
                    "name": name,
                    "mobile": mobile,
                    "college": college,
                    "regNo": regNo,
                    "registeredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "registrations": registrations,
                }
            )
    else:
        registrations = {clean_test_id: reg_entry} if clean_test_id else {}
        table.put_item(
            Item={
                "mailId": mailId,
                "name": name,
                "mobile": mobile,
                "college": college,
                "regNo": regNo,
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
            "regNo": regNo,
        },
        "isSubmitted": False
    }


def login_candidate(
    mailId: str,
    password: str = None,
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
                "message": "No account found with this email address. Please register first."
            }

    user = existing_user["Item"]
    user_mail_id = user.get("mailId", mailId).strip().lower()

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
            "regNo": user.get("regNo", ""),
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

    import requests
    real_section_map = {}
    real_question_map = {}
    try:
        res = requests.get(f"https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests/{testId}", timeout=5)
        if res.status_code == 200:
            test_data = res.json()
            for s in test_data.get("sections", []):
                real_section_map[s.get("sectionId")] = s
                for q in s.get("questions", []):
                    q_id = q.get("questionId")
                    if q_id:
                        real_question_map[q_id] = q
    except Exception as e:
        print(f"Error fetching test details: {e}")

    sections_data = []
    for section in sections:
        sec_data = section.model_dump(exclude_none=True)
        sec_id = sec_data.get("sectionId", "")
        if sec_id in real_section_map:
            real_sec = real_section_map[sec_id]
            if real_sec.get("sectionName"):
                sec_data["sectionName"] = real_sec["sectionName"]
            if real_sec.get("questionType"):
                sec_data["questionType"] = real_sec["questionType"]

        # Guarantee selectedOption and selectedOptionText for all MCQ responses
        responses = sec_data.get("responses", [])
        for resp in responses:
            resp.pop("selectedOptionId", None)  # Remove redundant selectedOptionId
            q_id = resp.get("questionId")
            sel_opt = resp.get("selectedOption")
            if sel_opt and q_id in real_question_map:
                real_q = real_question_map[q_id]
                options = real_q.get("options", [])
                matched_opt = None
                for opt in options:
                    if opt.get("optionId") == sel_opt or opt.get("id") == sel_opt or opt.get("text") == sel_opt:
                        matched_opt = opt
                        break

                if matched_opt:
                    if not resp.get("selectedOptionText"):
                        resp["selectedOptionText"] = matched_opt.get("text") or matched_opt.get("optionText") or matched_opt.get("value") or sel_opt
                else:
                    if not resp.get("selectedOptionText"):
                        resp["selectedOptionText"] = sel_opt
            elif sel_opt:
                if not resp.get("selectedOptionText"):
                    resp["selectedOptionText"] = sel_opt

        sections_data.append(sec_data)

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
            "submissions": submissions,
        }
    )

    candidate_data = get_candidate(mailId)
    sns_result = publish_test_submitted_event(
        test_id=testId,
        mail_id=mailId,
        sections=sections_data,
        submitted_at=submittedAt,
        candidate_data=candidate_data,
    )

    sqs_message_id = None
    for section in sections_data:
        sec_id = section.get("sectionId", "")
        sec_name = section.get("sectionName", "")
        q_type = str(section.get("questionType", "")).upper()
        if "DESCRIPTIVE" in str(sec_id).upper() or "DESCRIPTIVE" in str(sec_name).upper() or q_type == "DESCRIPTIVE":
            sqs_res = publish_descriptive_section_event(
                test_id=testId,
                mail_id=mailId,
                descriptive_section=section,
                submitted_at=submittedAt,
            )
            if sqs_res:
                sqs_message_id = sqs_res.get("message_id")
            break

    return {
        "success": True,
        "message": "Answers submitted successfully",
        "sns_message_id": sns_result["message_id"],
        "sqs_message_id": sqs_message_id,
    }



def get_answers_by_test_id(
    test_id: str,
):
    """
    Fetches answers for a specific testId
    from Answers table submissions map.
    """

    table = get_answers_table()
    res = table.scan()
    results = []
    for item in res.get("Items", []):
        submissions = item.get("submissions", {})
        if test_id in submissions:
            sub = submissions[test_id]
            results.append({
                "mailId": item.get("mailId"),
                **sub
            })
    return results


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
        try:
            scan_res = users_table.scan(FilterExpression=Attr("mailId").eq(mail_id))
            items = scan_res.get("Items", [])
            if items:
                item = items[0]
        except Exception as e:
            print("Error scanning users_table in get_candidate:", e)

    return item or {}


def get_test_meta(link_id: str):
    """
    Fetches safe test metadata (title, duration, status) without any questions or answers.
    """
    import requests
    try:
        res = requests.get("https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests", timeout=5)
        if res.status_code == 200:
            tests = res.json().get("items", [])
            matched = next((t for t in tests if str(t.get("linkId", "")).strip() == str(link_id).strip()), None)
            if matched:
                status_lower = (matched.get("status") or "").lower().strip()
                return {
                    "success": True,
                    "test": {
                        "testId": matched.get("testId"),
                        "linkId": matched.get("linkId"),
                        "title": matched.get("title", "Online Assessment"),
                        "description": matched.get("description", ""),
                        "status": matched.get("status", "active"),
                        "isActive": status_lower == "active",
                        "totalDurationMinutes": matched.get("totalDurationMinutes") or matched.get("durationMinutes") or 60,
                        "totalMarks": matched.get("totalMarks", 50),
                    }
                }
            return {"success": False, "error": "NOT_FOUND", "message": f"No test found for link ID '{link_id}'."}
    except Exception as e:
        print(f"Error fetching test meta: {e}")
    return {"success": False, "error": "API_ERROR", "message": "Failed to fetch test metadata."}


def get_sanitized_questions(link_id: str):
    """
    Fetches test questions for an active session and strips all correct answers / correctOptionId.
    """
    import requests
    try:
        meta_res = get_test_meta(link_id)
        if not meta_res.get("success"):
            return meta_res

        test_id = meta_res["test"]["testId"]
        res = requests.get(f"https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests/{test_id}", timeout=5)
        if res.status_code == 200:
            test_data = res.json()
            sections = test_data.get("sections", [])

            sanitized_sections = []
            for s in sections:
                san_sec = {
                    "sectionId": s.get("sectionId"),
                    "sectionName": s.get("sectionName"),
                    "questionType": s.get("questionType"),
                    "durationMinutes": s.get("durationMinutes"),
                    "marks": s.get("marks"),
                    "questions": []
                }
                for q in s.get("questions", []):
                    san_q = {
                        "questionId": q.get("questionId"),
                        "question": q.get("question"),
                        "questionType": q.get("questionType", s.get("questionType")),
                        "marks": q.get("marks", 1),
                        "options": []
                    }
                    for opt in q.get("options", []):
                        san_opt = {
                            "optionId": opt.get("optionId") or opt.get("id"),
                            "text": opt.get("text") or opt.get("optionText") or opt.get("value")
                        }
                        san_q["options"].append(san_opt)
                    san_sec["questions"].append(san_q)
                sanitized_sections.append(san_sec)

            all_questions = [q for sec in sanitized_sections for q in sec["questions"]]
            return {
                "success": True,
                "data": {
                    "testId": test_id,
                    "title": test_data.get("title", "Online Assessment"),
                    "totalDurationMinutes": test_data.get("totalDurationMinutes") or test_data.get("durationMinutes") or 60,
                    "sections": sanitized_sections,
                    "questions": all_questions
                }
            }
    except Exception as e:
        print(f"Error fetching sanitized questions: {e}")
    return {"success": False, "error": "API_ERROR", "message": "Failed to fetch test questions."}
