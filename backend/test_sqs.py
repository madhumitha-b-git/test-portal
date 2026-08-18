import os
from services.sqs_service import publish_descriptive_section_event
from dotenv import load_dotenv

load_dotenv()

print("Testing SQS...")
print("SQS URL:", os.getenv("SQS_QUEUE_URL"))

try:
    res = publish_descriptive_section_event(
        test_id="TEST-123",
        mail_id="test@example.com",
        descriptive_section={"sectionId": "DESCRIPTIVE-123", "responses": []},
        submitted_at="2026-08-14T10:00:00Z"
    )
    print("Success! SQS Message ID:", res)
except Exception as e:
    print("Failed to send to SQS:", str(e))
