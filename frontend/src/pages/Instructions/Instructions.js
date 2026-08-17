import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ShieldCheck, FileText, Monitor, AlertTriangle, CheckCircle, ArrowRight, Lock } from "lucide-react";
import { fetchQuestions } from "../../services/api";

const Instructions = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [duration, setDuration] = useState(() => parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10));
  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

  useEffect(() => {
    // Sider AI and similar extensions often inject these elements
    const checkExtensions = () => {
      const siderElement = document.querySelector('div#sider-ai, sider-app, chatreply-app, div[id^="sider-"], grammarly-extension');
      if (siderElement) {
        setHasExtension(true);
      } else {
        setHasExtension(false);
      }
    };
    
    checkExtensions();
    const interval = setInterval(checkExtensions, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // If test is already started or in progress, auto-redirect candidate back to test portal
    const isTestStarted = localStorage.getItem("testStarted") === "true";
    const isSubmitted = localStorage.getItem("testSubmitted") === "true";

    if (isSubmitted) {
      navigate("/thankyou", { replace: true });
      return;
    }

    if (isTestStarted) {
      navigate("/test", { replace: true });
      return;
    }

    const loadTestDuration = async () => {
      try {
        const cachedDuration = localStorage.getItem("totalDurationMinutes");
        if (cachedDuration) {
          setDuration(parseInt(cachedDuration, 10));
          return;
        }

        const linkId = localStorage.getItem("linkId");
        const response = await fetchQuestions(linkId);
        const testDuration = response.data.totalDurationMinutes || 60;
        setDuration(testDuration);

        // Pre-cache test details to avoid loading states in the test dashboard
        localStorage.setItem("questions", JSON.stringify(response.data.questions));
        localStorage.setItem("testId", response.data.testId);
        localStorage.setItem("totalDurationMinutes", testDuration.toString());
      } catch (err) {
        console.error("Failed to load test metadata:", err);
      }
    };
    loadTestDuration();
  }, [navigate]);

  const handleStartTest = () => {
    if (!accepted || hasExtension) return;
    localStorage.setItem("testStarted", "true");
    navigate("/test", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar candidate={candidate} />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 my-4">
        
        {/* Banner Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm mb-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Assessment Guidelines</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {localStorage.getItem("testTitle") ? `${localStorage.getItem("testTitle")} - Examination Instructions` : "Hire360 Examination Instructions"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Read the following rules and instructions carefully before starting your test session.
              </p>
            </div>

            <div className="px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-right shrink-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Time</span>
              <span className="text-base font-bold text-blue-700">{duration} Minutes</span>
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            {/* General Instructions */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Test Format</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>The test contains 3 sections: <strong>10 MCQs</strong>, <strong>2 Coding questions</strong>, & <strong>2 Descriptive Notepad tasks</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>For MCQs select your choice, for Coding use the Python IDE, and for Descriptive write in the auto-saved Notepad.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Use <strong>Previous</strong>, <strong>Next</strong>, or the <strong>Question Palette</strong> to navigate.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>You can review and modify your answers anytime before final submission.</span>
                </li>
              </ul>
            </div>

            {/* Proctoring Rules */}
            <div className="bg-amber-50/60 p-5 rounded-lg border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Proctoring & System Rules</span>
              </div>
              <ul className="space-y-2.5 text-xs text-amber-900">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>The test must be taken in <strong>Fullscreen Mode</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span><strong>Do not switch tabs or windows.</strong> Tab switches trigger warnings & 5s lockout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>Copying, pasting, right-clicking, and shortcut keys are strictly blocked.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>Only 10 warnings are allowed. Exceeding the 10 warning limit leads to automatic termination of the exam.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* System Hardware Requirements */}
          <div className="mt-6 p-4 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">System Checklist</span>
                <span className="text-slate-600">Desktop Chrome/Edge • Stable Internet • Fullscreen Enabled</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
              <Lock className="w-3.5 h-3.5" />
              <span>Ready</span>
            </div>
          </div>

          {/* Extension Warning Banner */}
          {hasExtension && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col gap-2 text-sm text-red-800">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Browser Extension Detected!</span>
              </div>
              <p className="pl-7 text-xs">
                We have detected a browser extension (like Sider AI, Monica, Grammarly, or similar tools) active on this page. 
                You must <strong>disable the extension</strong> or use an Incognito window to start the exam. 
                Once disabled, this warning will disappear automatically.
              </p>
            </div>
          )}

          {/* Acceptance Checkbox */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-semibold">
                I have read and agree to all rules, proctoring policies, and system guidelines for Hire360.
              </span>
            </label>
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={handleStartTest}
              disabled={!accepted || hasExtension}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-sm shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                accepted && !hasExtension
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              }`}
            >
              <span>{hasExtension ? "Disable Extensions to Start" : "Begin Assessment"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Instructions;
