import React from "react";
import {
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from "lucide-react";

const DescriptiveView = ({
  currentQuestion,
  questionIndexInSection,
  currentSection,
  currentIndex,
  answers,
  setCurrentIndex,
  codingContainerRef,
  isDraggingSplit,
  splitWidth,
  handleMouseDownSplit,
  handleAnswer,
  handlePrevious,
  handleNext,
  handleSubmit,
  questions,
  nextSection,
}) => {
  const currentAnswer = answers[currentQuestion?.questionId] || "";
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const charCount = currentAnswer.length;

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Section Header Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
            Section: {currentQuestion?.sectionName || "Descriptive"}
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Task {questionIndexInSection + 1} of{" "}
            {currentSection?.questions?.length || 1}
          </h2>
        </div>

        {/* Inline Palette tabs */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2">
            Tasks:
          </span>
          {currentSection?.questions?.map((q, index) => {
            const isCurrent = currentIndex === q.globalIndex;
            const isAnswered = !!answers[q.questionId];
            return (
              <button
                key={q.questionId}
                onClick={() => setCurrentIndex(q.globalIndex)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-xs"
                    : isAnswered
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Task {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-side Resizable Layout */}
      <div
        ref={codingContainerRef}
        className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${
          isDraggingSplit ? "select-none" : ""
        }`}
      >
        {/* Left Column: Task Prompt & Scenario Card */}
        <div
          style={{ width: window.innerWidth >= 1024 ? `${splitWidth}%` : "100%" }}
          className={`w-full bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden ${
            isDraggingSplit ? "" : "transition-all duration-75"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3 shrink-0">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Task Prompt & Scenario
            </h3>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              {currentQuestion?.marks || 10} Marks
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
              {currentQuestion?.question || currentQuestion?.text}
            </p>
          </div>

          {/* Guidelines Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Notepad Guidelines</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Type your essay or written content in the notepad area. Your text is
              auto-saved in real-time as you write. Use the Clear button to start fresh.
            </p>
          </div>
        </div>

        {/* Draggable Split Divider Bar (Desktop) */}
        <div
          onMouseDown={handleMouseDownSplit}
          className="hidden lg:flex w-4 cursor-col-resize items-center justify-center bg-transparent hover:bg-blue-100/60 group transition-colors duration-150 relative z-10 shrink-0 mx-1 rounded-md"
          title="Click and drag to adjust width between Task Prompt and Notepad Editor"
        >
          <div className="w-1.5 h-16 bg-slate-300 group-hover:bg-blue-600 rounded-full transition-colors flex flex-col justify-center items-center gap-1 shadow-xs">
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Right Column: Notepad Editor Card */}
        <div
          style={{
            width: window.innerWidth >= 1024 ? `${100 - splitWidth}%` : "100%",
          }}
          className={`w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden ${
            isDraggingSplit ? "" : "transition-all duration-75"
          }`}
        >
          {/* Editor Header */}
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Notepad Editor
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                {wordCount} Words
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-500">
                {charCount} Chars
              </span>
              <span
                className={
                  currentAnswer
                    ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200"
                    : "text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200"
                }
              >
                {currentAnswer ? "Saved (Draft)" : "Unsaved"}
              </span>
              <button
                onClick={() => handleAnswer(currentQuestion?.questionId, "")}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition cursor-pointer"
                title="Clear editor text"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Textarea Notepad Area */}
          <div className="flex-1 p-3.5 relative flex flex-col min-h-0 overflow-hidden">
            <textarea
              value={currentAnswer}
              onChange={(e) =>
                handleAnswer(currentQuestion?.questionId, e.target.value)
              }
              placeholder="Type your response here... (Auto-saved)"
              className="w-full flex-1 p-3.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-800 text-sm leading-relaxed resize-none font-sans"
            />
          </div>
        </div>
      </div>

      {/* Descriptive Section Navigation Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Review & Submit</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
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
  );
};

export default DescriptiveView;
