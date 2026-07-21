import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuestions, startProctoringSession, incrementWarning, submitAnswers, submitProctoringReport } from "../../services/api";

const TAB_RETURN_LIMIT_MS = 15000;
const WARNING_LOCKOUT_MS = 5000;
const FULLSCREEN_TIMEOUT_MS = 15000;

const Test = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [warningCount, setWarningCount] = useState(0);
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(null);

  const awayTimerRef = useRef(null);
  const lockoutTimerRef = useRef(null);
  const isAwayRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const warningInFlightRef = useRef(false);
  const initialFullscreenDoneRef = useRef(false);
  const fullscreenTimerRef = useRef(null);
  const fullscreenIntervalRef = useRef(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
  const mailId = candidate.mailId || "";

  // ── Redirect if already submitted ──
  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true") {
      navigate("/thankyou", { replace: true });
    }
  }, [navigate]);

  // ── Fetch questions on mount ──
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const savedQuestions = JSON.parse(localStorage.getItem("questions") || "[]");
        const savedAnswers = JSON.parse(localStorage.getItem("answers") || "{}");

        if (savedQuestions.length > 0) {
          setQuestions(savedQuestions);
          setAnswers(savedAnswers);
          setLoading(false);
          return;
        }

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

  // ── Request fullscreen (must be called from user gesture) ──
  const enterFullscreen = useCallback(() => {
    if (!document.documentElement.requestFullscreen) return Promise.resolve();
    return document.documentElement.requestFullscreen()
      .then(() => {
        setNeedsFullscreen(false);
        setTimeout(() => { initialFullscreenDoneRef.current = true; }, 500);
      })
      .catch(() => setNeedsFullscreen(true));
  }, []);

  useEffect(() => {
    setNeedsFullscreen(!document.fullscreenElement);
  }, []);

  // ── Track fullscreen state ──
  useEffect(() => {
    const update = () => setNeedsFullscreen(!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [isTerminated]);

  // ── Start proctoring session on mount ──
  useEffect(() => {
    if (sessionStartedRef.current || !mailId) return;
    sessionStartedRef.current = true;

    const startedTime = new Date().toISOString();
    localStorage.setItem("proctoringStartedTime", startedTime);
    localStorage.setItem("proctoringWarningCount", "0");
    localStorage.setItem("proctoringStatus", "SUCCESS");

    startProctoringSession({ mailId }).catch(() => {});
  }, [mailId]);

  // ── Terminate session ──
  const terminateSession = useCallback((reason) => {
    if (isAwayRef.current) {
      clearTimeout(awayTimerRef.current);
      isAwayRef.current = false;
    }
    setIsTerminated(true);
    setTerminationReason(reason);

    const endedTime = new Date().toISOString();
    const startedTime = localStorage.getItem("proctoringStartedTime") || "";
    const count = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

    const currentAnswers = answersRef.current;
    const currentQuestions = questionsRef.current;

    const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

    const responses = currentQuestions.map((q) => ({
      questionId: q.questionId,
      selectedOption: currentAnswers[q.questionId] || "",
    }));

    submitAnswers({
      name: candidate.name,
      mailId: candidate.mailId,
      responses,
    }).catch(() => {});

    submitProctoringReport({
      mailId,
      startedTime,
      endedTime,
      status: "TERMINATED",
      warningCount: count,
    }).catch(() => {});

    localStorage.setItem("testSubmitted", "true");
    localStorage.removeItem("answers");
    localStorage.removeItem("questions");
    localStorage.removeItem("proctoringStartedTime");
    localStorage.removeItem("proctoringWarningCount");
    localStorage.removeItem("proctoringStatus");

    setTimeout(() => navigate("/thankyou", { replace: true }), 2000);
  }, [mailId, navigate]);

  // ── Handle tab / window returning within 15s ──
  const handleReturnFromAway = useCallback(() => {
    if (!isAwayRef.current) return;
    isAwayRef.current = false;
    clearTimeout(awayTimerRef.current);

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => setNeedsFullscreen(false))
        .catch(() => setNeedsFullscreen(true));
    }

    incrementWarning({ mailId }).then((res) => {
      const newCount = res.data.warningCount;
      setWarningCount(newCount);
      localStorage.setItem("proctoringWarningCount", String(newCount));
      if (newCount > 3) {
        terminateSession("Exceeded maximum warnings (3)");
      }
    }).catch(() => {});

    setShowWarningOverlay(true);
    lockoutTimerRef.current = setTimeout(() => {
      setShowWarningOverlay(false);
    }, WARNING_LOCKOUT_MS);
  }, [mailId]);

  // ── Start the 15s away countdown ──
  const startAwayCountdown = useCallback(() => {
    if (isAwayRef.current || isTerminated) return;
    isAwayRef.current = true;

    awayTimerRef.current = setTimeout(() => {
      isAwayRef.current = false;
      terminateSession("Left exam for more than 15 seconds");
    }, TAB_RETURN_LIMIT_MS);
  }, [isTerminated, terminateSession]);

  // ── Visibility change (tab switch) ──
  useEffect(() => {
    const onVisibilityChange = () => {
      if (isTerminated) return;
      if (document.hidden) {
        startAwayCountdown();
      } else {
        handleReturnFromAway();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isTerminated, startAwayCountdown, handleReturnFromAway]);

  // ── Window blur (app switch / alt-tab) ──
  useEffect(() => {
    const onBlur = () => {
      if (!isTerminated) startAwayCountdown();
    };
    const onFocus = () => {
      if (!isTerminated) handleReturnFromAway();
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [isTerminated, startAwayCountdown, handleReturnFromAway]);

  // ── When fullscreen is lost during test: warn ──
  useEffect(() => {
    if (!initialFullscreenDoneRef.current) return;
    if (document.fullscreenElement || isTerminated || !needsFullscreen) return;

    setShowWarningOverlay(true);
    clearTimeout(lockoutTimerRef.current);
    lockoutTimerRef.current = setTimeout(() => {
      setShowWarningOverlay(false);
    }, WARNING_LOCKOUT_MS);

    if (warningInFlightRef.current) return;
    warningInFlightRef.current = true;

    incrementWarning({ mailId }).then((res) => {
      const newCount = res.data.warningCount;
      setWarningCount(newCount);
      localStorage.setItem("proctoringWarningCount", String(newCount));
      if (newCount > 3) {
        terminateSession("Exceeded maximum warnings (3)");
      }
    }).catch(() => {}).finally(() => {
      warningInFlightRef.current = false;
    });
  }, [needsFullscreen, isTerminated, mailId]);

  // ── Fullscreen countdown: terminate if user ignores for 15s ──
  useEffect(() => {
    const showCountdown = needsFullscreen && initialFullscreenDoneRef.current && !isTerminated;

    if (!showCountdown) {
      clearTimeout(fullscreenTimerRef.current);
      clearInterval(fullscreenIntervalRef.current);
      setFullscreenCountdown(null);
      return;
    }

    const startTime = Date.now();
    setFullscreenCountdown(Math.ceil(FULLSCREEN_TIMEOUT_MS / 1000));

    fullscreenIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((FULLSCREEN_TIMEOUT_MS - elapsed) / 1000));
      setFullscreenCountdown(remaining);
    }, 200);

    fullscreenTimerRef.current = setTimeout(() => {
      clearInterval(fullscreenIntervalRef.current);
      setFullscreenCountdown(null);
      terminateSession("You did not enter fullscreen in time");
    }, FULLSCREEN_TIMEOUT_MS);

    return () => {
      clearTimeout(fullscreenTimerRef.current);
      clearInterval(fullscreenIntervalRef.current);
      setFullscreenCountdown(null);
    };
  }, [needsFullscreen, isTerminated, terminateSession]);

  // ── Restriction handlers ──
  useEffect(() => {
    if (isTerminated) return;

    const blockCopyPaste = (e) => {
      if (
        (e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
    };

    const blockFunctionKeys = (e) => {
      if (e.key.startsWith("F") && e.key.length <= 3) {
        const num = parseInt(e.key.slice(1), 10);
        if (num >= 1 && num <= 12) {
          e.preventDefault();
          return false;
        }
      }
    };

    const blockRightClick = (e) => {
      e.preventDefault();
      return false;
    };

    const blockCut = (e) => e.preventDefault();
    const blockPaste = (e) => e.preventDefault();
    const blockCopy = (e) => e.preventDefault();

    document.addEventListener("keydown", blockCopyPaste);
    document.addEventListener("keydown", blockFunctionKeys);
    document.addEventListener("contextmenu", blockRightClick);
    document.addEventListener("cut", blockCut);
    document.addEventListener("paste", blockPaste);
    document.addEventListener("copy", blockCopy);

    return () => {
      document.removeEventListener("keydown", blockCopyPaste);
      document.removeEventListener("keydown", blockFunctionKeys);
      document.removeEventListener("contextmenu", blockRightClick);
      document.removeEventListener("cut", blockCut);
      document.removeEventListener("paste", blockPaste);
      document.removeEventListener("copy", blockCopy);
    };
  }, [isTerminated]);

  // ── Cleanup timers ──
  useEffect(() => {
    return () => {
      clearTimeout(awayTimerRef.current);
      clearTimeout(lockoutTimerRef.current);
    };
  }, []);

  // ── Keep refs in sync with state ──
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // ── Option select ──
  const handleAnswer = (questionId, optionId) => {
    if (showWarningOverlay || isTerminated) return;
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handlePaletteClick = (index) => {
    setCurrentIndex(index);
  };

  // ── Submit ──
  const handleSubmit = () => {
    localStorage.setItem("answers", JSON.stringify(answers));
    localStorage.setItem("questions", JSON.stringify(questions));
    navigate("/review", { replace: true });
  };

  // ── Loading / Error states ──
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

  // ── Terminated screen ──
  if (isTerminated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Session Terminated</h1>
          <p className="text-gray-500 text-sm">{terminationReason}</p>
          <p className="text-gray-400 text-xs mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* ── Fullscreen Overlay ── */}
      {needsFullscreen && !isTerminated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'bg-red-100' : 'bg-blue-100'}`}>
              <svg className={`w-10 h-10 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
              {fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'Warning!' : 'Fullscreen Required'}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              You must be in fullscreen mode to continue the assessment.
              Please click the button below to enter fullscreen.
            </p>
            {fullscreenCountdown !== null && (
              <div className="mb-4">
                <div className={`text-5xl font-bold ${fullscreenCountdown <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                  {fullscreenCountdown}
                </div>
                <p className={`text-sm mt-1 font-semibold ${fullscreenCountdown <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                  seconds remaining
                </p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${fullscreenCountdown <= 5 ? 'bg-red-600' : 'bg-blue-600'}`}
                    style={{ width: `${(fullscreenCountdown / (FULLSCREEN_TIMEOUT_MS / 1000)) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={enterFullscreen}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Warning Overlay ── */}
      {showWarningOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Warning!</h2>
            <p className="text-gray-600 text-sm mb-4">
              Tab or window switch detected. Your exam is locked for 5 seconds.
            </p>
            <p className="text-yellow-600 font-semibold text-sm">
              Warning {warningCount} — Please stay on the exam window.
            </p>
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: "100%", animation: `shrink ${WARNING_LOCKOUT_MS}ms linear` }}
              />
            </div>
          </div>
          <style>{`
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Online Assessment</h1>
          <div className="flex items-center gap-4">
            <span className="text-yellow-600 text-sm font-medium">
              Warnings: {warningCount}
            </span>
            <span className="text-gray-500 text-sm">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Question Area */}
          <div className="flex-1 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              Q{currentIndex + 1}. {currentQuestion.text}
            </h2>

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
