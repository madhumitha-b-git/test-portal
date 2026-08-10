import unittest
import sys
import os

# Adjust sys.path so we can import modules from backend directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pydantic import ValidationError
from models.candidate import RegisterRequest, AnswerItem

class TestCandidateModels(unittest.TestCase):
    
    def test_valid_registration(self):
        # Test that a valid request passes validation and normalizes email
        data = {
            "name": "Rahul Ganesh",
            "mailId": "Rahul@Gmail.com",
            "mobile": "9876543210",
            "college": "IDP College",
            "password": "secretpassword"
        }
        request = RegisterRequest(**data)
        self.assertEqual(request.name, "Rahul Ganesh")
        self.assertEqual(request.mailId, "rahul@gmail.com")
        self.assertEqual(request.mobile, "9876543210")
        self.assertEqual(request.college, "IDP College")
        self.assertEqual(request.password, "secretpassword")

    def test_invalid_email(self):
        # Test that an invalid email fails validation
        data = {
            "name": "Rahul Ganesh",
            "mailId": "rahulgmailcom",  # Missing @ and .
            "mobile": "9876543210",
            "college": "IDP College",
            "password": "secretpassword"
        }
        with self.assertRaises(ValidationError):
            RegisterRequest(**data)

    def test_invalid_mobile_digits(self):
        # Test that mobile number not matching 10 digits fails validation
        data = {
            "name": "Rahul Ganesh",
            "mailId": "rahul@gmail.com",
            "mobile": "98765432",  # Only 8 digits
            "college": "IDP College",
            "password": "secretpassword"
        }
        with self.assertRaises(ValidationError):
            RegisterRequest(**data)

    def test_empty_fields(self):
        # Test that empty strings in name or college fail validation
        data_empty_name = {
            "name": "   ",
            "mailId": "rahul@gmail.com",
            "mobile": "9876543210",
            "college": "IDP College",
            "password": "secretpassword"
        }
        with self.assertRaises(ValidationError):
            RegisterRequest(**data_empty_name)

        data_empty_college = {
            "name": "Rahul Ganesh",
            "mailId": "rahul@gmail.com",
            "mobile": "9876543210",
            "college": "",
            "password": "secretpassword"
        }
        with self.assertRaises(ValidationError):
            RegisterRequest(**data_empty_college)

    def test_answer_item_both_fields(self):
        # Test that AnswerItem can contain both selectedOption and typedAnswer
        mcq_answer = {
            "questionId": "Q691",
            "selectedOption": "C",
            "typedAnswer": ""
        }
        coding_answer = {
            "questionId": "Q646",
            "selectedOption": "",
            "typedAnswer": "def my_func(): pass"
        }
        
        mcq_item = AnswerItem(**mcq_answer)
        coding_item = AnswerItem(**coding_answer)
        
        self.assertEqual(mcq_item.selectedOption, "C")
        self.assertEqual(mcq_item.typedAnswer, "")
        
        self.assertEqual(coding_item.selectedOption, "")
        self.assertEqual(coding_item.typedAnswer, "def my_func(): pass")

if __name__ == "__main__":
    unittest.main()
