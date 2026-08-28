import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Users, CheckCircle, Search, RotateCcw, ArrowLeft, Loader2, RefreshCw, Clock, Power, PowerOff } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function LiveMonitor({ assessmentId, onNavigateBack }) {
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState('COMPUTER SCIENCE');
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, studentId: null, studentName: '', addedMinutes: 0 });
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

        if (rawScheduledEnd) {
          const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
          const serverEndTime = new Date(targetTimeString).getTime();
          
          if (!examEndTimeRef.current || serverEndTime !== examEndTimeRef.current) {
            examEndTimeRef.current = serverEndTime;
          }
        } else if (data.students && data.students.length > 0 && !examEndTimeRef.current) {
          const maxStudentSeconds = Math.max(...data.students.map(s => parseInt(s.seconds_remaining, 10) || 0));
          if (maxStudentSeconds > 0) {
            examEndTimeRef.current = Date.now() + (maxStudentSeconds * 1000);
          }
        }
      }
    } catch (error) {
      console.error("Room telemetry connection error:", error);
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

  const executeTimeAdjustment = async (studentProfileId, minutes) => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/workstation/add-time`, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: parseInt(assessmentId, 10),
          student_profile_id: studentProfileId ? parseInt(studentProfileId, 10) : null, 
          added_minutes: parseInt(minutes, 10)
        })
      });
      if (response.ok) {
        if (examEndTimeRef.current && !studentProfileId) {
          examEndTimeRef.current += (parseInt(minutes, 10) * 60 * 1000);
        }
        triggerBannerAlert(studentProfileId ? `Successfully scheduled +${minutes} mins extra time for candidate.` : `Successfully scheduled +${minutes} mins extra time for ALL students!`, "success");
        await fetchRoomTelemetry();
      }
    } catch (err) {
      console.error(err);
      triggerBannerAlert("Failed to apply time extension.", "error");
    } finally {
      closeModal();
    }
  };

  const handleToggleStudentAccessLive = async (studentProfileId, currentActiveState) => {
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${assessmentId}/toggle-access`, {
        method: 'POST',
        body: JSON.stringify({ 
          student_profile_id: studentProfileId,
          is_active: !currentActiveState 
        })
      });
      if (res.ok) {
        triggerBannerAlert(`Student exam session successfully ${!currentActiveState ? 'activated' : 'deactivated'}.`, "success");
        await fetchRoomTelemetry();
      } else {
        throw new Error('Failed');
      }
    } catch (err) {
      console.error(err);
      triggerBannerAlert("Failed to update student access state.", "error");
    } finally {
      closeModal();
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, studentId: null, studentName: '', addedMinutes: 0 });

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
      
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center shrink-0">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Live Exam Hall Monitor</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Subject Session: {subjectMeta}</p>
          </div>
        </div>

        {/* Mass Extra Time Buttons */}
        <div className="flex items-center bg-white/20 border border-white/30 rounded-2xl px-3 py-1.5 justify-between gap-3 text-[10px] font-bold font-mono w-full sm:w-auto shadow-2xs">
          <span className="text-white uppercase font-sans text-[9px] font-black">Extra Time (All):</span>
          <button onClick={() => setModalConfig({ isOpen: true, type: 'mass_add_5', studentId: null, studentName: 'ALL STUDENTS IN ROOM', addedMinutes: 5 })} className="px-3 py-1 bg-white hover:bg-[#7C3AED] hover:text-white border border-[#E2D5F8] rounded-xl text-slate-900 font-mono font-black transition-all cursor-pointer shadow-2xs">+5m</button>
          <button onClick={() => setModalConfig({ isOpen: true, type: 'mass_add_10', studentId: null, studentName: 'ALL STUDENTS IN ROOM', addedMinutes: 10 })} className="px-3 py-1 bg-white hover:bg-[#7C3AED] hover:text-white border border-[#E2D5F8] rounded-xl text-slate-900 font-mono font-black transition-all cursor-pointer shadow-2xs">+10m</button>
        </div>
      </header>

      {notification.isVisible && (
        <div className="fixed top-20 right-6 z-[1000] p-4 border border-emerald-200 text-emerald-800 bg-emerald-50 rounded-2xl flex items-center gap-3 max-w-sm shadow-2xl font-mono text-xs uppercase">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <div className="font-sans font-bold">{notification.message}</div>
        </div>
      )}

      {/* Summary Cards */}
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
                    <th className="p-4 text-right pr-6 font-sans">Supervisor Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5F8] bg-white font-bold text-slate-700">
                  {filteredStudents.map((st, idx) => {
                    const studentProfileId = st.student_profile_id;
                    const nameString = (st.student_name || st.name || 'UNKNOWN CANDIDATE').toUpperCase();
                    const violationsCount = parseInt(st.violations, 10) || 0;
                    const statusVal = st.status || 'Not Started';
                    const isSubmitted = statusVal.includes('Submitted') || st.is_submitted == true;
                    const isLobbyConnected = statusVal === 'Lobby Connected';
                    const isNotStarted = statusVal === 'Not Started';
                    const isActiveState = st.is_active !== false;
                    const isMalpracticeLockout = statusVal.includes('Malpractice') || violationsCount >= 3;
                    const isWriting = statusVal.includes('Writing') || statusVal.includes('Progress') || (st.objective_progress && st.objective_progress !== '0 / 0');
                    
                    return (
                      <tr key={studentProfileId || idx} className="hover:bg-[#FAF9FA] transition-all">
                        <td className="p-4 pl-6 font-mono font-black text-slate-900 text-xs">{st.desk || 'N/A'}</td>
                        <td className="p-4 text-slate-900 uppercase font-black text-xs font-sans truncate max-w-[180px]">{nameString}</td>
                        <td className="p-4 text-center text-[#7C6B93]">{st.objective_progress || '0 / 0'}</td>
                        <td className="p-4 text-center text-[#7C6B93]">{st.theory_progress || '0 / 0'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg font-mono text-[10px] font-black border uppercase ${
                            isSubmitted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            isMalpracticeLockout ? 'bg-rose-600 text-white animate-pulse border-rose-700' :
                            isWriting ? 'bg-purple-50 border-purple-200 text-[#7C3AED]' :
                            isLobbyConnected ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse' :
                            'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            {isSubmitted ? '✓ SUBMITTED' :
                             isMalpracticeLockout ? `${violationsCount} / 3 Strikes` :
                             isWriting ? '✍️ Writing Exam' :
                             isLobbyConnected ? '🟢 Lobby Connected' : 
                             'Not Started'}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6 font-sans">
                          <div className="flex gap-1.5 justify-end items-center">
                            {/* Deactivate / Activate Button */}
                            <button
                              type="button"
                              onClick={() => setModalConfig({ 
                                isOpen: true, 
                                type: isActiveState ? 'deactivate_exam' : 'activate_exam', 
                                studentId: studentProfileId, 
                                studentName: nameString 
                              })}
                              className={`px-2.5 py-1.5 text-[10px] font-mono font-black uppercase rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs ${
                                isActiveState 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {isActiveState ? <PowerOff className="w-3 h-3 text-rose-600" /> : <Power className="w-3 h-3 text-emerald-600" />}
                              {isActiveState ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Clear Strikes / Restart — SHOWN ONLY WHEN STRIKES >= 3 */}
                            {violationsCount >= 3 && !isSubmitted && (
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'clear_override', studentId: studentProfileId, studentName: nameString })} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer shadow-2xs">Clear Strikes</button>
                            )}

                            {isLobbyConnected && <span className="text-[10px] font-mono font-black border px-3 py-1 rounded-xl bg-blue-50 border-blue-200 text-blue-700">ONLINE</span>}
                            {isNotStarted && <span className="text-[10px] font-mono font-black border px-3 py-1 rounded-xl bg-slate-50 border-slate-200 text-slate-400">OFFLINE</span>}
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
        title={
          modalConfig.type === 'deactivate_exam' ? "🛑 CONFIRM EXAM DEACTIVATION" :
          modalConfig.type === 'activate_exam' ? "🟢 CONFIRM EXAM ACTIVATION" :
          modalConfig.type?.startsWith('mass_add') ? "Global Class Extra Time Allocation" : "Reset Station Constraints"
        }
        message={
          modalConfig.type === 'deactivate_exam' ? `Are you sure you want to stop and deactivate the exam for student ${modalConfig.studentName}? Their active session will be immediately locked out.` :
          modalConfig.type === 'activate_exam' ? `Are you sure you want to activate/grant exam access for student ${modalConfig.studentName}?` :
          modalConfig.type?.startsWith('mass_add') ? `Confirm scheduling +${modalConfig.addedMinutes} mins extra time for ALL students in the room?` : 
          `Are you sure you want to clear warning strikes and unlock student ${modalConfig.studentName}?`
        }
        confirmLabel={modalConfig.type === 'deactivate_exam' ? "Yes, Deactivate Exam" : modalConfig.type === 'activate_exam' ? "Yes, Activate Exam" : "Confirm Action"}
        cancelLabel="Cancel"
        onConfirm={
          modalConfig.type === 'deactivate_exam' ? () => handleToggleStudentAccessLive(modalConfig.studentId, true) :
          modalConfig.type === 'activate_exam' ? () => handleToggleStudentAccessLive(modalConfig.studentId, false) :
          modalConfig.type?.startsWith('mass_add') ? () => executeTimeAdjustment(null, modalConfig.addedMinutes) : 
          () => executeStrikeClearanceOverride(modalConfig.studentId)
        }
        onCancel={closeModal}
        summaryData={{ "Target Student": modalConfig.studentName, "Action Context": "LIVE_MONITOR_OVERRIDE" }}
      />
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>
    </div>
  );
}