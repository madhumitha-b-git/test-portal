import React from "react";
import { ShieldAlert, Maximize, AlertTriangle } from "lucide-react";

const ProctoringOverlay = ({
  isTerminated,
  terminationReason,
  needsFullscreen,
  isDocumentFullscreen,
  initialFullscreenDoneRef,
  showWarningOverlay,
  fullscreenCountdown,
  warningCount,
  setNeedsFullscreen,
  enterFullscreen,
}) => {
  // ── Terminated screen ──
  if (isTerminated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-red-200">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Assessment Terminated
          </h1>
          <p className="text-red-600 text-xs mb-3 font-medium">
            {terminationReason}
          </p>
          <p className="text-slate-500 text-xs">Redirecting candidate session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Fullscreen Overlay ── */}
      {needsFullscreen &&
        !isDocumentFullscreen() &&
        initialFullscreenDoneRef.current &&
        !isTerminated &&
        !showWarningOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-slate-200">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  fullscreenCountdown !== null && fullscreenCountdown <= 5
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                }`}
              >
                <Maximize className="w-7 h-7" />
              </div>
              <h2
                className={`text-lg font-bold mb-2 ${
                  fullscreenCountdown !== null && fullscreenCountdown <= 5
                    ? "text-red-600"
                    : "text-slate-900"
                }`}
              >
                {fullscreenCountdown !== null && fullscreenCountdown <= 5
                  ? "Security Warning!"
                  : "Fullscreen Mode Required"}
              </h2>
              <p className="text-slate-600 text-xs mb-4">
                Hire360 requires active Fullscreen mode to continue your assessment.
              </p>

              {fullscreenCountdown !== null && (
                <div className="mb-5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div
                    className={`text-3xl font-extrabold ${
                      fullscreenCountdown <= 5 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {fullscreenCountdown}s
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                    Seconds remaining before termination
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setNeedsFullscreen(false);
                  enterFullscreen();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                Enter Fullscreen Mode
              </button>
            </div>
          </div>
        )}

      {/* ── Warning Overlay ── */}
      {showWarningOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-amber-200">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Window Switch Detected!
            </h2>
            <p className="text-slate-600 text-xs mb-4">
              Exam interface locked for 5 seconds. Please stay on the assessment
              window.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 font-bold text-xs">
              <span>Warning Record: {warningCount}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProctoringOverlay;
