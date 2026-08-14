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
table = dynamodb.Table("answer_table")

response = table.scan()
items = response.get("Items", [])
print(json.dumps([{"mailId": i.get("mailId"), "testId": i.get("testId")} for i in items], indent=2))
