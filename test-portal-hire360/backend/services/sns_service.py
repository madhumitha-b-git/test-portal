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

    merged_sections = {}
    for section in sections:
        sec_id = section.get("sectionId")
        if not sec_id:
            # If sectionId is completely missing, give it a placeholder based on content
            responses = section.get("responses", [])
            sec_id = "CODING-SECTION" if (responses and "typedAnswer" in responses[0]) else "MCQ-SECTION"
            
        if sec_id not in merged_sections:
            merged_sections[sec_id] = []
        merged_sections[sec_id].extend(section.get("responses", []))
        
    mapped_sections = []
    for sec_id, responses in merged_sections.items():
        section_name = "MCQ"
        if "DESCRIPTIVE" in str(sec_id).upper():
            section_name = "DESCRIPTIVE"
        elif len(responses) > 0 and "typedAnswer" in responses[0]:
            section_name = "CODING"
            
        mapped_sections.append({
            "sectionId": sec_id,
            "sectionName": section_name,
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