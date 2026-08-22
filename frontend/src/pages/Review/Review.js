import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitAnswers, submitProctoringReport } from "../../services/api";
import Navbar from "../../components/Navbar";
import { FileCheck, AlertTriangle, ArrowLeft, CheckCircle2, HelpCircle, Send } from "lucide-react";

const Review = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const candidate = JSON.parse(localStorage.getItem("candidate") || "{}");

  useEffect(() => {
    if (localStorage.getItem("testSubmitted") === "true") {
      navigate("/thankyou", { replace: true });
      return;
    }

    // Load questions and answers from localStorage
    const savedQuestions = JSON.parse(localStorage.getItem("questions") || "[]");
    const savedAnswers = JSON.parse(localStorage.getItem("answers") || "{}");
    setQuestions(savedQuestions);
    setAnswers(savedAnswers);
  }, [navigate]);

  // ── Ping timer to detect tab closure ──
  useEffect(() => {
    const pingInterval = setInterval(() => {
      localStorage.setItem("lastPing", Date.now().toString());
    }, 1000);
    return () => clearInterval(pingInterval);
  }, []);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const sectionsList = React.useMemo(() => {
    const list = [];
    const map = new Map();
    questions.forEach((q) => {
      const sId = q.sectionId || "default";
      if (!map.has(sId)) {
        const sec = {
          sectionId: sId,
          sectionName: q.sectionName || `Section ${list.length + 1}`,
          questions: [],
        };
        map.set(sId, sec);
        list.push(sec);
      }
      map.get(sId).questions.push(q);
    });
    return list;
  }, [questions]);

  // Handle final submit
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const sectionsMap = {};
      
      questions.forEach((q) => {
        const sId = q.sectionId || "default";
        if (!sectionsMap[sId]) {
          sectionsMap[sId] = {
            sectionId: sId,
            sectionName: q.sectionName || (q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ")),
            responses: []
          };
        }
        
        const respObj = { questionId: q.questionId };
        if (q.questionType === "CODING" || q.questionType === "DESCRIPTIVE") {
          respObj.typedAnswer = answers[q.questionId] || "";
        } else {
          respObj.selectedOption = answers[q.questionId] || "";
        }
        sectionsMap[sId].responses.push(respObj);
      });

      const sections = Object.values(sectionsMap);

      // Call POST /submit API
      const testId = localStorage.getItem("testId");
      const mailId = candidate.mailId || candidate.email;
      await submitAnswers({
        name: candidate.name,
        mailId: mailId,
        testId: testId,
        durationMinutes: parseInt(localStorage.getItem("totalDurationMinutes") || "60", 10),
        submittedAt: new Date().toISOString(),
        sections: sections,
      });

      // Submit proctoring report with SUCCESS status
      const startedTime = localStorage.getItem("proctoringStartedTime") || "";
      const endedTime = new Date().toISOString();
      const warningCount = parseInt(localStorage.getItem("proctoringWarningCount") || "0", 10);

      submitProctoringReport({
        mailId: mailId,
        startedTime: startedTime,
        endedTime: endedTime,
        status: "SUCCESS",
        warningCount,
      }).catch(() => {});

      // Mark as submitted for this testId
      localStorage.setItem("testSubmitted", "true");
      localStorage.setItem("submittedTestId", testId);


      // Clear all cached test session data from localStorage
      const keysToRemove = [
        "answers",
        "questions",
        "sections",
        "currentIndex",
        "testStarted",
        "proctoringStartedTime",
        "proctoringWarningCount",
        "proctoringStatus",
        "totalDurationMinutes",
        "lastPing",
      ];
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      });

      // Redirect to Thank You page
      navigate("/thankyou", { replace: true });
    } catch (err) {
      setError("Submission failed. Please check network connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar candidate={candidate} />

      {/* Main Container - Fluid Responsive Layout */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 pt-20 pb-24">
        
        <div className="bg-white p-5 sm:p-8 lg:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Final Review</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Review Your Answers
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Confirm your response summary before final submission.
              </p>
            </div>
          </div>

          {/* Section Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sectionsList.map((sec, sIdx) => {
              const secQuestions = sec.questions;
              const secAnsweredCount = secQuestions.filter(q => !!answers[q.questionId]).length;
              const secUnansweredCount = secQuestions.length - secAnsweredCount;
              const sectionLetter = String.fromCharCode(65 + sIdx);
              let displayName = sec.sectionName || `Section ${sectionLetter}`;
              if (!/^Section\s+[A-Z]:?/i.test(displayName)) {
                displayName = `Section ${sectionLetter}: ${displayName}`;
              }
              // Fix any spelling mistake coming from the backend payload
              displayName = displayName.replace(/decriptive/i, "Descriptive");

              return (
                <div key={sec.sectionId} className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 flex flex-col justify-between w-full min-w-0 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></div>
                      <span className="truncate">{displayName}</span>
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                      {secAnsweredCount}/{secQuestions.length} Done
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <p className="text-xl sm:text-2xl font-black text-blue-700">{secQuestions.length}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                      <p className="text-xl sm:text-2xl font-black text-emerald-700">{secAnsweredCount}</p>
                      <p className="text-[10px] sm:text-xs text-emerald-800 font-bold uppercase tracking-wider mt-1">Answered</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center min-w-0">
                      <p className="text-xl sm:text-2xl font-black text-amber-700">{secUnansweredCount}</p>
                      <p className="text-[10px] sm:text-xs text-amber-800 font-bold uppercase tracking-wider mt-1 truncate" title="Unanswered">Unanswered</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning Banner */}
          {unansweredCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm font-medium flex items-center gap-3 w-full shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                You have <strong>{unansweredCount} unanswered question(s)</strong>. You can return to the test to answer them.
              </span>
            </div>
          )}

          {/* API Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-center gap-3 w-full">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Breakdown List (Uncompressed, Natural Layout) */}
          <div className="space-y-6">
            {sectionsList.map((sec, sIdx) => {
              const sectionLetter = String.fromCharCode(65 + sIdx);
              let displayName = sec.sectionName || `Section ${sectionLetter}`;
              if (!/^Section\s+[A-Z]:?/i.test(displayName)) {
                displayName = `Section ${sectionLetter}: ${displayName}`;
              }
              // Fix any spelling mistake coming from the backend payload
              displayName = displayName.replace(/decriptive/i, "Descriptive");
              
              return (
                <div key={sec.sectionId} className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                    {displayName}
                  </h3>
                  <div className="space-y-3">
                    {sec.questions.map((q, idx) => {
                      const isAnswered = !!answers[q.questionId];
                      const isCoding = q.questionType === "CODING";
                      const isDescriptive = q.questionType === "DESCRIPTIVE";
                      const charLen = (answers[q.questionId] || "").length;

                      return (
                        <div
                          key={q.questionId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/90 gap-3 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-md bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm sm:text-base font-semibold text-slate-800 flex-1 break-words min-w-0 leading-relaxed">
                              {q.question || q.text}
                            </span>
                          </div>

                          {isAnswered ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100/80 text-blue-900 font-bold text-xs border border-blue-200 shrink-0 self-start sm:self-center">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                {isCoding
                                  ? "Code Submitted"
                                  : isDescriptive
                                  ? `Text Saved (${charLen} Chars)`
                                  : `Option ${answers[q.questionId]}`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/80 text-amber-900 font-bold text-xs border border-amber-200 shrink-0 self-start sm:self-center">
                              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Unanswered</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200">
            <button
              onClick={() => navigate("/test")}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Exam</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Submitting Test...</span>
              ) : (
                <>
                  <span>Final Submit</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </main>

    </div>
  );
};

export default Review;
