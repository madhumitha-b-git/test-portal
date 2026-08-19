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

  // Registration Form State
  const [regData, setRegData] = useState({
    name: "",
    mailId: "",
    mobile: "",
    college: "",
  });

  // Form error state
  const [errors, setErrors] = useState({});

  // Loading state
  const [loading, setLoading] = useState(false);

  // Validate Link on mount or when linkId changes
  useEffect(() => {
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
  }, [linkId]);

  // Handle register inputs
  const handleRegChange = (e) => {
    const { name, value } = e.target;
    setRegData({ ...regData, [name]: value });
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

    const normalizedMail = regData.mailId.trim().toLowerCase();
    const currentTestId = testInfo.testId || localStorage.getItem("testId") || "";

    setLoading(true);
    try {

      // Call POST /register API
      const res = await registerCandidate({
        name: regData.name.trim(),
        mailId: normalizedMail,
        mobile: regData.mobile.trim(),
        college: regData.college.trim(),
        password: "0000",
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

      // If email is already registered, try to auto-login with default PIN
      if (message.toLowerCase().includes("already registered") || message.toLowerCase().includes("already exist")) {
        try {
          const loginRes = await loginCandidate({
            mailId: normalizedMail,
            password: "0000",
            testId: currentTestId,
          });
          const userProfile = loginRes.data?.user || { mailId: normalizedMail };
          localStorage.setItem(
            "candidate",
            JSON.stringify({
              name: userProfile.name || regData.name.trim() || "Candidate",
              mailId: userProfile.mailId || normalizedMail,
              college: userProfile.college || regData.college.trim() || "",
              mobile: userProfile.mobile || regData.mobile.trim() || "",
            })
          );
          navigate("/instructions");
        } catch (loginErr) {
          setErrors({ api: "This email is already registered. Since the PIN feature was removed, please use a new email address to register." });
        }
        return;
      }

      setErrors({ api: message });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className="w-full px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <IdpLogo />
          

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        
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
               <p className="text-xs text-slate-500">
              The URL may be incorrect, expired, or removed by your exam coordinator. Please verify your URL.
            </p>
            </div>
           
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
            <div className="lg:col-span-5 space-y-4">
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
                Welcome to <strong>IDP Hire360</strong>. Please complete candidate registration to begin your active test session.
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
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                
                {/* REGISTRATION FORM */}
                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    
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

                    {/* Mobile Number */}
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

                    {/* College / Institution */}
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



                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
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

                  </form>

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
