import React from "react";
import IdpLogo from "../../components/IdpLogo";
import Footer from "../../components/Footer";
import { CheckCircle2, ShieldCheck, Calendar, User, Mail, Award, Lock } from "lucide-react";

const ThankYou = () => {
  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");
  const isTerminated = localStorage.getItem("testTerminated") === "true";
  const terminationReason = localStorage.getItem("terminationReason") || "";
  const submissionTime = new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <header className="w-full px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <IdpLogo />
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Session Closed</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex items-center justify-center my-4">
        
        <div className="bg-white p-8 sm:p-10 rounded-xl border border-slate-200 shadow-sm text-center w-full">
          
          {/* Hero Icon */}
          {!isTerminated ? (
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-9 h-9 text-red-600" />
            </div>
          )}

          {/* Heading */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {!isTerminated ? "Assessment Submitted Successfully!" : "Session Concluded"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-md mx-auto">
            {!isTerminated
              ? "Thank you for completing your assessment on IDP Assess 360. Your answers have been safely recorded."
              : terminationReason || "Your assessment session has been submitted."}
          </p>

          {/* Receipt Card */}
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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

          <p className="text-[11px] text-slate-500 font-medium">
            You may now close this browser window.
          </p>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ThankYou;
