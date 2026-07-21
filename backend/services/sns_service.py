import json
import os

from database.dynamodb import get_aws_session


SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")


def publish_test_submitted_event(
    test_id: str,
    mail_id: str,
    responses: list,
):
    """
    Publishes submitted test responses to SNS.
    """

    if not SNS_TOPIC_ARN:
        raise ValueError(
            "SNS_TOPIC_ARN is not configured"
        )

    session = get_aws_session()

    sns_client = session.client("sns")

    event = {
        "mailId": mail_id,
        "testId": test_id,
        "responses": responses,
    }

    sns_response = sns_client.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(event),
    )

    return {
        "message_id": sns_response["MessageId"],
    }