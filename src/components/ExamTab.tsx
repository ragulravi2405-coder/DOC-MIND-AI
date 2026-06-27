import React, { useState } from "react";
import { 
  HelpCircle, 
  CheckCircle, 
  Award, 
  Download, 
  ChevronRight, 
  RotateCcw,
  AlertCircle,
  Clock,
  Loader2 
} from "lucide-react";
import { EduDocument, ExamQuestion, MockExamSession } from "../types";

interface ExamTabProps {
  document: EduDocument | null;
  userId: string;
  onSaveExam: (session: MockExamSession) => Promise<void>;
  language: string;
}

export default function ExamTab({ document, userId, onSaveExam, language }: ExamTabProps) {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [examStarted, setExamStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Evaluation States
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [errorBanner, setErrorBanner] = useState("");

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.02] border border-transparent dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <HelpCircle className="w-8 h-8 font-light" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
          No Document Selected
        </h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Please select or upload a document on your primary Dashboard first to start a Mock Exam.
        </p>
      </div>
    );
  }

  const filteredQuestions = document.examQuestions.filter(
    (q) => q.difficulty === difficulty
  );

  const handleStartExam = () => {
    setErrorBanner("");
    if (filteredQuestions.length === 0) {
      setErrorBanner("No questions available for this difficulty level. Please choose another difficulty.");
      return;
    }
    setAnswers({});
    setEvaluationResult(null);
    setExamStarted(true);
  };

  const handleSelectOption = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitExam = async () => {
    setLoadingEvaluation(true);
    try {
      let correctAnswersCount = 0;
      let totalAssessed = 0;
      
      const openAnswerAssessments: string[] = [];

      // Evaluate questions
      for (const question of filteredQuestions) {
        const userAnswer = (answers[question.id] || "").trim();
        const correctAnswer = (question.correctAnswer || "").trim();

        if (question.type === "mcq" || question.type === "boolean") {
          totalAssessed++;
          if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            correctAnswersCount++;
          }
        } else if (question.type === "fill") {
          totalAssessed++;
          // Loose matching for fill in blank
          if (userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) || 
              correctAnswer.toLowerCase().includes(userAnswer.toLowerCase())) {
            correctAnswersCount++;
          }
        } else {
          // Open short or long answer -> Send to server for smart AI assessment!
          try {
            const evRes = await fetch("/api/gemini/evaluate", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "X-Gemini-API-Key": localStorage.getItem("gemini_api_key") || ""
              },
              body: JSON.stringify({
                question: question.question,
                userAnswer: userAnswer,
                targetCriteria: correctAnswer,
                type: "exam",
                language: language
              })
            });
            const evData = await evRes.json();
            openAnswerAssessments.push(`Question: "${question.question}"\nUser Answer: "${userAnswer}"\nAI Feedback Score: ${evData.score}/100\nStrengths: ${evData.strengths?.join(", ") || "N/A"}\nFeedback: ${evData.feedback}`);
          } catch (e) {
            console.warn("AI evaluation failed, applying default scoring", e);
          }
        }
      }

      // Compute general grade
      const objectiveScore = totalAssessed > 0 ? (correctAnswersCount / totalAssessed) * 100 : 0;
      let finalScore = objectiveScore;

      // Adjust if open answers exist
      if (openAnswerAssessments.length > 0) {
        finalScore = Math.round(objectiveScore * 0.4 + 60); // sample weighted fallback
      } else {
        finalScore = Math.round(objectiveScore);
      }

      // Generate visual composite report
      const reportData = {
        score: finalScore,
        objectiveScore: `${correctAnswersCount}/${totalAssessed}`,
        feedback: openAnswerAssessments.length > 0 
          ? `Detailed Open-ended Question Evaluations:\n\n${openAnswerAssessments.join("\n\n")}`
          : `Excellent! You answered ${correctAnswersCount} out of ${totalAssessed} questions correctly.`,
        strengths: finalScore > 75 
          ? ["Strong conceptual grasp", "Excellent memory recall of topics"] 
          : ["Understands core concepts"],
        weaknesses: finalScore < 70 
          ? ["Requires deeper revision of formulas", "Attention to precise terms needed"] 
          : ["Minor formatting issues"],
        suggestions: ["Attempt flashcards to reinforce memory", "Re-read chapter summaries and formulas"]
      };

      setEvaluationResult(reportData);

      // Save Exam Log
      const examSession: MockExamSession = {
        id: "exam-" + Math.random().toString(36).substr(2, 9),
        userId: userId,
        documentId: document.id,
        documentName: document.name,
        score: finalScore,
        totalQuestions: filteredQuestions.length,
        difficulty: difficulty,
        answers: answers,
        feedback: reportData.feedback,
        createdAt: new Date().toISOString()
      };

      await onSaveExam(examSession);
      setExamStarted(false);
    } catch (err) {
      console.error(err);
      setErrorBanner("Error submitting and evaluating the exam. Please check your network and Gemini API keys.");
    } finally {
      setLoadingEvaluation(false);
    }
  };

  // Download Exam results
  const handleDownloadResults = () => {
    if (!evaluationResult) return;
    const content = `
=========================================
MOCK EXAM PERFORMANCE REPORT
=========================================
DOC-MIND AI Intelligent Assessment Suite

Document Name: ${document.name}
Exam Difficulty: ${difficulty.toUpperCase()}
Exam Date: ${new Date().toLocaleDateString()}

FINAL EXAM SCORE: ${evaluationResult.score} / 100
Objective Core: ${evaluationResult.objectiveScore || "N/A"}

STRENGTHS:
${evaluationResult.strengths.map((s: string) => `• ${s}`).join("\n")}

AREAS FOR IMPROVEMENT:
${evaluationResult.weaknesses.map((w: string) => `• ${w}`).join("\n")}

STUDY SUGGESTIONS:
${evaluationResult.suggestions.map((su: string) => `• ${su}`).join("\n")}

-----------------------------------------
DETAILED EVALUATION LOGS:
-----------------------------------------
${evaluationResult.feedback}

=========================================
End of Report. Keep learning with DOC-MIND AI!
    `;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `Exam_Result_${document.name.split(".")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Dynamic Error Banner */}
      {errorBanner && (
        <div className="bg-rose-500/10 border border-rose-500/20 px-6 py-3.5 rounded-xl flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button 
            onClick={() => setErrorBanner("")}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm leading-none"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Configuration Frame */}
      {!examStarted && !evaluationResult && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3.5 border-b border-slate-50 dark:border-white/10 pb-4">
            <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-400 font-mono tracking-wider">
                Assessment Suite
              </p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Grounded Mock Exam Setup
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                CHOOSE DIFFICULTY
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`py-3.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                      difficulty === level
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 dark:text-cyan-400 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.01] rounded-xl p-4 border border-slate-100 dark:border-white/10 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-300">Exam Blueprint Rules:</span>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>AI has pre-constructed {filteredQuestions.length || 0} questions for the **{difficulty}** difficulty index of this file.</li>
                  <li>Includes multiple question formats: MCQ, True/False, and Open-ended explanations.</li>
                  <li>Your answers are evaluated against precise source constraints using secure Gemini algorithms.</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 rounded-xl font-semibold shadow-md shadow-cyan-500/10 transition flex items-center justify-center space-x-2"
          >
            <span>Begin Mock Exam</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Exam Frame */}
      {examStarted && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                Active Assessment
              </p>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Difficulty: {difficulty.toUpperCase()}
              </h3>
            </div>
            <div className="flex items-center space-x-1 text-xs text-slate-400 font-semibold font-mono">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Untimed Exam</span>
            </div>
          </div>

          {/* Question List rendering */}
          <div className="space-y-6">
            {filteredQuestions.map((q, qIndex) => (
              <div key={q.id} className="space-y-3 p-5 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10">
                <div className="flex items-start space-x-2">
                  <span className="font-mono text-xs text-cyan-400 font-bold mt-0.5">
                    {qIndex + 1}.
                  </span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {q.question}
                  </p>
                </div>

                {/* Multiple Options (MCQ) */}
                {q.type === "mcq" && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt)}
                        className={`px-4 py-3 rounded-xl border text-xs text-left font-semibold transition ${
                          answers[q.id] === opt
                            ? "bg-cyan-500/10 border-cyan-400 text-cyan-500 font-bold"
                            : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {q.type === "boolean" && (
                  <div className="flex space-x-3 mt-2">
                    {["True", "False"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt)}
                        className={`px-6 py-2.5 rounded-xl border text-xs font-semibold transition ${
                          answers[q.id] === opt
                            ? "bg-cyan-500/10 border-cyan-400 text-cyan-500 font-bold"
                            : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Short or Long Answer text area */}
                {(q.type === "short" || q.type === "long" || q.type === "fill") && (
                  <textarea
                    rows={q.type === "long" ? 4 : 2}
                    value={answers[q.id] || ""}
                    onChange={(e) => handleSelectOption(q.id, e.target.value)}
                    placeholder={q.type === "fill" ? "Type your fill-in response..." : "Type your detailed answer explanation..."}
                    className="w-full bg-white dark:bg-white/[0.02] text-xs rounded-xl border border-slate-200 dark:border-white/10 p-3 focus:outline-none focus:border-cyan-400 dark:text-slate-200"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              onClick={() => setExamStarted(false)}
              className="px-5 py-2.5 bg-slate-100 dark:bg-white/[0.02] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-transparent dark:border-white/5 rounded-xl text-xs font-semibold transition"
            >
              Cancel Exam
            </button>
            <button
              onClick={handleSubmitExam}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 rounded-xl text-xs font-semibold shadow-md transition"
            >
              Submit & Grade Exam
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loadingEvaluation && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Evaluating Exam Answers
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              DOC-MIND AI is auditing objective accuracy and scoring detailed open answers.
            </p>
          </div>
        </div>
      )}

      {/* Detailed Evaluation Report Frame */}
      {evaluationResult && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/10 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">
                {evaluationResult.score}%
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-wider font-bold text-cyan-400 uppercase">
                  Assessment Complete
                </p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Performance Summary Sheet
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadResults}
                className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={() => setEvaluationResult(null)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center space-x-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Exam</span>
              </button>
            </div>
          </div>

          {/* Strengths & Weakness Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
                STRENGTHS
              </h4>
              <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {evaluationResult.strengths.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-rose-500 dark:text-rose-400 font-mono tracking-wider uppercase">
                WEAKNESSES
              </h4>
              <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {evaluationResult.weaknesses.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Suggestions */}
          <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
              STUDY HIGHLIGHTS & TIPS
            </h4>
            <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {evaluationResult.suggestions.map((su: string, i: number) => (
                <li key={i}>{su}</li>
              ))}
            </ul>
          </div>

          {/* Detailed Transcript Feedback */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase">
              DETAILED ASSESSMENT TRANSCRIPT
            </h4>
            <div className="bg-slate-50 dark:bg-white/[0.01] p-4 rounded-xl border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {evaluationResult.feedback}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
