import React from "react";
import IdpLogo from "./IdpLogo";

const Navbar = ({ candidate, hideUser = false }) => {

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-white border-b border-slate-200 z-40 px-4 sm:px-6 lg:px-10 2xl:px-16 py-3 shadow-xs">
      <div className="w-full mx-auto flex items-center justify-between">
        
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
                <span className="text-xs font-bold text-slate-800 truncate max-w-[160px] lg:max-w-[240px]">
                  {candidate.name}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[160px] lg:max-w-[240px]">
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
