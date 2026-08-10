import axios from "axios";

// Base URL of FastAPI backend
const API = axios.create({
  baseURL: "https://ylmuevgvjd.execute-api.ap-southeast-1.amazonaws.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// POST /register - Register candidate
export const registerCandidate = (data) => API.post("/register", data);

// POST /login - Login candidate
export const loginCandidate = (data) => API.post("/login", data);

// GET /tests - Fetch single test validation by linkId
export const fetchTestByLinkId = async (linkId) => {
  if (!linkId) {
    return { success: false, error: "NO_LINK_ID", message: "Direct access without a link ID is not permitted." };
  }

  try {
    const resList = await axios.get("https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests");
    const tests = resList.data.items || [];
    const matchedTest = tests.find((t) => String(t.linkId).trim() === String(linkId).trim());

    if (!matchedTest) {
      return { success: false, error: "NOT_FOUND", message: `No test found for link ID '${linkId}'.` };
    }

    // Determine active status: check ONLY 'status'
    const statusLower = matchedTest.status ? matchedTest.status.toLowerCase().trim() : "";
    const isActive = statusLower === "active";

    if (!isActive) {
      return {
        success: false,
        error: "NOT_ACTIVE",
        title: matchedTest.title,
        message: `The assessment '${matchedTest.title}' is currently not active.`,
        test: matchedTest,
      };
    }

    return {
      success: true,
      test: matchedTest,
      title: matchedTest.title || "Online Assessment",
    };
  } catch (error) {
    console.error("Error verifying test by linkId:", error);
    return { success: false, error: "API_ERROR", message: "Failed to connect to assessment service. Please check your network." };
  }
};

// GET /questions - Fetch questions from Admin API
export const fetchQuestions = async (linkId) => {
  let testToUse = null;

  try {
    if (linkId) {
      const result = await fetchTestByLinkId(linkId);
      if (result.success && result.test) {
        testToUse = result.test;
      }
    }

    if (!testToUse) {
      const resList = await axios.get("https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests");
      const tests = resList.data.items || [];
      if (tests.length > 0) {
        const firstTest = tests[0];
        const resDetail = await axios.get(`https://utmtbogmaf.execute-api.ap-southeast-1.amazonaws.com/tests/${firstTest.testId}`);
        testToUse = resDetail.data;
      }
    }
  } catch (error) {
    console.error("Error fetching questions from Admin API:", error);
  }

  if (!testToUse) {
    testToUse = { sections: [], testId: "" };
  }
  
  // Flatten questions from all sections and inject section metadata
  const flattenedQuestions = [];
  const sections = testToUse.sections || [];
  
  sections.forEach((section) => {
    const qs = section.questions || [];
    qs.forEach((q) => {
      flattenedQuestions.push({
        ...q,
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        questionType: section.questionType || q.type || (section.sectionName === "CODING" ? "CODING" : "MCQ"),
      });
    });
  });

  const duration = testToUse.totalDurationMinutes || testToUse.durationMinutes || 60;

  return {
    data: {
      questions: flattenedQuestions,
      testId: testToUse.testId,
      totalDurationMinutes: duration,
      title: testToUse.title,
    }
  };
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
