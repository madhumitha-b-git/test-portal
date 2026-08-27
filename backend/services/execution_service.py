import sys
import os
import time
import subprocess
import ast

MAX_OUTPUT_BYTES = 10 * 1024  # 10 KB
EXECUTION_TIMEOUT = 8.0       # 8 seconds timeout to accommodate Lambda process initialization

# Standard library modules permitted for technical coding assessments
ALLOWED_MODULES = {
    "math", "string", "random", "datetime", "collections",
    "itertools", "functools", "statistics", "re", "json",
    "decimal", "fractions", "heapq", "bisect", "array",
    "operator", "copy", "time", "calendar", "dataclasses",
    "typing", "enum", "numbers", "hashlib", "base64",
}

# Operating-system, process-control, networking, and security risk modules
BLOCKED_MODULES = {
    "os", "sys", "subprocess", "socket", "ctypes", "multiprocessing",
    "threading", "signal", "resource", "shutil", "pathlib", "importlib",
    "asyncio", "http", "urllib", "ftplib", "telnetlib", "ssl", "pickle",
    "marshal", "code", "codeop", "builtins", "platform", "inspect", "winreg",
    "webbrowser", "pydoc", "tempfile", "glob", "fnmatch",
}

def validate_python_code_security(code: str) -> tuple[bool, str]:
    """
    Parses Python AST to enforce standard library allowlist and block security risk modules.
    Returns (is_valid: bool, error_message: str).
    """
    try:
        tree = ast.parse(code)
    except Exception:
        # Allow invalid syntax to pass to the Python runtime interpreter for accurate SyntaxError line output
        return True, ""

    for node in ast.walk(tree):
        # 1. Direct imports: import os, import sys
        if isinstance(node, ast.Import):
            for alias in node.names:
                base_module = alias.name.split(".")[0]
                if base_module in BLOCKED_MODULES or base_module not in ALLOWED_MODULES:
                    return False, f"Import of module '{base_module}' is not allowed."

        # 2. From imports: from os import system, from subprocess import run
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base_module = node.module.split(".")[0]
                if base_module in BLOCKED_MODULES or base_module not in ALLOWED_MODULES:
                    return False, f"Import of module '{base_module}' is not allowed."

        # 3. Dynamic calls: __import__('os'), eval(), exec()
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "__import__":
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    mod_name = node.args[0].value.split(".")[0]
                    return False, f"Import of module '{mod_name}' is not allowed."
                return False, "Dynamic import using '__import__' is not allowed."

            elif isinstance(node.func, ast.Name) and node.func.id in ("eval", "exec", "compile", "globals", "locals"):
                return False, f"Use of built-in function '{node.func.id}' is not allowed for security reasons."

    return True, ""


def run_python_code_execution(code: str) -> dict:
    """
    Executes Python 3 code in an isolated child process via subprocess.run after AST security validation.
    Enforces sanitized environment (no AWS tokens), 3s timeout, and 10KB output limit.
    Does NOT interact with DynamoDB, SNS, or application data.
    """
    code_str = (code or "").strip()
    if not code_str:
        return {
            "status": "error",
            "output": "Please enter Python code before running.",
            "executionTimeMs": 0,
        }

    # Pre-execution AST import validation
    is_valid, sec_error = validate_python_code_security(code_str)
    if not is_valid:
        return {
            "status": "error",
            "output": sec_error,
            "executionTimeMs": 0,
        }

    # Sanitize environment variables: strip all AWS credentials & app secrets
    sanitized_env = dict(os.environ)
    for secret_key in [
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
        "AWS_SECURITY_TOKEN", "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
        "AWS_CONTAINER_CREDENTIALS_FULL_URI", "SNS_TOPIC_ARN"
    ]:
        sanitized_env.pop(secret_key, None)

    start_time = time.perf_counter()

    try:
        process_res = subprocess.run(
            [sys.executable, "-c", code_str],
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT,
            env=sanitized_env,
        )

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        stdout = process_res.stdout or ""
        stderr = process_res.stderr or ""

        combined = stdout
        if stderr:
            if combined and not combined.endswith("\n"):
                combined += "\n"
            combined += stderr

        # Enforce 10 KB output limit
        if len(combined) > MAX_OUTPUT_BYTES:
            combined = combined[:MAX_OUTPUT_BYTES] + "\n[Output truncated: Exceeded maximum allowed size of 10 KB]"

        if process_res.returncode == 0:
            output_text = combined if combined.strip() else "(Program completed successfully with no output. Use print() to display results.)"
            return {
                "status": "success",
                "output": output_text,
                "executionTimeMs": elapsed_ms,
            }
        else:
            return {
                "status": "error",
                "output": combined,
                "executionTimeMs": elapsed_ms,
            }

    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "status": "timeout",
            "output": "Execution timed out.",
            "executionTimeMs": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return {
            "status": "error",
            "output": f"Execution error: {str(e)}",
            "executionTimeMs": elapsed_ms,
        }
