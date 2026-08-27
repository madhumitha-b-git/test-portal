import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { submitAnswers, submitProctoringReport, incrementWarning } from "../../services/api";
import Navbar from "../../components/Navbar";
import ProctoringOverlay from "../Test/components/ProctoringOverlay";
import { FileCheck, AlertTriangle, ArrowLeft, CheckCircle2, HelpCircle, Send } from "lucide-react";

const WARNING_LOCKOUT_MS = 5000;
const FULLSCREEN_TIMEOUT_MS = 10000;

const Review = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
  const email = candidate.mailId || candidate.email || "";
  const testId = localStorage.getItem("testId") || "";

  const [warningCount, setWarningCount] = useState(() => parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10));
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [pendingTermination, setPendingTermination] = useState(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(null);

  const awayTimerRef = useRef(null);
  const lockoutTimerRef = useRef(null);
  const isAwayRef = useRef(false);
  const awayWarnedRef = useRef(false);
  const lastWarningTimeRef = useRef(0);
  const warningInFlightRef = useRef(false);
  const initialFullscreenDoneRef = useRef(false);
  const fullscreenTimerRef = useRef(null);
  const fullscreenIntervalRef = useRef(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  // ── Redirect if already submitted ──
  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true") {
      navigate("/thankyou", { replace: true });
      return;
    }

    // Load questions and answers from localStorage
    const savedQuestions = JSON.parse(localStorage.getItem("questions") || "[]");
    const savedAnswers = JSON.parse(localStorage.getItem("answers") || "{}");
    setQuestions(savedQuestions);
    setAnswers(savedAnswers);

    // Check lastPing on review mount
    const lastPing = localStorage.getItem("lastPing");
    if (lastPing) {
      const timeAway = Date.now() - parseInt(lastPing, 10);
      if (timeAway > 10000) {
        setPendingTermination("Left exam window for more than 10 seconds");
      } else if (timeAway > 2000) {
        isAwayRef.current = true;
      }
    }
  }, [navigate]);

  // ── Request fullscreen ──
  const isDocumentFullscreen = useCallback(() => !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement
  ), []);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      return el.requestFullscreen()
        .then(() => setNeedsFullscreen(false))
        .catch(() => setNeedsFullscreen(!isDocumentFullscreen()));
    }
    if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      setNeedsFullscreen(false);
      return Promise.resolve();
    }
    if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
      setNeedsFullscreen(false);
      return Promise.resolve();
    }
    return Promise.resolve();
  }, [isDocumentFullscreen]);

  useEffect(() => {
    enterFullscreen().finally(() => {
      setTimeout(() => { initialFullscreenDoneRef.current = true; }, 500);
    });
  }, [enterFullscreen]);

  // ── Track fullscreen state ──
  useEffect(() => {
    const update = () => setNeedsFullscreen(!isDocumentFullscreen());
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    document.addEventListener("mozfullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
      document.removeEventListener("mozfullscreenchange", update);
    };
  }, [isTerminated, isDocumentFullscreen]);

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

    const candidateObj = JSON.parse(localStorage.getItem("candidate") || "{}");
    const mailId = candidateObj.mailId || candidateObj.email;
    const currentTestId = localStorage.getItem("testId") || "";

    const sectionsMap = {};
    
    currentQuestions.forEach((q) => {
      const sId = q.sectionId || "default";
      if (!sectionsMap[sId]) {
        sectionsMap[sId] = {
          sectionId: sId,
          sectionName: q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ"),
          responses: []
        };
      }
      
      const respObj = { questionId: q.questionId };
      if (q.questionType === "CODING" || q.questionType === "DESCRIPTIVE") {
        respObj.typedAnswer = currentAnswers[q.questionId] || "";
      } else {
        respObj.selectedOption = currentAnswers[q.questionId] || "";
      }
      sectionsMap[sId].responses.push(respObj);
    });

    const sections = Object.values(sectionsMap);

    submitAnswers({
      name: candidateObj.name,
      mailId: mailId,
      testId: currentTestId,
      durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
      submittedAt: endedTime,
      sections: sections,
    }).catch(() => {});

    submitProctoringReport({
      mailId: mailId,
      startedTime: startedTime,
      endedTime: endedTime,
      status: "TERMINATED",
      warningCount: count,
    }).catch(() => {});

    localStorage.setItem("testSubmitted", "true");
    localStorage.setItem("submittedTestId", currentTestId);
    localStorage.setItem("testTerminated", "true");
    localStorage.setItem("terminationReason", reason);

    const keysToRemove = [
      "answers",
      "questions",
      "sections",
      "currentIndex",
      "testStarted",
      "proctoringStartedTime",
      "proctoringWarningCount",
      "proctoringStatus",
      "totalDurationMinutes",
      "lastPing",
    ];
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });

    setTimeout(() => navigate("/thankyou", { replace: true }), 2000);
  }, [navigate]);

  // ── Ping timer to detect tab closure ──
  useEffect(() => {
    if (isTerminated) return;
    const pingInterval = setInterval(() => {
      if (localStorage.getItem("testSubmitted") === "true" || localStorage.getItem("testTerminated") === "true") return;
      localStorage.setItem("lastPing", Date.now().toString());
    }, 1000);
    return () => clearInterval(pingInterval);
  }, [isTerminated]);

  // ── Enforce 10 warnings limit ──
  useEffect(() => {
    if (warningCount >= 10 && !isTerminated) {
      terminateSession("Maximum warning limit exceeded (10 warnings).");
    }
  }, [warningCount, isTerminated, terminateSession]);

  // ── Enforce pending terminations (e.g. from tab close) ──
  useEffect(() => {
    if (pendingTermination && !isTerminated) {
      terminateSession(pendingTermination);
    }
  }, [pendingTermination, isTerminated, terminateSession]);

  // ── Handle tab / window returning within 10s ──
  const handleReturnFromAway = useCallback(() => {
    if (!isAwayRef.current) return;
    isAwayRef.current = false;
    clearTimeout(awayTimerRef.current);

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => setNeedsFullscreen(false))
        .catch(() => setNeedsFullscreen(true));
    }

    if (!awayWarnedRef.current) {
      incrementWarning({ mailId: email, testId: testId }).then((res) => {
        const newCount = res.data.warningCount;
        setWarningCount(newCount);
        localStorage.setItem("proctoringWarningCount", String(newCount));
      }).catch(() => {});

      setShowWarningOverlay(true);
      lockoutTimerRef.current = setTimeout(() => {
        setShowWarningOverlay(false);
      }, WARNING_LOCKOUT_MS);
    }
  }, [email, testId]);

  // ── Start away state ──
  const startAwayCountdown = useCallback(() => {
    if (isAwayRef.current || isTerminated) return;
    isAwayRef.current = true;
    
    if (Date.now() - lastWarningTimeRef.current > 1000) {
      awayWarnedRef.current = false;
    } else {
      awayWarnedRef.current = true;
    }

    awayTimerRef.current = setTimeout(() => {
      isAwayRef.current = false;
      terminateSession("Left exam window for more than 10 seconds");
    }, 10000);
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

  // ── Strict Browser Back Navigation Lockout & Mouse Swipe Interception ──
  useEffect(() => {
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    localStorage.setItem("testStarted", "true");

    const fillHistoryBuffer = () => {
      for (let i = 0; i < 50; i++) {
        window.history.pushState({ page: "review_lockout" }, "", window.location.href);
      }
    };

    fillHistoryBuffer();

    const handlePopState = (e) => {
      fillHistoryBuffer();
    };

    const blockMouseBackForward = (e) => {
      if (e.button === 3 || e.button === 4 || e.button === 5) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const blockKeyboardBackNav = (e) => {
      const key = e.key;
      if (e.altKey && (key === "ArrowLeft" || key === "ArrowRight" || e.code === "ArrowLeft" || e.code === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (key === "BrowserBack" || key === "BrowserForward" || key === "AppBack" || key === "AppForward") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (key === "Backspace") {
        const targetTag = e.target?.tagName ? e.target.tagName.toUpperCase() : "";
        const isEditable = e.target?.isContentEditable;
        if (targetTag !== "INPUT" && targetTag !== "TEXTAREA" && !isEditable) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("mouseup", blockMouseBackForward, true);
    window.addEventListener("mousedown", blockMouseBackForward, true);
    window.addEventListener("keydown", blockKeyboardBackNav, true);

    return () => {
      document.documentElement.style.overscrollBehavior = "auto";
      document.body.style.overscrollBehavior = "auto";
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("mouseup", blockMouseBackForward, true);
      window.removeEventListener("mousedown", blockMouseBackForward, true);
      window.removeEventListener("keydown", blockKeyboardBackNav, true);
    };
  }, []);

  // ── Fullscreen warning ──
  useEffect(() => {
    if (!initialFullscreenDoneRef.current) return;
    if (document.fullscreenElement || isTerminated || !needsFullscreen) return;

    lastWarningTimeRef.current = Date.now();
    if (isAwayRef.current) {
      awayWarnedRef.current = true;
    }

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
    const showCountdown = needsFullscreen && !isDocumentFullscreen() && initialFullscreenDoneRef.current && !isTerminated && !showWarningOverlay;

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
  }, [needsFullscreen, isTerminated, terminateSession, isDocumentFullscreen, showWarningOverlay]);

  // ── Restriction handlers ──
  useEffect(() => {
    if (isTerminated) return;

    const blockCopyPasteAndZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key ? e.key.toLowerCase() : "";
        const code = e.code || "";
        if (
          ["+", "-", "=", "_", "0"].includes(key) ||
          ["Equal", "Minus", "Digit0", "NumpadAdd", "NumpadSubtract", "Numpad0"].includes(code) ||
          e.keyCode === 187 || e.keyCode === 189 || e.keyCode === 107 || e.keyCode === 109 || e.keyCode === 48 || e.keyCode === 96
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (["c", "v", "x", "a", "u", "p", "s", "f", "r"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (e.shiftKey && ["i", "j", "c"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    const blockWheelZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
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

    const blockScreenshot = (e) => {
      let isScreenshotKey = false;
      if (e.key === "PrintScreen") isScreenshotKey = true;
      else if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") isScreenshotKey = true;
      else if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) isScreenshotKey = true;
      else if (e.metaKey && e.key.toLowerCase() === "g") isScreenshotKey = true;

      if (isScreenshotKey) {
        e.preventDefault();
        if (Date.now() - lastWarningTimeRef.current > 2000) {
          lastWarningTimeRef.current = Date.now();
          incrementWarning({ mailId: email, testId: testId }).then((res) => {
            const newCount = res.data.warningCount;
            setWarningCount(newCount);
            localStorage.setItem("proctoringWarningCount", String(newCount));
          }).catch(() => {});
          setShowWarningOverlay(true);
          clearTimeout(lockoutTimerRef.current);
          lockoutTimerRef.current = setTimeout(() => {
            setShowWarningOverlay(false);
          }, WARNING_LOCKOUT_MS);
        }
        return false;
      }
    };

    const blockRightClick = (e) => {
      e.preventDefault();
      return false;
    };

    const blockCut = (e) => e.preventDefault();
    const blockPaste = (e) => e.preventDefault();
    const blockCopy = (e) => e.preventDefault();
    const blockDragAndDrop = (e) => {
      e.preventDefault();
      return false;
    };
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your exam progress might be affected.";
    };

    document.addEventListener("keydown", blockCopyPasteAndZoom);
    document.addEventListener("wheel", blockWheelZoom, { passive: false });
    document.addEventListener("keydown", blockFunctionKeys);
    document.addEventListener("keydown", blockScreenshot);
    document.addEventListener("keyup", blockScreenshot);
    document.addEventListener("contextmenu", blockRightClick, true);
    document.addEventListener("cut", blockCut);
    document.addEventListener("paste", blockPaste);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("dragstart", blockDragAndDrop);
    document.addEventListener("drop", blockDragAndDrop);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("keydown", blockCopyPasteAndZoom);
      document.removeEventListener("wheel", blockWheelZoom);
      document.removeEventListener("keydown", blockFunctionKeys);
      document.removeEventListener("keydown", blockScreenshot);
      document.removeEventListener("keyup", blockScreenshot);
      document.removeEventListener("contextmenu", blockRightClick, true);
      document.removeEventListener("cut", blockCut);
      document.removeEventListener("paste", blockPaste);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("dragstart", blockDragAndDrop);
      document.removeEventListener("drop", blockDragAndDrop);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTerminated, email, testId]);

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

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const sectionsList = React.useMemo(() => {
    const list = [];
    const map = new Map();
    questions.forEach((q) => {
      const sId = q.sectionId || "default";
      if (!map.has(sId)) {
        const sec = {
          sectionId: sId,
          sectionName: q.sectionName || `Section ${list.length + 1}`,
          questions: [],
        };
        map.set(sId, sec);
        list.push(sec);
      }
      map.get(sId).questions.push(q);
    });
    return list;
  }, [questions]);

  // Handle final submit
  const handleFinalSubmit = async () => {
    if (showWarningOverlay || isTerminated) return;
    setLoading(true);
    try {
      const sectionsMap = {};
      
      questions.forEach((q) => {
        const sId = q.sectionId || "default";
        if (!sectionsMap[sId]) {
          sectionsMap[sId] = {
            sectionId: sId,
            sectionName: q.sectionName || (q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ")),
            responses: []
          };
        }
        
        const respObj = { questionId: q.questionId };
        if (q.questionType === "CODING" || q.questionType === "DESCRIPTIVE") {
          respObj.typedAnswer = answers[q.questionId] || "";
        } else {
          respObj.selectedOption = answers[q.questionId] || "";
        }
        sectionsMap[sId].responses.push(respObj);
      });

      const sections = Object.values(sectionsMap);

      const mailId = candidate.mailId || candidate.email;
      await submitAnswers({
        name: candidate.name,
        mailId: mailId,
        testId: testId,
        durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
        submittedAt: new Date().toISOString(),
        sections: sections,
      });

      const startedTime = localStorage.getItem("proctoringStartedTime") || "";
      const endedTime = new Date().toISOString();
      const currentWarningCount = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

      submitProctoringReport({
        mailId: mailId,
        startedTime: startedTime,
        endedTime: endedTime,
        status: "SUCCESS",
        warningCount: currentWarningCount,
      }).catch(() => {});

      const submissionFormattedTime = new Date().toLocaleString();
      localStorage.setItem("submittedAtTime", submissionFormattedTime);
      localStorage.setItem("testSubmitted", "true");
      localStorage.setItem("submittedTestId", testId);

      const keysToRemove = [
        "answers",
        "questions",
        "sections",
        "currentIndex",
        "testStarted",
        "proctoringStartedTime",
        "proctoringWarningCount",
        "proctoringStatus",
        "totalDurationMinutes",
        "lastPing",
      ];
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });

      navigate("/thankyou", { replace: true });
    } catch (err) {
      setError("Submission failed. Please check network connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white select-none relative">
      
      {/* ── Fullscreen / Warning / Terminated Overlays ── */}
      <ProctoringOverlay
        isTerminated={isTerminated}
        terminationReason={terminationReason}
        needsFullscreen={needsFullscreen}
        isDocumentFullscreen={isDocumentFullscreen}
        initialFullscreenDoneRef={initialFullscreenDoneRef}
        showWarningOverlay={showWarningOverlay}
        fullscreenCountdown={fullscreenCountdown}
        warningCount={warningCount}
        setNeedsFullscreen={setNeedsFullscreen}
        enterFullscreen={enterFullscreen}
      />

      {/* Navbar */}
      <Navbar candidate={candidate} />

      {/* Main Container - Fluid Responsive Layout */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 pt-20 pb-24">
        
        <div className="bg-white p-5 sm:p-8 lg:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Final Review</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Review Your Answers
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Confirm your response summary before final submission.
              </p>
            </div>

            {/* Warning Count Display */}
            {warningCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Warnings: {warningCount}/10</span>
              </div>
            )}
          </div>

          {/* Section Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sectionsList.map((sec, sIdx) => {
              const secQuestions = sec.questions;
              const secAnsweredCount = secQuestions.filter(q => !!answers[q.questionId]).length;
              const secUnansweredCount = secQuestions.length - secAnsweredCount;
              const sectionLetter = String.fromCharCode(65 + sIdx);
              let displayName = sec.sectionName || `Section ${sectionLetter}`;
              if (!/^Section\s+[A-Z]:?/i.test(displayName)) {
                displayName = `Section ${sectionLetter}: ${displayName}`;
              }
              displayName = displayName.replace(/decriptive/i, "Descriptive");

              return (
                <div key={sec.sectionId} className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 flex flex-col justify-between w-full min-w-0 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></div>
                      <span className="truncate">{displayName}</span>
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                      {secAnsweredCount}/{secQuestions.length} Done
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <p className="text-xl sm:text-2xl font-black text-blue-700">{secQuestions.length}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                      <p className="text-xl sm:text-2xl font-black text-emerald-700">{secAnsweredCount}</p>
                      <p className="text-[10px] sm:text-xs text-emerald-800 font-bold uppercase tracking-wider mt-1">Answered</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center min-w-0">
                      <p className="text-xl sm:text-2xl font-black text-amber-700">{secUnansweredCount}</p>
                      <p className="text-[10px] sm:text-xs text-amber-800 font-bold uppercase tracking-wider mt-1 truncate" title="Unanswered">Unanswered</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning Banner */}
          {unansweredCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm font-medium flex items-center gap-3 w-full shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                You have <strong>{unansweredCount} unanswered question(s)</strong>. You can return to the test to answer them.
              </span>
            </div>
          )}

          {/* API Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-center gap-3 w-full">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Breakdown List (Uncompressed, Natural Layout) */}
          <div className="space-y-6">
            {sectionsList.map((sec, sIdx) => {
              const sectionLetter = String.fromCharCode(65 + sIdx);
              let displayName = sec.sectionName || `Section ${sectionLetter}`;
              if (!/^Section\s+[A-Z]:?/i.test(displayName)) {
                displayName = `Section ${sectionLetter}: ${displayName}`;
              }
              displayName = displayName.replace(/decriptive/i, "Descriptive");
              
              return (
                <div key={sec.sectionId} className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                    {displayName}
                  </h3>
                  <div className="space-y-3">
                    {sec.questions.map((q, idx) => {
                      const isAnswered = !!answers[q.questionId];
                      const isCoding = q.questionType === "CODING";
                      const isDescriptive = q.questionType === "DESCRIPTIVE";
                      const charLen = (answers[q.questionId] || "").length;

                      return (
                        <div
                          key={q.questionId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/90 gap-3 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-md bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm sm:text-base font-semibold text-slate-800 flex-1 break-words min-w-0 leading-relaxed">
                              {q.question || q.text}
                            </span>
                          </div>

                          {isAnswered ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100/80 text-blue-900 font-bold text-xs border border-blue-200 shrink-0 self-start sm:self-center">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                {isCoding
                                  ? "Code Submitted"
                                  : isDescriptive
                                  ? `Text Saved (${charLen} Chars)`
                                  : `Option ${answers[q.questionId]}`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/80 text-amber-900 font-bold text-xs border border-amber-200 shrink-0 self-start sm:self-center">
                              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Unanswered</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200">
            <button
              onClick={() => navigate("/test")}
              disabled={showWarningOverlay || isTerminated}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Exam</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={loading || showWarningOverlay || isTerminated}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Submitting Test...</span>
              ) : (
                <>
                  <span>Final Submit</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </main>

    </div>
  );
};

export default Review;
