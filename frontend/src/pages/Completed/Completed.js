import React, { useEffect } from "react";
import IdpLogo from "../../components/IdpLogo";
import Footer from "../../components/Footer";
import { CheckCircle2, Lock, XCircle } from "lucide-react";

const Completed = () => {
  useEffect(() => {
    // Exit full-screen mode if active
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
  }, []);

  const handleCloseTab = () => {
    try {
      window.close();
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white select-none">
      
      {/* Top Header */}
      <header className="w-full px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <IdpLogo />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Session Concluded</span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 lg:p-8 flex items-center justify-center my-6">
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm text-center w-full">
          
          {/* Icon Badge */}
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
            <CheckCircle2 className="w-11 h-11 text-emerald-600" />
          </div>

          {/* Main Heading & Notice */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Test Completed
          </h1>
          <p className="text-sm sm:text-base font-semibold text-blue-700 mb-6 bg-blue-50/80 border border-blue-200 py-3 px-4 rounded-xl">
            You may now safely close this browser window or tab.
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-left space-y-2.5 mb-6 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs pb-2 border-b border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Assessment Status: Recorded</span>
            </div>
            <p className="text-slate-600 leading-relaxed pt-1">
              Your test responses and proctoring logs have been securely submitted to the server. No further action is required.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCloseTab}
            className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <XCircle className="w-4 h-4" />
            <span>Close Window</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Completed;
