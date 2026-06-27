import React, { useState, useRef } from "react";
import { 
  Briefcase, 
  ChevronRight, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  Loader2, 
  RotateCcw, 
  CheckCircle2, 
  Download,
  AlertCircle 
} from "lucide-react";
import { EduDocument, InterviewQuestion, MockInterviewSession } from "../types";

interface InterviewTabProps {
  document: EduDocument | null;
  userId: string;
  onSaveInterview: (session: MockInterviewSession) => Promise<void>;
  language: string;
}

const LANG_VOICE_MAP: Record<string, string> = {
  English: "en-US",
  Tamil: "ta-IN",
  Hindi: "hi-IN",
  Malayalam: "ml-IN",
  Telugu: "te-IN"
};

export default function InterviewTab({ document, userId, onSaveInterview, language }: InterviewTabProps) {
  const [mode, setMode] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [type, setType] = useState<"technical" | "hr" | "viva">("technical");
  
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswerInput, setUserAnswerInput] = useState("");
  const [responsesLog, setResponsesLog] = useState<Array<{ question: string; answer: string; score: number; feedback: string }>>([]);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Loading/Results States
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [finalReport, setFinalReport] = useState<any | null>(null);

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.02] border border-transparent dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <Briefcase className="w-8 h-8 font-light" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
          No Document Selected
        </h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Please select or upload a document on your primary Dashboard first to trigger a Mock Interview.
        </p>
      </div>
    );
  }

  // Filter pool
  const filteredPool = document.interviewQuestions.filter(
    (q) => q.mode === mode && q.type === type
  );

  // Fallback to any if pool is empty
  const activeQuestions = filteredPool.length > 0 
    ? filteredPool.slice(0, 5) 
    : document.interviewQuestions.slice(0, 5);

  const activeQuestion = activeQuestions[currentQuestionIndex];

  const handleStartInterview = () => {
    if (activeQuestions.length === 0) {
      alert("No questions found for this configuration. Try a different combination.");
      return;
    }
    setResponsesLog([]);
    setCurrentQuestionIndex(0);
    setUserAnswerInput("");
    setFinalReport(null);
    setInterviewStarted(true);

    // Read the first question aloud automatically!
    setTimeout(() => {
      speakQuestion(activeQuestions[0].question);
    }, 400);
  };

  // 1. Text to Speech
  const speakQuestion = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_VOICE_MAP[language] || "en-US";
    utter.onstart = () => setIsInterviewerSpeaking(true);
    utter.onend = () => setIsInterviewerSpeaking(false);
    utter.onerror = () => setIsInterviewerSpeaking(false);
    synth.speak(utter);
  };

  // 2. Speech to Text
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = LANG_VOICE_MAP[language] || "en-US";
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setUserAnswerInput(prev => prev ? prev + " " + text : text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  // 3. Submit question answer
  const handleSubmitAnswer = async () => {
    if (!userAnswerInput.trim()) {
      alert("Please enter or record an answer before continuing.");
      return;
    }

    setSubmittingAnswer(true);
    try {
      const response = await fetch("/api/gemini/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: activeQuestion.question,
          userAnswer: userAnswerInput,
          targetCriteria: activeQuestion.targetCriteria,
          type: "interview",
          language: language
        })
      });

      const evalData = await response.json();
      if (evalData.error) throw new Error(evalData.error);

      const responseRecord = {
        question: activeQuestion.question,
        answer: userAnswerInput,
        score: evalData.score || 80,
        feedback: evalData.feedback || "Good response"
      };

      const updatedLogs = [...responsesLog, responseRecord];
      setResponsesLog(updatedLogs);
      setUserAnswerInput("");

      // Proceed to next question or complete interview
      if (currentQuestionIndex + 1 < activeQuestions.length) {
        const nextIdx = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIdx);
        setSubmittingAnswer(false);
        // Prompt next question speak aloud
        setTimeout(() => {
          speakQuestion(activeQuestions[nextIdx].question);
        }, 500);
      } else {
        // Complete Interview
        const totalScore = Math.round(updatedLogs.reduce((sum, item) => sum + item.score, 0) / updatedLogs.length);
        
        const feedbackSummarizer = updatedLogs.map(
          (log, i) => `Q${i+1}: "${log.question}"\nYour Answer: "${log.answer}"\nAI Feedback Score: ${log.score}%\nFeedback: ${log.feedback}`
        ).join("\n\n");

        const finalReportCard = {
          score: totalScore,
          strengths: totalScore > 80 
            ? ["Strong professional vocabulary", "Deep grasp of subject matter rules"] 
            : ["Clear attempt at structuring answers"],
          weaknesses: totalScore < 75 
            ? ["Technical precision could be improved", "Length and structuring of HR answers was slightly short"] 
            : ["Minor adjustments in terminology"],
          suggestions: ["Revise definitions using Keywords Glossary", "Practice mock chat answering to speed up response timing"],
          feedback: feedbackSummarizer
        };

        setFinalReport(finalReportCard);

        const interviewSession: MockInterviewSession = {
          id: "interview-" + Math.random().toString(36).substr(2, 9),
          userId: userId,
          documentId: document.id,
          documentName: document.name,
          score: totalScore,
          mode: mode,
          type: type,
          responses: updatedLogs,
          feedback: finalReportCard.feedback,
          createdAt: new Date().toISOString()
        };

        await onSaveInterview(interviewSession);
        setInterviewStarted(false);
        setSubmittingAnswer(false);
      }
    } catch (err: any) {
      console.error(err);
      alert("Evaluation failed. Please try again.");
      setSubmittingAnswer(false);
    }
  };

  const handleExportInterview = () => {
    if (!finalReport) return;
    const content = `
=========================================
AI MOCK INTERVIEW LOGS & TRANSCRIPT
=========================================
DOC-MIND AI Intelligent Assessment Suite

Interviewer: DOC-MIND AI Grounded Recruiter
Candidate User ID: ${userId}
Interview Mode: ${mode.toUpperCase()}
Interview Type: ${type.toUpperCase()}
Document Base: ${document.name}
Interview Date: ${new Date().toLocaleDateString()}

FINAL RECRUITER SCORE: ${finalReport.score} / 100

STRENGTHS DETECTED:
${finalReport.strengths.map((s: string) => `• ${s}`).join("\n")}

AREAS FOR TECHNICAL IMPROVEMENT:
${finalReport.weaknesses.map((w: string) => `• ${w}`).join("\n")}

PREPARATION ADVICE:
${finalReport.suggestions.map((su: string) => `• ${su}`).join("\n")}

-----------------------------------------
QUESTION BY QUESTION ASSESSMENT:
-----------------------------------------
${finalReport.feedback}

=========================================
Keep practicing to master your next interview!
    `;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `Interview_Report_${document.name.split(".")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* 1. Setup Frame */}
      {!interviewStarted && !finalReport && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3.5 border-b border-slate-50 dark:border-white/10 pb-4">
            <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-400 font-mono tracking-wider">
                Recruiter Sandbox
              </p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Grounded Mock Recruiter Setup
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mode Select */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                INTERVIEW MODE / LEVEL
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setMode(lvl)}
                    className={`py-2.5 rounded-lg border text-xs font-bold uppercase transition ${
                      mode === lvl
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 dark:text-cyan-400 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Select */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                INTERVIEW STYLE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["technical", "hr", "viva"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setType(style)}
                    className={`py-2.5 rounded-lg border text-xs font-bold uppercase transition ${
                      type === style
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 dark:text-cyan-400 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.01] rounded-xl p-4 border border-slate-100 dark:border-white/10 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-700 dark:text-slate-300">Grounded Interview Rules:</span>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>AI recruiter selects up to 5 comprehensive questions based *only* on file content.</li>
                <li>Accepts standard text answers or voice input (using browser voice-to-text algorithms).</li>
                <li>AI evaluations happen instantly after each question, offering feedback and scores.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleStartInterview}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 rounded-xl font-semibold shadow-md shadow-cyan-500/10 transition flex items-center justify-center space-x-2"
          >
            <span>Start Mock Interview</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Active Interview Box */}
      {interviewStarted && activeQuestion && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">
                Mock Interview Session
              </p>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Question {currentQuestionIndex + 1} of {activeQuestions.length}
              </h3>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono font-semibold">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Question-by-Question Evaluation</span>
            </div>
          </div>

          {/* Recruiter Question Speech and Display */}
          <div className="p-5 bg-slate-950/40 rounded-xl border border-white/10 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest uppercase">
                  RECRUITER QUESTION
                </span>
              </div>
              <button
                onClick={() => speakQuestion(activeQuestion.question)}
                className="p-1.5 bg-white/[0.05] hover:bg-white/10 border border-white/5 rounded-lg text-slate-300 transition flex items-center space-x-1 cursor-pointer"
                title="Speak question aloud"
              >
                {isInterviewerSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-sm font-semibold leading-relaxed">
              {activeQuestion.question}
            </p>
          </div>

          {/* User Answer Area */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
              YOUR RESPONSE
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={userAnswerInput}
                onChange={(e) => setUserAnswerInput(e.target.value)}
                placeholder={isListening ? "Listening aloud... speak clearly..." : "Type your professional answer explanation..."}
                className="w-full bg-slate-50 dark:bg-white/[0.02] text-xs rounded-xl border border-slate-200 dark:border-white/10 p-4 pr-12 focus:outline-none focus:border-cyan-400 dark:text-slate-100"
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3.5 bottom-4 p-2.5 rounded-lg flex items-center justify-center shadow-sm transition cursor-pointer ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-500"
                }`}
                title={isListening ? "Stop listening" : "Record answer by voice"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              onClick={() => setInterviewStarted(false)}
              className="px-5 py-2.5 bg-slate-100 dark:bg-white/[0.02] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-transparent dark:border-white/5 rounded-xl text-xs font-semibold transition"
            >
              Quit Interview
            </button>
            <button
              onClick={handleSubmitAnswer}
              disabled={submittingAnswer || !userAnswerInput.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 transition flex items-center space-x-2"
            >
              {submittingAnswer ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Evaluating answer...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ChevronRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Final Evaluation Report Card */}
      {finalReport && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/10 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">
                {finalReport.score}%
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-wider font-bold text-cyan-400 uppercase">
                  INTERVIEW COMPLETE
                </p>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  AI Recruiter Assessment Transcript
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportInterview}
                className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
              <button
                onClick={() => setFinalReport(null)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center space-x-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Session</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
                STRENGTHS DETECTED
              </h4>
              <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {finalReport.strengths.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-rose-500 dark:text-rose-400 font-mono tracking-wider uppercase">
                WEAKNESS CONSTRAINTS
              </h4>
              <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {finalReport.weaknesses.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
              INTERVIEW CLINIC PREPARATION ADVICE
            </h4>
            <ul className="list-disc ml-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {finalReport.suggestions.map((su: string, i: number) => (
                <li key={i}>{su}</li>
              ))}
            </ul>
          </div>

          {/* Answer Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase">
              RECRUITMENT LOG TRANSCRIPT
            </h4>
            <div className="bg-slate-50 dark:bg-white/[0.01] p-4 rounded-xl border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {finalReport.feedback}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
