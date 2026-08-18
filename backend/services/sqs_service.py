import json
import os

from database.dynamodb import get_aws_session

SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL")

def publish_descriptive_section_event(
    test_id: str,
    mail_id: str,
    descriptive_section: dict,
    submitted_at: str,
):
    """
    Publishes the descriptive section responses to SQS.
    """

    if not SQS_QUEUE_URL:
        # If queue URL is not configured, we just return or log it.
        # But raising an error might be appropriate if it's strictly required.
        print("SQS_QUEUE_URL is not configured, skipping SQS publish.")
        return None

    session = get_aws_session()
    sqs_client = session.client("sqs")

    event = {
        "mailId": mail_id,
        "testId": test_id,
        "submittedAt": submitted_at,
        "descriptiveSection": descriptive_section,
    }

    sqs_response = sqs_client.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps(event),
    )

    return {
        "message_id": sqs_response.get("MessageId"),
    }
