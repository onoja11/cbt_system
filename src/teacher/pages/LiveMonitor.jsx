import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, CheckCircle, Search, RotateCcw, ArrowLeft, AlertTriangle, Loader2, Clock } from 'lucide-react';
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

  const executeTimeAdjustment = async (studentProfileId, minutes) => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/workstation/add-time`, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: parseInt(assessmentId, 10),
          student_profile_id: studentProfileId ? parseInt(studentProfileId, 10) : null, 
          added_minutes: minutes
        })
      });
      if (response.ok) {
        triggerBannerAlert(
          studentProfileId 
            ? `Added +${minutes} extra minutes to the student's screen.` 
            : `Added +${minutes} extra minutes to ALL active students in the room!`, 
          "success"
        );
        await fetchRoomTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeModal();
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, studentId: null, studentName: '', addedMinutes: 0 });

  const formatSecondsToMinutes = (secs) => {
    if (secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    return `${m} Mins`;
  };

  const filteredStudents = studentStatuses.filter(st => 
    (st.student_name || st.name || '').toLowerCase().includes(searchFilter.toLowerCase()) || 
    (st.desk || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      {/* HEADER CONTROL DASHBOARD */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.97] shrink-0"><ArrowLeft className="w-4 h-4" /></button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider">Live Exam Hall Monitor</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] mt-0.5 uppercase font-mono">Subject Session: {subjectMeta}</p>
            </div>
          </div>

          <div className="flex items-center bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg p-1 justify-between gap-2 text-[10px] font-bold font-mono w-full sm:w-auto">
            <span className="text-[#9A87A9] px-1.5 uppercase font-sans text-[9px] font-black">Add Extra Time (All Students):</span>
            <button onClick={() => setModalConfig({ isOpen: true, type: 'mass_add_5', studentId: null, studentName: 'ALL STUDENTS IN ROOM', addedMinutes: 5 })} className="px-2.5 py-1 bg-white hover:bg-[#2A1A63] hover:text-white border border-[#9A87A9]/30 rounded-md text-slate-900 font-mono font-black transition-all cursor-pointer shadow-3xs">+5 Mins</button>
            <button onClick={() => setModalConfig({ isOpen: true, type: 'mass_add_10', studentId: null, studentName: 'ALL STUDENTS IN ROOM', addedMinutes: 10 })} className="px-2.5 py-1 bg-white hover:bg-[#2A1A63] hover:text-white border border-[#9A87A9]/30 rounded-md text-slate-900 font-mono font-black transition-all cursor-pointer shadow-3xs">+10 Mins</button>
          </div>
        </div>
      </header>

      {/* SUCCESS TOAST PIPELINE NOTIFIER */}
      {notification.isVisible && (
        <div className="fixed top-20 right-6 z-[1000] p-4 border border-emerald-200 text-emerald-800 bg-emerald-50 rounded-xl flex items-center gap-3 max-w-sm shadow-xl font-mono text-xs uppercase animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <div className="font-sans font-bold">{notification.message}</div>
        </div>
      )}

      {/* CLUSTER HALL METRICS INFRASTRUCTURE PANEL */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs">
          <Users className="w-5 h-5 text-[#2A1A63]" />
          <div>
            <span className="text-[9px] font-black text-[#9A87A9] uppercase font-mono block">Active Desks</span>
            <p className="text-xs font-black text-slate-950 font-mono">{studentStatuses.length} Computers</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div>
            <span className="text-[9px] font-black text-[#9A87A9] uppercase font-mono block">Finished Papers</span>
            <p className="text-xs font-black text-slate-950 font-mono">{studentStatuses.filter(s => s.status.includes('Submitted') || s.is_submitted).length} Submitted</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs bg-rose-50/20 border-rose-100">
          <ShieldAlert className="w-5 h-5 text-[#C62927]" />
          <div>
            <span className="text-[9px] font-black text-[#C62927]/70 uppercase font-mono block">Screen Violations</span>
            <p className="text-xs font-black text-[#C62927] font-mono">{studentStatuses.filter(s => (s.violations || 0) > 0 || s.status.includes('Malpractice')).length} Flagged Desks</p>
          </div>
        </div>
      </div>

      {/* CORE WORKSTATIONS REGISTRY DATA CONTAINER GRID */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col justify-start">
        <div className="bg-white border border-[#9A87A9]/30 rounded-xl p-4 md:p-5 flex flex-col h-[460px] overflow-hidden shadow-3xs w-full">
          
          <div className="relative mb-4 max-w-xs shrink-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A87A9]" />
            <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search student name or computer number..." className="w-full pl-9 pr-3 py-2 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 placeholder-[#9A87A9]/70 focus:outline-none focus:border-[#2A1A63] rounded-lg uppercase" />
          </div>

          <div className="flex-1 overflow-y-auto border border-[#FAF9FA] rounded-lg w-full">
            {isLoading ? (
              <div className="p-12 text-center text-xs font-mono text-[#9A87A9] uppercase tracking-widest flex flex-col items-center justify-center gap-2 py-24">
                <Loader2 className="w-4 h-4 animate-spin text-[#2A1A63]" />
                Connecting to testing workstations database...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-[#9A87A9] uppercase tracking-wider py-24">
                No active exam sessions running in the room matrix.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs font-medium text-slate-700">
                <thead className="bg-[#FAF9FA] border-b border-[#9A87A9]/20 font-mono font-black uppercase text-[9px] text-[#9A87A9] sticky top-0 z-10">
                  <tr>
                    <th className="p-3 px-4">Desk No.</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Time Remaining</th>
                    <th className="p-3">Section A Progress</th>
                    <th className="p-3">Section B Progress</th>
                    <th className="p-3">Warning Strikes</th>
                    <th className="p-3 text-right px-4">Supervisor Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold text-slate-700">
                  {filteredStudents.map((st, idx) => {
                    const studentProfileId = st.student_profile_id;
                    const nameString = (st.student_name || 'UNKNOWN CANDIDATE').toUpperCase();
                    const violationsCount = st.violations || 0;
                    const isSubmitted = st.status.includes('Submitted') || st.is_submitted == true;
                    const isMalpracticeLockout = st.status.includes('Malpractice');
                    
                    return (
                      <tr key={studentProfileId || idx} className="hover:bg-[#FAF9FA]/30 transition-all">
                        <td className="p-3 px-4 font-mono font-black text-slate-950 text-[11px]">{st.desk || 'N/A'}</td>
                        <td className="p-3 text-slate-950 uppercase font-black text-xs truncate max-w-[160px]">{nameString}</td>
                        <td className="p-3 font-mono font-black text-slate-900">
                          {isSubmitted ? (
                            <span className="text-slate-300 font-normal">--</span>
                          ) : (
                            <span className={st.seconds_remaining < 300 ? 'text-[#C62927] animate-pulse font-black' : 'text-slate-900'}>
                              {formatSecondsToMinutes(st.seconds_remaining)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[#9A87A9]">{st.objective_progress || '0 / 0'}</td>
                        <td className="p-3 font-mono text-[#9A87A9]">{st.theory_progress || '0 / 0'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${isMalpracticeLockout || violationsCount >= 3 ? 'bg-[#C62927] text-white animate-pulse' : violationsCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#FAF9FA] text-[#9A87A9]'}`}>
                            {violationsCount} / 3 Strikes
                          </span>
                        </td>
                        <td className="p-3 text-right px-4">
                          <div className="flex gap-1.5 justify-end items-center">
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 hidden md:block ${
                              isSubmitted ? (isMalpracticeLockout ? 'bg-[#C62927]' : 'bg-[#2A1A63]') : 
                              violationsCount >= 3 ? 'bg-[#C62927] animate-ping' : 'bg-emerald-500'
                            }`} />

                            {!isSubmitted && (
                              <>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'add_time_5', studentId: studentProfileId, studentName: nameString, addedMinutes: 5 })} className="px-2 py-1 border border-[#9A87A9]/40 hover:border-[#2A1A63] text-[#2A1A63] hover:bg-white text-[10px] font-mono font-black uppercase rounded-md transition-all cursor-pointer shadow-3xs">+5 Mins</button>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'add_time_10', studentId: studentProfileId, studentName: nameString, addedMinutes: 10 })} className="px-2 py-1 border border-[#9A87A9]/40 hover:border-[#2A1A63] text-[#2A1A63] hover:bg-white text-[10px] font-mono font-black uppercase rounded-md transition-all cursor-pointer shadow-3xs">+10 Mins</button>
                              </>
                            )}

                            {violationsCount > 0 && !isSubmitted && (
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'clear_override', studentId: studentProfileId, studentName: nameString })} className="px-2 py-1 bg-[#2A1A63] hover:opacity-90 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-md"><RotateCcw className="w-3 h-3" /> Reset Screen</button>
                            )}

                            {isSubmitted && (
                              <span className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-md ${
                                isMalpracticeLockout 
                                  ? 'bg-rose-50 border-rose-200 text-[#C62927]' 
                                  : 'bg-[#FAF9FA] border-[#9A87A9]/30 text-[#9A87A9]'
                              }`}>
                                {isMalpracticeLockout ? 'LOCKED OUT' : '✓ SUBMITTED'}
                              </span>
                            )}
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

      {/* CONFIRMATION OVERLAYS CONTROL MODAL */}
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={
          modalConfig.type?.startsWith('mass_add') ? "Global Class Extra Time Allocation" :
          modalConfig.type?.startsWith('add_time') ? "Individual Extra Time Allocation" : "Reset Station Constraints"
        }
        message={
          modalConfig.type?.startsWith('mass_add') ? `Confirm adding +${modalConfig.addedMinutes} extra minutes onto EVERY single student currently writing in the room?` :
          modalConfig.type?.startsWith('add_time') ? `Confirm pushing +${modalConfig.addedMinutes} extra minutes directly to student ${modalConfig.studentName}'s computer?` :
          `Are you sure you want to clear the warning strikes for student ${modalConfig.studentName}? This will instantly unlock their browser screen and reset their strike counter back to 0.`
        }
        confirmLabel={modalConfig.type?.startsWith('mass_add') ? "Add Time to All" : modalConfig.type?.startsWith('add_time') ? "Add Extra Time" : "Unlock Student Computer"}
        cancelLabel="Cancel"
        onConfirm={
          modalConfig.type?.startsWith('mass_add') ? () => executeTimeAdjustment(null, modalConfig.addedMinutes) :
          modalConfig.type?.startsWith('add_time') ? () => executeTimeAdjustment(modalConfig.studentId, modalConfig.addedMinutes) :
          () => executeStrikeClearanceOverride(modalConfig.studentId)
        }
        onCancel={closeModal}
        summaryData={{
          "Target Computer Seating": modalConfig.studentName,
          "Action Context": modalConfig.type?.startsWith('mass_add') ? `MASS_TIME_EXTENSION_PLUS_${modalConfig.addedMinutes}M` : modalConfig.type?.startsWith('add_time') ? `INDIVIDUAL_TIME_EXTENSION_PLUS_${modalConfig.addedMinutes}M` : "STRIKES_RESET_UNLOCK"
        }}
      />

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Corporate Examination Monitoring Node Cluster
      </footer>

    </div>
  );
}