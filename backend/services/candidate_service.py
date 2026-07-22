from datetime import datetime, timezone

from boto3.dynamodb.conditions import Attr

from database.dynamodb import (
    get_users_table,
    get_answers_table,
    get_questions_table,
)

from services.sns_service import publish_test_submitted_event


def register_candidate(
    name: str,
    mailId: str,
    mobile: str,
    college: str,
):
    """
    Stores candidate details in Users table.
    """

    table = get_users_table()

    existing_user = table.get_item(Key={"mailId": mailId})
    if "Item" in existing_user:
        return {
            "success": False,
            "message": "Email already exists"
        }

    table.put_item(
        Item={
            "mailId": mailId,
            "name": name,
            "mobile": mobile,
            "college": college,
        }
    )

    return {
        "success": True,
        "message": "Registered successfully",
    }


def submit_answers(
    mailId: str,
    testId: str,
    responses: list,
):
    """
    Stores candidate answers in DynamoDB
    and publishes the same response format to SNS.
    """

    table = get_answers_table()

    # Convert Pydantic models into plain dictionaries
    responses_data = [
        response.model_dump()
        for response in responses
    ]

    submit_time = datetime.now(
        timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Save submission to DynamoDB
    table.put_item(
        Item={
            "mailId": mailId,
            "testId": testId,
            "responses": responses_data,
            # "submitTime": submit_time,
        }
    )

    # Publish the same structure to SNS
    sns_result = publish_test_submitted_event(
        test_id=testId,
        mail_id=mailId,
        responses=responses_data,
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

    users_table = get_users_table()

    response = users_table.get_item(
        Key={
            "mailId": mail_id,
        }
    )

    return response.get(
        "Item",
        {}
    )