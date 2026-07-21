import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def get_aws_session():
    """
    Creates and returns a boto3 AWS session.
    """

    region = os.getenv("AWS_REGION","ap-southeast-1",)

    is_lambda = (
        os.getenv("AWS_EXECUTION_ENV")
        is not None
    )

    profile = os.getenv("AWS_PROFILE")

    if is_lambda:

        # Lambda uses IAM execution role
        os.environ.pop(
            "AWS_PROFILE",
            None,
        )

        return boto3.Session(
            region_name=region,
        )

    if profile:

        return boto3.Session(
            profile_name=profile,
            region_name=region,
        )

    return boto3.Session(
        region_name=region,
    )

def get_dynamodb():
    region = os.getenv("AWS_REGION") or "ap-southeast-1"
    
    # AWS Lambda automatically sets AWS_EXECUTION_ENV. 
    is_lambda = os.getenv("AWS_EXECUTION_ENV") is not None
    profile = os.getenv("AWS_PROFILE")
    
    if is_lambda:
        # Boto3 implicitly checks os.environ["AWS_PROFILE"]. 
        # We MUST remove it so it doesn't crash Lambda's auth signature.
        os.environ.pop("AWS_PROFILE", None)
        session = boto3.Session(region_name=region)
    else:
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
