import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login/Login";
import Instructions from "./pages/Instructions/Instructions";
import Test from "./pages/Test/Test";
import Review from "./pages/Review/Review";
import ThankYou from "./pages/ThankYou/ThankYou";

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
          <Route path="/instructions" element={<Instructions />} />
          <Route path="/test" element={<Test />} />
          <Route path="/review" element={<Review />} />
          <Route path="/thankyou" element={<ThankYou />} />
        </Routes>
      </SubmittedGuard>
    </Router>
  );
}

export default App;
