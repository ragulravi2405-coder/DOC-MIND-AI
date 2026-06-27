import React, { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  Activity, 
  Trash2, 
  ShieldAlert, 
  TrendingUp, 
  UserPlus, 
  Lock,
  Cpu
} from "lucide-react";
import { UserProfile, EduDocument } from "../types";
import { getAllUsers, getDocuments, deleteDocument } from "../lib/store";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";

interface AdminTabProps {
  currentAdmin: UserProfile;
  documents: EduDocument[];
  onDeleteDocument: (id: string) => Promise<void>;
}

export default function AdminTab({ currentAdmin, documents, onDeleteDocument }: AdminTabProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const uList = await getAllUsers();
        setUsers(uList);
      } catch (e) {
        console.error("Could not fetch user directory for admin.", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalUsersCount = users.length;
  const totalFilesCount = documents.length;
  
  // Analytics chart representation
  const dataAnalytics = [
    { name: "Mon", requests: 120 },
    { name: "Tue", requests: 210 },
    { name: "Wed", requests: 190 },
    { name: "Thu", requests: 340 },
    { name: "Fri", requests: 280 },
    { name: "Sat", requests: 450 },
    { name: "Sun", requests: 520 }
  ];

  // Modify local role
  const handleChangeRole = (uid: string, newRole: any) => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        return { ...u, role: newRole };
      }
      return u;
    });
    setUsers(updated);
    // save updated user list
    const localUsersList = JSON.parse(localStorage.getItem("edumind_users") || "[]");
    const foundIdx = localUsersList.findIndex((u: any) => u.uid === uid);
    if (foundIdx !== -1) {
      localUsersList[foundIdx].role = newRole;
      localStorage.setItem("edumind_users", JSON.stringify(localUsersList));
    }
  };

  const handleDeleteUser = (uid: string) => {
    setErrorBanner("");
    if (uid === currentAdmin.uid) {
      setErrorBanner("You cannot delete your own admin account.");
      return;
    }
    const filtered = users.filter((u) => u.uid !== uid);
    setUsers(filtered);
    const localUsersList = JSON.parse(localStorage.getItem("edumind_users") || "[]");
    const updated = localUsersList.filter((u: any) => u.uid !== uid);
    localStorage.setItem("edumind_users", JSON.stringify(updated));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      
      {/* Dynamic Error Banner */}
      {errorBanner && (
        <div className="bg-rose-500/10 border border-rose-500/20 px-6 py-3.5 rounded-xl flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
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
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Global Administrator Console 🛡️
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Monitor system load telemetry, moderate courses, and verify role-based permissions.
        </p>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Registered Users</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalUsersCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Moderated Course Materials</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalFilesCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total AI API Requests</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">1,942</span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Platform Up-time</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">99.98%</span>
          </div>
        </div>
      </div>

      {/* Charts & System usage telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Traffic Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-cyan-400" />
            AI Query Rate Load Telemetry
          </h3>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#0d0d14", 
                    border: "1px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px"
                  }} 
                />
                <Bar dataKey="requests" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course moderation index */}
        <div className="lg:col-span-5 bg-white dark:bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 text-rose-500" />
            Course Document Moderation
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {documents.map((doc) => {
              const isSeed = doc.id === "seed-ai-ml-basics";
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/10 text-xs">
                  <div className="truncate pr-4">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                    <span className="text-[9px] text-slate-400">{isSeed ? "Preloaded Asset" : "Uploaded user file"}</span>
                  </div>
                  {!isSeed && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-500/10 transition shrink-0"
                      title="Moderator delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* User list management directory */}
      <div className="bg-white dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
          <Users className="w-4 h-4 mr-2 text-cyan-400" />
          Active Accounts Directory
        </h3>

        {loading ? (
          <div className="text-center py-6 text-slate-400 text-xs">Loading user list...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">EMAIL</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">CREATED</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <tr key={usr.uid} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {usr.displayName}
                    </td>
                    <td className="py-3.5 px-4">{usr.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={usr.role}
                        onChange={(e) => handleChangeRole(usr.uid, e.target.value as any)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs rounded px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">{new Date(usr.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      {usr.uid !== currentAdmin.uid ? (
                        <button
                          onClick={() => handleDeleteUser(usr.uid)}
                          className="text-rose-500 hover:text-rose-700 font-mono text-[10px] font-bold"
                        >
                          DELETE
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">CURRENT ADMIN</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
