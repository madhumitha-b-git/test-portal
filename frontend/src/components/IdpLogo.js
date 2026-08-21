import React, { useState } from "react";
import logoImg from "../assets/idp-logo-leaves.png";

const IdpLogo = ({ className = "h-9", showTagline = true }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center gap-2 select-none drop-shadow-md ${className}`}>
      {!imgError ? (
        <img
          src={logoImg}
          alt="IDP Education Logo"
          onError={() => setImgError(true)}
          className="h-9 w-auto object-contain"
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
          <span className="font-black tracking-tight text-2xl text-slate-900">
            idp
          </span>
          <span className="font-bold tracking-tight text-2xl text-blue-600">
            Hire
          </span>
          <span className="bg-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded shadow-sm ml-0.5 transform -translate-y-[1px]">
            360
          </span>
        </div>
      </div>
    </div>
  );
};

export default IdpLogo;
