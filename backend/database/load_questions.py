import json
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

def load_questions():
    """
    One time script to load questions from questions.json into DynamoDB.
    Run this once on company laptop after creating tables.
    """
    session = boto3.Session(
        profile_name=os.getenv("AWS_PROFILE"),
        region_name=os.getenv("AWS_REGION")
    )
    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table("question_table")

    # Read questions from local JSON file
    questions_path = os.path.join(os.path.dirname(__file__), "../data/questions.json")
    with open(questions_path, "r") as f:
        data = json.load(f)

    questions = data["questions"]

    # Load each question into DynamoDB
    for question in questions:
        table.put_item(Item=question)
        print(f"✅ Loaded: {question['questionId']}")

    print(f"\n🎉 All {len(questions)} questions loaded successfully!")

if __name__ == "__main__":
    load_questions()
