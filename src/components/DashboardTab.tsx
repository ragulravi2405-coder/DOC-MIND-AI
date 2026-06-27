import React, { useState } from "react";
import { 
  FileText, 
  HelpCircle, 
  Briefcase, 
  Award, 
  Upload, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Loader2
} from "lucide-react";
import { EduDocument, MockExamSession, MockInterviewSession } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";

interface DashboardTabProps {
  userDisplayName: string;
  documents: EduDocument[];
  exams: MockExamSession[];
  interviews: MockInterviewSession[];
  onUploadFile: (name: string, type: string, size: number, base64: string) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  setSelectedDocument: (doc: EduDocument) => void;
  selectedDocument: EduDocument | null;
}

export default function DashboardTab({
  userDisplayName,
  documents,
  exams,
  interviews,
  onUploadFile,
  onDeleteDoc,
  setSelectedDocument,
  selectedDocument
}: DashboardTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Calculate stats
  const totalUploads = documents.length;
  const examsTaken = exams.length;
  const interviewsCompleted = interviews.length;
  
  const avgExamScore = exams.length 
    ? Math.round(exams.reduce((acc, curr) => acc + curr.score, 0) / exams.length) 
    : 0;

  const avgInterviewScore = interviews.length
    ? Math.round(interviews.reduce((acc, curr) => acc + curr.score, 0) / interviews.length)
    : 0;

  // Format chart data
  const chartData = [...exams]
    .reverse()
    .map((session, index) => ({
      name: `Exam ${index + 1}`,
      score: session.score,
      total: 100
    }));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      // Vercel serverless request body size limit is 4.5MB
      if (file.size > 3.5 * 1024 * 1024) {
        throw new Error("To ensure smooth processing on Vercel's serverless environment, please upload files smaller than 3.5MB. For larger documents, try splitting them into smaller parts.");
      }

      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          try {
            const resultStr = reader.result as string;
            const parts = resultStr.split(",");
            if (parts.length > 1) {
              resolve(parts[1]);
            } else {
              reject(new Error("Could not parse file data."));
            }
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => {
          reject(new Error("File reading error."));
        };
      });

      await onUploadFile(file.name, file.type || "text/plain", file.size, base64String);
    } catch (err: any) {
      console.error("Upload error details:", err);
      setUploadError(err.message || "Failed to process uploaded file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Welcome back, {userDisplayName}! 👋
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Transform course materials into customized interactive exams, revision notes, and speech-ready interviews.
          </p>
        </div>

        {/* Selected Document Indicator */}
        {selectedDocument && (
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl px-4 py-2 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                Active Document
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">
                {selectedDocument.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Uploaded Materials</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalUploads}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Mock Exams Taken</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{examsTaken}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Average Exam Score</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{avgExamScore}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Avg Interview Score</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{avgInterviewScore}%</span>
          </div>
        </div>
      </div>

      {/* Main Core Layout: Upload Zone & Document Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Document Upload & Selector */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
              <Upload className="w-4 h-4 mr-2 text-cyan-400" />
              Upload Study Material
            </h3>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? "border-cyan-400 bg-cyan-400/5 dark:bg-cyan-400/10"
                  : "border-slate-200 dark:border-white/10 hover:border-cyan-400 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
              }`}
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      DOC-MIND AI is Indexing Knowledge...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Generating structured study summaries, flashcards, exams, and viva question pools.
                    </p>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center w-full h-full cursor-pointer">
                  <div className="w-12 h-12 bg-cyan-400/10 text-cyan-400 rounded-full flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Drag & Drop your file or <span className="text-cyan-400">browse</span>
                  </span>
                  <span className="text-xs text-slate-400 mt-1.5">
                    Supports PDF, DOCX, PPT, TXT, PNG, JPG (Max 50MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                {uploadError}
              </p>
            )}
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
              <FileText className="w-4 h-4 mr-2 text-cyan-400" />
              Your Document Library
            </h3>

            {documents.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No documents found. Drag & Drop above to index your first file!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isActive = selectedDocument?.id === doc.id;
                  const isSeed = doc.id === "seed-ai-ml-basics";
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isActive
                          ? "border-cyan-400 bg-cyan-400/5 dark:bg-cyan-400/10"
                          : "border-slate-100 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500 bg-slate-50/50 dark:bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          isActive 
                            ? "bg-cyan-400 text-slate-950" 
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}>
                          {doc.name.split(".").pop()?.toUpperCase() || "DOC"}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">
                            {doc.name}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {(doc.size / (1024 * 1024)).toFixed(2)} MB • {isSeed ? "Pre-seeded Sample" : "User Document"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isActive && (
                          <span className="text-[10px] bg-cyan-400 text-slate-950 px-2 py-0.5 rounded font-mono font-bold uppercase">
                            ACTIVE
                          </span>
                        )}
                        {!isSeed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDoc(doc.id);
                            }}
                            title="Delete document"
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Progression */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center justify-between">
              <span className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-cyan-400" />
                Exam Progress Scorecard
              </span>
            </h3>

            {chartData.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50/50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10">
                Complete a Mock Exam to generate performance analytics.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#0d0d14", 
                        border: "1px solid rgba(255, 255, 255, 0.1)", 
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px"
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#22d3ee" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#scoreGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Activity Stream */}
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
              <Clock className="w-4 h-4 mr-2 text-cyan-400" />
              Recent Activity Feed
            </h3>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {exams.length === 0 && interviews.length === 0 && documents.length <= 1 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Upload a file or run assessments to populate your feed!
                </div>
              ) : (
                <>
                  {exams.slice(0, 3).map((exam) => (
                    <div key={exam.id} className="flex items-start space-x-3 text-xs border-b border-slate-50 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                      <div className="w-7 h-7 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          Completed Exam on {exam.documentName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Score: <span className="text-emerald-500 font-bold">{exam.score}%</span> • Difficulty: {exam.difficulty}
                        </p>
                      </div>
                    </div>
                  ))}

                  {interviews.slice(0, 3).map((int) => (
                    <div key={int.id} className="flex items-start space-x-3 text-xs border-b border-slate-50 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                      <div className="w-7 h-7 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          Mock Interview - {int.type}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Evaluation Score: <span className="text-emerald-500 font-bold">{int.score}%</span> • Level: {int.mode}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
