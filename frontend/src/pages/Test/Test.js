import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuestions, startProctoringSession, incrementWarning, submitAnswers, submitProctoringReport } from "../../services/api";
import { runPythonCode } from "../../services/codeExecution";
import IdpLogo from "../../components/IdpLogo";
import PythonEditor from "../../components/PythonEditor";
import { Clock, ShieldAlert, AlertTriangle, Maximize, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, FileCheck2, User, Play, Terminal, Loader2, Trash2, Edit3, FileText } from "lucide-react";

const TAB_RETURN_LIMIT_MS = 15000;
const WARNING_LOCKOUT_MS = 5000;
const FULLSCREEN_TIMEOUT_MS = 10000;

const Test = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("questions"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("currentIndex");
    const num = parseInt(saved, 10);
    return !isNaN(num) && num >= 0 ? num : 0;
  });
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem("answers") || "{}"));
  const [executionMap, setExecutionMap] = useState({});
  const [showOutputMap, setShowOutputMap] = useState({});
  const [customInputMap, setCustomInputMap] = useState({});
  const [activeConsoleTabMap, setActiveConsoleTabMap] = useState({});

  // Resizable Split Panel State for Coding Round
  const [splitWidth, setSplitWidth] = useState(42); // Left panel width % (20% to 75%)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const codingContainerRef = useRef(null);

  const handleMouseDownSplit = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e) => {
      if (!codingContainerRef.current) return;
      const rect = codingContainerRef.current.getBoundingClientRect();
      const newWidthPx = e.clientX - rect.left;
      const percentage = (newWidthPx / rect.width) * 100;
      if (percentage >= 20 && percentage <= 75) {
        setSplitWidth(percentage);
        window.dispatchEvent(new Event("resize"));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  const handleRunCode = async (questionId) => {
    if (!questionId) return;
    setShowOutputMap((prev) => ({ ...prev, [questionId]: true }));
    setActiveConsoleTabMap((prev) => ({ ...prev, [questionId]: "output" }));
    const code = answers[questionId] || "";
    const customInput = customInputMap[questionId] || "";

    if (!code.trim()) {
      setExecutionMap((prev) => ({
        ...prev,
        [questionId]: {
          isRunning: false,
          status: "empty",
          output: "Please enter Python code before running.",
        },
      }));
      return;
    }

    setExecutionMap((prev) => ({
      ...prev,
      [questionId]: {
        isRunning: true,
        status: "running",
        output: null,
      },
    }));

    try {
      const res = await runPythonCode(code, customInput);
      const outputText = typeof res?.output === "object"
        ? JSON.stringify(res.output, null, 2)
        : String(res?.output ?? "");

      setExecutionMap((prev) => ({
        ...prev,
        [questionId]: {
          isRunning: false,
          status: res?.status || "success",
          output: outputText,
          executionTimeMs: res?.executionTimeMs || 0,
        },
      }));
    } catch (err) {
      setExecutionMap((prev) => ({
        ...prev,
        [questionId]: {
          isRunning: false,
          status: "error",
          output: `Execution error: ${err?.message || "Please try again."}`,
          executionTimeMs: 0,
        },
      }));
    }
  };

  useEffect(() => {
    localStorage.setItem("answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem("currentIndex", currentIndex.toString());
  }, [currentIndex]);
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
  const awayWarnedRef = useRef(false);
  const lastWarningTimeRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const warningInFlightRef = useRef(false);
  const initialFullscreenDoneRef = useRef(false);
  const fullscreenTimerRef = useRef(null);
  const fullscreenIntervalRef = useRef(null);
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
  const email = candidate.mailId || candidate.email || "";

  // ── Redirect if already submitted FOR THIS SPECIFIC TEST ──
  useEffect(() => {
    const submittedTestId = localStorage.getItem("submittedTestId");
    const currentTestId = testId || localStorage.getItem("testId");
    if (localStorage.getItem("testSubmitted") === "true" && (!submittedTestId || submittedTestId === currentTestId)) {
      navigate("/thankyou", { replace: true });
    }
  }, [navigate, testId]);


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
          const linkId = localStorage.getItem("linkId");
          const response = await fetchQuestions(linkId);
          const fetchedQuestions = Array.isArray(response.data.questions) ? response.data.questions : [];
          setQuestions(fetchedQuestions);
          localStorage.setItem("questions", JSON.stringify(fetchedQuestions));
          
          currentTestId = response.data.testId;
          setTestId(currentTestId);
          localStorage.setItem("testId", currentTestId);
          
          duration = response.data.totalDurationMinutes || 60;
          localStorage.setItem("totalDurationMinutes", duration.toString());
        }

        // Handle Proctoring Session & Timer
        const existingStartedTime = localStorage.getItem("proctoringStartedTime");
        if (existingStartedTime) {
          const lastPing = localStorage.getItem("lastPing");
          if (lastPing) {
            const timeAway = Date.now() - parseInt(lastPing, 10);
            if (timeAway > 15000) {
              // Just mark as away so they get a warning when it mounts and focuses
              isAwayRef.current = true;
            }
          }
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

    const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
    const mailId = candidate.mailId || candidate.email;

    const sectionsMap = {};
    
    currentQuestions.forEach((q) => {
      const sId = q.sectionId || "default";
      if (!sectionsMap[sId]) {
        sectionsMap[sId] = {
          sectionId: sId,
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
      name: candidate.name,
      mailId: mailId,
      testId: testId,
      durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
      submittedAt: endedTime,
      sections: sections,
    }).catch(() => {});

    submitProctoringReport({
      mailId: mailId,
      testId: testId,
      linkId: localStorage.getItem("linkId") || "",
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
    localStorage.removeItem("currentIndex");
    localStorage.removeItem("proctoringStartedTime");
    localStorage.removeItem("proctoringWarningCount");
    localStorage.removeItem("proctoringStatus");
    localStorage.removeItem("lastPing");

    setTimeout(() => navigate("/thankyou", { replace: true }), 2000);
  }, [testId, navigate]);

  // ── Ping timer to detect tab closure ──
  useEffect(() => {
    if (isTerminated) return;
    const pingInterval = setInterval(() => {
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
    // Mark test session as active
    localStorage.setItem("testStarted", "true");

    // Fill history stack with 50 duplicate /test states to neutralize multi-step mouse swipes
    const fillHistoryBuffer = () => {
      for (let i = 0; i < 50; i++) {
        window.history.pushState({ page: "test_lockout" }, "", window.location.href);
      }
    };

    fillHistoryBuffer();

    const handlePopState = (e) => {
      fillHistoryBuffer();
    };

    const blockMouseBackForward = (e) => {
      // Button 3 = Mouse Back (Side Button 1 / Swipe Left)
      // Button 4 = Mouse Forward (Side Button 2 / Swipe Right)
      if (e.button === 3 || e.button === 4 || e.button === 5) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const blockKeyboardBackNav = (e) => {
      const key = e.key;
      // Block Alt + Left / Alt + Right shortcuts
      if (e.altKey && (key === "ArrowLeft" || key === "ArrowRight" || e.code === "ArrowLeft" || e.code === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block BrowserBack / AppBack keys
      if (key === "BrowserBack" || key === "BrowserForward" || key === "AppBack" || key === "AppForward") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block Backspace outside text input/textarea
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
        const key = e.key.toLowerCase();
        // Block zoom shortcuts (Ctrl +, Ctrl -, Ctrl 0, Ctrl =)
        if (["+", "-", "=", "_", "0"].includes(key) || e.code === "Equal" || e.code === "Minus" || e.code === "Digit0") {
          e.preventDefault();
          return false;
        }
        // Block copy, paste, cut, select all, view source
        if (["c", "v", "x", "a", "u"].includes(key)) {
          e.preventDefault();
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

    const blockRightClick = (e) => {
      e.preventDefault();
      return false;
    };

    const blockCut = (e) => e.preventDefault();
    const blockPaste = (e) => e.preventDefault();
    const blockCopy = (e) => e.preventDefault();

    document.addEventListener("keydown", blockCopyPasteAndZoom);
    document.addEventListener("wheel", blockWheelZoom, { passive: false });
    document.addEventListener("keydown", blockFunctionKeys);
    document.addEventListener("contextmenu", blockRightClick);
    document.addEventListener("cut", blockCut);
    document.addEventListener("paste", blockPaste);
    document.addEventListener("copy", blockCopy);

    return () => {
      document.removeEventListener("keydown", blockCopyPasteAndZoom);
      document.removeEventListener("wheel", blockWheelZoom);
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
      const sectionsMap = {};
      
      currentQuestions.forEach((q) => {
        const sId = q.sectionId || "default";
        if (!sectionsMap[sId]) {
          sectionsMap[sId] = {
            sectionId: sId,
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
      const count = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

      submitProctoringReport({
        mailId: mailId,
        testId: testId,
        linkId: localStorage.getItem("linkId") || "",
        startedTime: startedTime,
        endedTime: endedTime,
        status: "SUCCESS",
        warningCount: count,
      }).catch(() => {});

      localStorage.setItem("testSubmitted", "true");
      localStorage.removeItem("answers");
      localStorage.removeItem("questions");
      localStorage.removeItem("currentIndex");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");
      localStorage.removeItem("lastPing");

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

  // ── Option select (saves dynamically to local cache) ──
  const handleAnswer = (questionId, optionId) => {
    if (showWarningOverlay || isTerminated) return;
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);
    localStorage.setItem("answers", JSON.stringify(newAnswers));
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

  const mcqQuestions = questions.filter(q => q.questionType === "MCQ");
  const codingQuestions = questions.filter(q => q.questionType === "CODING");
  const descriptiveQuestions = questions.filter(q => q.questionType === "DESCRIPTIVE");

  const mcqCount = mcqQuestions.length;
  const codingCount = codingQuestions.length;
  const descriptiveCount = descriptiveQuestions.length;

  const codingStartIndex = mcqCount;
  const descriptiveStartIndex = mcqCount + codingCount;

  const mcqAnsweredCount = mcqQuestions.filter(q => !!answers[q.questionId]).length;
  const codingAnsweredCount = codingQuestions.filter(q => !!answers[q.questionId]).length;
  const descriptiveAnsweredCount = descriptiveQuestions.filter(q => !!answers[q.questionId]).length;

  const mcqProgressPercent = Math.round((mcqAnsweredCount / (mcqCount || 1)) * 100);

  const isMcq = currentQuestion?.questionType === "MCQ";
  const isCoding = currentQuestion?.questionType === "CODING";
  const isDescriptive = currentQuestion?.questionType === "DESCRIPTIVE";

  const renderPalette = () => (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Question Palette</h3>
          <span className="text-xs font-bold text-blue-700">{mcqAnsweredCount}/{mcqQuestions.length} Answered</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-200">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${mcqProgressPercent}%` }}
          ></div>
        </div>

        {/* Question Buttons Grid - Compact 5-column grid */}
        <div className="grid grid-cols-5 gap-2.5 my-2 max-w-sm">
          {mcqQuestions.map((q, index) => {
            const isCurrent = currentIndex === index;
            const isAnswered = !!answers[q.questionId];

            return (
              <button
                key={q.questionId}
                onClick={() => handlePaletteClick(index)}
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
    <div className="bg-slate-50 text-slate-800 flex flex-col justify-between select-none relative h-screen max-h-screen overflow-hidden">
      
      {/* ── Fullscreen Overlay ── */}
      {needsFullscreen && !isDocumentFullscreen() && initialFullscreenDoneRef.current && !isTerminated && !showWarningOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-slate-200">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
              <Maximize className="w-7 h-7" />
            </div>
            <h2 className={`text-lg font-bold mb-2 ${fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
              {fullscreenCountdown !== null && fullscreenCountdown <= 5 ? 'Security Warning!' : 'Fullscreen Mode Required'}
            </h2>
            <p className="text-slate-600 text-xs mb-4">
              Hire360 requires active Fullscreen mode to continue your assessment.
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

      {/* Top Header Bar - Section tabs positioned 2 inches down with comfortable spacing */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 pt-3.5 pb-3 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Left: Logo & Section Navigation Tabs (positioned lower down for easy access) */}
          <div className="flex items-center gap-6">
            <IdpLogo showTagline={false} />

            {/* Section Tabs - Lowered down */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg gap-1.5 mt-2 sm:mt-2.5 border border-slate-200">
              <button
                onClick={() => setCurrentIndex(0)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isMcq
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Section A: Aptitude
              </button>
              <button
                onClick={() => {
                  if (codingCount > 0) {
                    setCurrentIndex(codingStartIndex);
                  }
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isCoding
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Section B: Coding
              </button>
              <button
                onClick={() => {
                  if (descriptiveCount > 0) {
                    setCurrentIndex(descriptiveStartIndex);
                  }
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isDescriptive
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Section C: Descriptive
              </button>
            </div>
          </div>



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

      {/* Main Examination View - Full Viewport Zero Scroll Fit */}
      <main className="max-w-7xl mx-auto w-full p-4 flex-1 flex flex-col min-h-0 overflow-hidden">

        {isCoding ? (
          <div className="w-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            
            {/* Section Header Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  Section B: Coding Round
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Coding Question {currentIndex - codingStartIndex + 1} of {codingCount}
                </h2>
              </div>

              {/* Inline Palette tabs */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Questions:</span>
                {codingQuestions.map((q, index) => {
                  const globalIndex = codingStartIndex + index;
                  const isCurrent = currentIndex === globalIndex;
                  const isAnswered = !!answers[q.questionId];
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIndex(globalIndex)}
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
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">Problem Statement</h3>
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
                style={{ width: window.innerWidth >= 1024 ? `${100 - splitWidth}%` : "100%" }}
                className={`w-full flex-1 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-lg flex flex-col min-h-0 overflow-hidden ${
                  isDraggingSplit ? "" : "transition-all duration-75"
                }`}
              >
                {/* IDE Header */}
                <div className="bg-slate-950 px-5 py-2.5 border-b border-slate-850 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 font-mono">Python 3</span>
                  </div>
                </div>
                
                {/* Python Monaco Editor area */}
                <div className="flex-1 relative overflow-hidden min-h-0">
                  <PythonEditor
                    value={answers[currentQuestion.questionId] || ""}
                    onChange={(val) => handleAnswer(currentQuestion.questionId, val)}
                  />
                </div>

                {/* Footer status bar & Run Code Action */}
                <div className="bg-slate-950 px-5 py-2 border-t border-slate-850 flex justify-between items-center text-[11px] text-slate-400 font-mono shrink-0">
                  <div className="flex items-center gap-4">
                    <div>
                      <span>Status: </span>
                      <span className={answers[currentQuestion?.questionId] ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {answers[currentQuestion?.questionId] ? "Saved (Draft)" : "Unsaved"}
                      </span>
                    </div>
                    <div>
                      <span>Lines: {(answers[currentQuestion?.questionId] || "").split("\n").length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowOutputMap((prev) => ({ ...prev, [currentQuestion?.questionId]: true }));
                        setActiveConsoleTabMap((prev) => ({
                          ...prev,
                          [currentQuestion?.questionId]: prev[currentQuestion?.questionId] === "input" ? "output" : "input"
                        }));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs font-semibold transition cursor-pointer ${
                        showOutputMap[currentQuestion?.questionId] && activeConsoleTabMap[currentQuestion?.questionId] === "input"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                      title="Provide custom input for input() in your Python code"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Custom Input</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowOutputMap((prev) => ({ ...prev, [currentQuestion?.questionId]: !prev[currentQuestion?.questionId] }));
                        setActiveConsoleTabMap((prev) => ({ ...prev, [currentQuestion?.questionId]: "output" }));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs font-semibold transition cursor-pointer ${
                        showOutputMap[currentQuestion?.questionId] && (activeConsoleTabMap[currentQuestion?.questionId] || "output") === "output"
                          ? "bg-slate-700 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                      title={showOutputMap[currentQuestion?.questionId] ? "Collapse console panel" : "Expand console panel"}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{showOutputMap[currentQuestion?.questionId] ? "Console" : "Show Console"}</span>
                      {showOutputMap[currentQuestion?.questionId] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>

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

                {/* Console Panel (Output & Custom Input STDIN) */}
                {showOutputMap[currentQuestion?.questionId] && (
                  <div className="bg-slate-950 border-t border-slate-850 p-3 flex flex-col h-[150px] shrink-0 font-mono text-xs">
                    {/* Console Header Tabs */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-850 mb-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveConsoleTabMap((prev) => ({ ...prev, [currentQuestion?.questionId]: "output" }))}
                          className={`flex items-center gap-1.5 text-xs font-bold font-sans transition cursor-pointer pb-0.5 border-b-2 ${
                            (activeConsoleTabMap[currentQuestion?.questionId] || "output") === "output"
                              ? "text-blue-400 border-blue-500"
                              : "text-slate-500 border-transparent hover:text-slate-300"
                          }`}
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Output</span>
                          {executionMap[currentQuestion?.questionId]?.executionTimeMs > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({executionMap[currentQuestion?.questionId]?.executionTimeMs}ms)
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setActiveConsoleTabMap((prev) => ({ ...prev, [currentQuestion?.questionId]: "input" }))}
                          className={`flex items-center gap-1.5 text-xs font-bold font-sans transition cursor-pointer pb-0.5 border-b-2 ${
                            activeConsoleTabMap[currentQuestion?.questionId] === "input"
                              ? "text-blue-400 border-blue-500"
                              : "text-slate-500 border-transparent hover:text-slate-300"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Custom Input (STDIN)</span>
                          {customInputMap[currentQuestion?.questionId] && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {executionMap[currentQuestion?.questionId]?.status === "error" && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded font-sans">
                            Execution Error
                          </span>
                        )}
                        {executionMap[currentQuestion?.questionId]?.status === "success" && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded font-sans">
                            Success
                          </span>
                        )}
                        <button
                          onClick={() => setShowOutputMap((prev) => ({ ...prev, [currentQuestion?.questionId]: false }))}
                          title="Close Console Panel"
                          className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </button>
                      </div>
                    </div>

                    {/* Console Tab Content */}
                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                      {(activeConsoleTabMap[currentQuestion?.questionId] || "output") === "output" ? (
                        <>
                          {executionMap[currentQuestion?.questionId]?.output ? (
                            <pre className="text-slate-200 whitespace-pre-wrap font-mono">
                              {executionMap[currentQuestion?.questionId]?.output}
                            </pre>
                          ) : (
                            <p className="text-slate-500 italic font-sans text-xs">
                              Click &quot;Run Code&quot; to execute your Python program and view results.
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col h-full space-y-1">
                          <p className="text-[11px] text-slate-400 font-sans mb-1">
                            Enter custom test input passed to standard input <code className="text-blue-300">input()</code> line by line:
                          </p>
                          <textarea
                            value={customInputMap[currentQuestion?.questionId] || ""}
                            onChange={(e) => setCustomInputMap((prev) => ({ ...prev, [currentQuestion?.questionId]: e.target.value }))}
                            placeholder="Enter test inputs here (e.g. 10&#10;20)..."
                            className="w-full flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 resize-none"
                          />
                        </div>
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
                {currentIndex === (codingStartIndex + codingCount - 1) ? (
                  <button
                    onClick={() => {
                      if (descriptiveCount > 0) {
                        setCurrentIndex(descriptiveStartIndex);
                      }
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <span>Proceed to Descriptive Section</span>
                    <ChevronRight className="w-4 h-4" />
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
        ) : isDescriptive ? (
          <div className="w-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            
            {/* Section Header Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  Section C: Descriptive Round
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Descriptive Task {currentIndex - descriptiveStartIndex + 1} of {descriptiveCount}
                </h2>
              </div>

              {/* Inline Palette tabs */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Tasks:</span>
                {descriptiveQuestions.map((q, index) => {
                  const globalIndex = descriptiveStartIndex + index;
                  const isCurrent = currentIndex === globalIndex;
                  const isAnswered = !!answers[q.questionId];
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIndex(globalIndex)}
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
                  <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">Task Prompt & Scenario</h3>
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
                    Type your essay or written content in the notepad area. Your text is auto-saved in real-time as you write. Use the Clear button to start fresh.
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
                style={{ width: window.innerWidth >= 1024 ? `${100 - splitWidth}%` : "100%" }}
                className={`w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden ${
                  isDraggingSplit ? "" : "transition-all duration-75"
                }`}
              >
                {/* Editor Header */}
                <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notepad Editor</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      {(answers[currentQuestion?.questionId] || "").trim() ? (answers[currentQuestion?.questionId] || "").trim().split(/\s+/).length : 0} Words
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {(answers[currentQuestion?.questionId] || "").length} Chars
                    </span>
                    <span className={answers[currentQuestion?.questionId] ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold border border-emerald-200" : "text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200"}>
                      {answers[currentQuestion?.questionId] ? "Saved (Draft)" : "Unsaved"}
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
                    value={answers[currentQuestion?.questionId] || ""}
                    onChange={(e) => handleAnswer(currentQuestion?.questionId, e.target.value)}
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
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 items-stretch overflow-hidden">
            {/* Question Details & Option Selection Card (Left 8 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col justify-between h-full overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {/* Question Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                        Question {currentIndex + 1} of {mcqQuestions.length}
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed mb-4 shrink-0">
                    {currentQuestion?.question || currentQuestion?.text}
                  </h2>

                  {/* Options List - Flexible layout */}
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {currentQuestion?.options?.map((option) => {
                      const isSelected = answers[currentQuestion.questionId] === option.optionId;
                      return (
                        <div
                          key={option.optionId}
                          onClick={() => handleAnswer(currentQuestion.questionId, option.optionId)}
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
                            {option.optionId}
                          </div>
                          <span className={`text-sm sm:text-base transition ${isSelected ? "text-blue-950 font-semibold" : "text-slate-700"}`}>
                            {option.text}
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
                    {currentIndex === mcqQuestions.length - 1 ? (
                      <button
                        onClick={() => {
                          if (codingCount > 0) {
                            setCurrentIndex(codingStartIndex);
                          } else if (descriptiveCount > 0) {
                            setCurrentIndex(descriptiveStartIndex);
                          }
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                      >
                        <span>{codingCount > 0 ? "Proceed to Coding Section" : "Proceed to Descriptive Section"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
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
            <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
              {renderPalette()}
            </div>
          </div>
        )}


      </main>

    </div>
  );
};

export default Test;
