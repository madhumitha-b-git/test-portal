import React from "react";
import { useNavigate } from "react-router-dom";

const Instructions = () => {
  const navigate = useNavigate();

  const handleStartTest = () => {
    navigate("/test");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl">

        {/* Header */}
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">
          Assessment Instructions
        </h1>

        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">📋 General Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
            <li>The assessment contains 10 multiple choice questions.</li>
            <li>Each question has 4 options. Select the best answer.</li>
            <li>You can navigate between questions using Previous and Next buttons.</li>
            <li>You can review your answers before final submission.</li>
            <li>Once submitted, you cannot change your answers.</li>
            <li>Do not refresh or close the browser during the test.</li>
          </ul>
        </div>

        {/* System Requirements */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">💻 System Requirements</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
            <li>Use a stable internet connection.</li>
            <li>Use latest version of Chrome, Firefox, or Edge.</li>
            <li>Make sure JavaScript is enabled in your browser.</li>
            <li>Do not use mobile devices for this assessment.</li>
          </ul>
        </div>

        {/* Start Test Button */}
        <button
          onClick={handleStartTest}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
        >
          Start Test
        </button>

      </div>
    </div>
  );
};

export default Instructions;
