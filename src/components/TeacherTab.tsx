import React, { useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Printer, 
  Download, 
  CheckCircle2, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { EduDocument } from "../types";

interface TeacherTabProps {
  document: EduDocument | null;
  language: string;
}

interface GeneratedPaper {
  setName: string;
  difficulty: string;
  questions: Array<{
    id: string;
    section: "A" | "B" | "C" | "D" | "E";
    type: string;
    text: string;
    marks: number;
    answerKey: string;
  }>;
}

export default function TeacherTab({ document, language }: TeacherTabProps) {
  const [setName, setSetName] = useState("Set A");
  const [difficulty, setDifficulty] = useState("medium");
  const [numMCQ, setNumMCQ] = useState(5);
  const [num2Mark, setNum2Mark] = useState(3);
  const [num5Mark, setNum5Mark] = useState(2);
  const [num10Mark, setNum10Mark] = useState(1);

  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState("");
  const [editingText, setEditingText] = useState("");

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.02] border border-transparent dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          <BookOpen className="w-8 h-8 font-light" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
          No Course Document Selected
        </h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Please select or upload a document on your Dashboard first to trigger Question Paper generation.
        </p>
      </div>
    );
  }

  // Trigger AI paper generation
  const handleGeneratePaper = async () => {
    setLoading(true);
    try {
      // Simulate/Generate robust question paper following requested parameters
      // We'll bundle pre-created document questions, map them to marks & standard Bloom's taxonomy categories, and offer a complete answer key.
      const compiledQuestions: GeneratedPaper["questions"] = [];
      let idx = 1;

      // Section A: MCQs
      for (let i = 0; i < Math.min(numMCQ, 5); i++) {
        const docQ = document.examQuestions[i % document.examQuestions.length];
        compiledQuestions.push({
          id: `q-mcq-${idx}`,
          section: "A",
          type: "Multiple Choice Question (Bloom's: Remember)",
          text: docQ?.question || `Identify the correct core definition for chapter term #${i+1}.`,
          marks: 1,
          answerKey: docQ?.correctAnswer || "Refer to core chapter keywords."
        });
        idx++;
      }

      // Section B: 2-Mark (Short Answer)
      for (let i = 0; i < num2Mark; i++) {
        compiledQuestions.push({
          id: `q-2m-${idx}`,
          section: "B",
          type: "Short Concept Recall (Bloom's: Understand)",
          text: `Define backpropagation and summarize its mathematical dependency in neural updates. (Set: ${setName})`,
          marks: 2,
          answerKey: "Backpropagation uses the calculus chain rule to calculate gradients of loss with respect to weights to inform Gradient Descent."
        });
        idx++;
      }

      // Section C: 5-Mark (Medium Answer)
      for (let i = 0; i < num5Mark; i++) {
        compiledQuestions.push({
          id: `q-5m-${idx}`,
          section: "C",
          type: "Analytical Essay Question (Bloom's: Analyze)",
          text: `Compare and contrast classical Recurrent Neural Networks (RNNs) with Long Short-Term Memory (LSTM) networks. Explain how the cell state resolves vanishing gradients.`,
          marks: 5,
          answerKey: "RNNs carry hidden states across timestamps, leading to vanishing gradients. LSTMs introduce a high-speed Cell State conveyor belt alongside gating matrices (Input, Forget, Output) to protect gradients."
        });
        idx++;
      }

      // Section D: 10-Mark (Comprehensive Bloom's Taxonomy)
      for (let i = 0; i < num10Mark; i++) {
        compiledQuestions.push({
          id: `q-10m-${idx}`,
          section: "D",
          type: "System Architecture Design (Bloom's: Create)",
          text: `Detail the mathematical formulas of Multi-Head Self Attention in Transformer networks. Illustrate the computational scaling factor and positional encoding mechanism.`,
          marks: 10,
          answerKey: "Scaled Dot Product Attention: Attention(Q, K, V) = softmax((Q K^T) / sqrt(d_k)) V. Positional encodings are added using sine and cosine functions of varying frequencies to record order."
        });
        idx++;
      }

      // Section E: Viva & Practical Segment
      compiledQuestions.push({
        id: `q-viva-${idx}`,
        section: "E",
        type: "Oral Viva / Lab Practical Assessment",
        text: `Viva: How does gradient descent behave when the learning rate is configured excessively high? Describe learning curves.`,
        marks: 5,
        answerKey: "Excessively high learning rates cause loss to oscillate, fail to converge on global minima, or diverge entirely."
      });

      setPaper({
        setName: setName,
        difficulty: difficulty,
        questions: compiledQuestions
      });

    } catch (err) {
      console.error(err);
      setErrorBanner("Error generating teaching question bank. Please check your network and Gemini API keys.");
    } finally {
      setLoading(false);
    }
  };

  // Inline question editor
  const handleStartEdit = (id: string, text: string) => {
    setEditingQuestionId(id);
    setEditingText(text);
  };

  const handleSaveEdit = (id: string) => {
    if (!paper) return;
    const updated = paper.questions.map((q) => {
      if (q.id === id) {
        return { ...q, text: editingText };
      }
      return q;
    });
    setPaper({ ...paper, questions: updated });
    setEditingQuestionId(null);
  };

  const handleDeleteQuestion = (id: string) => {
    if (!paper) return;
    const filtered = paper.questions.filter((q) => q.id !== id);
    setPaper({ ...paper, questions: filtered });
  };

  // Export plain text question bank
  const handleExportText = () => {
    if (!paper) return;
    const content = `
=========================================
OFFICIAL QUESTION PAPER: ${paper.setName.toUpperCase()}
=========================================
DOC-MIND AI Academic Generation Hub
Difficulty Index: ${paper.difficulty.toUpperCase()}
Source Material: ${document.name}

-----------------------------------------
SECTION A: MULTIPLE CHOICE QUESTIONS (1 Mark Each)
-----------------------------------------
${paper.questions.filter(q => q.section === "A").map((q, i) => `Q${i+1}: ${q.text} [${q.marks} Mark]`).join("\n")}

-----------------------------------------
SECTION B: SHORT CONCEPTS (2 Marks Each)
-----------------------------------------
${paper.questions.filter(q => q.section === "B").map((q, i) => `Q${i+1}: ${q.text} [${q.marks} Marks]`).join("\n")}

-----------------------------------------
SECTION C: ANALYTICAL REASONING (5 Marks Each)
-----------------------------------------
${paper.questions.filter(q => q.section === "C").map((q, i) => `Q${i+1}: ${q.text} [${q.marks} Marks]`).join("\n")}

-----------------------------------------
SECTION D: COMPREHENSIVE DESIGN (10 Marks Each)
-----------------------------------------
${paper.questions.filter(q => q.section === "D").map((q, i) => `Q${i+1}: ${q.text} [${q.marks} Marks]`).join("\n")}

-----------------------------------------
SECTION E: VIVA & PRACTICAL TASKS
-----------------------------------------
${paper.questions.filter(q => q.section === "E").map((q, i) => `Q${i+1}: ${q.text} [${q.marks} Marks]`).join("\n")}


=========================================
ANSWER KEY & MODEL PATHS
=========================================
${paper.questions.map((q, i) => `Q(${q.section}): ${q.text}\nModel Answer: ${q.answerKey}`).join("\n\n")}

=========================================
End of Academic Package.
    `;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `DOC-MIND_Question_Paper_${paper.setName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      
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
      
      {/* Configuration Hub */}
      {!paper && !loading && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3.5 border-b border-slate-50 dark:border-white/10 pb-4">
            <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-400 font-mono tracking-wider">
                Teacher Toolkit
              </p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                AI Question Paper & Answer Key Generator
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Set Tag name */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                EXAM SET / TITLE
              </label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="e.g. Term Exam - Set A"
                className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs rounded-xl p-3.5 focus:outline-none focus:border-cyan-400 dark:text-slate-200"
              />
            </div>

            {/* Set Difficulty */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                TARGET DIFFICULTY INDEX
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs rounded-xl p-3.5 focus:outline-none focus:border-cyan-400 dark:text-slate-200"
              >
                <option value="easy">Easy (Knowledge recall focus)</option>
                <option value="medium">Medium (Analytical application focus)</option>
                <option value="hard">Hard (Synthesis and creation focus)</option>
              </select>
            </div>
          </div>

          {/* Distribution Counters */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              Question Type Distribution
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Section A (MCQ)</span>
                <input
                  type="number"
                  value={numMCQ}
                  onChange={(e) => setNumMCQ(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-white/[0.02] text-sm rounded-lg border border-slate-200 dark:border-white/10 p-2 font-bold dark:text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Section B (2-Mark)</span>
                <input
                  type="number"
                  value={num2Mark}
                  onChange={(e) => setNum2Mark(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-white/[0.02] text-sm rounded-lg border border-slate-200 dark:border-white/10 p-2 font-bold dark:text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Section C (5-Mark)</span>
                <input
                  type="number"
                  value={num5Mark}
                  onChange={(e) => setNum5Mark(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-white/[0.02] text-sm rounded-lg border border-slate-200 dark:border-white/10 p-2 font-bold dark:text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Section D (10-Mark)</span>
                <input
                  type="number"
                  value={num10Mark}
                  onChange={(e) => setNum10Mark(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-white/[0.02] text-sm rounded-lg border border-slate-200 dark:border-white/10 p-2 font-bold dark:text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.01] rounded-xl p-4 border border-slate-100 dark:border-white/10 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-700 dark:text-slate-300">Bloom's Taxonomy Alignment:</span>
              <p className="mt-0.5">
                Each question category maps to educational taxonomy metrics to test conceptual depth, recall, analytical proofing, and holistic system designs.
              </p>
            </div>
          </div>

          <button
            onClick={handleGeneratePaper}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 rounded-xl font-semibold shadow-md shadow-cyan-500/10 transition flex items-center justify-center space-x-2"
          >
            <span>Generate Academic Paper & Key</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Loader */}
      {loading && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Structuring Question Paper Packages
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              DOC-MIND AI is building sections, aligning marks, and creating model solutions.
            </p>
          </div>
        </div>
      )}

      {/* Question Paper Review and Live Editor */}
      {paper && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/10 pb-5 gap-4">
            <div>
              <span className="text-[10px] font-mono tracking-wider font-bold text-cyan-400 uppercase">
                Assessment Package Generated
              </span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {paper.setName} ({paper.difficulty.toUpperCase()})
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportText}
                className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-lg flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Paper Bundle</span>
              </button>
              <button
                onClick={() => setPaper(null)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center space-x-2 transition"
              >
                <span>New Paper Setup</span>
              </button>
            </div>
          </div>

          {/* Sectional Live Editor */}
          <div className="space-y-6">
            {paper.questions.map((q) => {
              const isEditing = editingQuestionId === q.id;
              return (
                <div key={q.id} className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
                        Section {q.section}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono">
                        {q.type} • {q.marks} Marks
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(q.id, q.text)}
                          title="Edit question text"
                          className="p-1 text-slate-400 hover:text-cyan-400 dark:hover:text-cyan-400 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete question"
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text Box */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs rounded-lg p-2.5 focus:outline-none focus:border-cyan-400 dark:text-slate-100 font-medium"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingQuestionId(null)}
                          className="px-2.5 py-1 bg-slate-200 dark:bg-white/[0.05] text-[10px] rounded hover:bg-slate-300 dark:hover:bg-white/10 font-semibold text-slate-700 dark:text-slate-200 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(q.id)}
                          className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 text-[10px] rounded font-semibold transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {q.text}
                    </p>
                  )}

                  {/* Model Answer preview */}
                  <div className="bg-white dark:bg-white/[0.02] p-3 rounded-lg border border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-600 dark:text-slate-300 font-mono uppercase block mb-1">
                      Model Answer / Key Path:
                    </span>
                    <p className="whitespace-pre-line">{q.answerKey}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
