import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

  // If candidate is opening a NEW linkId, bypass old test redirect guards
  if (currentLinkId && cachedLinkId && String(currentLinkId).trim() !== String(cachedLinkId).trim()) {
    return children;
  }

  const isSubmitted = localStorage.getItem("testSubmitted") === "true";
  const submittedTestId = localStorage.getItem("submittedTestId");
  const currentTestId = localStorage.getItem("testId");

  if (isSubmitted && (!submittedTestId || !currentTestId || String(submittedTestId) === String(currentTestId))) {
    return <Navigate to="/thankyou" replace />;
  }
  return children;
}

function InstructionsGuard({ children }) {
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
  // ── Global Security: Block DevTools, Inspect Shortcuts, and Right-Click across all pages ──
  React.useEffect(() => {
    const blockDevToolsAndInspect = (e) => {
      // Block F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K (DevTools, Console, Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const key = e.key ? e.key.toLowerCase() : "";
        if (["i", "j", "c", "k"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Block Ctrl+U / Cmd+Option+U (View Page Source)
      if (
        (e.ctrlKey && !e.shiftKey && !e.altKey && e.key?.toLowerCase() === "u") ||
        (e.metaKey && e.altKey && e.key?.toLowerCase() === "u")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Cmd+Option+I, Cmd+Option+J, Cmd+Option+C on Mac
      if (e.metaKey && e.altKey) {
        const key = e.key ? e.key.toLowerCase() : "";
        if (["i", "j", "c"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    const blockContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("keydown", blockDevToolsAndInspect, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    return () => {
      document.removeEventListener("keydown", blockDevToolsAndInspect, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
    };
  }, []);

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
