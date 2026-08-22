import React, { useState } from "react";
import { Shield, ExternalLink, X, ShieldCheck, FileText, HelpCircle, Lock, AlertTriangle } from "lucide-react";

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'proctoring' | 'help' | null

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 w-full bg-slate-100 border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-10 2xl:px-16 text-xs text-slate-600 z-40">
        <div className="w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Copyright */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>
              © {new Date().getFullYear()} <strong className="text-slate-800 font-semibold">IDP Hire360</strong>. All rights reserved. IDP Education Platform.
            </span>
          </div>

          {/* Right: Interactive Security & Terms Buttons */}
          <div className="flex items-center gap-6 text-slate-600 font-semibold">
            <button
              onClick={() => setActiveModal("privacy")}
              className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1 focus:outline-none"
            >
              <span>Privacy Policy</span>
            </button>

            <button
              onClick={() => setActiveModal("proctoring")}
              className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1 focus:outline-none"
            >
              <span>Proctoring Rules</span>
            </button>

            <button
              onClick={() => setActiveModal("help")}
              className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1 focus:outline-none"
            >
              <span>Help & Support</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>

        </div>
      </footer>

      {/* ========================================================================= */}
      {/* PRIVACY POLICY MODAL */}
      {/* ========================================================================= */}
      {activeModal === "privacy" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
                <Lock className="w-5 h-5 text-blue-600" />
                <span>Privacy Policy & Data Protection</span>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-blue-900 font-medium">
                IDP Hire360 respects your privacy and is committed to protecting candidate personal data during automated examination sessions.
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">1. Candidate Information Collected</h4>
                <p>During test registration, we collect candidate Full Name, Register Number, Email Address, Mobile Number, and Institution name for identification purposes.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">2. Examination Monitoring & Logs</h4>
                <p>Proctoring logs include timestamped event tracking, warning count metrics, tab switch notifications, and submission receipts to ensure integrity.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">3. Data Security & Storage</h4>
                <p>All response data and candidate evaluation reports are stored with enterprise-grade encryption on AWS infrastructure.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROCTORING RULES MODAL */}
      {/* ========================================================================= */}
      {activeModal === "proctoring" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Proctoring Rules & Guidelines</span>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Strict adherence to proctoring policies is mandatory. Exceeding warning thresholds results in session termination.</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">1. Fullscreen & Tab Restriction</h4>
                <p>The examination must be taken in Fullscreen Mode. Navigating away from the exam tab triggers a proctoring warning. Maximum allowed warnings: <strong>10 Warnings</strong>.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">2. Keyboard & Clipboard Policy</h4>
                <p>Copying, pasting, cut operations, right-clicking, and system hotkeys (Alt+Tab, PrintScreen, F12) are restricted during the active exam session.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">3. Camera & Environment Guidelines</h4>
                <p>Ensure a well-lit room, stay centered in your webcam view, and ensure no secondary monitors or external assistance are present.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HELP & SUPPORT MODAL */}
      {/* ========================================================================= */}
      {activeModal === "help" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Help & Candidate Support</span>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-800">Need Immediate Exam Assistance?</h4>
                <p>If you experience technical issues during registration or instruction review, follow the troubleshooting steps below.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">1. Network Reconnection</h4>
                <p>If your internet disconnects, your current answer responses are cached locally. Re-establish connection and refresh the browser to resume your session.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">2. Recommended Browsers</h4>
                <p>For optimal stability, use Google Chrome (v100+), Microsoft Edge (v100+), or Mozilla Firefox (v100+). Enable JavaScript and allow camera permissions when prompted.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">3. Contact Exam Administrator</h4>
                <p>For Link ID validation issues or login issues, contact your campus placement coordinator or exam administrator.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer">
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
