import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Monitor, Users, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminLiveMonitor({ onNavigateBack, selectedSessionInfo }) {
  const [monitoredDesks, setMonitoredDesks] = useState([]);
  const [dynamicSupervisor, setDynamicSupervisor] = useState("Resolving Instructor...");
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 PARAMETER DETECTOR FALLBACKERS
  const targetAssessmentId = 
    selectedSessionInfo?.assessment_id || 
    selectedSessionInfo?.id || 
    (selectedSessionInfo?.id ? parseInt(String(selectedSessionInfo.id).replace(/[^\d]/g, ''), 10) : null);

  const targetSubject = selectedSessionInfo?.subject || "EXAMINATION MONITOR CHANNEL";
  const targetArm = selectedSessionInfo?.arm || "GENERAL HALL";

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
          }
        }
      } catch (err) {
        console.error("❌ [SURVEILLANCE METRIC EXCEPTION]:", err);
      } {
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

  const totalFlaggedAlerts = monitoredDesks.reduce((sum, d) => sum + (d.activeStrikes > 0 ? 1 : 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Connecting to active classroom workstation monitors...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none text-[#2A1A63] font-sans">
      
      {/* Upper Navigation Tracker Header */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 border border-[#9A87A9]/30 hover:border-[#2A1A63] rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">Live Class Surveillance Feed</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] uppercase font-mono tracking-tight">Active Paper: {targetSubject}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-[#C62927] bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wide shrink-0">
            🔒 READ-ONLY HALL AUDIT MODE
          </span>
        </div>
      </header>

      {/* Surveillance Summary Analytics Header Strips */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono w-full shrink-0">
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs">
          <Users className="w-5 h-5 text-[#9A87A9]" />
          <div className="text-left">
            <span className="text-[9px] font-sans font-black text-[#9A87A9] uppercase tracking-wider block">Inspecting Classroom</span>
            <p className="text-xs font-black text-slate-950 uppercase truncate">{targetArm}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs">
          <Monitor className="w-5 h-5 text-[#9A87A9]" />
          <div className="text-left">
            <span className="text-[9px] font-sans font-black text-[#9A87A9] uppercase tracking-wider block">Room Supervisor</span>
            <p className="text-xs font-black text-slate-950 uppercase truncate">{dynamicSupervisor}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl flex items-center gap-3 shadow-3xs bg-rose-50/20 border-rose-100">
          <ShieldAlert className="w-5 h-5 text-[#C62927] animate-pulse" />
          <div className="text-left">
            <span className="text-[9px] font-sans font-black text-[#C62927]/70 uppercase tracking-wider block">Flagged Student Desks</span>
            <p className="text-xs font-black text-[#C62927] uppercase">{totalFlaggedAlerts} Terminals Triggered</p>
          </div>
        </div>
      </div>

      {/* THE OMNIPRESENT TERMINAL GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto w-full">
        <div className="mb-4 pb-1 border-b border-[#FAF9FA] w-full text-left">
          <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Live Student Workstations Seating Grid</span>
        </div>

        {monitoredDesks.length === 0 ? (
          <div className="w-full text-center p-12 font-mono text-xs text-[#9A87A9] font-black uppercase tracking-wide py-24 bg-white border border-[#9A87A9]/20 rounded-xl shadow-3xs">
            No active student computers are transmitting telemetry streams for this paper session.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            {monitoredDesks.map((desk, idx) => {
              const strikeCount = desk.activeStrikes || 0;
              const hasBreaches = strikeCount > 0;
              const isLockedOut = strikeCount >= 3;

              return (
                <div key={desk.terminalId || idx} className={`border rounded-xl p-4 flex flex-col justify-between h-36 transition-all shadow-3xs bg-white ${isLockedOut ? 'border-[#C62927] ring-1 ring-[#C62927]/10' : hasBreaches ? 'border-amber-400' : 'border-[#9A87A9]/20'}`}>
                  <div className="space-y-1.5 min-w-0 text-left">
                    <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#9A87A9] border-b border-[#FAF9FA] pb-1 uppercase">
                      <span className="truncate">Desk {desk.terminalId || '00'}</span>
                      <span className={`shrink-0 tracking-tight ${isLockedOut ? 'text-[#C62927] font-black animate-pulse' : hasBreaches ? 'text-amber-600 font-black' : 'text-[#9A87A9]'}`}>
                        {strikeCount} / 3 Strikes
                      </span>
                    </div>
                    
                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight truncate w-full" title={desk.candidate}>
                      {desk.candidate || 'VACANT NODE'}
                    </h4>

                    <p className="text-[10px] font-mono font-black text-[#9A87A9] truncate">ID: {desk.admission_no || 'N/A'}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-500 truncate mt-0.5">{desk.progress || 'Awiting Startup...'}</p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-50 flex justify-between items-center text-[9px] font-mono font-black uppercase tracking-wider min-w-0">
                    <span className={`truncate mr-1 ${isLockedOut ? 'text-[#C62927]' : hasBreaches ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {desk.linkState || 'Connected'}
                    </span>
                    {isLockedOut ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#C62927] shrink-0" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Security & Surveillance Infrastructure Matrix © 2026
      </footer>

    </div>
  );
}