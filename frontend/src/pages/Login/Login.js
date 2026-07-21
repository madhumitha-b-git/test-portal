import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerCandidate } from "../../services/api";
import IdpLogo from "../../components/IdpLogo";
import Footer from "../../components/Footer";
import { User, Mail, Phone, GraduationCap, ShieldCheck, ArrowRight, AlertCircle, Lock, CheckCircle2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    mailId: "",
    mobile: "",
    college: "",
  });

  // Error state
  const [errors, setErrors] = useState({});

  // Loading state
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // Validate form fields
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.mailId.trim()) {
      newErrors.mailId = "Mail ID is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.mailId)) {
      newErrors.mailId = "Enter a valid email address";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    }

    if (!formData.college.trim()) {
      newErrors.college = "College/Institution name is required";
    }

    return newErrors;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate first
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // Call POST /register API
      await registerCandidate(formData);

      // Store candidate info in localStorage for later use
      localStorage.setItem(
        "candidate",
        JSON.stringify({
          name: formData.name,
          mailId: formData.mailId,
        })
      );

      // Redirect to Instructions page
      navigate("/instructions");
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed. Please try again.";
      setErrors({ api: message });
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Candidate Registration</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Portal Overview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Official Assessment Portal</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
              Candidate Portal Access
            </h1>

            <p className="text-slate-600 text-sm leading-relaxed">
              Welcome to <strong>IDP Assess 360</strong>. Please verify your candidate details below to start your proctored assessment.
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
                  <h4 className="text-xs font-bold text-slate-900">Verified Credentials</h4>
                  <p className="text-[11px] text-slate-500">Ensure your details match your institution records.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
              
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Enter Details</h2>
                <p className="text-xs text-slate-500">Fill in the required information to initiate your exam</p>
              </div>

              {/* API Error Box */}
              {errors.api && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg mb-5 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errors.api}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Ganesh"
                      className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                        errors.name
                          ? "border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-red-600 text-xs mt-1 font-medium">{errors.name}</p>}
                </div>

                {/* Mail ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mail ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      name="mailId"
                      value={formData.mailId}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                        errors.mailId
                          ? "border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.mailId && <p className="text-red-600 text-xs mt-1 font-medium">{errors.mailId}</p>}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="10 digit mobile number"
                      className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                        errors.mobile
                          ? "border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.mobile && <p className="text-red-600 text-xs mt-1 font-medium">{errors.mobile}</p>}
                </div>

                {/* College Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    College / Institution Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      placeholder="Enter your college or institution"
                      className={`w-full bg-white text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition ${
                        errors.college
                          ? "border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.college && <p className="text-red-600 text-xs mt-1 font-medium">{errors.college}</p>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Validating Details...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Login;
