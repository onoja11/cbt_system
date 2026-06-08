import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Monitor, Users, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';

export default function AdminLiveMonitor({ onNavigateBack, selectedSessionInfo }) {
  // Mocking real-time streaming candidate workstation data blocks changing frames over LAN
  const [monitoredDesks, setMonitoredDesks] = useState([
    { terminalId: 'T-01', candidate: 'DUNG STEPHEN NYAM', progress: '12 / 15 Tasks', activeStrikes: 0, linkState: 'Secure Fullscreen', frameColor: 'border-slate-200 bg-white' },
    { terminalId: 'T-02', candidate: 'OCHIGBO GODSWILL', progress: '15 / 15 Tasks', activeStrikes: 0, linkState: 'Secure Fullscreen', frameColor: 'border-slate-200 bg-white' },
    { terminalId: 'T-03', candidate: 'EMMANUEL AMEH', progress: '8 / 15 Tasks', activeStrikes: 2, linkState: 'Flipped Out Window blur', frameColor: 'border-amber-300 bg-amber-50/20' },
    { terminalId: 'T-04', candidate: 'FAITH OCHE', progress: '10 / 15 Tasks', activeStrikes: 3, linkState: 'HARD LOCKED OUT', frameColor: 'border-rose-400 bg-rose-50/10' },
    { terminalId: 'T-05', candidate: 'BLESSING JONATHAN', progress: '14 / 15 Tasks', activeStrikes: 0, linkState: 'Secure Fullscreen', frameColor: 'border-slate-200 bg-white' }
  ]);

  const totalFlaggedAlerts = monitoredDesks.reduce((sum, d) => sum + (d.activeStrikes > 0 ? 1 : 0), 0);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      {/* Upper Navigation Tracker Header */}
      <header className="w-full bg-slate-950 text-white px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm">ADM</div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Universal Surveillance Infiltration Stream</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Mirroring Live Screen Feed: {selectedSessionInfo?.subject || "COMPUTER SCIENCE"} Folder</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/50 border border-rose-900 px-2.5 py-1 rounded uppercase tracking-wide">
            ⚠️ OVERHEAD INTRUSION VIEW: READ-ONLY AUDIT MODE
          </span>
        </div>
      </header>

      {/* Surveillance Summary Analytics Header Strips */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Supervised Room</span>
            <p className="text-xs font-black text-slate-900 uppercase">{selectedSessionInfo?.classGroup || "Grade 9 / JSS 3"}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <Monitor className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Session Supervisor</span>
            <p className="text-xs font-black text-slate-950 uppercase">{selectedSessionInfo?.supervisor || "Faculty Instructor"}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Active Room Violations</span>
            <p className="text-xs font-black text-rose-600 uppercase">{totalFlaggedAlerts} Terminals Flagged</p>
          </div>
        </div>
      </div>

      {/* 💡 THE OMNIPRESENT TERMINAL GRID: Principal monitors focus losses live */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
        <div className="mb-4 pb-1 border-b">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Terminal Seat Matrix Roll</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {monitoredDesks.map((desk) => (
            <div key={desk.terminalId} className={`border rounded-lg p-4 flex flex-col justify-between h-36 transition-all shadow-3xs ${desk.frameColor}`}>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center font-mono text-[9px] font-bold text-slate-400 border-b pb-1 uppercase">
                  <span>Desk {desk.terminalId}</span>
                  <span className={desk.activeStrikes >= 3 ? 'text-rose-600 font-black' : desk.activeStrikes > 0 ? 'text-amber-500 font-black' : 'text-slate-400'}>
                    {desk.activeStrikes} Strikes
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight truncate">{desk.candidate}</h4>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Progress: {desk.progress}</p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wide">
                <span className={desk.activeStrikes >= 3 ? 'text-rose-600' : desk.activeStrikes > 0 ? 'text-amber-500' : 'text-emerald-600'}>
                  {desk.linkState}
                </span>
                {desk.activeStrikes >= 3 ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Master Surveillance Surveillance Layer
      </footer>

    </div>
  );
}