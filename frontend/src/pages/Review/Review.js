import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitAnswers, submitProctoringReport } from "../../services/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
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

  const mcqQuestions = questions.filter(q => q.questionType === "MCQ");
  const codingQuestions = questions.filter(q => q.questionType === "CODING");
  const descriptiveQuestions = questions.filter(q => q.questionType === "DESCRIPTIVE");
  
  const mcqAnsweredCount = mcqQuestions.filter(q => !!answers[q.questionId]).length;
  const mcqUnansweredCount = mcqQuestions.length - mcqAnsweredCount;
  
  const codingAnsweredCount = codingQuestions.filter(q => !!answers[q.questionId]).length;
  const codingUnansweredCount = codingQuestions.length - codingAnsweredCount;

  const descriptiveAnsweredCount = descriptiveQuestions.filter(q => !!answers[q.questionId]).length;
  const descriptiveUnansweredCount = descriptiveQuestions.length - descriptiveAnsweredCount;

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
            sectionName: q.questionType === "DESCRIPTIVE" ? "DESCRIPTIVE" : (q.questionType === "CODING" ? "CODING" : "MCQ"),
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
      localStorage.removeItem("answers");
      localStorage.removeItem("questions");
      localStorage.removeItem("currentIndex");
      localStorage.removeItem("proctoringStartedTime");
      localStorage.removeItem("proctoringWarningCount");
      localStorage.removeItem("proctoringStatus");
      localStorage.removeItem("totalDurationMinutes");
      localStorage.removeItem("lastPing");

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

      {/* Main Container - Compact Zero Scroll Layout */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-2 sm:p-3 my-1">
        
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold mb-1">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Final Review</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Review Your Answers
              </h1>
              <p className="text-xs text-slate-600">
                Confirm your response summary before final submission.
              </p>
            </div>
          </div>

          {/* Unified Metric Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
            
            {/* Section A Card */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Section A: Aptitude
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {mcqAnsweredCount}/{mcqQuestions.length} Done
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-slate-50 px-1 py-2 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center">
                  <p className="text-lg font-extrabold text-blue-700">{mcqQuestions.length}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Total</p>
                </div>
                <div className="bg-emerald-50 px-1 py-2 rounded-lg border border-emerald-200 text-center flex flex-col items-center justify-center">
                  <p className="text-lg font-extrabold text-emerald-700">{mcqAnsweredCount}</p>
                  <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-tight mt-0.5">Answered</p>
                </div>
                <div className="bg-amber-50 px-1 py-2 rounded-lg border border-amber-200 text-center flex flex-col items-center justify-center min-w-0 overflow-hidden">
                  <p className="text-lg font-extrabold text-amber-700">{mcqUnansweredCount}</p>
                  <p className="text-[9px] text-amber-800 font-bold uppercase tracking-tight mt-0.5 truncate w-full" title="Unanswered">Unanswered</p>
                </div>
              </div>
            </div>

            {/* Section B Card */}
            {codingQuestions.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    Section B: Coding
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {codingAnsweredCount}/{codingQuestions.length} Done
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 px-1 py-2 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center">
                    <p className="text-lg font-extrabold text-blue-700">{codingQuestions.length}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Total</p>
                  </div>
                  <div className="bg-emerald-50 px-1 py-2 rounded-lg border border-emerald-200 text-center flex flex-col items-center justify-center">
                    <p className="text-lg font-extrabold text-emerald-700">{codingAnsweredCount}</p>
                    <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-tight mt-0.5">Answered</p>
                  </div>
                  <div className="bg-amber-50 px-1 py-2 rounded-lg border border-amber-200 text-center flex flex-col items-center justify-center min-w-0 overflow-hidden">
                    <p className="text-lg font-extrabold text-amber-700">{codingUnansweredCount}</p>
                    <p className="text-[9px] text-amber-800 font-bold uppercase tracking-tight mt-0.5 truncate w-full" title="Unanswered">Unanswered</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section C Card */}
            {descriptiveQuestions.length > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Section C: Descriptive
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {descriptiveAnsweredCount}/{descriptiveQuestions.length} Done
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 px-1 py-2 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center">
                    <p className="text-lg font-extrabold text-blue-700">{descriptiveQuestions.length}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Total</p>
                  </div>
                  <div className="bg-emerald-50 px-1 py-2 rounded-lg border border-emerald-200 text-center flex flex-col items-center justify-center">
                    <p className="text-lg font-extrabold text-emerald-700">{descriptiveAnsweredCount}</p>
                    <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-tight mt-0.5">Answered</p>
                  </div>
                  <div className="bg-amber-50 px-1 py-2 rounded-lg border border-amber-200 text-center flex flex-col items-center justify-center min-w-0 overflow-hidden">
                    <p className="text-lg font-extrabold text-amber-700">{descriptiveUnansweredCount}</p>
                    <p className="text-[9px] text-amber-800 font-bold uppercase tracking-tight mt-0.5 truncate w-full" title="Unanswered">Unanswered</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warning Banner */}
          {unansweredCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You have <strong>{unansweredCount} unanswered question(s)</strong>. You can return to the test to answer them.
              </span>
            </div>
          )}

          {/* API Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Responses Breakdown List */}
          <div className="space-y-4 mb-4 max-h-[180px] overflow-y-auto pr-2">

            
            {/* Section A: Aptitude */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">Section A: Aptitude</h3>
              <div className="space-y-2">
                {questions.filter(q => q.questionType === "MCQ").map((q, idx) => {
                  const isAnswered = !!answers[q.questionId];
                  return (
                    <div
                      key={q.questionId}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-medium truncate max-w-[280px] sm:max-w-md">
                          {q.question || q.text}
                        </span>
                      </div>

                      {isAnswered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Option {answers[q.questionId]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                          <HelpCircle className="w-3 h-3 text-amber-600" />
                          Unanswered
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Coding */}
            {codingQuestions.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">Section B: Coding Round</h3>
                <div className="space-y-2">
                  {codingQuestions.map((q, idx) => {
                    const isAnswered = !!answers[q.questionId];
                    return (
                      <div
                        key={q.questionId}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 font-medium truncate max-w-[280px] sm:max-w-md">
                            {q.question || q.text}
                          </span>
                        </div>

                        {isAnswered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            Code Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            Unanswered
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section C: Descriptive */}
            {descriptiveQuestions.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">Section C: Descriptive Round</h3>
                <div className="space-y-2">
                  {descriptiveQuestions.map((q, idx) => {
                    const isAnswered = !!answers[q.questionId];
                    const charLen = (answers[q.questionId] || "").length;
                    return (
                      <div
                        key={q.questionId}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 font-medium truncate max-w-[280px] sm:max-w-md">
                            {q.question || q.text}
                          </span>
                        </div>

                        {isAnswered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            Text Saved ({charLen} Chars)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            Unanswered
                          </span>

                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => navigate("/test")}
              className="flex-1 py-2.5 px-5 rounded-lg font-semibold text-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Exam</span>
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={loading}
              className="flex-1 py-2.5 px-5 rounded-lg font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Review;
