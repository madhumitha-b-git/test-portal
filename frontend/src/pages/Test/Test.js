import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchQuestions, startProctoringSession, incrementWarning, submitAnswers, submitProctoringReport } from "../../services/api";
import { runPythonCode } from "../../services/codeExecution";
import { AlertCircle } from "lucide-react";

import TestHeader from "./components/TestHeader";
import McqView from "./components/McqView";
import CodingView from "./components/CodingView";
import DescriptiveView from "./components/DescriptiveView";
import ProctoringOverlay from "./components/ProctoringOverlay";

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
    const code = answers[questionId] || "";
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
      const res = await runPythonCode(code);
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
    if (localStorage.getItem("testSubmitted") === "true" || localStorage.getItem("testTerminated") === "true") return;
    if (answers && Object.keys(answers).length > 0) {
      localStorage.setItem("answers", JSON.stringify(answers));
    }
  }, [answers]);

  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true" || localStorage.getItem("testTerminated") === "true") return;
    if (currentIndex > 0) {
      localStorage.setItem("currentIndex", currentIndex.toString());
    }
  }, [currentIndex]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testId, setTestId] = useState(() => localStorage.getItem("testId") || "");

  const [warningCount, setWarningCount] = useState(() => parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10));
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [pendingTermination, setPendingTermination] = useState(null);
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
        localStorage.removeItem("lastPing");

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
            if (timeAway > 10000) {
              setPendingTermination("Left exam window for more than 10 seconds");
            } else if (timeAway > 2000) {
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
          sectionName: q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ"),
          responses: []
        };
      }
      
      const respObj = { questionId: q.questionId };
      if (q.questionType === "CODING" || q.questionType === "DESCRIPTIVE") {
        respObj.typedAnswer = currentAnswers[q.questionId] || "";
      } else {
        const chosenId = currentAnswers[q.questionId] || "";
        respObj.selectedOption = chosenId;
        const matchedOpt = (q.options || []).find((opt) => (opt.adminOptionId || opt.originalOptionId || opt.optionId || opt.id) === chosenId);
        respObj.selectedOptionText = matchedOpt ? (matchedOpt.text || matchedOpt.optionText || "") : chosenId;
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
      startedTime: startedTime,
      endedTime: endedTime,
      status: "TERMINATED",
      warningCount: count,
    }).catch(() => {});

    localStorage.setItem("submittedAtTime", new Date().toLocaleString());
    localStorage.setItem("testSubmitted", "true");
    localStorage.setItem("submittedTestId", testId);
    localStorage.setItem("testTerminated", "true");
    localStorage.setItem("terminationReason", reason);

    try {
      localStorage.clear();
    } catch (e) {}

    setTimeout(() => navigate("/thankyou", { replace: true }), 2000);
  }, [testId, navigate]);

  // ── Ping timer to detect tab closure ──
  useEffect(() => {
    if (isTerminated || localStorage.getItem("testSubmitted") === "true" || localStorage.getItem("testTerminated") === "true") return;
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
    // Prevent trackpad swipe back/forward specifically in the exam screen
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

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
        const isMonaco = e.target?.closest && e.target.closest('.monaco-editor');
        if (targetTag !== "INPUT" && targetTag !== "TEXTAREA" && !isEditable && !isMonaco) {
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
        // Block zoom shortcuts (Ctrl +, Ctrl -, Ctrl 0, Ctrl =, NumpadAdd, NumpadSubtract, Numpad0)
        if (
          ["+", "-", "=", "_", "0"].includes(key) ||
          ["Equal", "Minus", "Digit0", "NumpadAdd", "NumpadSubtract", "Numpad0"].includes(code) ||
          e.keyCode === 187 || e.keyCode === 189 || e.keyCode === 107 || e.keyCode === 109 || e.keyCode === 48 || e.keyCode === 96
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Block copy, paste, cut, select all, view source
        if (["c", "v", "x", "a", "u"].includes(key)) {
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
      // Windows Snipping Tool (Win + Shift + S)
      else if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") isScreenshotKey = true;
      // Mac Screenshot (Cmd + Shift + 3/4/5)
      else if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) isScreenshotKey = true;
      // Windows Game Bar (Win + G)
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
            sectionName: q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ"),
            responses: []
          };
        }
        
        const respObj = { questionId: q.questionId };
        if (q.questionType === "CODING" || q.questionType === "DESCRIPTIVE") {
          respObj.typedAnswer = currentAnswers[q.questionId] || "";
        } else {
        const chosenId = currentAnswers[q.questionId] || "";
        respObj.selectedOption = chosenId;
        const matchedOpt = (q.options || []).find((opt) => (opt.adminOptionId || opt.originalOptionId || opt.optionId || opt.id) === chosenId);
        respObj.selectedOptionText = matchedOpt ? (matchedOpt.text || matchedOpt.optionText || "") : chosenId;
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
        startedTime: startedTime,
        endedTime: endedTime,
        status: "SUCCESS",
        warningCount: count,
      }).catch(() => {});

      localStorage.setItem("submittedAtTime", new Date().toLocaleString());
      localStorage.setItem("testSubmitted", "true");
      localStorage.setItem("submittedTestId", testId);

      try {
        localStorage.clear();
      } catch (e) {}

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
    if (showWarningOverlay || isTerminated || localStorage.getItem("testSubmitted") === "true" || localStorage.getItem("testTerminated") === "true") return;
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

  const sectionsList = React.useMemo(() => {
    const list = [];
    const map = new Map();
    questions.forEach((q, idx) => {
      const sId = q.sectionId || "default";
      if (!map.has(sId)) {
        const sec = {
          sectionId: sId,
          sectionName: q.sectionName || `Section ${list.length + 1}`,
          startIndex: idx,
          questions: [],
        };
        map.set(sId, sec);
        list.push(sec);
      }
      map.get(sId).questions.push({ ...q, globalIndex: idx });
    });
    return list;
  }, [questions]);

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

  const currentSection = sectionsList.find(s => s.sectionId === (currentQuestion?.sectionId || "default")) || sectionsList[0];
  const currentSectionIndex = sectionsList.findIndex(s => s.sectionId === currentSection?.sectionId);
  const nextSection = currentSectionIndex >= 0 && currentSectionIndex < sectionsList.length - 1 ? sectionsList[currentSectionIndex + 1] : null;
  const questionIndexInSection = currentSection?.questions.findIndex(q => q.questionId === currentQuestion?.questionId) ?? 0;

  const isCoding = currentQuestion?.questionType === "CODING";
  const isDescriptive = currentQuestion?.questionType === "DESCRIPTIVE";

  // ── Terminated screen ──
  if (isTerminated) {
    return (
      <ProctoringOverlay
        isTerminated={isTerminated}
        terminationReason={terminationReason}
      />
    );
  }

  return (
    <div className="bg-slate-50 text-slate-800 flex flex-col justify-between select-none relative h-screen max-h-screen overflow-hidden">
      
      {/* ── Fullscreen / Warning Overlays ── */}
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

      {/* Top Header Bar */}
      <TestHeader
        candidate={candidate}
        warningCount={warningCount}
        timeLeft={timeLeft}
        formatTime={formatTime}
        sectionsList={sectionsList}
        currentSection={currentSection}
        setCurrentIndex={setCurrentIndex}
      />

      {/* Main Examination View - Full Viewport Zero Scroll Fit */}
      <main className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 p-4 flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Section Navigation Tabs Bar */}
        <div className="flex items-center justify-start pb-3 shrink-0">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1.5 max-w-full overflow-x-auto">
            {sectionsList.map((sec, sIdx) => {
              const isActive = currentSection?.sectionId === sec.sectionId;
              const sectionLetter = String.fromCharCode(65 + sIdx);
              let displayName = sec.sectionName || `Section ${sectionLetter}`;
              if (!/^Section\s+[A-Z]:?/i.test(displayName)) {
                displayName = `Section ${sectionLetter}: ${displayName}`;
              }

              return (
                <button
                  key={sec.sectionId}
                  onClick={() => setCurrentIndex(sec.startIndex)}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>

        {isCoding ? (
          <CodingView
            currentQuestion={currentQuestion}
            questionIndexInSection={questionIndexInSection}
            currentSection={currentSection}
            currentIndex={currentIndex}
            answers={answers}
            setCurrentIndex={setCurrentIndex}
            codingContainerRef={codingContainerRef}
            isDraggingSplit={isDraggingSplit}
            splitWidth={splitWidth}
            handleMouseDownSplit={handleMouseDownSplit}
            handleAnswer={handleAnswer}
            executionMap={executionMap}
            showOutputMap={showOutputMap}
            setShowOutputMap={setShowOutputMap}
            handleRunCode={handleRunCode}
            handlePrevious={handlePrevious}
            handleNext={handleNext}
            handleSubmit={handleSubmit}
            questions={questions}
            nextSection={nextSection}
          />
        ) : isDescriptive ? (
          <DescriptiveView
            currentQuestion={currentQuestion}
            questionIndexInSection={questionIndexInSection}
            currentSection={currentSection}
            currentIndex={currentIndex}
            answers={answers}
            setCurrentIndex={setCurrentIndex}
            codingContainerRef={codingContainerRef}
            isDraggingSplit={isDraggingSplit}
            splitWidth={splitWidth}
            handleMouseDownSplit={handleMouseDownSplit}
            handleAnswer={handleAnswer}
            handlePrevious={handlePrevious}
            handleNext={handleNext}
            handleSubmit={handleSubmit}
            questions={questions}
            nextSection={nextSection}
          />
        ) : (
          <McqView
            questionIndexInSection={questionIndexInSection}
            currentSection={currentSection}
            answers={answers}
            currentQuestion={currentQuestion}
            handleAnswer={handleAnswer}
            handlePrevious={handlePrevious}
            currentIndex={currentIndex}
            handleSubmit={handleSubmit}
            handleNext={handleNext}
            questions={questions}
            nextSection={nextSection}
            handlePaletteClick={handlePaletteClick}
          />
        )}


      </main>

    </div>
  );
};

export default Test;
