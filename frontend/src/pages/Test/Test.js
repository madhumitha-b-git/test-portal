import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuestions, startProctoringSession, incrementWarning, submitAnswers, submitProctoringReport } from "../../services/api";
import IdpLogo from "../../components/IdpLogo";
import { Clock, ShieldAlert, AlertTriangle, Maximize, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, FileCheck2, User } from "lucide-react";

const TAB_RETURN_LIMIT_MS = 15000;
const WARNING_LOCKOUT_MS = 5000;
const FULLSCREEN_TIMEOUT_MS = 15000;

const Test = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState(() => JSON.parse(localStorage.getItem("questions") || "[]"));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem("answers") || "{}"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testId, setTestId] = useState(() => localStorage.getItem("testId") || "");

  const [warningCount, setWarningCount] = useState(() => parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10));
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
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
  const email = candidate.mailId || candidate.email || "";

  // ── Redirect if already submitted ──
  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true") {
      navigate("/thankyou", { replace: true });
    }
  }, [navigate]);

  // ── Initialization (Questions & Proctoring Session) ──
  useEffect(() => {
    if (sessionStartedRef.current || !email) return;
    sessionStartedRef.current = true;

    const initializeTest = async () => {
      try {
        let duration = parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10);
        let currentTestId = testId;

        // Fetch questions if not cached
        const cachedQuestions = localStorage.getItem("questions");
        if (!cachedQuestions || cachedQuestions === "[]") {
          const response = await fetchQuestions();
          setQuestions(response.data.questions);
          localStorage.setItem("questions", JSON.stringify(response.data.questions));
          
          currentTestId = response.data.testId;
          setTestId(currentTestId);
          localStorage.setItem("testId", currentTestId);
          
          duration = response.data.total_duration_minutes || 60;
          localStorage.setItem("totalDurationMinutes", duration.toString());
        }

        // Handle Proctoring Session & Timer
        const existingStartedTime = localStorage.getItem("proctoringStartedTime");
        if (existingStartedTime) {
          // Resume existing session
          const startedAt = new Date(existingStartedTime).getTime();
          const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
          setTimeLeft(Math.max(0, duration * 60 - elapsedSeconds));
        } else {
          // Start completely new session
          const startedTime = new Date().toISOString();
          localStorage.setItem("proctoringStartedTime", startedTime);
          localStorage.setItem("proctoringWarningCount", "0");
          localStorage.setItem("proctoringStatus", "SUCCESS");
          setTimeLeft(duration * 60);

          if (currentTestId) {
            startProctoringSession({ mailId: email, testId: currentTestId, durationMinutes: duration }).catch(() => {});
          }
        }
      } catch (err) {
        setError("Failed to load test session. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    initializeTest();
  }, [email, testId]);

  // ── Request fullscreen ──
  const enterFullscreen = useCallback(() => {
    if (!document.documentElement.requestFullscreen) return Promise.resolve();
    return document.documentElement.requestFullscreen()
      .then(() => setNeedsFullscreen(false))
      .catch(() => setNeedsFullscreen(true));
  }, []);

  useEffect(() => {
    enterFullscreen().finally(() => {
      setTimeout(() => { initialFullscreenDoneRef.current = true; }, 500);
    });
  }, [enterFullscreen]);

  // ── Track fullscreen state ──
  useEffect(() => {
    const update = () => setNeedsFullscreen(!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [isTerminated]);

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
    const mailId = candidate.mailId || candidate.email;

    const responses = currentQuestions.map((q) => ({
      questionId: q.questionId,
      selectedOption: currentAnswers[q.questionId] || "",
    }));

    submitAnswers({
      name: candidate.name,
      mailId: mailId,
      testId: testId,
      durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
      submitTime: endedTime,
      responses: responses,
    }).catch(() => {});

    submitProctoringReport({
      mailId: mailId,
      startedTime: startedTime,
      endedTime: endedTime,
      status: "TERMINATED",
      warningCount: count,
    }).catch(() => {});

    localStorage.setItem("testSubmitted", "true");
    localStorage.setItem("testTerminated", "true");
    localStorage.setItem("terminationReason", reason);
    localStorage.removeItem("answers");
    localStorage.removeItem("questions");
    localStorage.removeItem("proctoringStartedTime");
    localStorage.removeItem("proctoringWarningCount");
    localStorage.removeItem("proctoringStatus");

    setTimeout(() => navigate("/thankyou", { replace: true }), 2000);
  }, [testId, navigate]);

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

    incrementWarning({ mailId: email, testId: testId }).then((res) => {
      const newCount = res.data.warningCount;
      setWarningCount(newCount);
      localStorage.setItem("proctoringWarningCount", String(newCount));
    }).catch(() => {});

    setShowWarningOverlay(true);
    lockoutTimerRef.current = setTimeout(() => {
      setShowWarningOverlay(false);
    }, WARNING_LOCKOUT_MS);
  }, [email, testId]);

  // ── Start away countdown ──
  const startAwayCountdown = useCallback(() => {
    if (isAwayRef.current || isTerminated) return;
    isAwayRef.current = true;

    awayTimerRef.current = setTimeout(() => {
      isAwayRef.current = false;
      terminateSession("Left exam window for more than 15 seconds");
    }, TAB_RETURN_LIMIT_MS);
  }, [isTerminated, terminateSession]);

  // ── Visibility change ──
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

  // ── Window blur / focus ──
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

  // ── Fullscreen warning ──
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

    incrementWarning({ mailId: email, testId: testId }).then((res) => {
      const newCount = res.data.warningCount;
      setWarningCount(newCount);
      localStorage.setItem("proctoringWarningCount", String(newCount));
    }).catch(() => {}).finally(() => {
      warningInFlightRef.current = false;
    });
  }, [needsFullscreen, isTerminated, email, testId]);

  // ── Fullscreen countdown ──
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
      terminateSession("You did not re-enter fullscreen in time");
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
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())) {
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

  // ── Keep refs in sync ──
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // ── Auto Submit ──
  const autoSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
      const mailId = candidate.mailId || candidate.email;
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;

      const responses = currentQuestions.map((q) => ({
        questionId: q.questionId,
        selectedOption: currentAnswers[q.questionId] || "",
      }));

      await submitAnswers({
        name: candidate.name,
        mailId: mailId,
        testId: testId,
        durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
        submitTime: new Date().toISOString(),
        responses: responses,
      });

      const startedTime = localStorage.getItem("proctoringStartedTime") || "";
      const endedTime = new Date().toISOString();
      const count = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

      submitProctoringReport({
        mailId: mailId,
        startedTime: startedTime,
        endedTime: endedTime,
        status: "SUCCESS",
        warningCount: count,
      }).catch(() => {});

      localStorage.setItem("testSubmitted", "true");
      localStorage.removeItem("answers");
      localStorage.removeItem("questions");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");

      navigate("/thankyou", { replace: true });
    } catch (err) {
      setError("Auto-submission failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  }, [navigate, testId]);

  // ── Timer Effect ──
  useEffect(() => {
    if (timeLeft === null || isTerminated) return;
    
    if (timeLeft <= 0) {
      autoSubmit();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, isTerminated, autoSubmit]);

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
    localStorage.setItem("testId", testId);
    navigate("/review", { replace: true });
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-600 font-semibold text-sm">Loading Examination Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 p-8 rounded-xl max-w-md text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Session Error</h2>
          <p className="text-slate-600 text-xs mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-xs transition"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / (questions.length || 1)) * 100);

  // ── Terminated screen ──
  if (isTerminated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-red-200">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Assessment Terminated</h1>
          <p className="text-red-600 text-xs mb-3 font-medium">{terminationReason}</p>
          <p className="text-slate-500 text-xs">Redirecting candidate session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between select-none relative">
      
      {/* ── Fullscreen Overlay ── */}
      {needsFullscreen && initialFullscreenDoneRef.current && !isTerminated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-slate-200">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
              <Maximize className="w-7 h-7" />
            </div>
            <h2 className={`text-lg font-bold mb-2 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
              {fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'Security Warning!' : 'Fullscreen Mode Required'}
            </h2>
            <p className="text-slate-600 text-xs mb-4">
              IDP Assess 360 requires active Fullscreen mode to continue your assessment.
            </p>

            {fullscreenCountdown !== null && (
              <div className="mb-5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className={`text-3xl font-extrabold ${fullscreenCountdown <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                  {fullscreenCountdown}s
                </div>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                  Seconds remaining before termination
                </p>
              </div>
            )}

            <button
              onClick={enterFullscreen}
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
            <h2 className="text-lg font-bold text-slate-900 mb-2">Window Switch Detected!</h2>
            <p className="text-slate-600 text-xs mb-4">
              Exam interface locked for 5 seconds. Please stay on the assessment window.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 font-bold text-xs">
              <span>Warning Record: {warningCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <IdpLogo showTagline={false} />

          {/* Real-Time Metrics Header */}
          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Proctoring Warning Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              warningCount > 0 
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}>
              <ShieldAlert className={`w-4 h-4 ${warningCount > 0 ? "text-amber-600" : "text-emerald-600"}`} />
              <span>Warnings: {warningCount}</span>
            </div>

            {/* Countdown Timer */}
            <div className={`flex items-center gap-2 px-3.5 py-1 rounded-lg text-sm font-bold font-mono border ${
              timeLeft !== null && timeLeft < 300 
                ? "bg-red-50 border-red-300 text-red-600 animate-pulse" 
                : timeLeft !== null && timeLeft < 600
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Candidate Name */}
            {candidate.name && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-700 font-semibold pl-2 border-l border-slate-200">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate max-w-[120px]">{candidate.name}</span>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Main Examination View */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 my-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Question Card (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm relative min-h-[420px] flex flex-col justify-between">
              
              <div>
                {/* Question Header */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Multiple Choice</span>
                  </div>
                  
                  {answers[currentQuestion?.questionId] && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Answered
                    </span>
                  )}
                </div>

                {/* Question Content */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-6">
                  {currentQuestion?.question || currentQuestion?.text}
                </h2>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQuestion?.options?.map((option) => {
                    const isSelected = answers[currentQuestion.questionId] === option.optionId;
                    return (
                      <div
                        key={option.optionId}
                        onClick={() => handleAnswer(currentQuestion.questionId, option.optionId)}
                        className={`group flex items-center gap-3.5 p-4 rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-600 shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition shrink-0 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}
                        >
                          {option.optionId}
                        </div>
                        <span className={`text-xs sm:text-sm transition ${isSelected ? "text-blue-950 font-semibold" : "text-slate-700"}`}>
                          {option.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-200">
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
                      className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Review & Submit</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Question Palette Sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Question Palette</h3>
                <span className="text-[11px] font-semibold text-blue-700">{answeredCount}/{questions.length} Answered</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Question Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, index) => {
                  const isCurrent = currentIndex === index;
                  const isAnswered = !!answers[q.questionId];

                  return (
                    <button
                      key={q.questionId}
                      onClick={() => handlePaletteClick(index)}
                      className={`h-9 rounded-lg font-bold text-xs transition duration-150 cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? "bg-blue-600 text-white ring-2 ring-blue-300 shadow-xs"
                          : isAnswered
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-[10px] text-slate-600 font-semibold">
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

              {/* Quick Submit */}
              <button
                onClick={handleSubmit}
                className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Submit Exam
              </button>

            </div>

          </div>

        </div>
      </main>

    </div>
  );
};

export default Test;
