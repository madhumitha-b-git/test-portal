import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitAnswers, submitProctoringReport } from "../../services/api";

const Review = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true") {
      navigate("/thankyou", { replace: true });
      return;
    }

    // Load questions and answers from localStorage
    const savedQuestions = JSON.parse(localStorage.getItem("questions") || "[]");
    const savedAnswers = JSON.parse(localStorage.getItem("answers") || "{}");
    setQuestions(savedQuestions);
    setAnswers(savedAnswers);
  }, [navigate]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  // Handle final submit
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

      // Build responses array
      const responses = questions.map((q) => ({
        questionId: q.questionId,
        selectedOption: answers[q.questionId] || "",
      }));

      // Call POST /submit API
      await submitAnswers({
        name: candidate.name,
        mailId: candidate.mailId,
        responses,
      });

      // Submit proctoring report with SUCCESS status
      const startedTime = localStorage.getItem("proctoringStartedTime") || "";
      const endedTime = new Date().toISOString();
      const warningCount = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

      submitProctoringReport({
        mailId: candidate.mailId,
        startedTime,
        endedTime,
        status: "SUCCESS",
        warningCount,
      }).catch(() => {});

      // Mark as submitted to block re-entry
      localStorage.setItem("testSubmitted", "true");

      // Clear localStorage
      localStorage.removeItem("answers");
      localStorage.removeItem("questions");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");

      // Redirect to Thank You page
      navigate("/thankyou", { replace: true });
    } catch (err) {
      setError("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">

        {/* Header */}
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Review Your Answers
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{questions.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{answeredCount}</p>
            <p className="text-sm text-gray-500 mt-1">Answered</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{unansweredCount}</p>
            <p className="text-sm text-gray-500 mt-1">Unanswered</p>
          </div>
        </div>

        {/* Warning if unanswered */}
        {unansweredCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 p-3 rounded-lg text-sm mb-6">
            ⚠️ You have {unansweredCount} unanswered question(s). You can go back and answer them.
          </div>
        )}

        {/* API Error */}
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/test")}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Back to Test
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Final Submit"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Review;
