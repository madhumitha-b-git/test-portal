import React from "react";
import IdpLogo from "./IdpLogo";
import { ShieldCheck, Lock } from "lucide-react";

const Navbar = ({ candidate, hideUser = false }) => {
  const testTitle = localStorage.getItem("testTitle");

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Test Title */}
        <div className="flex items-center gap-3">
          <IdpLogo />

        </div>

        {/* Status Badges & Candidate Profile */}
        <div className="flex items-center gap-3 sm:gap-6">
          


          {/* Candidate Info */}
          {!hideUser && candidate?.name && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {candidate.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                  {candidate.name}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                  {candidate.mailId || candidate.email}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

export default Navbar;
