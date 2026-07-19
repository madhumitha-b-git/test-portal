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

// GET /questions - Fetch all questions
export const fetchQuestions = () => API.get("/questions");

// POST /submit - Submit answers
export const submitAnswers = (data) => API.post("/submit", data);
