import React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, FileCheck2 } from "lucide-react";
import QuestionPaletteSidebar from "./QuestionPaletteSidebar";

const McqView = ({
  questionIndexInSection,
  currentSection,
  answers,
  currentQuestion,
  handleAnswer,
  handlePrevious,
  currentIndex,
  handleSubmit,
  handleNext,
  questions,
  nextSection,
  handlePaletteClick,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 items-stretch overflow-hidden">
      {/* Question Details & Option Selection Card (Left 8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col justify-between h-full overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                  Question {questionIndexInSection + 1} of{" "}
                  {currentSection?.questions?.length || 1}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentQuestion?.sectionName || "Multiple Choice"}
                </span>
              </div>
              {answers[currentQuestion?.questionId] && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Answered
                </span>
              )}
            </div>

            {/* Question Content */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-4 shrink-0">
              {currentQuestion?.question || currentQuestion?.text}
            </h2>

            {/* Options List - Flexible layout */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {currentQuestion?.options?.map((option, idx) => {
                const optValue = option.adminOptionId || option.originalOptionId || option.optionId || option.id;
                const badgeLabel = option.displayLabel || String.fromCharCode(65 + idx);
                const isSelected =
                  answers[currentQuestion.questionId] === optValue;
                return (
                  <div
                    key={optValue || idx}
                    onClick={() =>
                      handleAnswer(currentQuestion.questionId, optValue)
                    }
                    className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-600 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {badgeLabel}
                    </div>
                    <span
                      className={`text-sm sm:text-base transition ${
                        isSelected
                          ? "text-blue-950 font-semibold"
                          : "text-slate-700"
                      }`}
                    >
                      {option.text || option.optionText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls - Anchored bottom bar */}
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-200 shrink-0">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Review & Submit</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                >
                  <span>
                    {nextSection &&
                    questionIndexInSection === currentSection?.questions?.length - 1
                      ? `Proceed to ${nextSection.sectionName}`
                      : "Next"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Palette Sidebar (Right 4 cols) */}
      <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
        <QuestionPaletteSidebar
          currentSection={currentSection}
          questions={questions}
          answers={answers}
          currentIndex={currentIndex}
          handlePaletteClick={handlePaletteClick}
        />
      </div>
    </div>
  );
};

export default McqView;
