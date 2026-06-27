import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/DashboardTab";
import NotesTab from "./components/NotesTab";
import ChatTab from "./components/ChatTab";
import ExamTab from "./components/ExamTab";
import InterviewTab from "./components/InterviewTab";
import TeacherTab from "./components/TeacherTab";
import AdminTab from "./components/AdminTab";
import { 
  signUpUser, 
  loginUser, 
  logoutUser, 
  getActiveUser, 
  getDocuments, 
  deleteDocument, 
  saveDocument, 
  saveExamSession, 
  getExamSessions, 
  saveInterviewSession, 
  getInterviewSessions 
} from "./lib/store";
import { UserProfile, EduDocument, MockExamSession, MockInterviewSession, UserRole } from "./types";
import { 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Cpu, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight,
  Loader2,
  AlertTriangle,
  Menu
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(getActiveUser());
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core Data States
  const [documents, setDocuments] = useState<EduDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<EduDocument | null>(null);
  const [exams, setExams] = useState<MockExamSession[]>([]);
  const [interviews, setInterviews] = useState<MockInterviewSession[]>([]);

  // User Auth Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Global Config states
  const [language, setLanguage] = useState("English");
  const [darkMode, setDarkMode] = useState(true);

  // Profile management overlay state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileRoleInput, setProfileRoleInput] = useState<UserRole>("student");
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [hasServerApiKey, setHasServerApiKey] = useState(true);

  // Check backend config status on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch("/api/config/status");
        const data = await response.json();
        if (data && typeof data.hasServerApiKey === "boolean") {
          setHasServerApiKey(data.hasServerApiKey);
        }
      } catch (err) {
        console.error("Failed to check server config status:", err);
      }
    };
    checkConfig();
  }, []);

  // Load all user collections once authenticated
  useEffect(() => {
    if (user) {
      setProfileNameInput(user.displayName);
      setProfileRoleInput(user.role);
      loadUserData();
    }
  }, [user]);

  // Sync Tailwind Dark Mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const loadUserData = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      
      // Auto select first document (pre-seeded AI ML Basics) if none is selected
      if (docs.length > 0 && !selectedDocument) {
        setSelectedDocument(docs[0]);
      }

      const examLogs = await getExamSessions();
      setExams(examLogs);

      const interviewLogs = await getInterviewSessions();
      setInterviews(interviewLogs);
    } catch (e) {
      console.error("Failed loading data collections", e);
    }
  };

  // Auth: Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setAuthError("Please fill out all fields.");
      return;
    }
    setAuthLoading(true);
    try {
      const profile = await signUpUser(email, password, displayName, role);
      setUser(profile);
    } catch (err: any) {
      setAuthError(err.message || "Failed to create account.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!email.trim() || !password.trim()) {
      setAuthError("Please fill out all fields.");
      return;
    }
    setAuthLoading(true);
    try {
      const profile = await loginUser(email, password);
      setUser(profile);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Forgot Password Simulation
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setForgotSuccess("");
    if (!email.trim()) {
      setAuthError("Please provide your email address.");
      return;
    }
    setAuthLoading(true);
    setTimeout(() => {
      setForgotSuccess("Password reset instructions has been sent. If this email is active in our Firebase Auth, you will receive a recovery link shortly.");
      setAuthLoading(false);
    }, 1000);
  };

  // Auth: Sign Out
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setSelectedDocument(null);
    setDocuments([]);
    setExams([]);
    setInterviews([]);
    setActiveTab("dashboard");
  };

  // Document Processor Proxy Callback
  const handleUploadFile = async (name: string, type: string, size: number, base64: string) => {
    if (!user) return;
    const response = await fetch("/api/documents/process", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Gemini-API-Key": localStorage.getItem("gemini_api_key") || ""
      },
      body: JSON.stringify({ fileName: name, fileType: type, size, base64 })
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = "Failed to process document.";
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.error) {
          errorMsg = parsed.error;
        }
      } catch (e) {
        // If it's a Vercel function error page, make it clean and readable
        if (text.includes("An error occurred") || text.includes("server error")) {
          errorMsg = "A serverless function error occurred in Vercel. Please ensure you have set your GEMINI_API_KEY environment variable in your Vercel project settings dashboard.";
        } else {
          errorMsg = text.slice(0, 150) || `Server returned error status ${response.status}`;
        }
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // Formulate a clean document record
    const newDoc: EduDocument = {
      id: "doc-" + Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      name: name,
      type: type,
      size: size,
      summary: data.summary || "Summary generation failure.",
      importantTopics: data.importantTopics || "Topics generation failure.",
      revisionNotes: data.revisionNotes || "Revision notes generation failure.",
      keywords: data.keywords || [],
      flashcards: data.flashcards || [],
      examQuestions: data.examQuestions || [],
      interviewQuestions: data.interviewQuestions || [],
      createdAt: new Date().toISOString()
    };

    await saveDocument(newDoc);
    await loadUserData();
    setSelectedDocument(newDoc);
    setActiveTab("dashboard");
  };

  // Document Deletion Handler
  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    await loadUserData();
  };

  // Exam result save handler
  const handleSaveExam = async (session: MockExamSession) => {
    await saveExamSession(session);
    await loadUserData();
  };

  // Interview result save handler
  const handleSaveInterview = async (session: MockInterviewSession) => {
    await saveInterviewSession(session);
    await loadUserData();
  };

  // Profile Details update
  const handleUpdateProfile = () => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      displayName: profileNameInput,
      role: profileRoleInput
    };
    setUser(updated);
    localStorage.setItem("edumind_current_user", JSON.stringify(updated));
    localStorage.setItem("gemini_api_key", customApiKey);
    
    // update local user index as well
    const localUsersList = JSON.parse(localStorage.getItem("edumind_users") || "[]");
    const idx = localUsersList.findIndex((u: any) => u.uid === user.uid);
    if (idx !== -1) {
      localUsersList[idx].displayName = profileNameInput;
      localUsersList[idx].role = profileRoleInput;
      localStorage.setItem("edumind_users", JSON.stringify(localUsersList));
    }
    setShowProfileModal(false);
  };

  // If unauthorized, show Landing Auth card
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center relative p-4 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
          {/* Logo Heading */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-cyan-500/20">
              DM
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                DOC-MIND AI
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Intelligent learning, structured summaries & voice mock assessments.
              </p>
            </div>
          </div>

          {/* Form switchers */}
          {authMode !== "forgot" && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition ${
                  authMode === "login" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition ${
                  authMode === "register" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                REGISTER
              </button>
            </div>
          )}

          {/* Form implementation */}
          {authMode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@university.edu"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Password</label>
                  <button
                    type="button"
                    onClick={() => setAuthMode("forgot")}
                    className="text-[10px] text-cyan-400 font-semibold font-mono uppercase"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-10 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{authError}</p>}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In Account</span>}
              </button>
            </form>
          )}

          {authMode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Alex Johnson"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="alex@academy.org"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-10 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{authError}</p>}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
              </button>
            </form>
          )}

          {authMode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@university.edu"
                    className="w-full bg-slate-950 text-xs rounded-xl border border-slate-800 pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {authError && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{authError}</p>}
              {forgotSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">{forgotSuccess}</p>}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Instructions</span>}
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); setForgotSuccess(""); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white font-semibold transition mt-2 block"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Sandbox Fallback Disclaimer */}
          <div className="pt-4 border-t border-slate-800/80 flex items-start space-x-2.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-sans">
              <span className="font-semibold text-slate-400">Sandbox Fallback Active</span>: This platform uses secure Local Storage backings if Firestore project keys are offline, giving you fully functional accounts, mock exams, notes, and dashboards instantly!
            </p>
          </div>
        </div>
      </main>
    );
  }

  // If authorized, show Dashboard layout
  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? "dark" : ""}`}>
      {/* Sidebar navigation */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Primary Workspace Frame */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
        
        {/* Top bar with quick settings / profile modal triggers */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-900 bg-white dark:bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden shrink-0"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans truncate">
              {activeTab === "dashboard" && "Platform Analytics & Materials"}
              {activeTab === "notes" && "Grounded Course Summaries & Flashcards"}
              {activeTab === "chat" && "Grounded AI Tutor Chat"}
              {activeTab === "exam" && "Assessments & Grading Sheets"}
              {activeTab === "interview" && "AI Recruiter Board"}
              {activeTab === "teacher" && "Academic Exam Paper Generator"}
              {activeTab === "admin" && "Administrative Cloud Console"}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </button>
          </div>
        </header>

        {/* API Key Missing Alert Banner */}
        {!hasServerApiKey && !customApiKey && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span className="font-bold">Google Gemini API Key is missing:</span> This app is deployed on a public platform (like GitHub or Render) but does not have the <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-[10px]">GEMINI_API_KEY</code> environment variable set.
              </p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition shrink-0"
            >
              Configure API Key
            </button>
          </div>
        )}

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/40">
          {activeTab === "dashboard" && (
            <DashboardTab
              userDisplayName={user.displayName}
              documents={documents}
              exams={exams}
              interviews={interviews}
              onUploadFile={handleUploadFile}
              onDeleteDoc={handleDeleteDoc}
              setSelectedDocument={setSelectedDocument}
              selectedDocument={selectedDocument}
            />
          )}

          {activeTab === "notes" && (
            <NotesTab document={selectedDocument} />
          )}

          {activeTab === "chat" && (
            <ChatTab document={selectedDocument} language={language} />
          )}

          {activeTab === "exam" && (
            <ExamTab
              document={selectedDocument}
              userId={user.uid}
              onSaveExam={handleSaveExam}
              language={language}
            />
          )}

          {activeTab === "interview" && (
            <InterviewTab
              document={selectedDocument}
              userId={user.uid}
              onSaveInterview={handleSaveInterview}
              language={language}
            />
          )}

          {activeTab === "teacher" && (
            <TeacherTab document={selectedDocument} language={language} />
          )}

          {activeTab === "admin" && (
            <AdminTab
              currentAdmin={user}
              documents={documents}
              onDeleteDocument={handleDeleteDoc}
            />
          )}
        </main>
      </div>

      {/* Profile Details Edit Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Manage Profile Details
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Display Name</label>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Custom Gemini API Key (Optional)</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-xl p-3 focus:outline-none dark:text-white"
                />
                <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                  Required if the server's GEMINI_API_KEY environment variable is missing (e.g. on Render). You can also add it in Render's dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateProfile}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] rounded-lg font-semibold transition"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
