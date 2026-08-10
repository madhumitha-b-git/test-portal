import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login";
import Instructions from "./pages/Instructions/Instructions";
import Test from "./pages/Test/Test";
import Review from "./pages/Review/Review";
import ThankYou from "./pages/ThankYou/ThankYou";

function LoginGuard({ children }) {
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const hasActiveSession = !!localStorage.getItem("proctoringStartedTime");

  if (isSubmitted) {
    return <Navigate to="/thankyou" replace />;
  }
  if (hasActiveSession) {
    return <Navigate to="/test" replace />;
  }
  return children;
}

function InstructionsGuard({ children }) {
  const candidate = localStorage.getItem("candidate");
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const hasActiveSession = !!localStorage.getItem("proctoringStartedTime");

  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  if (isSubmitted) {
    return <Navigate to="/thankyou" replace />;
  }
  if (hasActiveSession) {
    return <Navigate to="/test" replace />;
  }
  return children;
}

function TestGuard({ children }) {
  const candidate = localStorage.getItem("candidate");
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";

  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  if (isSubmitted) {
    return <Navigate to="/thankyou" replace />;
  }
  return children;
}

function ThankYouGuard({ children }) {
  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const isTerminated = localStorage.getItem("testTerminated") === "true";
  const hasActiveSession = !!localStorage.getItem("proctoringStartedTime");

  if (!isSubmitted && !isTerminated) {
    if (hasActiveSession) {
      return <Navigate to="/test" replace />;
    }
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
