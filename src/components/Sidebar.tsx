import React from "react";
import { 
  BookOpen, 
  MessageSquare, 
  HelpCircle, 
  Briefcase, 
  FileText, 
  Users, 
  LogOut, 
  Sun, 
  Moon, 
  Globe,
  Award,
  X
} from "lucide-react";
import { UserProfile, UserRole } from "../types";

interface SidebarProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const LANGUAGES = [
  { code: "English", label: "English (US)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Malayalam", label: "മലയാളം (Malayalam)" },
  { code: "Telugu", label: "తెలుగు (Telugu)" }
];

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  darkMode,
  setDarkMode,
  onLogout,
  sidebarOpen,
  setSidebarOpen
}: SidebarProps) {
  const isTeacher = user.role === "teacher" || user.role === "student";
  const isAdmin = user.role === "admin";
  const isStudent = user.role === "student" || user.role === "teacher";

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false); // Auto-close drawer on mobile selection
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col h-full shrink-0 transition-transform duration-300 transform
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:flex
      `}>
        {/* Brand Title */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              DM
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                DOC - MIND AI
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold font-mono">
                Intelligent Study
              </span>
            </div>
          </div>

          {/* Close Sidebar Icon (Visible only on Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Quick Identity */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold truncate text-white">{user.displayName}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                  isAdmin 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}>
                  {isAdmin ? "ADMIN" : "MEMBER"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-2">
            Core Dashboards
          </p>

          {/* Dashboard / Analytics */}
          <button
            onClick={() => handleTabClick("dashboard")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
              activeTab === "dashboard"
                ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Student Tabs */}
          {(isStudent || isTeacher || isAdmin) && (
            <>
              <p className="px-3 pt-4 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-2">
                Learning Suite
              </p>

              <button
                onClick={() => handleTabClick("notes")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "notes"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>AI Study Notes</span>
              </button>

              <button
                onClick={() => handleTabClick("chat")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "chat"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Tutor Chat</span>
              </button>

              <button
                onClick={() => handleTabClick("exam")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "exam"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Mock Exam</span>
              </button>

              <button
                onClick={() => handleTabClick("interview")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "interview"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Mock Interview</span>
              </button>
            </>
          )}

          {/* Teacher Specific */}
          {(isTeacher || isAdmin) && (
            <>
              <p className="px-3 pt-4 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-2">
                Teaching Hub
              </p>
              <button
                onClick={() => handleTabClick("teacher")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "teacher"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Question Generator</span>
              </button>
            </>
          )}

          {/* Admin Specific */}
          {isAdmin && (
            <>
              <p className="px-3 pt-4 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold mb-2">
                Administration
              </p>
              <button
                onClick={() => handleTabClick("admin")}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm border transition-all duration-200 ${
                  activeTab === "admin"
                    ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-950/30">
          {/* Language Selection */}
          <div>
            <label className="text-[10px] text-slate-500 font-mono font-semibold flex items-center mb-1">
              <Globe className="w-3.5 h-3.5 mr-1" /> LANGUAGE
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme and Logout Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme mode"
              className="p-2 bg-slate-800 text-slate-400 rounded hover:text-white hover:bg-slate-700 transition"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
