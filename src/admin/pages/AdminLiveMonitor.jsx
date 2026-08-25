import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShieldAlert, Monitor, Users, AlertTriangle, ShieldCheck, Loader2, Clock } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminLiveMonitor({ onNavigateBack, selectedSessionInfo }) {
  const [monitoredDesks, setMonitoredDesks] = useState([]);
  const [dynamicSupervisor, setDynamicSupervisor] = useState("Resolving Instructor...");
  const [isLoading, setIsLoading] = useState(true);

  const targetAssessmentId = 
    selectedSessionInfo?.assessment_id || 
    selectedSessionInfo?.id || 
    (selectedSessionInfo?.id ? parseInt(String(selectedSessionInfo.id).replace(/[^\d]/g, ''), 10) : null);

  const targetSubject = selectedSessionInfo?.subject || "EXAMINATION MONITOR CHANNEL";
  const targetArm = selectedSessionInfo?.arm || "GENERAL HALL";

  const [adminRoomSecondsLeft, setAdminRoomSecondsLeft] = useState(null);
  const examEndTimeRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const ingestLiveTerminalFeeds = async () => {
      if (!targetAssessmentId) {
        if (isMounted) {
          setMonitoredDesks([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await apiRequest(`api/v1/admin/surveillance/session/${targetAssessmentId}/terminals`, { method: 'GET' });
        
        if (res.ok && isMounted) {
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

            if (rawScheduledEnd && !examEndTimeRef.current) {
              const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
              examEndTimeRef.current = new Date(targetTimeString).getTime();
            } else if (payload.desks && payload.desks.length > 0 && !examEndTimeRef.current) {
              const maxSeconds = Math.max(...payload.desks.map(d => parseInt(d.seconds_remaining || d.secondsLeft || 0, 10)));
              if (maxSeconds > 0) {
                examEndTimeRef.current = Date.now() + (maxSeconds * 1000);
              }
            }
          }
        }
      } catch (err) {
        console.error("❌ [SURVEILLANCE METRIC EXCEPTION]:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    ingestLiveTerminalFeeds();
    const telemetryIntervalId = setInterval(ingestLiveTerminalFeeds, 4000);
    
    return () => {
      isMounted = false;
      clearInterval(telemetryIntervalId);
    };
  }, [targetAssessmentId, selectedSessionInfo]);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      if (!examEndTimeRef.current) return;
      
      const remainingSeconds = Math.floor((examEndTimeRef.current - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        setAdminRoomSecondsLeft(0);
      } else {
        setAdminRoomSecondsLeft(remainingSeconds);
      }
    }, 1000);

    return () => clearInterval(tickerInterval);
  }, []);

  const formatRoomCountdown = (secs) => {
    if (secs === null || secs <= 0) return '00:00';
    
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (n) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const totalFlaggedAlerts = monitoredDesks.reduce((sum, d) => sum + (d.activeStrikes > 0 ? 1 : 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Connecting to active classroom workstation monitors...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] text-[#2A1A63] font-sans flex flex-col justify-between select-none">
      
      {/* Header Banner matching AdminDashboard & Class Directory gradient style */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
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

        <span className="px-3 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-black rounded-xl uppercase tracking-widest font-mono shadow-2xs">
          🔒 READ-ONLY HALL AUDIT MODE
        </span>
      </header>

      <div className="w-full max-w-7xl mx-auto px-8 mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono shrink-0 text-left">
        <div className="p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 bg-white border border-[#E2D5F8] rounded-xl flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Room Time Remaining</span>
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
        <div className="mb-4 pb-1 border-b border-[#E2D5F8] w-full text-left">
          <span className="text-xs font-black text-[#7C6B93] uppercase tracking-wider font-mono">Live Student Workstations Seating Grid</span>
        </div>

        {monitoredDesks.length === 0 ? (
          <div className="w-full flex flex-col justify-center items-center text-center font-mono py-24 bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl shadow-xs my-auto">
            <div className="w-32 h-32 flex items-center justify-center text-[#7C3AED] mb-3">
              <img 
                src="/thinking-character.png" 
                alt="Thinking Character" 
                className="w-28 h-28 object-contain drop-shadow-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO ACTIVE STUDENT COMPUTERS ARE TRANSMITTING TELEMETRY STREAMS FOR THIS PAPER SESSION.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            {monitoredDesks.map((desk, idx) => {
              const strikeCount = desk.activeStrikes || 0;
              const hasBreaches = strikeCount > 0;
              const isLockedOut = strikeCount >= 3;
              const isNotStarted = desk.linkState === 'Not Started' || desk.linkState === 'Absent / Offline';

              return (
                <div 
                  key={desk.terminalId || idx} 
                  className={`border rounded-3xl p-5 flex flex-col justify-between h-40 transition-all shadow-2xs text-left ${
                    isNotStarted 
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
                      <span className="truncate">Desk {desk.terminalId || '00'}</span>
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
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate w-full font-sans" title={desk.candidate}>
                      {desk.candidate || 'CANDIDATE'}
                    </h4>
                    <p className="text-[10px] font-mono font-black text-[#7C6B93] truncate">ID: {desk.admission_no || 'N/A'}</p>
                    <p className={`text-[10px] font-mono font-bold truncate mt-1 ${isNotStarted ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                      {desk.progress || 'Awaiting Startup...'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E2D5F8]/60 flex justify-between items-center text-[9px] font-mono font-black uppercase tracking-wider min-w-0">
                    <span className={`truncate mr-1 px-2.5 py-1 rounded-lg ${
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
                    {isNotStarted ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    ) : isLockedOut ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>
    </div>
  );
}