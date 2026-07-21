import React, { useState } from "react";
import logoImg from "../assets/idp-logo.png";

const IdpLogo = ({ className = "h-9", showTagline = true }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {!imgError ? (
        <img
          src={logoImg}
          alt="IDP Education Logo"
          onError={() => setImgError(true)}
          className="h-9 w-auto max-w-[160px] object-contain"
        />
      ) : (
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-blue-900 text-white font-extrabold text-lg shadow-sm border border-blue-950">
          <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      )}

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold tracking-tight text-lg text-slate-900">
            IDP
          </span>
          <span className="font-bold tracking-tight text-lg text-blue-600">
            Assess
          </span>
          <span className="bg-blue-600 text-white font-extrabold text-xs px-1.5 py-0.5 rounded shadow-sm">
            360
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500 mt-0.5">
            Enterprise Assessment Portal
          </span>
        )}
      </div>
    </div>
  );
};

export default IdpLogo;
