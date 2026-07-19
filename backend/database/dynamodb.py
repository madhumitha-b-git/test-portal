import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def get_dynamodb():
    """
    Creates and returns a DynamoDB resource.
    Uses AWS SSO profile from .env file.
    No access key or secret key needed.
    """
    session = boto3.Session(
        profile_name=os.getenv("AWS_PROFILE"),
        region_name=os.getenv("AWS_REGION")
    )
    dynamodb = session.resource("dynamodb")
    return dynamodb

def get_users_table():
    """Returns the candidate_table DynamoDB table."""
    dynamodb = get_dynamodb()
    return dynamodb.Table(os.getenv("USERS_TABLE", "candidate_table"))

def get_answers_table():
    """Returns the answer_table DynamoDB table."""
    dynamodb = get_dynamodb()
    return dynamodb.Table(os.getenv("ANSWERS_TABLE", "answer_table"))

def get_questions_table():
    """Returns the question_table DynamoDB table."""
    dynamodb = get_dynamodb()
    return dynamodb.Table(os.getenv("QUESTIONS_TABLE", "question_table"))
