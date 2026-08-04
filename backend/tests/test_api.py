import unittest
import sys
import os
from unittest.mock import patch

# Adjust sys.path so we can import modules from backend directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app import app

class TestCandidateAPI(unittest.TestCase):
    
    def setUp(self):
        self.client = TestClient(app)

    @patch("routes.candidate.candidate_service.register_candidate")
    def test_register_success(self, mock_register):
        # Setup mock behavior
        mock_register.return_value = {
            "success": True,
            "message": "Registered successfully"
        }
        
        payload = {
            "name": "Moul",
            "mailId": "moul@gmail.com",
            "mobile": "9876543210",
            "college": "IDP College"
        }
        
        response = self.client.post("/register", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "message": "Registered successfully"})
        mock_register.assert_called_once_with(
            name="Moul",
            mailId="moul@gmail.com",
            mobile="9876543210",
            college="IDP College"
        )

    @patch("routes.candidate.candidate_service.register_candidate")
    def test_register_duplicate_email(self, mock_register):
        # Mock duplicate registration failure
        mock_register.return_value = {
            "success": False,
            "message": "Email already exists"
        }
        
        payload = {
            "name": "Moul",
            "mailId": "moul@gmail.com",
            "mobile": "9876543210",
            "college": "IDP College"
        }
        
        response = self.client.post("/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Email already exists"})

    def test_register_validation_error(self):
        # Missing fields should fail Pydantic model validation
        payload = {
            "name": "",
            "mailId": "invalid-email",
            "mobile": "123",  # Not 10 digits
            "college": ""
        }
        
        response = self.client.post("/register", json=payload)
        self.assertEqual(response.status_code, 422)  # Unprocessable entity

    @patch("routes.candidate.candidate_service.submit_answers")
    def test_submit_answers(self, mock_submit):
        # Mock answer submission
        mock_submit.return_value = {
            "success": True,
            "message": "Answers submitted successfully"
        }
        
        payload = {
            "mailId": "moul@gmail.com",
            "testId": "BIT-2026-TEST",
            "responses": [
                {
                    "questionId": "Q691",
                    "selectedOption": "C",
                    "typedAnswer": ""
                },
                {
                    "questionId": "Q646",
                    "selectedOption": "",
                    "typedAnswer": "print('hello')"
                }
            ]
        }
        
        response = self.client.post("/submit", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "message": "Answers submitted successfully"})

if __name__ == "__main__":
    unittest.main()
