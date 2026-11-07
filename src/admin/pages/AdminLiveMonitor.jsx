import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, ShieldAlert, Monitor, Users, AlertTriangle, ShieldCheck, Loader2, Clock, PlusCircle, Zap, CheckSquare, Square } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';
import windowEcho from '../../core/echo';

export default function AdminLiveMonitor({ onNavigateBack, selectedSessionInfo }) {
  const [monitoredDesks, setMonitoredDesks] = useState([]);
  const [dynamicSupervisor, setDynamicSupervisor] = useState("Resolving Instructor...");
  const [isLoading, setIsLoading] = useState(true);

  // Multi-student selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Time Grant Modal State
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [targetStudentsForTime, setTargetStudentsForTime] = useState([]); // Array of desk objects or single desk
  const [timeToAddMinutes, setTimeToAddMinutes] = useState(5);
  const [isGrantingTime, setIsGrantingTime] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const targetAssessmentId = useMemo(() => {
    return (
      selectedSessionInfo?.assessment_id || 
      selectedSessionInfo?.id || 
      (selectedSessionInfo?.id ? parseInt(String(selectedSessionInfo.id).replace(/[^\d]/g, ''), 10) : null)
    );
  }, [selectedSessionInfo]);

  const targetSubject = selectedSessionInfo?.subject || "EXAMINATION MONITOR CHANNEL";
  const targetArm = selectedSessionInfo?.arm || "GENERAL HALL";

  const [adminRoomSecondsLeft, setAdminRoomSecondsLeft] = useState(null);
  const examEndTimeRef = useRef(null);

  const ingestLiveTerminalFeeds = useCallback(async () => {
    if (!targetAssessmentId) {
      setMonitoredDesks([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/surveillance/session/${targetAssessmentId}/terminals`, { method: 'GET' });
      
      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.status === 'SUCCESS') {
          if (payload.desks) setMonitoredDesks(payload.desks);
          if (payload.supervisor) setDynamicSupervisor(payload.supervisor);
          
          const rawScheduledEnd = 
            payload.assessment_meta?.scheduled_end || 
            payload.session?.scheduled_end || 
            payload.assessment?.scheduled_end || 
            payload.exam?.scheduled_end || 
            payload.scheduled_end ||
            selectedSessionInfo?.scheduled_end;

          if (rawScheduledEnd) {
            const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
            examEndTimeRef.current = new Date(targetTimeString).getTime();
          }
        }
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoading(false);
    }
  }, [targetAssessmentId, selectedSessionInfo]);

  useEffect(() => {
    ingestLiveTerminalFeeds();
  }, [ingestLiveTerminalFeeds]);

  useEffect(() => {
    if (!targetAssessmentId) return;

    const surveillanceChannel = windowEcho.channel('exam-surveillance-channel');
    const roomChannel = windowEcho.channel(`room-${targetAssessmentId}`);

    const handleAdminPing = () => { ingestLiveTerminalFeeds(); };

    const handleRoomCommand = (event) => {
      const commandData = event?.commandData || event?.data?.commandData || event?.data || event;
      if (commandData) {
        const action = commandData?.action;
        const targetStudentId = commandData?.student_profile_id || commandData?.studentProfileId;
        const addedMinutes = commandData?.added_minutes || commandData?.addedMinutes;

        if (action === 'ADD_TIME' && addedMinutes) {
          const addedSecs = parseInt(addedMinutes, 10) * 60;

          if (targetStudentId) {
            setMonitoredDesks(prevDesks => prevDesks.map(d => {
              if (String(d.student_profile_id) === String(targetStudentId)) {
                return {
                  ...d,
                  individual_extra_seconds: (d.individual_extra_seconds || 0) + addedSecs
                };
              }
              return d;
            }));
          }
        }
      }
      ingestLiveTerminalFeeds();
    };

    surveillanceChannel.listen('.room.telemetry.updated', handleAdminPing);
    roomChannel.listen('.terminal.command.executed', handleRoomCommand);

    return () => {
      surveillanceChannel.stopListening('.room.telemetry.updated', handleAdminPing);
      roomChannel.stopListening('.terminal.command.executed', handleRoomCommand);
      windowEcho.leaveChannel('exam-surveillance-channel');
      windowEcho.leaveChannel(`room-${targetAssessmentId}`);
    };
  }, [targetAssessmentId, ingestLiveTerminalFeeds]);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      if (!examEndTimeRef.current) return;
      const remainingSeconds = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
      setAdminRoomSecondsLeft(remainingSeconds);
    }, 1000);

    return () => clearInterval(tickerInterval);
  }, []);

  const formatRoomCountdown = (secs) => {
    if (secs === null || secs <= 0) return '00:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const totalFlaggedAlerts = useMemo(() => {
    return monitoredDesks.reduce((sum, d) => sum + (d.activeStrikes > 0 ? 1 : 0), 0);
  }, [monitoredDesks]);

  // Checkbox toggle handlers
  const toggleSelectStudent = (studentProfileId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentProfileId) 
        ? prev.filter(id => id !== studentProfileId)
        : [...prev, studentProfileId]
    );
  };

  const activeUnsubmittedDesks = useMemo(() => {
    return monitoredDesks.filter(d => 
      d.linkState !== 'Not Started' && 
      d.linkState !== 'Absent / Offline' && 
      !d.is_submitted
    );
  }, [monitoredDesks]);

  const toggleSelectAll = () => {
    const allActiveIds = activeUnsubmittedDesks.map(d => d.student_profile_id || d.id);
    if (selectedStudentIds.length === allActiveIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allActiveIds);
    }
  };

  const openTimeModalForTarget = (targetDesks, defaultMins = 5) => {
    setTargetStudentsForTime(Array.isArray(targetDesks) ? targetDesks : [targetDesks]);
    setTimeToAddMinutes(defaultMins);
    setFeedbackMsg(null);
    setIsTimeModalOpen(true);
  };

  const handleGrantTimeSubmit = async () => {
    if (!targetAssessmentId) return;

    const parsedMins = Math.max(1, parseInt(timeToAddMinutes, 10) || 1);
    const targetIds = targetStudentsForTime.map(d => d.student_profile_id || d.id).filter(Boolean);

    setIsGrantingTime(true);
    setFeedbackMsg(null);

    try {
      const res = await apiRequest('api/v1/teacher/monitor/workstation/add-time', {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: targetAssessmentId,
          student_profile_ids: targetIds, // Array of selected student IDs (empty array means all students)
          student_profile_id: targetIds.length === 1 ? targetIds[0] : null,
          added_minutes: parsedMins
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        const targetLabel = targetIds.length > 0 
          ? `Granted ${parsedMins} extra mins to ${targetIds.length} selected candidate(s).`
          : `Granted ${parsedMins} extra mins to ALL students in the room.`;

        setFeedbackMsg(`${targetLabel} Remind students to press refresh on their screen!`);
        setSelectedStudentIds([]); // Clear selections on success

        setTimeout(() => {
          setIsTimeModalOpen(false);
          setFeedbackMsg(null);
        }, 1800);

        ingestLiveTerminalFeeds();
      } else {
        setFeedbackMsg(data.message || 'Failed to adjust student time.');
      }
    } catch {
      setFeedbackMsg('Network error updating student time.');
    } finally {
      setIsGrantingTime(false);
    }
  };

  if (isLoading && monitoredDesks.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Connecting to active classroom workstation monitors...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] text-[#2A1A63] font-sans flex flex-col justify-between select-none">
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Live Class Surveillance Feed</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Active Paper: {targetSubject}</p>
          </div>
        </div>

        
      </header>

      <div className="w-full max-w-7xl mx-auto px-8 mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono shrink-0 text-left">
        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Hall Access Window Left</span>
            <p className={`text-base font-black font-mono mt-0.5 ${adminRoomSecondsLeft !== null && adminRoomSecondsLeft <= 300 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {adminRoomSecondsLeft !== null ? formatRoomCountdown(adminRoomSecondsLeft) : 'Synchronizing...'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Inspecting Classroom</span>
            <p className="text-base font-black text-slate-900 uppercase truncate mt-0.5">{targetArm}</p>
          </div>
        </div>

        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Room Supervisor</span>
            <p className="text-base font-black text-slate-900 uppercase truncate mt-0.5">{dynamicSupervisor}</p>
          </div>
        </div>

        <div className="p-4 bg-[#FCE7EE] border border-[#F8D3DF] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#F8D3DF] rounded-xl flex items-center justify-center text-[#E11D48] shadow-2xs">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-600 uppercase block">Flagged Student Desks</span>
            <p className="text-base font-black text-[#E11D48] uppercase mt-0.5">{totalFlaggedAlerts} Terminals Triggered</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 flex flex-col justify-start">
        {/* Selection Bar & Control Row */}
        <div className="mb-4 pb-2 border-b border-[#E2D5F8] w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-[#7C6B93] uppercase tracking-wider font-mono">
              Live Student Workstations Seating Grid
            </span>
            {activeUnsubmittedDesks.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-2.5 py-1 bg-white border border-[#E2D5F8] rounded-xl text-[10px] font-extrabold uppercase text-slate-700 hover:bg-purple-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {selectedStudentIds.length === activeUnsubmittedDesks.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#7C3AED]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {selectedStudentIds.length === activeUnsubmittedDesks.length ? 'Deselect All' : 'Select All Active'}
                </span>
              </button>
            )}
          </div>

          {/* Batch Extra Time Trigger Button when checkboxes are selected */}
          {selectedStudentIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const selectedDesks = monitoredDesks.filter(d => selectedStudentIds.includes(d.student_profile_id || d.id));
                openTimeModalForTarget(selectedDesks, 5);
              }}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-sans font-black uppercase rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Grant Extra Time ({selectedStudentIds.length} Selected)</span>
            </button>
          )}
        </div>

        {monitoredDesks.length === 0 ? (
          <div className="w-full flex flex-col justify-center items-center text-center font-mono py-24 bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl shadow-xs my-auto">
            <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">
              NO ACTIVE STUDENT COMPUTERS ARE TRANSMITTING TELEMETRY STREAMS FOR THIS PAPER SESSION.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            {monitoredDesks.map((desk, idx) => {
              const studentProfileId = desk.student_profile_id || desk.id;
              const strikeCount = desk.activeStrikes || 0;
              const hasBreaches = strikeCount > 0;
              const isLockedOut = strikeCount >= 3;
              const isNotStarted = desk.linkState === 'Not Started' || desk.linkState === 'Absent / Offline';
              const isSubmitted = desk.is_submitted || (desk.linkState || '').includes('Submitted');
              const extraSecs = desk.individual_extra_seconds || 0;
              const isChecked = selectedStudentIds.includes(studentProfileId);

              return (
                <div 
                  key={desk.terminalId || idx} 
                  className={`border rounded-3xl p-5 flex flex-col justify-between h-56 transition-all shadow-2xs text-left relative ${
                    isChecked
                      ? 'border-[#7C3AED] ring-2 ring-[#7C3AED] bg-purple-50/50'
                      : isNotStarted 
                        ? 'border-dashed border-slate-300 bg-slate-50/70 opacity-80' 
                        : isLockedOut 
                          ? 'border-rose-500 ring-2 ring-rose-500/20 bg-white' 
                          : hasBreaches 
                            ? 'border-amber-400 bg-white' 
                            : 'border-[#E2D5F8] bg-white hover:border-[#7C3AED]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#7C6B93] border-b border-[#E2D5F8]/60 pb-1.5 uppercase">
                      {/* Workstation Checkbox Selection Control */}
                      <div className="flex items-center gap-1.5 truncate">
                        {!isSubmitted && !isNotStarted ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectStudent(studentProfileId)}
                            className="w-4 h-4 rounded border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer accent-[#7C3AED]"
                          />
                        ) : null}
                        <span className="truncate">Desk {desk.terminalId || '00'}</span>
                      </div>

                      <span className={`shrink-0 tracking-tight px-2 py-0.5 rounded-lg font-black ${
                        isNotStarted 
                          ? 'bg-slate-200 text-slate-600' 
                          : isLockedOut 
                            ? 'bg-rose-100 text-rose-700 animate-pulse' 
                            : hasBreaches 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-purple-50 text-[#7C3AED]'
                      }`}>
                        {isNotStarted ? 'NOT STARTED' : `${strikeCount} / 3 Strikes`}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate w-full font-sans mt-1" title={desk.candidate}>
                      {desk.candidate || 'CANDIDATE'}
                    </h4>

                    {extraSecs > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md border border-purple-200/80 w-max">
                        <Zap className="w-3 h-3 fill-[#7C3AED] text-[#7C3AED] shrink-0" />
                        <span>+{Math.round(extraSecs / 60)}m Extra Time</span>
                      </div>
                    )}

                    <p className="text-[10px] font-mono font-black text-[#7C6B93] truncate">ID: {desk.admission_no || 'N/A'}</p>
                    <p className={`text-[10px] font-mono font-bold truncate mt-1 ${isNotStarted ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                      {desk.progress || 'Awaiting Startup...'}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#E2D5F8]/60 flex justify-between items-center text-[9px] font-mono font-black uppercase tracking-wider min-w-0">
                    <span className={`truncate mr-1 px-2 py-0.5 rounded-lg ${
                      isNotStarted 
                        ? 'bg-slate-200/80 text-slate-600 font-bold' 
                        : isLockedOut 
                          ? 'text-rose-600' 
                          : hasBreaches 
                            ? 'text-amber-600' 
                            : 'text-emerald-600'
                    }`}>
                      {desk.linkState || 'Connected'}
                    </span>

                    {!isNotStarted && !isSubmitted && (
                      <button
                        onClick={() => openTimeModalForTarget(desk, 5)}
                        className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-[#7C3AED] rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Grant extra time to this candidate"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>+ Time</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Grant Extra Time Modal */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[25000] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl space-y-5 text-left border border-[#E2D5F8]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
                <Clock className="w-5 h-5 text-[#7C3AED] shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">
                  {targetStudentsForTime.length > 1 
                    ? `Grant Time (${targetStudentsForTime.length} Candidates)` 
                    : targetStudentsForTime.length === 1 
                      ? 'Grant Extra Time' 
                      : 'Grant Extra Time (All Room)'}
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {targetStudentsForTime.length > 1 ? (
                  <span>Adding extra exam minutes for <span className="font-extrabold text-slate-900">{targetStudentsForTime.length} selected candidates</span>.</span>
                ) : targetStudentsForTime.length === 1 ? (
                  <span>Adding extra exam minutes for <span className="font-extrabold text-slate-900">{targetStudentsForTime[0]?.candidate}</span>.</span>
                ) : (
                  <span>Adding extra exam minutes for <span className="font-extrabold text-slate-900">ALL students in the room</span>.</span>
                )}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#7C6B93] block">
                Select or Enter Duration (Minutes):
              </label>
              
              {/* Duration Presets */}
              <div className="grid grid-cols-5 gap-1.5 font-mono">
                {[2, 5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimeToAddMinutes(mins)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      timeToAddMinutes === mins
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                        : 'bg-white text-slate-700 border-[#E2D5F8] hover:bg-purple-50'
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>

              {/* Custom Minutes Input Field */}
              <div className="flex items-center gap-2 pt-1">
                <label className="text-[11px] font-bold text-slate-600 font-sans uppercase">Custom Minutes:</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={timeToAddMinutes}
                  onChange={(e) => setTimeToAddMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 border border-[#E2D5F8] rounded-xl text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-[#7C3AED] bg-white shadow-2xs"
                />
                <span className="text-xs font-mono font-bold text-slate-500">mins</span>
              </div>
            </div>

            {feedbackMsg && (
              <p className="text-xs font-bold text-purple-700 bg-purple-50 p-3 rounded-xl border border-purple-100 leading-relaxed">
                {feedbackMsg}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsTimeModalOpen(false); setFeedbackMsg(null); }} 
                className="flex-1 py-3 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={isGrantingTime} 
                onClick={handleGrantTimeSubmit} 
                className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.97]"
              >
                {isGrantingTime && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Grant Time
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite institutional security matrix
      </footer>
    </div>
  );
}