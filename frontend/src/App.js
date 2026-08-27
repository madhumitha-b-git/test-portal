import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Instructions from "./pages/Instructions/Instructions";
import Test from "./pages/Test/Test";
import Review from "./pages/Review/Review";
import ThankYou from "./pages/ThankYou/ThankYou";

function isTestSubmitted() {
  return (
    sessionStorage.getItem("testSubmitted") === "true" ||
    localStorage.getItem("testSubmitted") === "true"
  );
}

function isTestTerminated() {
  return (
    sessionStorage.getItem("testTerminated") === "true" ||
    localStorage.getItem("testTerminated") === "true"
  );
}

function LoginGuard({ children }) {
  const urlParams = new URLSearchParams(window.location.search);
  const queryLinkId = urlParams.get("linkId");
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathLinkId = pathParts.length > 0 && !["instructions", "test", "review", "thankyou"].includes(pathParts[0]) ? pathParts[0] : null;
  const currentLinkId = queryLinkId || pathLinkId;
  const cachedLinkId = localStorage.getItem("linkId") || sessionStorage.getItem("linkId");

  // If candidate is opening a NEW linkId, bypass old test redirect guards
  if (currentLinkId && cachedLinkId && String(currentLinkId).trim() !== String(cachedLinkId).trim()) {
    return children;
  }

  if (isTestSubmitted()) {
    return <Navigate to="/thankyou" replace />;
  }
  return children;
}

function InstructionsGuard({ children }) {
  const candidate = localStorage.getItem("candidate") || sessionStorage.getItem("candidate") || sessionStorage.getItem("submittedCandidate");

  if (isTestSubmitted()) {
    return <Navigate to="/thankyou" replace />;
  }
  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function TestGuard({ children }) {
  const candidate = localStorage.getItem("candidate") || sessionStorage.getItem("candidate") || sessionStorage.getItem("submittedCandidate");

  if (isTestSubmitted()) {
    return <Navigate to="/thankyou" replace />;
  }
  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ThankYouGuard({ children }) {
  if (!isTestSubmitted() && !isTestTerminated()) {
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
