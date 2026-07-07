import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Activity, 
  Folder, 
  CheckCircle, 
  Monitor, 
  ChevronRight, 
  Radio, 
  Clock, 
  AlertTriangle, 
  LogOut, 
  ShieldAlert,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  Calendar,
  Tags
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminDashboard({ 
  onNavigateToApproval, 
  onNavigateToClasses, 
  onNavigateToArchive, 
  onNavigateToLiveSurveillance, 
  onNavigateToScheduler, 
  onLogOut 
}) {
  // 🏫 SCHOOL CONTROL MATRIX MEMORY REGISTERS
  const [schoolStats, setSchoolStats] = useState({
    active_exam_writers: 0,
    total_students: 0,
    total_teachers: 0,
    total_subjects: 0,
    total_class_arms: 0,
    pending_vetting_slips: 0
  });
  const [liveSessions, setLiveSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // EFFECT HOOK: Pull Unified Institutional Telemetry & Live Streams
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const ingestSchoolManagementLogs = async (isFirstLoad = false) => {
      if (isFirstLoad) setIsLoading(true);
      try {
        // 1. Ingest central breakdown statistics
        const statsRes = await apiRequest('api/v1/admin/dashboard/school-metrics', { method: 'GET' });
        if (statsRes.ok) {
          const statsPayload = await statsRes.json();
          if (statsPayload.status === 'SUCCESS' && statsPayload.data && isMounted) {
            setSchoolStats(statsPayload.data);
          }
        }

        // 2. Ingest active real-time exam rooms channel feed
        const channelsRes = await apiRequest('api/v1/admin/dashboard/surveillance-channels', { method: 'GET' });
        if (channelsRes.ok) {
          const channelsPayload = await channelsRes.json();
          if (channelsPayload.status === 'SUCCESS' && isMounted) {
            setLiveSessions(channelsPayload.channels || channelsPayload.data || []);
          }
        }
      } catch (error) {
        console.error("❌ [ACADEMIC TELEMETRY LINK FAULT]:", error);
      } finally {
        if (isFirstLoad && isMounted) setIsLoading(false);
      }
    };

    // Load metrics immediately on lifecycle start
    ingestSchoolManagementLogs(true);

    // Refresh dashboard records dynamically every 8 seconds via background heartbeat
    const telemetryHeartbeatId = setInterval(() => ingestSchoolManagementLogs(false), 8000);
    return () => {
      isMounted = false;
      clearInterval(telemetryHeartbeatId);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Synchronizing administrative school logs with live databases...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none font-sans text-[#2A1A63] relative overflow-hidden w-full">
      
      {/* MANAGEMENT CONTROL BANNER */}
      <header className="w-full bg-[#2A1A63] text-white px-4 md:px-6 py-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white p-1 rounded-lg shrink-0 shadow-sm">
              <Logo size={40} showText={false} />
            </div>
            <div className="truncate text-left">
              <h1 className="text-xs font-black uppercase tracking-wider truncate text-white">Start-Rite Admin Portal</h1>
              <p className="text-[10px] font-bold text-[#9A87A9] uppercase font-mono tracking-tight truncate mt-0.5">Institutional Examination Management System</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-900">
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2.5 py-0.5 rounded uppercase tracking-wider animate-pulse">● PORTAL ONLINE</span>
            <button 
              onClick={() => setShowLogoutDrawer(true)} 
              className="p-1.5 bg-[#2A1A63] hover:bg-indigo-9ED/50 border border-[#9A87A9]/40 rounded-lg text-rose-400 hover:text-rose-300 cursor-pointer transition-all shrink-0 active:scale-[0.95]"
              title="Sign Out of Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT EXECUTION GRID */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 flex flex-col justify-start">
        
        {/* SCHOOL ROSTER METRIC GRID STATUS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 font-mono w-full shrink-0">
          
          {/* Card 1: Active Exam Writers */}
          <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs w-full col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center text-[#C62927] shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div className="truncate text-left">
              <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Exam Writers</span>
              <p className="text-xs font-black text-[#C62927] mt-0.5 truncate">{schoolStats.active_exam_writers} Writing Now</p>
            </div>
          </div>

          {/* Card 2: Total Student Population */}
          <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs w-full">
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-[#2A1A63] shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="truncate text-left">
              <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Student Enrollment</span>
              <p className="text-xs font-black text-slate-950 mt-0.5 truncate">{schoolStats.total_students} Registered</p>
            </div>
          </div>

          {/* Card 3: Academic Instructors Staff */}
          <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs w-full">
            <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="truncate text-left">
              <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Teaching Staff</span>
              <p className="text-xs font-black text-slate-950 mt-0.5 truncate">{schoolStats.total_teachers} Active</p>
            </div>
          </div>

          {/* Card 4: Configured Class Arms */}
          <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs w-full">
            <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div className="truncate text-left">
              <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Class Branches</span>
              <p className="text-xs font-black text-slate-950 mt-0.5 truncate">{schoolStats.total_class_arms} Classes</p>
            </div>
          </div>

          {/* Card 5: Registered Subject Catalogs */}
          <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs w-full">
            <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate text-left">
              <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Total Subjects</span>
              <p className="text-xs font-black text-slate-950 mt-0.5 truncate">{schoolStats.total_subjects} Listed</p>
            </div>
          </div>

        </div>

        {/* NAVIGATION HUB TIERS — RESPONSIVE 4 COLUMNS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono w-full shrink-0">
          
          {/* Card 1: School Records Directory */}
          <div onClick={onNavigateToClasses} className="p-4 bg-white border border-[#9A87A9]/30 hover:border-[#2A1A63] rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-lg flex items-center justify-center text-[#9A87A9] group-hover:bg-[#2A1A63] group-hover:text-white transition-all shrink-0">
                <Folder className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">School Records</span>
                <p className="text-xs font-black text-slate-950 mt-0.5 truncate">Class Folders</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-[#2A1A63] transition-all shrink-0" />
          </div>

          {/* Card 2: Vetting Queue Desk */}
          <div onClick={onNavigateToApproval} className="p-4 bg-white border border-[#9A87A9]/30 hover:border-amber-500 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Waiting Approvals</span>
                <p className="text-xs font-black text-amber-600 mt-0.5 truncate">{schoolStats.pending_vetting_slips} Papers Pending</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-amber-500 transition-all shrink-0" />
          </div>

          {/* Card 3: Concluded Archive Vault */}
          <div onClick={onNavigateToArchive} className="p-4 bg-white border border-[#9A87A9]/30 hover:border-blue-600 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">Exams Archive</span>
                <p className="text-xs font-black text-blue-600 mt-0.5 truncate">Past Exam Records</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all shrink-0" />
          </div>

          {/* Card 4: CBT Scheduling Timetable Portal */}
          <div onClick={onNavigateToScheduler} className="p-4 bg-white border border-[#9A87A9]/30 hover:border-[#2A1A63] rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-lg flex items-center justify-center text-[#9A87A9] group-hover:bg-[#2A1A63] group-hover:text-white transition-all shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="truncate text-left">
                <span className="text-[9px] font-sans font-bold text-[#9A87A9] uppercase block tracking-wider">CBT Scheduling</span>
                <p className="text-xs font-black text-slate-950 mt-0.5 truncate">Exam Timetable</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-[#2A1A63] transition-all shrink-0" />
          </div>

        </div>

        {/* MONITOR FEED PIPELINE SELECTION ROW */}
        <div className="bg-white border border-[#9A87A9]/30 rounded-xl p-4 md:p-5 shadow-2xs min-h-[300px] lg:h-[360px] flex flex-col overflow-hidden w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 shrink-0 w-full">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-black text-[#9A87A9] uppercase tracking-wider">Active Examination Hall Monitor Channels</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 w-full text-left pb-1">
            {(!Array.isArray(liveSessions) || liveSessions.length === 0) ? (
              <div className="w-full h-full flex flex-col justify-center items-center text-center font-mono text-[10px] uppercase text-[#9A87A9] py-12 font-bold">
                No active examination room sessions are currently running on the school network.
              </div>
            ) : (
              liveSessions.map((session) => (
                <div key={session.id} className="p-4 border border-[#9A87A9]/20 rounded-xl bg-[#FAF9FA]/60 hover:bg-white hover:border-[#9A87A9]/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full shadow-3xs">
                  <div className="space-y-1.5 w-full sm:w-auto truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 text-[8px] font-mono font-black bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-100 tracking-wider shrink-0 uppercase">LIVE RUNNING</span>
                      
                      <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-[#2A1A63] text-white border border-[#2A1A63] uppercase tracking-wide flex items-center gap-1 shrink-0 rounded-sm">
                        <Tags className="w-2.5 h-2.5 opacity-60" /> {session.category || 'EXAM'}
                      </span>
                      
                      <h4 className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-tight truncate">{session.subject} — {session.arm}</h4>
                    </div>
                    <p className="text-[11px] font-medium text-[#9A87A9] font-mono uppercase truncate">
                      Invigilator: <span className="font-sans font-bold text-slate-700 text-xs">{session.supervisor}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 shrink-0 font-mono text-[11px] font-bold">
                    <div className="flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[#9A87A9]" /> {session.duration}
                    </div>

                    {session.alertsCount > 0 ? (
                      <span className="flex items-center gap-1 text-[#C62927] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-wide shrink-0 font-black animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> {session.alertsCount} Irregularities
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wide shrink-0 font-black">
                        <CheckCircle className="w-3.5 h-3.5" /> Secure Room
                      </span>
                    )}
                    <button 
                      onClick={() => onNavigateToLiveSurveillance(session)} 
                      className="px-4 py-1.5 bg-[#2A1A63] hover:opacity-90 text-white text-[10px] uppercase font-bold tracking-wider rounded-md cursor-pointer shadow-md shrink-0 transition-all active:scale-[0.97]"
                    >
                      Monitor Room
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-Rite Intranet Institutional Security Matrix
      </footer>

      {/* DRAWER MODAL OVERLAYS */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-[#C62927] p-4 md:p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full select-none text-left">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-rose-50 text-[#C62927] border border-rose-100 rounded-lg flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Administrative Session Token?</h3>
                <p className="text-[10px] font-bold text-[#9A87A9] uppercase mt-0.5 tracking-wide font-mono">Signing out terminates active management control feeds immediately.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto font-sans border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 justify-end">
              <button onClick={() => setShowLogoutDrawer(false)} className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-lg cursor-pointer transition-all text-center">Cancel Actions</button>
              <button onClick={onLogOut} className="px-5 py-2.5 bg-[#2A1A63] text-white text-xs font-bold uppercase rounded-lg shadow-md cursor-pointer font-mono text-center">Confirm Logout</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
} 