import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { registerCandidate, loginCandidate, fetchTestByLinkId } from "../../services/api";
import IdpLogo from "../../components/IdpLogo";
import loginIllustration from "../../assets/login-illustration.jpg";
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  AlertOctagon, 
  RefreshCw, 
  Hash
} from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { linkId: paramLinkId } = useParams();
  
  // Extract linkId from params, query param, pathname, or localStorage fallback
  const urlParams = new URLSearchParams(window.location.search);
  const queryLinkId = urlParams.get("linkId");
  const pathnameSegment = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const linkId = paramLinkId || queryLinkId || (pathnameSegment && pathnameSegment !== "index.html" ? pathnameSegment : "") || localStorage.getItem("linkId") || "";

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
    regNo: "",
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

  // Email format validator
  const isValidEmail = (email) => {
    const trimmed = (email || "").trim();
    if (!trimmed) return false;

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(trimmed) && !trimmed.includes("..");
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

    const mob = regData.mobile.trim();
    if (!mob) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mob)) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    } else if (!/^[6-9]/.test(mob)) {
      newErrors.mobile = "Mobile number must start with 6, 7, 8, or 9";
    } else if (["1234567890", "9876543210", "0123456789"].includes(mob) || new Set(mob).size === 1) {
      newErrors.mobile = "Invalid mobile number. Please enter a valid mobile number";
    }

    if (!regData.college.trim()) {
      newErrors.college = "College/Institution name is required";
    }

    if (!regData.regNo.trim()) {
      newErrors.regNo = "Registration number is required";
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
        regNo: regData.regNo.trim(),
        testId: currentTestId,
      });

      // Clear previous cached session for fresh registration
      sessionStorage.clear();
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
          regNo: res.data?.user?.regNo || regData.regNo.trim(),
        })
      );

      navigate("/instructions");
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed. Please check your details and try again.";

      // If email is already registered, check if candidate already completed this specific testId
      if (message.toLowerCase().includes("already registered") || message.toLowerCase().includes("already exist")) {
        try {
          const loginRes = await loginCandidate({
            mailId: normalizedMail,
            testId: currentTestId,
          });

          // Block navigation if user ALREADY completed/submitted this assessment for this testId
          if (loginRes.data?.isSubmitted) {
            setErrors({ api: "You have already attended/submitted this assessment." });
            return;
          }

          const userProfile = loginRes.data?.user || { mailId: normalizedMail };

          // Clear previous cached session for fresh registration
          localStorage.removeItem("questions");
          localStorage.removeItem("answers");
          localStorage.removeItem("currentIndex");
          localStorage.removeItem("proctoringStartedTime");
          localStorage.removeItem("proctoringWarningCount");
          localStorage.removeItem("proctoringStatus");
          localStorage.removeItem("testSubmitted");
          localStorage.removeItem("submittedTestId");
          localStorage.removeItem("testTerminated");
          localStorage.removeItem("terminationReason");

          localStorage.setItem(
            "candidate",
            JSON.stringify({
              name: userProfile.name || regData.name.trim() || "Candidate",
              mailId: userProfile.mailId || normalizedMail,
              college: userProfile.college || regData.college.trim() || "",
              mobile: userProfile.mobile || regData.mobile.trim() || "",
              regNo: userProfile.regNo || regData.regNo.trim() || "",
            })
          );
          navigate("/instructions");
        } catch (loginErr) {
          setErrors({ api: "This email is already registered for this assessment." });
        }
        return;
      }

      setErrors({ api: message });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full bg-white border-b border-slate-200 z-40 px-4 sm:px-6 lg:px-10 2xl:px-16 py-3.5 shadow-xs">
        <div className="w-full max-w-[1920px] mx-auto flex justify-between items-center">
          <IdpLogo />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 pt-20 pb-24">
        
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
        {/* 2. ERROR STATE: TEST NOT FOUND & NO LINK ID */}
        {/* ========================================================================= */}
        {!validatingLink && (linkError === "NOT_FOUND" || linkError === "NO_LINK_ID") && (
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Assessment Not Found</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                The assessment link may be incorrect, expired, or inactive. Please verify your URL or contact your exam coordinator.
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
          <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Test Overview & Image */}
            <div className="lg:col-span-5 bg-slate-50/70 p-6 lg:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200 text-center space-y-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                  Online Assessment
                </h1>
                <h2 className="text-base font-bold text-blue-600">
                  {testInfo.title}
                </h2>
              </div>
              <img src={loginIllustration} alt="Assessment Illustration" className="w-full max-w-[240px] object-contain mix-blend-multiply" />
            </div>

            {/* Right Column: Authentication Form */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
                
                {/* Registration Warning */}
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg mb-4 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="leading-relaxed">
                    <strong>Important:</strong> Details entered during registration cannot be changed later.
                  </p>
                </div>

                {/* API Error Alert */}
                {errors.api && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg mb-3 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errors.api}</span>
                  </div>
                )}

                {/* REGISTRATION FORM */}
                  <form onSubmit={handleRegisterSubmit} className="space-y-2">
                    
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
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-1.5 rounded-md border focus:outline-none focus:ring-2 transition ${
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
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-1.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                            errors.mailId
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                      </div>
                      {errors.mailId && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.mailId}</p>}
                    </div>

                  {/* Registration Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        College Register Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          name="regNo"
                          value={regData.regNo}
                          onChange={handleRegChange}
                          placeholder="Enter Register Number"
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-1.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                            errors.regNo
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                          }`}
                        />
                      </div>
                      {errors.regNo && <p className="text-red-600 text-[11px] mt-1 font-medium">{errors.regNo}</p>}
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
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-1.5 rounded-md border focus:outline-none focus:ring-2 transition ${
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
                          className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-1.5 rounded-md border focus:outline-none focus:ring-2 transition ${
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
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
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
        )}

      </main>

    </div>
  );
};

export default Login;
