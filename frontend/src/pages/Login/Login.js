import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { registerCandidate, loginCandidate, fetchTestByLinkId, fetchProctoringSessions } from "../../services/api";
import IdpLogo from "../../components/IdpLogo";
import Footer from "../../components/Footer";
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  KeyRound, 
  LogIn, 
  UserPlus, 
  Clock, 
  AlertOctagon, 
  RefreshCw, 
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { linkId: paramLinkId } = useParams();
  
  // Extract linkId from params or directly from pathname fallback (e.g. /846764)
  const pathnameSegment = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const linkId = paramLinkId || (pathnameSegment && pathnameSegment !== "index.html" ? pathnameSegment : "");

  // Link validation state
  const [validatingLink, setValidatingLink] = useState(true);
  const [linkError, setLinkError] = useState(null); // 'NO_LINK_ID' | 'NOT_FOUND' | 'NOT_ACTIVE' | 'API_ERROR'
  const [testInfo, setTestInfo] = useState({
    title: "",
    durationMinutes: 30,
    testId: "",
  });

  // Active Tab state: 'register' or 'login'
  const [activeTab, setActiveTab] = useState("register");

  // Registration Form State
  const [regData, setRegData] = useState({
    name: "",
    mailId: "",
    mobile: "",
    college: "",
    password: "",
    confirmPassword: "",
  });

  // Login Form State
  const [loginData, setLoginData] = useState({
    mailId: "",
    password: "",
  });

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form error state
  const [errors, setErrors] = useState({});

  // Loading state
  const [loading, setLoading] = useState(false);

  // Validate Link on mount or when linkId changes
  useEffect(() => {
    // Detect if candidate is opening a new/different linkId than what is cached in localStorage
    const cachedLinkId = localStorage.getItem("linkId");
    if (linkId && cachedLinkId && String(linkId).trim() !== String(cachedLinkId).trim()) {
      localStorage.removeItem("testStarted");
      localStorage.removeItem("testSubmitted");
      localStorage.removeItem("submittedTestId");
      localStorage.removeItem("testTerminated");
      localStorage.removeItem("terminationReason");
      localStorage.removeItem("questions");
      localStorage.removeItem("answers");
      localStorage.removeItem("currentIndex");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");
      localStorage.removeItem("lastPing");
    }

    // If candidate has an active test session in progress for THIS test, auto-redirect immediately back to test
    const isStarted = localStorage.getItem("testStarted") === "true";
    const isSubmitted = localStorage.getItem("testSubmitted") === "true";
    if (isStarted && !isSubmitted) {
      navigate("/test", { replace: true });
      return;
    }

    const validateLink = async () => {
      setValidatingLink(true);
      setLinkError(null);

      // 1. Direct root URL without linkId is strictly blocked
      if (!linkId) {
        setLinkError("NO_LINK_ID");
        setValidatingLink(false);
        return;
      }

      // 2. Query Admin API to match linkId and verify status
      const res = await fetchTestByLinkId(linkId);

      if (!res.success) {
        setLinkError(res.error || "API_ERROR");
        if (res.title) {
          setTestInfo((prev) => ({ ...prev, title: res.title }));
        }
        setValidatingLink(false);
        return;
      }

      // 3. Test is valid and active
      const test = res.test;
      const title = res.title || test.title || "Online Assessment";
      const duration = test.totalDurationMinutes || test.durationMinutes || 30;

      setTestInfo({
        title: title,
        durationMinutes: duration,
        testId: test.testId,
      });

      // If candidate is switching to a different testId, clear old test session state
      const currentStoredTestId = localStorage.getItem("testId");
      if (currentStoredTestId && currentStoredTestId !== test.testId) {
        localStorage.removeItem("testStarted");
        localStorage.removeItem("testSubmitted");
        localStorage.removeItem("submittedTestId");
        localStorage.removeItem("testTerminated");
        localStorage.removeItem("terminationReason");
        localStorage.removeItem("questions");
        localStorage.removeItem("answers");
        localStorage.removeItem("currentIndex");
        localStorage.removeItem("proctoringStartedTime");
        localStorage.removeItem("proctoringWarningCount");
        localStorage.removeItem("proctoringStatus");
        localStorage.removeItem("lastPing");
      }

      // Cache verified test metadata in localStorage
      localStorage.setItem("linkId", linkId);
      localStorage.setItem("testTitle", title);
      localStorage.setItem("testId", test.testId);
      localStorage.setItem("totalDurationMinutes", duration.toString());

      setLinkError(null);
      setValidatingLink(false);
    };

    validateLink();
  }, [linkId, navigate]);

  // Handle register inputs (password/confirmPassword are 4-digit PINs)
  const handleRegChange = (e) => {
    const { name, value } = e.target;
    const sanitized =
      name === "password" || name === "confirmPassword"
        ? value.replace(/\D/g, "").slice(0, 4)
        : value;
    setRegData({ ...regData, [name]: sanitized });
    setErrors({ ...errors, [name]: "", api: "" });
  };

  // Handle login inputs (password is a 4-digit PIN)
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    const sanitized = name === "password" ? value.replace(/\D/g, "").slice(0, 4) : value;
    setLoginData({ ...loginData, [name]: sanitized });
    setErrors({ ...errors, [name]: "", api: "" });
  };

  // Strict list of allowed email domains for candidate registration & login
  const ALLOWED_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "ritchennai.edu.in",
    "rajalakshmi.edu.in",
    "bitsathy.ac.in",
  ]);

  // Email format & domain validator (strictly allows only the 6 approved domains)
  const isValidEmail = (email) => {
    const trimmed = (email || "").trim();
    if (!trimmed) return false;

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed) || trimmed.includes("..")) {
      return false;
    }

    const parts = trimmed.split("@");
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase();

    return ALLOWED_EMAIL_DOMAINS.has(domain);
  };

  // 4-digit PIN validator for Signup & Login
  const isValidPin = (pin) => /^\d{4}$/.test(pin || "");

  // Switch tab helper
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setErrors({});
  };

  // Validate registration form
  const validateRegister = () => {
    const newErrors = {};
    const email = (regData.mailId || "").trim();

    if (!regData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!email) {
      newErrors.mailId = "Email address is required";
    } else if (!isValidEmail(email)) {
      newErrors.mailId = "Please enter a valid email address";
    }

    if (!regData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(regData.mobile.trim())) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    }

    if (!regData.college.trim()) {
      newErrors.college = "College/Institution name is required";
    }

    if (!regData.password) {
      newErrors.password = "PIN is required";
    } else if (!isValidPin(regData.password)) {
      newErrors.password = "PIN must be exactly 4 digits.";
    }

    if (!regData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your PIN";
    } else if (regData.password !== regData.confirmPassword) {
      newErrors.confirmPassword = "PINs do not match";
    }

    return newErrors;
  };

  // Validate login form
  const validateLogin = () => {
    const newErrors = {};
    const email = (loginData.mailId || "").trim();

    if (!email) {
      newErrors.mailId = "Email address is required";
    } else if (!isValidEmail(email)) {
      newErrors.mailId = "Please enter a valid email address";
    }

    if (!loginData.password) {
      newErrors.password = "PIN is required";
    } else if (!isValidPin(loginData.password)) {
      newErrors.password = "PIN must be exactly 4 digits.";
    }

    return newErrors;
  };

  // Handle registration submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateRegister();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const normalizedMail = regData.mailId.trim().toLowerCase();

      const currentTestId = testInfo.testId || localStorage.getItem("testId") || "";

      // Call POST /register API
      const res = await registerCandidate({
        name: regData.name.trim(),
        mailId: normalizedMail,
        mobile: regData.mobile.trim(),
        college: regData.college.trim(),
        password: regData.password,
        testId: currentTestId,
      });

      // Clear previous cached session for fresh registration
      localStorage.removeItem("questions");
      localStorage.removeItem("answers");
      localStorage.removeItem("currentIndex");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");
      localStorage.removeItem("testSubmitted");
      localStorage.removeItem("testTerminated");
      localStorage.removeItem("terminationReason");

      // Store candidate profile
      localStorage.setItem(
        "candidate",
        JSON.stringify({
          name: res.data?.user?.name || regData.name.trim(),
          mailId: res.data?.user?.mailId || normalizedMail,
          college: res.data?.user?.college || regData.college.trim(),
          mobile: res.data?.user?.mobile || regData.mobile.trim(),
        })
      );

      navigate("/instructions");
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed. Please check your details and try again.";
      const normalizedMail = regData.mailId.trim().toLowerCase();

      // If email is already registered, switch to Login tab so candidate can enter 4-digit PIN to log in
      if (message.toLowerCase().includes("already registered") || message.toLowerCase().includes("already exist")) {
        setLoginData((prev) => ({ ...prev, mailId: normalizedMail }));
        setErrors({ api: "You are already registered with this email. Please log in using your 4-digit PIN." });
        setActiveTab("login");
        return;
      }

      setErrors({ api: message });
    } finally {
      setLoading(false);
    }
  };


  // Handle login submit (for resume or returning candidate)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateLogin();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const normalizedMail = loginData.mailId.trim().toLowerCase();

      // Call POST /login API
      const res = await loginCandidate({
        mailId: normalizedMail,
        password: loginData.password,
        testId: testInfo.testId || localStorage.getItem("testId") || "",
      });


      const userProfile = res.data?.user || { mailId: normalizedMail };
      localStorage.setItem(
        "candidate",
        JSON.stringify({
          name: userProfile.name || "Candidate",
          mailId: userProfile.mailId || normalizedMail,
          college: userProfile.college || "",
          mobile: userProfile.mobile || "",
        })
      );

      // Check proctoring session status BEFORE allowing the user to continue/resume
      let sessionStatus = null;
      try {
        const sessionsRes = await fetchProctoringSessions();
        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
        const currentTestId = String(testInfo.testId || localStorage.getItem("testId") || "").trim();
        const currentLinkId = String(linkId || localStorage.getItem("linkId") || "").trim();
        const mySessions = sessions.filter((s) => {
          const matchEmail = (s.mailId || s.email || "").trim().toLowerCase() === normalizedMail;
          const sTest = String(s.testId || "").trim();
          const sLink = String(s.linkId || "").trim();
          const currentTestId = String(testInfo.testId || localStorage.getItem("testId") || "").trim();
          const currentLinkId = String(linkId || localStorage.getItem("linkId") || "").trim();

          // Strictly match testId or linkId ONLY for this specific assessment
          let matchTest = false;
          if (currentTestId && (sTest === currentTestId || sLink === currentTestId)) {
            matchTest = true;
          }
          if (currentLinkId && (sTest === currentLinkId || sLink === currentLinkId)) {
            matchTest = true;
          }

          return matchEmail && matchTest;
        });

        if (mySessions.length > 0) {
          mySessions.sort((a, b) =>
            String(b.startedTime || b.starttime || "").localeCompare(String(a.startedTime || a.starttime || ""))
          );
          sessionStatus = (mySessions[0].status || "").toUpperCase().trim();
        }
      } catch (error) {
        console.error("Error fetching proctoring session status:", error);
      }



      // Terminated candidate -> show terminated window, block re-entry
      if (sessionStatus === "TERMINATED") {
        localStorage.setItem("testSubmitted", "true");
        localStorage.setItem("testTerminated", "true");
        localStorage.setItem(
          "terminationReason",
          "Your assessment session was terminated due to a proctoring violation. You are not allowed to retake this assessment."
        );
        localStorage.removeItem("questions");
        localStorage.removeItem("answers");
        localStorage.removeItem("currentIndex");
        localStorage.removeItem("proctoringStartedTime");
        navigate("/thankyou", { replace: true });
        return;
      }

      // Completed candidate -> show completed window, block re-entry
      if (sessionStatus === "SUCCESS") {
        localStorage.setItem("testSubmitted", "true");
        localStorage.removeItem("testTerminated");
        localStorage.removeItem("terminationReason");
        localStorage.removeItem("questions");
        localStorage.removeItem("answers");
        localStorage.removeItem("currentIndex");
        localStorage.removeItem("proctoringStartedTime");
        navigate("/thankyou", { replace: true });
        return;
      }

      // Check if test was already submitted
      if (res.data?.isSubmitted) {
        localStorage.setItem("testSubmitted", "true");
        localStorage.removeItem("questions");
        localStorage.removeItem("answers");
        localStorage.removeItem("currentIndex");
        localStorage.removeItem("proctoringStartedTime");
        navigate("/thankyou", { replace: true });
        return;
      }

      // Check if candidate is resuming an active test session
      const existingStartedTime = localStorage.getItem("proctoringStartedTime");

      if (existingStartedTime && localStorage.getItem("testSubmitted") !== "true") {
        navigate("/test", { replace: true });
      } else {
        navigate("/instructions");
      }
    } catch (error) {
      setErrors({ api: "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className="w-full px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <IdpLogo />
          
          {testInfo.title ? (
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{testInfo.title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Assessment Portal</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-6">
        
        {/* ========================================================================= */}
        {/* 1. LOADING STATE */}
        {/* ========================================================================= */}
        {validatingLink && (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-base font-bold text-slate-900">Validating Test Access Link</h3>
            <p className="text-xs text-slate-500">Connecting to assessment configuration and checking active status...</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ERROR STATE: NO LINK ID IN URL (e.g. root url https://.../) */}
        {/* ========================================================================= */}
        {!validatingLink && linkError === "NO_LINK_ID" && (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Invalid Assessment URL</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Direct access to the root portal URL without a <strong>Link ID</strong> is restricted.
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">Expected URL format:</span>
              <code className="block bg-white p-2 rounded border border-slate-300 font-mono text-blue-700 break-all select-all">
                https://d1t6qh90xvpukg.cloudfront.net/&lt;link_id&gt;
              </code>
              <p className="text-slate-500 text-[11px] pt-1">
                Example: <span className="font-semibold text-slate-800">https://d1t6qh90xvpukg.cloudfront.net/846764</span>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Please click the unique test link provided by your institution or check your exam invitation.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ERROR STATE: TEST NOT FOUND */}
        {/* ========================================================================= */}
        {!validatingLink && linkError === "NOT_FOUND" && (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Assessment Not Found</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                No active assessment corresponds to the Link ID: <strong className="text-red-600 font-mono">{linkId}</strong>.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              The link ID may be incorrect, expired, or removed by your exam coordinator. Please verify your link.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ERROR STATE: TEST NOT ACTIVE */}
        {/* ========================================================================= */}
        {!validatingLink && linkError === "NOT_ACTIVE" && (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/60 border border-amber-200 text-amber-900 text-xs font-bold mb-1">
                <span>Assessment Currently Inactive</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {testInfo.title || "Assessment Inactive"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                This test is currently marked as <strong>Not Active</strong>. Candidate registration and test taking are temporarily closed.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 text-left">
              <span className="font-bold text-slate-800 block">What should I do?</span>
              <p>• Check if your scheduled assessment window has started.</p>
              <p>• Contact your campus placement cell or exam administrator to activate the test.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer border border-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Page</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ERROR STATE: API CONNECTION ERROR */}
        {/* ========================================================================= */}
        {!validatingLink && linkError === "API_ERROR" && (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Connection Error</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unable to retrieve assessment details from the server. Please check your internet connection.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SUCCESS STATE: ACTIVE ASSESSMENT PORTAL UI */}
        {/* ========================================================================= */}
        {!validatingLink && !linkError && (
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Test & Portal Overview */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Official Assessment Portal</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {testInfo.title}
                </h1>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 w-fit px-3 py-1 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Test Status: Active • {testInfo.durationMinutes} Minutes</span>
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                Welcome to <strong>Hire360</strong>. Please complete candidate registration or log in to resume your active test session.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Secure Online Evaluation</h4>
                    <p className="text-[11px] text-slate-500">Automated responses sync & AI-guided proctoring.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Session Resumption</h4>
                    <p className="text-[11px] text-slate-500">If your computer reboots, log in to continue without losing progress.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Authentication Card */}
            <div className="lg:col-span-7">
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
                
                {/* Tab Selector */}
                <div className="flex rounded-lg bg-slate-100 p-1 mb-6 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch("register")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-md transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === "register"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>New Registration</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch("login")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-md transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === "login"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Candidate Login / Resume</span>
                  </button>
                </div>

                {/* API Error Box */}
                {errors.api && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg mb-5 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errors.api}</span>
                  </div>
                )}

                {/* TAB 1: REGISTRATION FORM */}
                {activeTab === "register" && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          name="name"
                          value={regData.name}
                          onChange={handleRegChange}
                          placeholder="Enter your Name..."
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                            errors.name
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                      </div>
                      {errors.name && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.name}</p>}
                    </div>

                    {/* Mail ID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mail ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          name="mailId"
                          value={regData.mailId}
                          onChange={handleRegChange}
                          placeholder="Enter your Mail Id"
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                            errors.mailId
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                      </div>
                      {errors.mailId && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.mailId}</p>}
                    </div>

                    {/* Mobile & College row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            name="mobile"
                            value={regData.mobile}
                            onChange={handleRegChange}
                            placeholder="10 digit mobile"
                            className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                              errors.mobile
                                ? "border-red-400 focus:ring-red-100"
                                : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                            }`}
                          />
                        </div>
                        {errors.mobile && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.mobile}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          College / Institution <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            name="college"
                            value={regData.college}
                            onChange={handleRegChange}
                            placeholder="College name"
                            className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                              errors.college
                                ? "border-red-400 focus:ring-red-100"
                                : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                            }`}
                          />
                        </div>
                        {errors.college && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.college}</p>}
                      </div>
                    </div>

                    {/* PIN & Confirm PIN row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Create 4-Digit PIN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showRegPassword ? "text" : "password"}
                            name="password"
                            value={regData.password}
                            onChange={handleRegChange}
                            placeholder="4-digit PIN"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="[0-9]*"
                            autoComplete="new-password"
                            className={`w-full bg-white text-slate-900 text-sm pl-10 pr-10 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                              errors.password
                                ? "border-red-400 focus:ring-red-100"
                                : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.password}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm PIN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={regData.confirmPassword}
                            onChange={handleRegChange}
                            placeholder="Re-enter PIN"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="[0-9]*"
                            autoComplete="new-password"
                            className={`w-full bg-white text-slate-900 text-sm pl-10 pr-10 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                              errors.confirmPassword
                                ? "border-red-400 focus:ring-red-100"
                                : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.confirmPassword}</p>}
                      </div>
                    </div>

                    {/* Register Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Registering Candidate...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Registration</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => handleTabSwitch("login")}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Login / Resume Test
                      </button>
                    </p>

                  </form>
                )}

                {/* TAB 2: LOGIN / RESUME FORM */}
                {activeTab === "login" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    
                    <div className="bg-blue-50/60 border border-blue-200 text-blue-800 p-3 rounded-lg text-xs leading-relaxed">
                      <strong>Resuming your assessment?</strong> Enter your registered email and 4-digit PIN to pick up where you left off.
                    </div>

                    {/* Mail ID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Registered Mail ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          name="mailId"
                          value={loginData.mailId}
                          onChange={handleLoginChange}
                          placeholder="Enter registered mail Id"
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                            errors.mailId
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                      </div>
                      {errors.mailId && <p className="text-red-600 text-xs mt-1 font-medium">{errors.mailId}</p>}
                    </div>

                    {/* PIN */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        4-Digit PIN <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          name="password"
                          value={loginData.password}
                          onChange={handleLoginChange}
                          placeholder="Enter 4-digit PIN"
                          inputMode="numeric"
                          maxLength={4}
                          pattern="[0-9]*"
                          autoComplete="current-password"
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                            errors.password
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-600 text-xs mt-1 font-medium">{errors.password}</p>}
                    </div>

                    {/* Login Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Login & Resume Assessment</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Not registered yet?{" "}
                      <button
                        type="button"
                        onClick={() => handleTabSwitch("register")}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Create Candidate Registration
                      </button>
                    </p>

                  </form>
                )}

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Login;
