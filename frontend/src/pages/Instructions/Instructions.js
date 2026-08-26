import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ShieldCheck, FileText, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { fetchQuestions } from "../../services/api";

const Instructions = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [duration, setDuration] = useState(() => parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10));
  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

  const [sectionsSummary, setSectionsSummary] = useState([]);

  useEffect(() => {
    const loadTestDuration = async () => {
      try {
        const linkId = localStorage.getItem("linkId");
        const response = await fetchQuestions(linkId);
        const testDuration = response.data.totalDurationMinutes || 60;
        setDuration(testDuration);

        // Pre-cache test details to avoid loading states in the test dashboard
        const fetchedQuestions = response.data.questions || [];
        localStorage.setItem("questions", JSON.stringify(fetchedQuestions));
        if (response.data.sections) {
          localStorage.setItem("sections", JSON.stringify(response.data.sections));
        }
        localStorage.setItem("testId", response.data.testId);
        localStorage.setItem("totalDurationMinutes", testDuration.toString());

        // Build section summary list
        const secMap = {};
        fetchedQuestions.forEach(q => {
          const sId = q.sectionId || "default";
          if (!secMap[sId]) {
            secMap[sId] = {
              name: q.sectionName || "Section",
              count: 0,
              type: q.questionType || "MCQ"
            };
          }
          secMap[sId].count += 1;
        });
        setSectionsSummary(Object.values(secMap));
      } catch (err) {
        console.error("Failed to load test metadata:", err);
      }
    };
    loadTestDuration();
  }, []);

  const handleStartTest = () => {
    if (!accepted) return;
    navigate("/test");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar candidate={candidate} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl 2xl:max-w-none mx-auto px-4 sm:px-6 lg:px-10 2xl:px-16 py-6 pt-[73px] pb-[89px]">
        
        {/* Banner Card */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Assessment Guidelines</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {localStorage.getItem("testTitle") ? `${localStorage.getItem("testTitle")} - Examination Instructions` : "IDP Hire360 Examination Instructions"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Read the following rules and instructions carefully before starting your test session.
              </p>
            </div>

            <div className="px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 text-right shrink-0">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Time</span>
              <span className="text-base font-bold text-blue-700">{duration} Minutes</span>
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 2xl:gap-10 mt-6">
            
            {/* General Instructions */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Test Format</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    The test contains {sectionsSummary.length > 0 ? `${sectionsSummary.length} section(s)` : "multiple sections"}:{" "}
                    {sectionsSummary.length > 0 ? (
                      sectionsSummary.map((s, idx) => (
                        <span key={idx}>
                          <strong>{s.name}</strong> ({s.count} {s.type} question{s.count !== 1 ? "s" : ""})
                          {idx < sectionsSummary.length - 1 ? ", " : "."}
                        </span>
                      ))
                    ) : (
                      "MCQs, Coding, and Descriptive questions."
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>For MCQs select your choice, for Coding use the Python IDE, and for Descriptive write in the auto-saved Descriptive Text Editor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Use <strong>Previous</strong>, <strong>Next</strong>, or the <strong>Question Palette</strong> to navigate.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>You can review and modify your answers anytime before final submission.</span>
                </li>
              </ul>
            </div>

            {/* Proctoring Rules */}
            <div className="bg-amber-50/60 p-4 rounded-lg border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Proctoring & System Rules</span>
              </div>
              <ul className="space-y-2 text-xs text-amber-900">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>The test must be taken in <strong>Fullscreen Mode</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span><strong>Do not switch tabs or windows.</strong> Tab switches trigger warnings & 5s lockout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>Copying, pasting, right-clicking, and shortcut keys are strictly blocked.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5"></span>
                  <span>Only 10 warnings are allowed. Exceeding the 10 warning limit leads to automatic termination of the exam.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Acceptance Checkbox */}
          {/* <div className="mt-4 pt-4 border-t border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-semibold">
                I have read and agree to all rules, proctoring policies, and system guidelines for IDP Hire360.
              </span>
            </label>
          </div> */}

          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-start gap-3 select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />

              <span className="text-xs text-slate-700 font-semibold">
                I have read and agree to all assessment rules, proctoring policies, and
                system guidelines for IDP Hire360.
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <button
              onClick={handleStartTest}
              disabled={!accepted}
              className={`w-full py-2.5 px-6 rounded-lg font-semibold text-sm shadow-xs transition duration-150 flex items-center justify-center gap-2 ${
                accepted
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              }`}
            >
              <span>Begin Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Instructions;
