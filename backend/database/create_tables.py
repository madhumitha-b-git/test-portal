import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def create_tables():
    """
    One time script to create all 3 DynamoDB tables.
    Run this once on company laptop before starting the app.
    """
    session = boto3.Session(
        profile_name=os.getenv("AWS_PROFILE"),
        region_name=os.getenv("AWS_REGION")
    )
    dynamodb = session.client("dynamodb")

    existing_tables = dynamodb.list_tables()["TableNames"]

    # Create candidate_table
    if "candidate_table" not in existing_tables:
        dynamodb.create_table(
            TableName="candidate_table",
            KeySchema=[
                {"AttributeName": "mailId", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "mailId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("✅ candidate_table created")
    else:
        print("⚠️  candidate_table already exists")

    # Create answer_table
    if "answer_table" not in existing_tables:
        dynamodb.create_table(
            TableName="answer_table",
            KeySchema=[
                {"AttributeName": "mailId", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "mailId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("✅ answer_table created")
    else:
        print("⚠️  answer_table already exists")

    # Create question_table
    if "question_table" not in existing_tables:
        dynamodb.create_table(
            TableName="question_table",
            KeySchema=[
                {"AttributeName": "questionId", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "questionId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("✅ question_table created")
    else:
        print("⚠️  question_table already exists")

    # Create ProctoringSessions
    if "ProctoringSessions" not in existing_tables:
        dynamodb.create_table(
            TableName="ProctoringSessions",
            KeySchema=[
                {"AttributeName": "mailId", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "mailId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        print("✅ ProctoringSessions created")
    else:
        print("⚠️  ProctoringSessions already exists")

if __name__ == "__main__":
    create_tables()
