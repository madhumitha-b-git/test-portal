import axios from "axios";

// Primary API Gateway endpoint for production cloud deployment
const API_GATEWAY_URL = "https://ylmuevgvjd.execute-api.ap-southeast-1.amazonaws.com";
const PRIMARY_EXEC_URL = (process.env.REACT_APP_API_BASE_URL || API_GATEWAY_URL).trim();
const LOCAL_FALLBACK_URL = "http://127.0.0.1:8000";

/**
 * Sends Python 3 code and optional custom STDIN input to POST /execute endpoint.
 * Does NOT save code or persist answers to DynamoDB.
 */
export const runPythonCode = async (code, customInput = "") => {
  const trimmedCode = (code || "").trim();
  const trimmedInput = (customInput || "").trim();

  if (!trimmedCode) {
    return {
      status: "empty",
      output: "Please enter Python code before running.",
      executionTimeMs: 0,
    };
  }

  const tryExecute = async (baseURL) => {
    const response = await axios.post(
      `${baseURL}/execute`,
      { code: trimmedCode, input: trimmedInput },
      { timeout: 10000 }
    );
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

  // 1. Try configured Primary URL
  try {
    return await tryExecute(PRIMARY_EXEC_URL);
  } catch (error) {
    // 2. Try API Gateway URL if primary was local or custom
    if (PRIMARY_EXEC_URL !== API_GATEWAY_URL) {
      try {
        return await tryExecute(API_GATEWAY_URL);
      } catch (gwError) {
        // Fall through
      }
    }
    // 3. Try Local URL
    if (PRIMARY_EXEC_URL !== LOCAL_FALLBACK_URL) {
      try {
        return await tryExecute(LOCAL_FALLBACK_URL);
      } catch (localError) {
        // Fall through
      }
    }

    console.error("API /execute request error:", error);
    let detail = error.response?.data?.detail || error.message || "Failed to communicate with Python execution engine.";
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

