import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuestions } from "../../services/api";

const Test = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch questions on page load
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetchQuestions();
        setQuestions(response.data.questions);
      } catch (err) {
        setError("Failed to load questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  // Handle option selection
  const handleAnswer = (questionId, optionId) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  // Navigate to next question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Go to specific question from palette
  const handlePaletteClick = (index) => {
    setCurrentIndex(index);
  };

  // Handle submit - go to review page
  const handleSubmit = () => {
    // Save answers to localStorage for review and submit pages
    localStorage.setItem("answers", JSON.stringify(answers));
    localStorage.setItem("questions", JSON.stringify(questions));
    navigate("/review");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Online Assessment</h1>
          <span className="text-gray-500 text-sm">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex gap-6">

          {/* Question Area */}
          <div className="flex-1 bg-white rounded-xl shadow-md p-6">

            {/* Question Text */}
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              Q{currentIndex + 1}. {currentQuestion.text}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <div
                  key={option.optionId}
                  onClick={() => handleAnswer(currentQuestion.questionId, option.optionId)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition duration-200
                    ${answers[currentQuestion.questionId] === option.optionId
                      ? "bg-blue-50 border-blue-500"
                      : "border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm
                    ${answers[currentQuestion.questionId] === option.optionId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600"
                    }`}>
                    {option.optionId}
                  </span>
                  <span className="text-gray-700">{option.text}</span>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
              >
                Previous
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Review & Submit
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Question Palette */}
          <div className="w-48 bg-white rounded-xl shadow-md p-4 h-fit">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.questionId}
                  onClick={() => handlePaletteClick(index)}
                  className={`w-8 h-8 rounded text-sm font-semibold transition
                    ${currentIndex === index
                      ? "bg-blue-600 text-white"
                      : answers[q.questionId]
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                <span>Not Answered</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full mt-6 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
            >
              Submit
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Test;
