import React from "react";
import PythonEditor from "../../../components/PythonEditor";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from "lucide-react";

const CodingView = ({
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
  executionMap,
  showOutputMap,
  setShowOutputMap,
  handleRunCode,
  handlePrevious,
  handleNext,
  handleSubmit,
  questions,
  nextSection,
}) => {
  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Section Header Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            Section: {currentQuestion?.sectionName || "Coding"}
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Question {questionIndexInSection + 1} of{" "}
            {currentSection?.questions?.length || 1}
          </h2>
        </div>

        {/* Inline Palette tabs */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2">
            Questions:
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
                Q{index + 1}
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
        {/* Left Column: Problem Description Card */}
        <div
          style={{ width: window.innerWidth >= 1024 ? `${splitWidth}%` : "100%" }}
          className={`w-full bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden ${
            isDraggingSplit ? "" : "transition-all duration-75"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3 shrink-0">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Problem Statement
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
              {currentQuestion?.marks || 15} Marks
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
              {currentQuestion?.question || currentQuestion?.text}
            </p>
          </div>
        </div>

        {/* Draggable Split Divider Bar (Desktop) */}
        <div
          onMouseDown={handleMouseDownSplit}
          className="hidden lg:flex w-4 cursor-col-resize items-center justify-center bg-transparent hover:bg-blue-100/60 group transition-colors duration-150 relative z-10 shrink-0 mx-1 rounded-md"
          title="Click and drag to adjust width between Problem Statement and Code Editor"
        >
          <div className="w-1.5 h-16 bg-slate-300 group-hover:bg-blue-600 rounded-full transition-colors flex flex-col justify-center items-center gap-1 shadow-xs">
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Right Column: Python IDE Card */}
        <div
          style={{
            width: window.innerWidth >= 1024 ? `${100 - splitWidth}%` : "100%",
          }}
          className={`w-full flex-1 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-lg flex flex-col min-h-0 overflow-hidden ${
            isDraggingSplit ? "" : "transition-all duration-75"
          }`}
        >
          {/* IDE Header */}
          <div className="bg-slate-950 px-5 py-2.5 border-b border-slate-850 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 font-mono">
                Python 3
              </span>
            </div>
          </div>

          {/* Python Monaco Editor area */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            <PythonEditor
              value={answers[currentQuestion?.questionId] || ""}
              onChange={(val) => handleAnswer(currentQuestion?.questionId, val)}
            />
          </div>

          {/* Footer status bar & Run Code Action */}
          <div className="bg-slate-950 px-5 py-2 border-t border-slate-850 flex justify-between items-center text-[11px] text-slate-400 font-mono shrink-0">
            <div className="flex items-center gap-4">
              <div>
                <span>Status: </span>
                <span
                  className={
                    answers[currentQuestion?.questionId]
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {answers[currentQuestion?.questionId] ? "Saved (Draft)" : "Unsaved"}
                </span>
              </div>
              <div>
                <span>
                  Lines:{" "}
                  {(answers[currentQuestion?.questionId] || "").split("\n").length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {executionMap[currentQuestion?.questionId] && (
                <button
                  onClick={() =>
                    setShowOutputMap((prev) => ({
                      ...prev,
                      [currentQuestion?.questionId]:
                        !prev[currentQuestion?.questionId],
                    }))
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title={
                    showOutputMap[currentQuestion?.questionId]
                      ? "Collapse output panel"
                      : "Expand output panel"
                  }
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>
                    {showOutputMap[currentQuestion?.questionId]
                      ? "Hide Output"
                      : "Show Output"}
                  </span>
                  {showOutputMap[currentQuestion?.questionId] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                onClick={() => handleRunCode(currentQuestion?.questionId)}
                disabled={executionMap[currentQuestion?.questionId]?.isRunning}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-sans text-xs font-bold transition cursor-pointer ${
                  executionMap[currentQuestion?.questionId]?.isRunning
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                }`}
              >
                {executionMap[currentQuestion?.questionId]?.isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Panel */}
          {showOutputMap[currentQuestion?.questionId] && (
            <div className="bg-slate-950 border-t border-slate-850 p-3.5 flex flex-col h-[140px] shrink-0 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-850 mb-1.5 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                    Output
                  </span>
                  {executionMap[currentQuestion?.questionId]?.executionTimeMs > 0 && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({executionMap[currentQuestion?.questionId]?.executionTimeMs}ms)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {executionMap[currentQuestion?.questionId]?.status === "error" && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded">
                      Execution Error
                    </span>
                  )}
                  {executionMap[currentQuestion?.questionId]?.status === "success" && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                      Success
                    </span>
                  )}
                  <button
                    onClick={() =>
                      setShowOutputMap((prev) => ({
                        ...prev,
                        [currentQuestion?.questionId]: false,
                      }))
                    }
                    title="Close / Hide Output Panel"
                    className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Output Content Area */}
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                {executionMap[currentQuestion?.questionId]?.output && (
                  <pre className="text-slate-200 whitespace-pre-wrap">
                    {executionMap[currentQuestion?.questionId]?.output}
                  </pre>
                )}
                {executionMap[currentQuestion?.questionId]?.error && (
                  <pre className="text-red-400 whitespace-pre-wrap font-bold">
                    {executionMap[currentQuestion?.questionId]?.error}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coding Section Navigation Controls */}
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

export default CodingView;
