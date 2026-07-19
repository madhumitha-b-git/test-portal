import React from "react";

const ThankYou = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-xl shadow-md w-full max-w-md text-center">

        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Assessment Submitted Successfully!
        </h1>
        <p className="text-gray-500 text-sm">
          Thank you for completing the assessment. Your responses have been recorded.
        </p>

      </div>
    </div>
  );
};

export default ThankYou;
