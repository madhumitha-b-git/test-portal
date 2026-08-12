import axios from "axios";

// Execution endpoint for Python sandbox execution
const PRIMARY_EXEC_URL = (process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000").trim();
const FALLBACK_EXEC_URL = "http://localhost:8000";

/**
 * Sends Python 3 code to the backend POST /execute endpoint.
 * Does NOT save code or persist answers to DynamoDB.
 */
export const runPythonCode = async (code) => {
  const trimmed = (code || "").trim();

  if (!trimmed) {
    return {
      status: "empty",
      output: "Please enter Python code before running.",
      executionTimeMs: 0,
    };
  }

  const tryExecute = async (baseURL) => {
    const response = await axios.post(`${baseURL}/execute`, { code: trimmed }, { timeout: 8000 });
    const resData = response.data || {};
    const safeOutput = typeof resData.output === "object"
      ? JSON.stringify(resData.output, null, 2)
      : String(resData.output ?? "");

    return {
      status: resData.status || "success",
      output: safeOutput,
      executionTimeMs: resData.executionTimeMs || 0,
    };
  };

  try {
    return await tryExecute(PRIMARY_EXEC_URL);
  } catch (error) {
    if (PRIMARY_EXEC_URL !== FALLBACK_EXEC_URL) {
      try {
        return await tryExecute(FALLBACK_EXEC_URL);
      } catch (fallbackError) {
        // Fall through
      }
    }
    console.error("API /execute request error:", error);
    let detail = error.response?.data?.detail || error.message || "Failed to communicate with Python execution engine. Ensure backend is running on port 8000.";
    if (typeof detail === "object") {
      detail = JSON.stringify(detail, null, 2);
    }
    return {
      status: "error",
      output: `Execution Service Error: ${detail}`,
      executionTimeMs: 0,
    };
  }
};
