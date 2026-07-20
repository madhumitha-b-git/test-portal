import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def get_dynamodb():
    region = os.getenv("AWS_REGION") or "ap-southeast-1"
    profile = os.getenv("AWS_PROFILE")
    if profile:
        session = boto3.Session(profile_name=profile, region_name=region)
    else:
        session = boto3.Session(region_name=region)
    return session.resource("dynamodb")

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

def get_proctoring_sessions_table():
    """Returns the ProctoringSessions DynamoDB table."""
    dynamodb = get_dynamodb()
    return dynamodb.Table(os.getenv("PROCTORING_SESSIONS_TABLE", "ProctoringSessions"))
