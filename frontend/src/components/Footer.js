import React from "react";
import { Shield, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-slate-100 border-t border-slate-200 py-5 px-4 text-xs text-slate-600 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>
            © {new Date().getFullYear()} <strong className="text-slate-800 font-semibold">IDP Assess 360</strong>. All rights reserved. IDP Education Platform.
          </span>
        </div>

        {/* Right: Security & Terms */}
        <div className="flex items-center gap-6 text-slate-500 font-medium">
          <span className="hover:text-slate-900 transition cursor-pointer">
            Privacy Policy
          </span>
          <span className="hover:text-slate-900 transition cursor-pointer">
            Proctoring Rules
          </span>
          <span className="hover:text-slate-900 transition cursor-pointer flex items-center gap-1">
            Help & Support <ExternalLink className="w-3 h-3 text-slate-400" />
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
