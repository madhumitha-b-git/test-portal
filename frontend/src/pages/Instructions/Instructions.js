import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ShieldCheck, FileText, Monitor, AlertTriangle, CheckCircle, ArrowRight, Lock } from "lucide-react";

const Instructions = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

  const handleStartTest = () => {
    if (!accepted) return;
    navigate("/test");
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
                IDP Assess 360 Examination Instructions
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Read the following rules and instructions carefully before starting your test session.
              </p>
            </div>

            <div className="px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-right shrink-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Time</span>
              <span className="text-base font-bold text-blue-700">60 Minutes</span>
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
                  <span>The test consists of <strong>10 multiple choice questions</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Each question provides 4 options. Select the best answer.</span>
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
                  <span>Exceeding warning limits will automatically terminate the test.</span>
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
                I have read and agree to all rules, proctoring policies, and system guidelines for IDP Assess 360.
              </span>
            </label>
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={handleStartTest}
              disabled={!accepted}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-sm shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                accepted
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              }`}
            >
              <span>Begin Assessment</span>
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
