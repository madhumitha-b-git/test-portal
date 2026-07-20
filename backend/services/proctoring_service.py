import os
import logging
from datetime import datetime, timezone

import requests as http_requests
from database.dynamodb import get_proctoring_sessions_table

logger = logging.getLogger(__name__)


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_all_sessions():
    table = get_proctoring_sessions_table()
    response = table.scan()
    items = response.get("Items", [])
    items.sort(key=lambda x: x.get("startedTime", ""), reverse=True)
    return [{
        "email": item.get("mailId", ""),
        "startedTime": item.get("starttime", ""),
        "endedTime": item.get("endtime", ""),
        "warningCount": int(item.get("warningCount", 0)),
        "status": item.get("status", ""),
    } for item in items]


def start_session(email: str):
    table = get_proctoring_sessions_table()
    started = _now_iso()

    table.put_item(Item={
        "mailId": email,
        "durationMinutes": 60,
        "starttime": started,
        "endtime": "",
        "status": "IN_PROGRESS",
        "testId": "TEST-001",
        "warningCount": 0,
    })

    return {"email": email, "startedTime": started, "warningCount": 0, "status": "IN_PROGRESS"}


def get_session(email: str):
    table = get_proctoring_sessions_table()
    response = table.get_item(Key={"mailId": email})
    item = response.get("Item")
    if not item:
        return None
    return {
        "email": item.get("mailId", email),
        "startedTime": item.get("starttime", ""),
        "endedTime": item.get("endtime", ""),
        "warningCount": int(item.get("warningCount", 0)),
        "status": item.get("status", ""),
    }


def increment_warning(email: str):
    table = get_proctoring_sessions_table()
    response = table.get_item(Key={"mailId": email})
    item = response.get("Item")
    if not item:
        return None

    current = int(item.get("warningCount", 0))
    new_count = current + 1

    table.update_item(
        Key={"mailId": email},
        UpdateExpression="SET warningCount = :wc",
        ExpressionAttributeValues={":wc": new_count},
    )

    return {"email": email, "warningCount": new_count}


def end_session(email: str, status: str):
    table = get_proctoring_sessions_table()
    ended = _now_iso()

    table.update_item(
        Key={"mailId": email},
        UpdateExpression="SET endtime = :et, #s = :st",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":et": ended, ":st": status},
    )

    response = table.get_item(Key={"mailId": email})
    item = response.get("Item", {})

    return {
        "email": item.get("mailId", email),
        "startedTime": item.get("starttime", ""),
        "endedTime": item.get("endtime", ended),
        "warningCount": int(item.get("warningCount", 0)),
        "status": item.get("status", status),
    }


def submit_report_to_external(report: dict):
    url = os.getenv("PROCTORING_REPORT_URL", "").strip()
    if not url:
        logger.warning("PROCTORING_REPORT_URL is not configured. Skipping report submission.")
        return {"sent": False, "reason": "external URL not configured"}

    try:
        resp = http_requests.post(url, json=report, timeout=10)
        resp.raise_for_status()
        return {"sent": True, "statusCode": resp.status_code}
    except http_requests.RequestException as e:
        logger.error("Failed to submit proctoring report: %s", e)
        return {"sent": False, "reason": str(e)}
