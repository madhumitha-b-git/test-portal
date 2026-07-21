import axios from "axios";

// Base URL of FastAPI backend
const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// POST /register - Register candidate
export const registerCandidate = (data) => API.post("/register", data);

// GET /questions - Fetch all questions from Admin API
export const fetchQuestions = async () => {
  const res = await axios.get("https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests");
  // The API returns tests in `items`, we map the first test's questions
  // to match what the frontend expects { data: { questions: [...] } }
  const firstTest = res.data.items?.[0] || { questions: [] };
  return { data: { questions: firstTest.questions } };
};

// POST /submit - Submit answers
export const submitAnswers = (data) => API.post("/submit", data);

// POST /proctoring/session - Start proctoring session
export const startProctoringSession = (data) => API.post("/proctoring/session", data);

// GET /proctoring/session/{mailId} - Get session
export const getProctoringSession = (mailId) => API.get(`/proctoring/session/${mailId}`);

// POST /proctoring/warning - Increment warning count
export const incrementWarning = (data) => API.post("/proctoring/warning", data);

// POST /proctoring/report - Submit final report + end session
export const submitProctoringReport = (data) => API.post("/proctoring/report", data);
