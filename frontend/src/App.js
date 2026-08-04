import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login";
import Instructions from "./pages/Instructions/Instructions";
import Test from "./pages/Test/Test";
import Review from "./pages/Review/Review";
import ThankYou from "./pages/ThankYou/ThankYou";

function AuthGuard({ children }) {
  const candidate = localStorage.getItem("candidate");
  if (!candidate) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function SubmittedGuard({ children }) {
  const location = useLocation();
  if (localStorage.getItem("testSubmitted") === "true" && location.pathname !== "/thankyou") {
    return <Navigate to="/thankyou" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <SubmittedGuard>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/instructions" element={<AuthGuard><Instructions /></AuthGuard>} />
          <Route path="/test" element={<AuthGuard><Test /></AuthGuard>} />
          <Route path="/review" element={<AuthGuard><Review /></AuthGuard>} />
          <Route path="/thankyou" element={<AuthGuard><ThankYou /></AuthGuard>} />
        </Routes>
      </SubmittedGuard>
    </Router>
  );
}

export default App;
