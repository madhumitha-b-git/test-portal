import React from "react";

const QuestionPaletteSidebar = ({
  currentSection,
  questions,
  answers,
  currentIndex,
  handlePaletteClick,
}) => {
  const secQuestions =
    currentSection?.questions || questions.map((q, i) => ({ ...q, globalIndex: i }));
  const secAnsweredCount = secQuestions.filter((q) => !!answers[q.questionId]).length;
  const secProgressPercent = Math.round(
    (secAnsweredCount / (secQuestions.length || 1)) * 100
  );

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Question Palette
          </h3>
          <span className="text-xs font-bold text-blue-700">
            {secAnsweredCount}/{secQuestions.length} Answered
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-200">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${secProgressPercent}%` }}
          ></div>
        </div>

        {/* Question Buttons Grid - Compact 5-column grid */}
        <div className="grid grid-cols-5 gap-2.5 my-2 max-w-sm">
          {secQuestions.map((q, index) => {
            const isCurrent = currentIndex === q.globalIndex;
            const isAnswered = !!answers[q.questionId];

            return (
              <button
                key={q.questionId}
                onClick={() => handlePaletteClick(q.globalIndex)}
                className={`h-9 sm:h-10 rounded-lg font-bold text-xs sm:text-sm transition duration-150 cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? "bg-blue-600 text-white ring-2 ring-blue-300 shadow-xs scale-105"
                    : isAnswered
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Legend */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] sm:text-xs text-slate-600 font-semibold shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-600"></div>
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-600"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></div>
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionPaletteSidebar;
