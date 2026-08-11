import axios from "axios";

// Primary API Gateway endpoint for backend execution
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://ylmuevgvjd.execute-api.ap-southeast-1.amazonaws.com";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || " http://127.0.0.1:8000";
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

  try {
    const response = await axios.post(`${API_BASE_URL}/execute`, { code: trimmed });
    return response.data;
  } catch (error) {
    console.error("API /execute request error:", error);
    const detail = error.response?.data?.detail || error.message || "Failed to communicate with Python execution engine.";
    return {
      status: "error",
      output: `Execution Service Error: ${detail}`,
      executionTimeMs: 0,
    };
  }
};
