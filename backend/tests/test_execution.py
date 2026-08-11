import unittest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.execution_service import run_python_code_execution
from routes.execution import execute_code
from models.execution import ExecuteRequest

class TestPythonExecution(unittest.TestCase):

    def test_1_print_hello_world(self):
        res = run_python_code_execution('print("Hello World")')
        self.assertEqual(res["status"], "success")
        self.assertIn("Hello World", res["output"])

    def test_2_max_numbers(self):
        code = "numbers = [10, 20, 5]\nprint(max(numbers))"
        res = run_python_code_execution(code)
        self.assertEqual(res["status"], "success")
        self.assertIn("20", res["output"])

    def test_3_sorted_list(self):
        code = "numbers = [5, 2, 9, 1]\nprint(sorted(numbers))"
        res = run_python_code_execution(code)
        self.assertEqual(res["status"], "success")
        self.assertIn("[1, 2, 5, 9]", res["output"])

    def test_4_import_math(self):
        code = "import math\nprint(math.sqrt(25))"
        res = run_python_code_execution(code)
        self.assertEqual(res["status"], "success")
        self.assertIn("5.0", res["output"])

    def test_5_import_collections(self):
        code = "from collections import Counter\nprint(Counter('hello'))"
        res = run_python_code_execution(code)
        self.assertEqual(res["status"], "success")
        self.assertIn("Counter", res["output"])

    def test_6_name_error(self):
        res = run_python_code_execution("print(x)")
        self.assertEqual(res["status"], "error")
        self.assertIn("NameError", res["output"])

    def test_7_syntax_error(self):
        res = run_python_code_execution('print("Hello"')
        self.assertEqual(res["status"], "error")
        self.assertIn("SyntaxError", res["output"])

    def test_8_zero_division_error(self):
        res = run_python_code_execution("print(10 / 0)")
        self.assertEqual(res["status"], "error")
        self.assertIn("ZeroDivisionError", res["output"])

    def test_9_infinite_loop_timeout(self):
        code = "while True:\n    pass"
        res = run_python_code_execution(code)
        self.assertEqual(res["status"], "timeout")
        self.assertIn("Execution timed out", res["output"])

    def test_10_import_numpy(self):
        res = run_python_code_execution("import numpy")
        self.assertEqual(res["status"], "error")
        self.assertIn("not allowed", res["output"])

    def test_11_import_pandas(self):
        res = run_python_code_execution("import pandas")
        self.assertEqual(res["status"], "error")
        self.assertIn("not allowed", res["output"])

    # ── Security Allowlist & Blocklist Tests ──

    def test_allowed_modules(self):
        allowed_snippets = [
            "import math\nprint(math.pi)",
            "import string\nprint(string.ascii_letters[:5])",
            "from collections import Counter\nprint(Counter('aab'))",
            "import statistics\nprint(statistics.mean([1, 2, 3]))",
            "import json\nprint(json.dumps({'k': 'v'}))",
            "import random\nprint(random.randint(1, 1))",
        ]
        for snippet in allowed_snippets:
            res = run_python_code_execution(snippet)
            self.assertEqual(res["status"], "success", f"Failed allowed snippet: {snippet}")

    def test_blocked_modules(self):
        blocked_snippets = [
            "import os",
            "import sys",
            "import subprocess",
            "import socket",
            "import ctypes",
            "from os import system",
            "from subprocess import run",
            "import shutil",
            "import pathlib",
            "import asyncio",
        ]
        for snippet in blocked_snippets:
            res = run_python_code_execution(snippet)
            self.assertEqual(res["status"], "error", f"Failed to block snippet: {snippet}")
            self.assertIn("not allowed", res["output"])

    def test_bypass_attempts(self):
        bypass_snippets = [
            '__import__("os")',
            'import importlib\nimportlib.import_module("os")',
            'from builtins import __import__',
            'eval("__import__(\'os\')")',
            'exec("import os")',
        ]
        for snippet in bypass_snippets:
            res = run_python_code_execution(snippet)
            self.assertEqual(res["status"], "error", f"Failed to block bypass attempt: {snippet}")
            self.assertTrue("not allowed" in res["output"] or "not allowed for security reasons" in res["output"])

    def test_route_handler_execute_code(self):
        req = ExecuteRequest(code="print('Route Handler Test')")
        res = execute_code(req)
        self.assertEqual(res["status"], "success")
        self.assertIn("Route Handler Test", res["output"])

if __name__ == "__main__":
    unittest.main()
