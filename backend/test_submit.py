import requests
import json

data = {
    "mailId": "test21@gmail.com",
    "testId": "TEST-123",
    "submittedAt": "2026-08-14T10:00:00Z",
    "sections": [
        {
            "sectionId": "DESCRIPTIVE-SEC-01",
            "sectionName": "DESCRIPTIVE",
            "responses": [
                {
                    "questionId": "Q1",
                    "typedAnswer": "This is my descriptive answer"
                }
            ]
        }
    ]
}

res = requests.post("http://127.0.0.1:8000/submit", json=data)
print(res.status_code)
print(res.json())
