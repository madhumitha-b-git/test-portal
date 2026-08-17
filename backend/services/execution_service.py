import sys
import os
import time
import subprocess
import ast

MAX_OUTPUT_BYTES = 10 * 1024  # 10 KB
EXECUTION_TIMEOUT = 5.0       # 5 seconds timeout

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


def run_python_code_execution(code: str, input_str: str = "") -> dict:
    """
    Executes Python 3 code in a secure, AST-validated sandbox with stdout/stderr capture,
    custom input (STDIN) support, and step-count infinite loop protection.
    Does NOT interact with DynamoDB, SNS, or application data.
    """
    import io
    import traceback

    code_str = (code or "").strip()
    if not code_str:
        return {
            "status": "error",
            "output": "Please enter Python code before running.",
            "executionTimeMs": 0,
        }

    # Pre-execution AST import & function security validation
    is_valid, sec_error = validate_python_code_security(code_str)
    if not is_valid:
        return {
            "status": "error",
            "output": sec_error,
            "executionTimeMs": 0,
        }

    # Prepare custom STDIN input lines for input()
    input_lines = (input_str or "").splitlines()
    input_idx = 0

    def custom_input(prompt=""):
        nonlocal input_idx
        if prompt:
            print(prompt, end="")
        if input_idx < len(input_lines):
            val = input_lines[input_idx]
            input_idx += 1
            return val
        raise EOFError("EOFError: EOF when reading a line.\n[Tip: Your Python code uses input(). Please enter test data in the 'Custom Input' tab before running code.]")

    # Prepare output buffers
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()

    # Infinite loop protection: max 150,000 execution steps
    step_count = 0
    MAX_STEPS = 150_000

    def trace_limit(frame, event, arg):
        nonlocal step_count
        if event == "line":
            step_count += 1
            if step_count > MAX_STEPS:
                raise TimeoutError("Execution timed out: Maximum allowed step count (150,000 operations) exceeded. Check for infinite loops or non-terminating operations.")
        return trace_limit

    start_time = time.perf_counter()

    try:
        sys.stdout = stdout_buf
        sys.stderr = stderr_buf
        sys.settrace(trace_limit)

        # Build safe execution scope
        builtins_dict = dict(sys.modules["builtins"].__dict__)
        builtins_dict["input"] = custom_input
        builtins_dict["open"] = None
        builtins_dict["eval"] = None
        builtins_dict["exec"] = None
        builtins_dict["__import__"] = None

        exec_globals = {
            "__name__": "__main__",
            "__builtins__": builtins_dict,
        }

        exec(code_str, exec_globals)

    except TimeoutError as te:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        stdout_text = stdout_buf.getvalue()
        stderr_text = stderr_buf.getvalue()
        combined = stdout_text + (("\n" if stdout_text and not stdout_text.endswith("\n") else "") + stderr_text if stderr_text else "")
        return {
            "status": "timeout",
            "output": (combined + "\n" if combined.strip() else "") + str(te),
            "executionTimeMs": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        stdout_text = stdout_buf.getvalue()
        stderr_text = stderr_buf.getvalue()
        
        # Format traceback message without framework internal frames
        raw_tb = traceback.format_exc()
        tb_lines = [line for line in raw_tb.splitlines() if 'exec(code_str' not in line and 'sys.settrace' not in line]
        error_msg = "\n".join(tb_lines)

        combined = stdout_text + (("\n" if stdout_text and not stdout_text.endswith("\n") else "") + error_msg if error_msg else "")
        return {
            "status": "error",
            "output": combined,
            "executionTimeMs": elapsed_ms,
        }
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    stdout_text = stdout_buf.getvalue()
    stderr_text = stderr_buf.getvalue()

    combined = stdout_text
    if stderr_text:
        if combined and not combined.endswith("\n"):
            combined += "\n"
        combined += stderr_text

    # Enforce 10 KB output limit
    if len(combined) > MAX_OUTPUT_BYTES:
        combined = combined[:MAX_OUTPUT_BYTES] + "\n[Output truncated: Exceeded maximum allowed size of 10 KB]"

    output_text = combined if combined.strip() else "(Program completed successfully with no output. Use print() to display results.)"
    return {
        "status": "success",
        "output": output_text,
        "executionTimeMs": elapsed_ms,
    }
