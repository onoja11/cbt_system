import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Activity, 
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
  Tags,
  VideoOff,
  Folder
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminDashboard({ 
  onNavigateToApproval, 
  onNavigateToArchive, 
  onNavigateToScheduler, 
  onNavigateToUsers, 
  onNavigateToClasses, 
  onNavigateToLiveSurveillance, 
  onLogOut 
}) {
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

  useEffect(() => {
    let isMounted = true;

    const ingestSchoolManagementLogs = async (isFirstLoad = false) => {
      if (isFirstLoad) setIsLoading(true);
      try {
        const statsRes = await apiRequest('api/v1/admin/dashboard/school-metrics', { method: 'GET' });
        if (statsRes.ok) {
          const statsPayload = await statsRes.json();
          if (statsPayload.status === 'SUCCESS' && statsPayload.data && isMounted) {
            setSchoolStats(statsPayload.data);
          }
        }

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

    ingestSchoolManagementLogs(true);

    const telemetryHeartbeatId = setInterval(() => ingestSchoolManagementLogs(false), 8000);
    return () => {
      isMounted = false;
      clearInterval(telemetryHeartbeatId);
    };
  }, []);

  const formatCleanDuration = (durationInput) => {
    if (!durationInput) return '30 Mins';
    if (typeof durationInput === 'string' && !/^\d+(\.\d+)?$/.test(durationInput)) {
      return durationInput;
    }
    const totalMinutes = Math.round(parseFloat(durationInput));
    if (isNaN(totalMinutes)) return durationInput;

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    return `${totalMinutes} Mins`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Synchronizing administrative school logs with live databases...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none font-sans text-[#2A1A63] relative overflow-hidden w-full">

      {/* 🏛️ EXACT REFERENCE GRADIENT HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">START-RITE ADMIN PORTAL</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">INSTITUTIONAL EXAMINATION MANAGEMENT SYSTEM</p>
          </div>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => setShowLogoutDrawer(true)} 
            className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Sign Out of Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-6 space-y-6 flex flex-col justify-start">

      {/* 📊 EXACT MATCH 5-COLOUR ANALYTICS CARDS FROM REFERENCE IMAGE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono w-full shrink-0">
          
          {/* Card 1: Purple (Exam Writers) */}
          <div className="p-1.5 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs w-full relative overflow-hidden">
            <div className="w-18 h-18 bg-purple-400/20 border border-[#E2D5F8] rounded-xl flex items-center justify-center text-purple shrink-0 shadow-2xs">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div className="truncate text-left z-10">
              <span className="text-xxl font-black text-slate-900 block tracking-tight">{schoolStats.active_exam_writers}</span>
              <p className="text-[10px] font-bold text-black tracking-wide mt-0.5 font-sans">Students In Hall</p>
              <span className="text-[9px] text-[#7C6B93] block mt-0.5">Writing Now!</span>
            </div>
            <div className="absolute right-[-16px] top-0 pointer-events-none opacity-90">
              <img 
                src="/folder-character.png" 
                alt="Folder Character" 
                className="w-15 h-15 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Card 2: Pink (Students Enrollment) */}
          <div className="p-1.5 bg-[#FCE7EE] border border-[#F8D3DF] rounded-2xl flex items-center gap-3.5 shadow-2xs w-full">
            <div className="w-18 h-18 bg-red-400/20 border border-[#F8D3DF] rounded-xl flex items-center justify-center text-[#E11D48] shrink-0 shadow-2xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="truncate text-left">
              <span className="text-xxl font-black text-slate-900 block tracking-tight">{schoolStats.total_students}</span>
              <p className="text-[10px] font-bold text-black tracking-wide mt-0.5 font-sans">Students Enrollment</p>
              <span className="text-[9px] text-slate-500 block mt-0.5">Registered</span>
            </div>
          </div>

          {/* Card 3: Green (Teaching Staff) */}
          <div className="p-1.5 bg-[#EBFBF3] border border-[#C6F6D5] rounded-2xl flex items-center gap-3.5 shadow-2xs w-full">
            <div className="w-18 h-18 bg-green-400/20 border border-[#C6F6D5] rounded-xl flex items-center justify-center text-[#059669] shrink-0 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div className="truncate text-left">
              <span className="text-xxl font-black text-slate-900 block tracking-tight">{schoolStats.total_teachers}</span>
              <p className="text-[10px] font-bold text-black tracking-wide mt-0.5 font-sans">Teaching staff</p>
              <span className="text-[9px] text-slate-500 block font-mono mt-0.5">Active</span>
            </div>
          </div>

          {/* Card 4: Orange (Class Branches) */}
          <div className="p-1.5 bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl flex items-center gap-3.5 shadow-2xs w-full">
            <div className="w-18 h-18 bg-[#FEF3C7] border border-[#FEF3C7] rounded-xl flex items-center justify-center text-[#D97706] shrink-0 shadow-2xs">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div className="truncate text-left">
              <span className="text-xxl font-black text-slate-900 block tracking-tight">{schoolStats.total_class_arms}</span>
              <p className="text-[10px] font-bold text-black tracking-wide mt-0.5 font-sans">Class Branches</p>
              <span className="text-[9px] text-slate-500 block font-mono mt-0.5">Classes</span>
            </div>
          </div>

          {/* Card 5: Neutral/Taupe (Total Subjects) */}
          <div className="p-1.5 bg-[#F5EFE6] border border-[#E8DFD1] rounded-2xl flex items-center gap-3.5 shadow-2xs w-full sm:col-span-2 lg:col-span-1">
            <div className="w-18 h-18 bg-purple-400/20 border border-[#E8DFD1] rounded-xl flex items-center justify-center text-purple-400 shrink-0 shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="truncate text-left">
              <span className="text-xxl font-black text-slate-900 block tracking-tight">{schoolStats.total_subjects}</span>
              <p className="text-[10px] font-bold text-slate-700 tracking-wide mt-0.5 font-sans">Total subjects</p>
              <span className="text-[9px] text-slate-500 block font-mono mt-0.5">Listed</span>
            </div>
          </div>

        </div>

       {/* 🧭 NAVIGATION TILES (UNIFORM TEMPLATE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono w-full shrink-0">

          {/* 1. Classes & matrix */}
          <div onClick={onNavigateToClasses} className="py-3 px-4 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-2xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 bg-[#7C3AED] border border-[#E2D5F8] rounded-xl flex items-center justify-center text-white group-hover:bg-[#7C3AED] group-hover:text-white transition-all shrink-0 shadow-2xs">
                <Folder className="w-3.5 h-3.5" />
              </div>
              <div className="truncate text-left font-sans">
                <span className="text-[9px] font-black text-[#7C6B93] block tracking-wider font-mono">School records</span>
                <p className="text-[11px] font-bold text-black-600 mt-0.5 truncate">Classes & matrix</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7C6B93] group-hover:translate-x-1 group-hover:text-[#7C3AED] transition-all shrink-0" />
          </div>

          {/* 2. Users & subjects */}
          <div onClick={onNavigateToUsers} className="py-3 px-4 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-2xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 bg-[#7C3AED] border border-[#E2D5F8] rounded-xl flex items-center justify-center text-white group-hover:bg-[#7C3AED] group-hover:text-white transition-all shrink-0 shadow-2xs">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="truncate text-left font-sans">
                <span className="text-[9px] font-black text-[#7C6B93] block tracking-wider font-mono">Directory</span>
                <p className="text-[11px] font-bold text-black-600 mt-0.5 truncate">Users & subjects</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7C6B93] group-hover:translate-x-1 group-hover:text-[#7C3AED] transition-all shrink-0" />
          </div>

          {/* 3. Papers (Waiting Approvals) */}
          <div onClick={onNavigateToApproval} className="py-3 px-4 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-2xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 bg-[#7C3AED] border border-[#E2D5F8] rounded-xl flex items-center justify-center text-white group-hover:bg-[#7C3AED] group-hover:text-white transition-all shrink-0 shadow-2xs">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="truncate text-left font-sans">
                <span className="text-[9px] font-black text-[#7C6B93] block tracking-wider font-mono">Waiting Approvals</span>
                <p className="text-[11px] font-bold text-black-600 mt-0.5 truncate">{schoolStats.pending_vetting_slips} Papers Pending</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7C6B93] group-hover:translate-x-1 group-hover:text-[#7C3AED] transition-all shrink-0" />
          </div>

          {/* 4. Audit center */}
          <div onClick={onNavigateToArchive} className="py-3 px-4 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-2xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 bg-[#7C3AED] border border-[#E2D5F8] rounded-xl flex items-center justify-center text-white group-hover:bg-[#7C3AED] group-hover:text-white transition-all shrink-0 shadow-2xs">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <div className="truncate text-left font-sans">
                <span className="text-[9px] font-black text-[#7C6B93] block tracking-wider font-mono">Exam Archive</span>
                <p className="text-[11px] font-bold text-black-900 mt-0.5 truncate">Audit center</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7C6B93] group-hover:translate-x-1 group-hover:text-[#7C3AED] transition-all shrink-0" />
          </div>

          {/* 5. Timetable */}
          <div onClick={onNavigateToScheduler} className="py-3 px-4 bg-purple-400/20 border border-[#E2D5F8] hover:border-[#7C3AED] rounded-2xl flex items-center justify-between shadow-2xs cursor-pointer group transition-all w-full sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 bg-[#7C3AED] border border-[#E2D5F8] rounded-xl flex items-center justify-center text-white group-hover:bg-[#7C3AED] group-hover:text-white transition-all shrink-0 shadow-2xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="truncate text-left font-sans">
                <span className="text-[9px] font-black text-[#7C6B93] block tracking-wider font-mono">CBT Scheduling</span>
                <p className="text-[11px] font-bold text-black-900 mt-0.5 truncate">Timetable</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7C6B93] group-hover:translate-x-1 group-hover:text-[#7C3AED] transition-all shrink-0" />
          </div>

        </div>

       {/* 📺 ACTIVE EXAMINATION HALL MONITOR CHANNELS SECTION */}
        <div className="bg-gradient-to-t from-[#D8B4FE]/60 via-[#EEDAFE]/40 to-[#F7F2FF] border border-[#E2D5F8] rounded-3xl p-5 shadow-xs flex flex-col overflow-hidden w-full text-left">
          <div className="flex items-center gap-2 border-b border-[#E2D5F8]/60 pb-3 mb-3 shrink-0 w-full font-mono">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[#7C6B93] uppercase tracking-wider">Active Examination Hall Monitor Channels</span>
          </div>

          <div className="flex-1 w-full pb-1 flex flex-col items-center">
            {(!Array.isArray(liveSessions) || liveSessions.length === 0) ? (
              <div className="w-full flex flex-col justify-center items-center text-center font-mono py-10">
                <div className="w-24 h-24 flex items-center justify-center text-[#7C3AED] mb-2">
                  <img 
                    src="/thinking-character.png" 
                    alt="Thinking Character" 
                    className="w-20 h-20 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO ACTIVE EXAMINATION ROOM SESSIONS ARE CURRENTLY RUNNING ON THE SCHOOL NETWORK.</p>
              </div>
            ) : (
              <div className="w-full space-y-2.5">
                {liveSessions.map((session) => (
                  <div key={session.id} className="p-3.5 border border-[#E2D5F8] rounded-2xl bg-white hover:border-[#7C3AED] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full shadow-2xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 tracking-wider shrink-0 uppercase">LIVE RUNNING</span>
                        <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-[#7C3AED] text-white rounded-lg uppercase tracking-wide flex items-center gap-1 shrink-0">
                          <Tags className="w-2.5 h-2.5 opacity-80" /> {session.category || 'EXAM'}
                        </span>
                        <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate flex-1 min-w-[200px]">{session.subject} — {session.arm}</h4>
                      </div>
                      <p className="text-[11px] font-medium text-[#7C6B93] font-mono uppercase truncate">
                        Invigilator: <span className="font-sans font-bold text-slate-800 text-xs">{session.supervisor}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0 font-mono text-[11px] font-bold">
                      <div className="flex items-center gap-1 text-slate-600 bg-[#FAF9FA] border border-[#E2D5F8] px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[#7C6B93]" /> {formatCleanDuration(session.duration)}
                      </div>

                      {session.alertsCount > 0 ? (
                        <span className="flex items-center gap-1 text-[#C62927] bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0 font-black animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> {session.alertsCount} Irregularities
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wide shrink-0 font-black">
                          <CheckCircle className="w-3.5 h-3.5" /> Secure Room
                        </span>
                      )}
                      <button 
                        onClick={() => onNavigateToLiveSurveillance(session)} 
                        className="px-3.5 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md shrink-0 transition-all active:scale-[0.97] !bg-[#22C55E] !text-white"
                      >
                        Monitor Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>

      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-[#C62927] p-4 md:p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full select-none text-left">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-rose-50 text-[#C62927] border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Administrative Session Token?</h3>
                <p className="text-[10px] font-bold text-[#7C6B93] uppercase mt-0.5 tracking-wide font-mono">Signing out terminates active management control feeds immediately.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto font-sans border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 justify-end">
              <button onClick={() => setShowLogoutDrawer(false)} className="px-4 py-2 border border-[#E2D5F8] text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-xl cursor-pointer transition-all text-center">Cancel Actions</button>
              <button onClick={onLogOut} className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl shadow-md cursor-pointer font-mono text-center">Confirm Logout</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}