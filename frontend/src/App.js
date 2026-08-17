import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login";
import Instructions from "./pages/Instructions/Instructions";
import Test from "./pages/Test/Test";
import Review from "./pages/Review/Review";
import ThankYou from "./pages/ThankYou/ThankYou";

function LoginGuard({ children }) {
  const urlParams = new URLSearchParams(window.location.search);
  const queryLinkId = urlParams.get("linkId");
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathLinkId = pathParts.length > 0 && !["instructions", "test", "review", "thankyou"].includes(pathParts[0]) ? pathParts[0] : null;
  const currentLinkId = queryLinkId || pathLinkId;
  const cachedLinkId = localStorage.getItem("linkId");

  // If candidate is opening a NEW linkId, clear old test state and bypass redirect guards
  if (currentLinkId && cachedLinkId && String(currentLinkId).trim() !== String(cachedLinkId).trim()) {
    localStorage.removeItem("testStarted");
    localStorage.removeItem("testSubmitted");
    localStorage.removeItem("submittedTestId");
    localStorage.removeItem("testTerminated");
    localStorage.removeItem("terminationReason");
    localStorage.removeItem("questions");
    localStorage.removeItem("answers");
    return children;
  }

  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const isStarted = localStorage.getItem("testStarted") === "true";
  const submittedTestId = localStorage.getItem("submittedTestId");
  const currentTestId = localStorage.getItem("testId");

  if (isSubmitted && (!submittedTestId || !currentTestId || String(submittedTestId) === String(currentTestId))) {
    return <Navigate to="/thankyou" replace />;
  }
  if (isStarted && !isSubmitted) {
    return <Navigate to="/test" replace />;
  }
  return children;
}

function InstructionsGuard({ children }) {
  const candidate = localStorage.getItem("candidate");
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const isStarted = localStorage.getItem("testStarted") === "true";
  const submittedTestId = localStorage.getItem("submittedTestId");
  const currentTestId = localStorage.getItem("testId");

  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  if (isSubmitted && (!submittedTestId || !currentTestId || String(submittedTestId) === String(currentTestId))) {
    return <Navigate to="/thankyou" replace />;
  }
  if (isStarted && !isSubmitted) {
    return <Navigate to="/test" replace />;
  }
  return children;
}

function TestGuard({ children }) {
  const candidate = localStorage.getItem("candidate");
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const submittedTestId = localStorage.getItem("submittedTestId");
  const currentTestId = localStorage.getItem("testId");

  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  if (isSubmitted && (!submittedTestId || !currentTestId || String(submittedTestId) === String(currentTestId))) {
    return <Navigate to="/thankyou" replace />;
  }
  return children;
}

function ThankYouGuard({ children }) {
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const isTerminated = localStorage.getItem("testTerminated") === "true";

  if (!isSubmitted && !isTerminated) {
    return <Navigate to="/" replace />;
  }
  return children;
}


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginGuard><Login /></LoginGuard>} />
        <Route path="/:linkId" element={<LoginGuard><Login /></LoginGuard>} />
        <Route path="/instructions" element={<InstructionsGuard><Instructions /></InstructionsGuard>} />
        <Route path="/test" element={<TestGuard><Test /></TestGuard>} />
        <Route path="/review" element={<TestGuard><Review /></TestGuard>} />
        <Route path="/thankyou" element={<ThankYouGuard><ThankYou /></ThankYouGuard>} />
      </Routes>
    </Router>
  );
}

export default App;
