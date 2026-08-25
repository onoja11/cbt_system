import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Users, CheckCircle, Search, RotateCcw, ArrowLeft, Loader2, RefreshCw, Clock } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function LiveMonitor({ assessmentId, onNavigateBack }) {
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState('COMPUTER SCIENCE');
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, studentId: null, studentName: '' });
  const [notification, setNotification] = useState({ isVisible: false, type: 'success', message: '' });

  const [roomSecondsLeft, setRoomSecondsLeft] = useState(null);
  const examEndTimeRef = useRef(null);

  const triggerBannerAlert = (message, type = 'success') => {
    setNotification({ isVisible: true, type, message });
    setTimeout(() => setNotification({ isVisible: false, type: 'success', message: '' }), 4000);
  };

  const fetchRoomTelemetry = async () => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/${assessmentId}`, { method: 'GET' });
      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setStudentStatuses(data.students || []);
        setSubjectMeta(data.subject || 'COMPUTER SCIENCE');
        
        const rawScheduledEnd = 
          data.assessment_meta?.scheduled_end || 
          data.assessment?.scheduled_end || 
          data.session?.scheduled_end || 
          data.exam?.scheduled_end || 
          data.scheduled_end;

        if (rawScheduledEnd && !examEndTimeRef.current) {
          const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
          examEndTimeRef.current = new Date(targetTimeString).getTime();
        } else if (data.students && data.students.length > 0 && !examEndTimeRef.current) {
          const maxStudentSeconds = Math.max(...data.students.map(s => parseInt(s.seconds_remaining, 10) || 0));
          if (maxStudentSeconds > 0) {
            examEndTimeRef.current = Date.now() + (maxStudentSeconds * 1000);
          }
        }
      }
    } catch (error) {
      console.error("❌ [ROOM MONITOR LINK FAULT]:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTelemetry();
    const telemetryIntervalId = setInterval(fetchRoomTelemetry, 4000);
    return () => clearInterval(telemetryIntervalId);
  }, [assessmentId]);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      if (!examEndTimeRef.current) return;
      
      const remainingSeconds = Math.floor((examEndTimeRef.current - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        setRoomSecondsLeft(0);
        setStudentStatuses(prev => prev.map(s => ({
          ...s,
          status: s.status.includes('Submitted') || s.status === 'Not Started' ? s.status : 'Finished (Ready to Grade)'
        })));
      } else {
        setRoomSecondsLeft(remainingSeconds);
      }
    }, 1000);

    return () => clearInterval(tickerInterval);
  }, []);

  const executeStrikeClearanceOverride = async (studentProfileId) => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/workstation/clear-strikes`, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: parseInt(assessmentId, 10),
          student_profile_id: parseInt(studentProfileId, 10)
        })
      });
      if (response.ok) {
        triggerBannerAlert("Student screen warnings reset and unlocked successfully.", "success");
        await fetchRoomTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeModal();
    }
  };

  const executeNuclearResetRestart = async (studentProfileId) => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/workstation/restart-exam`, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: parseInt(assessmentId, 10),
          student_profile_id: parseInt(studentProfileId, 10)
        })
      });
      if (response.ok) {
        triggerBannerAlert("Exam session flushed completely. Student workstation ready for a clean reload!", "success");
        await fetchRoomTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeModal();
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, studentId: null, studentName: '' });

  const formatSecondsToMinutes = (secs) => {
    if (secs === null || secs <= 0) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const filteredStudents = studentStatuses.filter(st => 
    (st.student_name || st.name || '').toLowerCase().includes(searchFilter.toLowerCase()) || 
    (st.desk || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F5FC] text-[#2A1A63] font-sans flex flex-col justify-between select-none relative w-full overflow-x-hidden">
      
      {/* Header Banner */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Live Exam Hall Monitor</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Subject Session: {subjectMeta}</p>
          </div>
        </div>
      </header>

      {notification.isVisible && (
        <div className="fixed top-20 right-6 z-[1000] p-4 border border-emerald-200 text-emerald-800 bg-emerald-50 rounded-2xl flex items-center gap-3 max-w-sm shadow-2xl font-mono text-xs uppercase">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <div className="font-sans font-bold">{notification.message}</div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-8 mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0 text-left">
        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Room Time Left</span>
            <p className={`text-base font-black font-mono mt-0.5 ${roomSecondsLeft !== null && roomSecondsLeft <= 300 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {roomSecondsLeft !== null ? formatSecondsToMinutes(roomSecondsLeft) : 'Synchronizing...'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Enrolled Class Roster</span>
            <p className="text-base font-black text-slate-900 font-mono mt-0.5">{studentStatuses.length} Students</p>
          </div>
        </div>
        <div className="p-4 bg-[#EBFBF3] border border-[#C6F6D5] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#C6F6D5] rounded-xl flex items-center justify-center text-[#059669] shadow-2xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-600 uppercase block">Finished Papers</span>
            <p className="text-base font-black text-slate-900 font-mono mt-0.5">{studentStatuses.filter(s => s.status.includes('Submitted') || s.is_submitted).length} Submitted</p>
          </div>
        </div>
        <div className="p-4 bg-[#FCE7EE] border border-[#F8D3DF] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#F8D3DF] rounded-xl flex items-center justify-center text-[#E11D48] shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-600 uppercase block">Screen Violations</span>
            <p className="text-base font-black text-[#E11D48] font-mono mt-0.5">{studentStatuses.filter(s => (s.violations || 0) > 0 || s.status.includes('Malpractice')).length} Flagged</p>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-6 flex flex-col justify-start">
        <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col h-[480px] overflow-hidden shadow-xs w-full text-left">
          <div className="relative mb-5 max-w-xs shrink-0 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6B93]" />
            <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search student name..." className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl uppercase focus:outline-none shadow-2xs" />
          </div>

          <div className="flex-1 overflow-y-auto border border-[#E2D5F8]/60 rounded-2xl w-full bg-white shadow-2xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-mono text-[#7C6B93] uppercase tracking-widest flex flex-col items-center justify-center gap-2 py-24">
                <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
                Connecting to testing workstations database...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="w-full h-full flex flex-col justify-center items-center text-center font-mono py-20">
                <div className="w-24 h-24 flex items-center justify-center text-[#7C3AED] mb-3">
                  <img 
                    src="/thinking-character.png" 
                    alt="Thinking Character" 
                    className="w-20 h-20 object-contain drop-shadow-sm"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO ACTIVE EXAM SESSIONS RUNNING IN THE ROOM MATRIX.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs font-medium text-slate-700 font-mono">
                <thead className="bg-[#7C3AED] text-white border-b border-[#E2D5F8] font-black uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 pl-6">Desk No.</th>
                    <th className="p-4 font-sans">Student Name</th>
                    <th className="p-4 text-center">Section A Progress</th>
                    <th className="p-4 text-center">Section B Progress</th>
                    <th className="p-4 text-center">Warning Strikes</th>
                    <th className="p-4 text-right pr-6 font-sans">Supervisor Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5F8] bg-white font-bold text-slate-700">
                  {filteredStudents.map((st, idx) => {
                    const studentProfileId = st.student_profile_id;
                    const nameString = (st.student_name || st.name || 'UNKNOWN CANDIDATE').toUpperCase();
                    const violationsCount = parseInt(st.violations, 10) || 0;
                    const isSubmitted = st.status.includes('Submitted') || st.is_submitted == true;
                    const isNotStarted = st.status === 'Not Started';
                    const isMalpracticeLockout = st.status.includes('Malpractice') || violationsCount >= 3;
                    
                    return (
                      <tr key={studentProfileId || idx} className="hover:bg-[#FAF9FA] transition-all">
                        <td className="p-4 pl-6 font-mono font-black text-slate-900 text-xs">{st.desk || 'N/A'}</td>
                        <td className="p-4 text-slate-900 uppercase font-black text-xs font-sans truncate max-w-[180px]">{nameString}</td>
                        <td className="p-4 text-center text-[#7C6B93]">{st.objective_progress || '0 / 0'}</td>
                        <td className="p-4 text-center text-[#7C6B93]">{st.theory_progress || '0 / 0'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg font-mono text-[10px] font-black border uppercase ${isNotStarted ? 'bg-slate-50 border-slate-200 text-slate-400' : isMalpracticeLockout ? 'bg-rose-600 text-white animate-pulse border-rose-700' : violationsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-[#7C3AED] border-purple-200'}`}>
                            {isNotStarted ? 'NOT STARTED' : `${violationsCount} / 3 Strikes`}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6 font-sans">
                          <div className="flex gap-2 justify-end items-center">
                            {violationsCount > 0 && !isSubmitted && (
                              <div className="flex gap-1.5">
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'clear_override', studentId: studentProfileId, studentName: nameString })} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase rounded-xl flex items-center gap-1 cursor-pointer shadow-2xs"><RotateCcw className="w-3 h-3 text-white" /> Clear Strikes</button>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'nuclear_restart', studentId: studentProfileId, studentName: nameString })} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded-xl flex items-center gap-1 cursor-pointer shadow-2xs"><RefreshCw className="w-3 h-3 text-white" /> Restart Exam</button>
                              </div>
                            )}
                            {isNotStarted && <span className="text-[10px] font-mono font-black border px-3 py-1 rounded-xl bg-slate-50 border-slate-200 text-slate-400">ABSENT / WAITING</span>}
                            {isSubmitted && <span className="text-[10px] font-mono font-black border px-3 py-1 rounded-xl bg-emerald-50 border-emerald-200 text-emerald-700">✓ SUBMITTED</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'nuclear_restart' ? "☢️ CRITICAL HARD RESTART OVERRIDE" : "Reset Station Constraints"}
        message={
          modalConfig.type === 'nuclear_restart' ? `CRITICAL SYSTEM INTERCEPT: Wiping and hard-restarting the active exam sheet layout row for candidate ${modalConfig.studentName}? This completely flushes their synced answers database records and lets them re-start from page 1 fresh!` :
          `Are you sure you want to clear the warning strikes for student ${modalConfig.studentName}? This will instantly unlock their browser screen layout and drop strikes back to 0.`
        }
        confirmLabel={modalConfig.type === 'nuclear_restart' ? "Wipe Progress & Restart Fresh" : "Unlock Student Computer"}
        cancelLabel="Cancel"
        onConfirm={
          modalConfig.type === 'nuclear_restart' ? () => executeNuclearResetRestart(modalConfig.studentId) :
          () => executeStrikeClearanceOverride(modalConfig.studentId)
        }
        onCancel={closeModal}
        summaryData={{ "Target Student": modalConfig.studentName, "Action Context": "MONITOR_ADJUSTMENT_OVERRIDE" }}
      />
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>
    </div>
  );
}