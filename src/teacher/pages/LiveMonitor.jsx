import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Users, CheckCircle, Search, ArrowLeft, Loader2, Clock, PlusCircle, CheckSquare, Square } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import windowEcho from '../../core/echo';

export default function LiveMonitor({ assessmentId, onNavigateBack }) {
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState('COMPUTER SCIENCE');
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    type: null, 
    studentIds: [], 
    studentName: '', 
    addedMinutes: 5 
  });
  const [notification, setNotification] = useState({ isVisible: false, type: 'success', message: '' });

  const [roomSecondsLeft, setRoomSecondsLeft] = useState(null);
  const examEndTimeRef = useRef(null);

  const triggerBannerAlert = (message, type = 'success') => {
    setNotification({ isVisible: true, type, message });
    setTimeout(() => setNotification({ isVisible: false, type: 'success', message: '' }), 6000);
  };

  const fetchRoomTelemetry = async () => {
    try {
      const response = await apiRequest(`api/v1/teacher/monitor/${assessmentId}`, { method: 'GET' });
      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setStudentStatuses(data.students || data.desks || []);
        setSubjectMeta(data.subject || 'COMPUTER SCIENCE');
        
        const rawScheduledEnd = 
          data.assessment_meta?.scheduled_end || 
          data.assessment?.scheduled_end || 
          data.session?.scheduled_end || 
          data.exam?.scheduled_end || 
          data.scheduled_end;

        if (rawScheduledEnd) {
          const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
          examEndTimeRef.current = new Date(targetTimeString).getTime();
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
  }, [assessmentId]);

  useEffect(() => {
    const channel = windowEcho.channel('exam-surveillance-channel');
    const handleTelemetryPing = () => {
      fetchRoomTelemetry();
    };

    channel.listen('.room.telemetry.updated', handleTelemetryPing);

    return () => {
      channel.stopListening('.room.telemetry.updated', handleTelemetryPing);
      windowEcho.leaveChannel('exam-surveillance-channel');
    };
  }, [assessmentId]);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      if (!examEndTimeRef.current) return;
      const remainingSeconds = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
      setRoomSecondsLeft(remainingSeconds);
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
        fetchRoomTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      closeModal();
    }
  };

  const executeTimeAdjustment = async (targetStudentIds, minutes) => {
    const parsedMins = Math.max(1, parseInt(minutes, 10) || 1);
    const idsArray = Array.isArray(targetStudentIds) ? targetStudentIds : (targetStudentIds ? [targetStudentIds] : []);

    try {
      const response = await apiRequest(`api/v1/teacher/monitor/workstation/add-time`, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: parseInt(assessmentId, 10),
          student_profile_ids: idsArray, 
          added_minutes: parsedMins
        })
      });
      const data = await response.json();
      if (response.ok && data.status === 'SUCCESS') {
        if (examEndTimeRef.current && idsArray.length === 0) {
          examEndTimeRef.current += (parsedMins * 60 * 1000);
        }

        const successNotice = idsArray.length > 0
          ? `+${parsedMins} mins granted to ${idsArray.length} candidate(s)! Inform them to press Refresh on their screen.`
          : `+${parsedMins} mins granted to ALL! Inform students to press Refresh on their screen.`;

        triggerBannerAlert(successNotice, "success");
        setSelectedStudentIds([]); // Clear selections after success
        fetchRoomTelemetry();
      } else {
        triggerBannerAlert(data.message || "Failed to apply time extension.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerBannerAlert("Failed to apply time extension.", "error");
    } finally {
      closeModal();
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, studentIds: [], studentName: '', addedMinutes: 5 });

  const formatSecondsToMinutes = (secs) => {
    if (secs === null || secs <= 0) return '00:00';
    const hours = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${m}m ${s}s`;
    return `${m}:${s}`;
  };

  const filteredStudents = React.useMemo(() => {
    const rawList = Array.isArray(studentStatuses) 
      ? studentStatuses 
      : (studentStatuses.students || studentStatuses.desks || []);

    return rawList.filter(st => {
      const name = (st.student_name || st.name || st.candidate || '').toLowerCase();
      const deskNum = (st.desk || st.terminalId || '').toLowerCase();
      return name.includes(searchFilter.toLowerCase()) || deskNum.includes(searchFilter.toLowerCase());
    });
  }, [studentStatuses, searchFilter]);

  // Checkbox Selection Controls
  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const unsubmittedStudentIds = filteredStudents
      .filter(s => !s.is_submitted && !(s.status || '').includes('Submitted'))
      .map(s => s.student_profile_id || s.id);

    if (selectedStudentIds.length === unsubmittedStudentIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(unsubmittedStudentIds);
    }
  };

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

        {/* <div className="flex items-center bg-white/20 border border-white/30 rounded-2xl px-3 py-1.5 justify-between gap-2 text-[10px] font-bold font-mono w-full sm:w-auto shadow-2xs">
          <span className="text-white uppercase font-sans text-[9px] font-black">
            {selectedStudentIds.length > 0 ? `Extra Time (${selectedStudentIds.length} Selected):` : "Extra Time (All):"}
          </span>
          <button 
            onClick={() => setModalConfig({ 
              isOpen: true, 
              type: 'add_time_batch', 
              studentIds: selectedStudentIds, 
              studentName: selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Selected Candidates` : 'ALL STUDENTS IN ROOM', 
              addedMinutes: 5 
            })} 
            className="px-3 py-1 bg-white hover:bg-[#7C3AED] hover:text-white border border-[#E2D5F8] rounded-xl text-slate-900 font-mono font-black transition-all cursor-pointer shadow-2xs"
          >
            +5m
          </button>
          <button 
            onClick={() => setModalConfig({ 
              isOpen: true, 
              type: 'add_time_batch', 
              studentIds: selectedStudentIds, 
              studentName: selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Selected Candidates` : 'ALL STUDENTS IN ROOM', 
              addedMinutes: 10 
            })} 
            className="px-3 py-1 bg-white hover:bg-[#7C3AED] hover:text-white border border-[#E2D5F8] rounded-xl text-slate-900 font-mono font-black transition-all cursor-pointer shadow-2xs"
          >
            +10m
          </button>
          <button 
            onClick={() => setModalConfig({ 
              isOpen: true, 
              type: 'add_time_batch', 
              studentIds: selectedStudentIds, 
              studentName: selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Selected Candidates` : 'ALL STUDENTS IN ROOM', 
              addedMinutes: 15 
            })} 
            className="px-3 py-1 bg-white hover:bg-[#7C3AED] hover:text-white border border-[#E2D5F8] rounded-xl text-slate-900 font-mono font-black transition-all cursor-pointer shadow-2xs"
          >
            +15m
          </button>
        </div> */}
      </header>

      {notification.isVisible && (
        <div className="fixed top-20 right-6 z-[1000] p-4 border border-emerald-200 text-emerald-900 bg-emerald-50 rounded-2xl flex items-center gap-3 max-w-md shadow-2xl font-sans text-xs">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <div className="font-extrabold uppercase tracking-tight leading-relaxed">{notification.message}</div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-8 mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0 text-left">
        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Hall Access Window Left</span>
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
            <p className="text-base font-black text-slate-900 font-mono mt-0.5">{filteredStudents.length} Students</p>
          </div>
        </div>
        
        <div className="p-4 bg-[#EBFBF3] border border-[#C6F6D5] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#C6F6D5] rounded-xl flex items-center justify-center text-[#059669] shadow-2xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-600 uppercase block">Finished Papers</span>
            <p className="text-base font-black text-slate-900 font-mono mt-0.5">
              {filteredStudents.filter(s => (s.status || '').includes('Submitted') || s.is_submitted).length} Submitted
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#FCE7EE] border border-[#F8D3DF] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#F8D3DF] rounded-xl flex items-center justify-center text-[#E11D48] shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-600 uppercase block">Screen Violations</span>
            <p className="text-base font-black text-[#E11D48] font-mono mt-0.5">
              {filteredStudents.filter(s => (s.violations || s.activeStrikes || 0) > 0 || (s.status || '').includes('Malpractice')).length} Flagged
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-6 flex flex-col justify-start">
        <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col h-[480px] overflow-hidden shadow-xs w-full text-left">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 shrink-0">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6B93]" />
              <input 
                type="text" 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Search student name..." 
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl uppercase focus:outline-none shadow-2xs" 
              />
            </div>

            {/* Batch Action Quick Trigger */}
            {selectedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setModalConfig({
                  isOpen: true,
                  type: 'add_time_batch',
                  studentIds: selectedStudentIds,
                  studentName: `${selectedStudentIds.length} Selected Candidates`,
                  addedMinutes: 5
                })}
                className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-sans font-black uppercase rounded-2xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Grant Extra Time ({selectedStudentIds.length} Selected)
              </button>
            )}
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
                    {/* Master Checkbox Header */}
                    <th className="p-4 pl-6 text-center w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.filter(s => !s.is_submitted).length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer accent-[#7C3AED]"
                        title="Select/Deselect All Active Candidates"
                      />
                    </th>
                    <th className="p-4">Desk No.</th>
                    <th className="p-4 font-sans">Student Name</th>
                    <th className="p-4 text-center">Started At</th>
                    <th className="p-4 text-center">Submitted At</th>
                    <th className="p-4 text-center">Warning Strikes</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right pr-6 font-sans">Supervisor Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5F8] bg-white font-bold text-slate-700">
                  {filteredStudents.map((st, idx) => {
                    const studentProfileId = st.student_profile_id || st.id;
                    const nameString = (st.student_name || st.name || st.candidate || st.fullName || 'UNKNOWN CANDIDATE').toUpperCase();
                    const deskLabel = st.desk || (st.terminalId ? `DESK ${st.terminalId}` : `DESK ${String(idx + 1).padStart(2, '0')}`);
                    const violationsCount = parseInt(st.violations ?? st.activeStrikes ?? 0, 10);
                    const statusVal = st.status || st.linkState || 'Not Started';
                    const isSubmitted = statusVal.includes('Submitted') || st.is_submitted == true;
                    const isLobbyConnected = statusVal === 'Lobby Connected' || statusVal === 'Connected';
                    const isMalpracticeLockout = statusVal.includes('Malpractice') || violationsCount >= 3;
                    const isWriting = statusVal.includes('Writing') || statusVal.includes('Progress') || (st.objective_progress && st.objective_progress !== '0 / 0');
                    
                    const extraSecondsGranted = parseInt(st.individual_extra_seconds || 0, 10);
                    const extraMinutesGranted = Math.floor(extraSecondsGranted / 60);
                    const isChecked = selectedStudentIds.includes(studentProfileId);

                    return (
                      <tr key={studentProfileId || idx} className={`hover:bg-[#FAF9FA] transition-all ${isChecked ? 'bg-purple-50/60' : ''}`}>
                        {/* Checkbox Cell */}
                        <td className="p-4 pl-6 text-center w-10">
                          {!isSubmitted ? (
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleSelectStudent(studentProfileId)}
                              className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer accent-[#7C3AED]"
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-black text-slate-900 text-xs">{deskLabel}</td>
                        <td className="p-4 text-slate-900 uppercase font-black text-xs font-sans truncate max-w-[180px]">{nameString}</td>
                        <td className="p-4 text-center font-mono text-[11px] text-slate-600">{st.started_at || '—'}</td>
                        <td className="p-4 text-center font-mono text-[11px] text-emerald-700 font-bold">{st.submitted_at || '—'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-black border uppercase ${
                            violationsCount >= 3 ? 'bg-rose-100 border-rose-300 text-rose-700 animate-pulse' :
                            violationsCount > 0 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                            'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            {violationsCount} / 3 Strikes
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-lg font-mono text-[10px] font-black border uppercase ${
                              isSubmitted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              isMalpracticeLockout ? 'bg-rose-600 text-white animate-pulse border-rose-700' :
                              isWriting ? 'bg-purple-50 border-purple-200 text-[#7C3AED]' :
                              isLobbyConnected ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse' :
                              'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              {isSubmitted ? '✓ SUBMITTED' :
                               isMalpracticeLockout ? 'Locked Out' :
                               isWriting ? '✍️ Writing Exam' :
                               isLobbyConnected ? '🟢 Connected' : 
                               'Not Started'}
                            </span>

                            {extraMinutesGranted > 0 && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[9px] font-mono font-black uppercase tracking-wider shadow-2xs">
                                +{extraMinutesGranted}m Extra
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right pr-6 font-sans">
                          <div className="flex gap-1.5 justify-end items-center">
                            {!isSubmitted && (
                              <button
                                type="button"
                                onClick={() => setModalConfig({
                                  isOpen: true,
                                  type: 'add_time_batch',
                                  studentIds: [studentProfileId],
                                  studentName: nameString,
                                  addedMinutes: 5
                                })}
                                className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 border border-purple-200 text-[#7C3AED] text-[10px] font-mono font-black uppercase rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Grant extra time to candidate"
                              >
                                <PlusCircle className="w-3 h-3" />
                                + Time
                              </button>
                            )}

                            {violationsCount >= 3 && !isSubmitted && (
                              <button 
                                onClick={() => setModalConfig({ 
                                  isOpen: true, 
                                  type: 'clear_override', 
                                  studentIds: [studentProfileId], 
                                  studentName: nameString,
                                  addedMinutes: 0
                                })} 
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer shadow-2xs"
                              >
                                Clear Strikes
                              </button>
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

      {/* Confirmation & Extra Time Selection Modal */}
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={
          modalConfig.type === 'add_time_batch' ? `⏰ GRANT EXTRA TIME: ${modalConfig.studentName}` : "Reset Station Constraints"
        }
        message={
          modalConfig.type === 'add_time_batch' ? `Specify the extra duration in minutes to add to ${modalConfig.studentName}. (Inform student(s) to press refresh on their screen after granting):` : 
          `Are you sure you want to clear warning strikes and unlock student ${modalConfig.studentName}?`
        }
        confirmLabel={
          modalConfig.type === 'add_time_batch' ? `Grant +${modalConfig.addedMinutes || 0}m Extra Time` :
          "Confirm Action"
        }
        cancelLabel="Cancel"
        onConfirm={
          modalConfig.type === 'add_time_batch' ? () => executeTimeAdjustment(modalConfig.studentIds, modalConfig.addedMinutes) : 
          () => executeStrikeClearanceOverride(modalConfig.studentIds[0])
        }
        onCancel={closeModal}
        summaryData={{ "Target Student(s)": modalConfig.studentName, "Action Context": "LIVE_MONITOR_OVERRIDE" }}
      >
        {modalConfig.type === 'add_time_batch' && (
          <div className="pt-3 pb-1 border-t border-slate-100 mt-3 space-y-3">
            <span className="text-[10px] font-black uppercase text-[#7C6B93] tracking-wider block text-left">
              Select or Enter Duration (Minutes):
            </span>
            <div className="grid grid-cols-5 gap-1.5 font-mono">
              {[2, 5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setModalConfig(prev => ({ ...prev, addedMinutes: mins }))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    modalConfig.addedMinutes === mins
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D5F8] hover:bg-purple-50'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-[11px] font-bold text-slate-600 font-sans uppercase">Custom Minutes:</label>
              <input
                type="number"
                min="1"
                max="180"
                value={modalConfig.addedMinutes}
                onChange={(e) => setModalConfig(prev => ({ ...prev, addedMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                className="w-24 px-3 py-1.5 border border-[#E2D5F8] rounded-xl text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-[#7C3AED] bg-white shadow-2xs"
              />
              <span className="text-xs font-mono font-bold text-slate-500">mins</span>
            </div>
          </div>
        )}
      </ConfirmationModal>
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>
    </div>
  );
}