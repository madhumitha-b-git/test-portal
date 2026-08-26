import React, { useState, useEffect } from "react";
import IdpLogo from "../../components/IdpLogo";
import { CheckCircle2, ShieldCheck, Calendar, User, Mail, Award, Lock } from "lucide-react";

const ThankYou = () => {
  const [candidate] = useState(() => JSON.parse(localStorage.getItem("candidate") || "{}"));
  const [isTerminated] = useState(() => localStorage.getItem("testTerminated") === "true");
  const [terminationReason] = useState(() => localStorage.getItem("terminationReason") || "");
  const [submissionTime] = useState(() => new Date().toLocaleString());

  const exitBrowserFullscreen = () => {
    try {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Automatically exit full-screen mode on thank you / concluded screen
    exitBrowserFullscreen();

    // Clear all localStorage after 30 seconds of landing on ThankYou page
    // Component state keeps the UI rendered; refreshing page redirects to Home (/)
    const timer = setTimeout(() => {
      try {
        localStorage.clear();
      } catch (e) {}
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-4 bg-white border-b border-slate-200 shadow-xs z-40">
        <div className="w-full mx-auto flex justify-between items-center">
          <IdpLogo />
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Session Closed</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-lg sm:max-w-xl mx-auto px-4 sm:px-6 flex items-center justify-center my-4 pt-20 pb-24">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center w-full">
          
          {/* Hero Icon */}
          {!isTerminated ? (
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-red-600" />
            </div>
          )}

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            {!isTerminated ? "Assessment Submitted Successfully!" : "Session Concluded"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mb-5 max-w-md mx-auto">
            {!isTerminated
              ? "Thank you for completing your assessment on Hire360. Your answers have been safely recorded."
              : terminationReason || "Your assessment session has been submitted."}
          </p>

          {/* Receipt Card */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left space-y-2 mb-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Submission Summary</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                <Award className="w-3 h-3 text-emerald-600" />
                IDP Verified
              </span>
            </div>

            {candidate.name && (
              <div className="flex items-center gap-3 text-xs">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Candidate:</span>
                <span className="text-slate-900 font-bold ml-auto">{candidate.name}</span>
              </div>
            )}

            {(candidate.mailId || candidate.email) && (
              <div className="flex items-center gap-3 text-xs">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-900 font-medium ml-auto truncate max-w-[200px]">
                  {candidate.mailId || candidate.email}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Timestamp:</span>
              <span className="text-slate-800 font-mono text-[11px] ml-auto">{submissionTime}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>You may now close this browser tab.</span>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};

export default ThankYou;
