import json
import os

from database.dynamodb import get_aws_session


SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")


def publish_test_submitted_event(
    test_id: str,
    mail_id: str,
    sections: list,
    submitted_at: str,
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

    mapped_sections = []
    for section in sections:
        sec_id = section.get("sectionId", "")
        sec_name = section.get("sectionName", "")
        responses = section.get("responses", [])
        
        if not sec_name:
            sec_name = "MCQ"
            if "DESCRIPTIVE" in str(sec_id).upper():
                sec_name = "DESCRIPTIVE"
            elif len(responses) > 0 and "typedAnswer" in responses[0]:
                sec_name = "CODING"
                
        mapped_sections.append({
            "sectionId": sec_id,
            "sectionName": sec_name,
            "responses": responses
        })

    event = {
        "mailId": mail_id,
        "sections": mapped_sections,
        "submittedAt": submitted_at,
        "testId": test_id,
    }

    sns_response = sns_client.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(event),
    )

    return {
        "message_id": sns_response["MessageId"],
    }