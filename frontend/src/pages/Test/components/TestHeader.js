import React from "react";
import IdpLogo from "../../../components/IdpLogo";
import { ShieldAlert, Clock, User } from "lucide-react";

const TestHeader = ({
  candidate,
  warningCount,
  timeLeft,
  formatTime,
  sectionsList,
  currentSection,
  setCurrentIndex,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10 2xl:px-16 pt-3.5 pb-3 shrink-0 shadow-xs">
      <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <IdpLogo showTagline={false} />
        </div>

        {/* Real-Time Metrics Header */}
        <div className="flex items-center gap-3 sm:gap-6">
          
          {/* Proctoring Warning Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              warningCount > 0
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <ShieldAlert
              className={`w-4 h-4 ${
                warningCount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            />
            <span>Warnings: {warningCount}</span>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-lg text-sm font-bold font-mono border ${
              timeLeft !== null && timeLeft < 300
                ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                : timeLeft !== null && timeLeft < 600
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
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
  );
};

export default TestHeader;
