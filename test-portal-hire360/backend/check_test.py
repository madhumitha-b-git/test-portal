import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

session = boto3.Session(
    profile_name=os.getenv("AWS_PROFILE"),
    region_name=os.getenv("AWS_REGION")
)
dynamodb = session.resource("dynamodb")
table = dynamodb.Table("question_table")

response = table.scan()
items = response.get("Items", [])
for item in items:
    if str(item.get("testId")) == "bc321e19-d50b-4340-a9fc-f9ef766e3b95":
        print(f"Found test: {item.get('testId')}")
        sections = item.get("sections", [])
        for section in sections:
            print(f"  Section ID: {section.get('sectionId')}")
            questions = section.get("questions", [])
            for q in questions:
                print(f"    Question: {q.get('questionId')} - Type: {q.get('questionType')}")
                break
