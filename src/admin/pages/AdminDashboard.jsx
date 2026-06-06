import React, { useState } from 'react';
import { Shield, FileText, Activity, Folder, Users, Monitor, ChevronRight, Radio, CheckCircle, Clock, AlertTriangle, LogOut, ShieldAlert } from 'lucide-react';

export default function AdminDashboard({ onNavigateToApproval, onNavigateToClasses, onNavigateToLiveSurveillance, onLogOut }) {
  // 💡 STATE FOR SYSTEM LOGOUT DRAWER INTERACTION
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);

  const [systemStats] = useState({
    pendingVettingSlips: 3,
    runningExamsLive: 2,
    connectedTerminalsNode: 84
  });

  const [liveSessions] = useState([
    { id: 'session_cs', code: 'CMP 301', subject: 'COMPUTER SCIENCE', arm: 'JSS 3A', supervisor: 'Mr. Ochigbo Godswill', studentsActive: 32, alertsCount: 2, duration: '45m left' },
    { id: 'session_dp', code: 'DTP 402', subject: 'DATA PROCESSING', arm: 'SS 1 GOLD', supervisor: 'Mrs. Faith Oche', studentsActive: 24, alertsCount: 0, duration: '1h 10m left' }
  ]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none font-sans text-slate-900 relative overflow-hidden">
      
      <header className="w-full bg-slate-950 text-white px-6 py-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm">ADM</div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider">Veritas Command Center</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tight">Institutional Operator System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2.5 py-1 rounded-xs uppercase">● SERVER RUNNING</span>
            <button 
              onClick={() => setShowLogoutDrawer(true)} 
              className="p-1.5 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all active:scale-[0.95]"
              title="Terminate Admin Token"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 my-auto">
        
        {/* EXECUTIVE CARD COMMAND TIER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div onClick={onNavigateToClasses} className="p-5 bg-white border border-slate-200 hover:border-slate-900 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 border rounded-lg flex items-center justify-center text-slate-900 group-hover:bg-slate-950 group-hover:text-white transition-all"><Folder className="w-5 h-5" /></div>
              <div><span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">School Register</span><p className="text-xs font-black text-slate-950 mt-0.5">Class Directories Folder</p></div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-950 transition-all" />
          </div>

          <div onClick={onNavigateToApproval} className="p-5 bg-white border border-slate-200 hover:border-amber-500 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all"><FileText className="w-5 h-5" /></div>
              <div><span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Audits</span><p className="text-xs font-black text-amber-600 mt-0.5">{systemStats.pendingVettingSlips} Slips Pending</p></div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-amber-500 transition-all" />
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-3xs">
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><Activity className="w-5 h-5 animate-pulse" /></div>
            <div><span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Client Core Mesh</span><p className="text-xs font-black text-slate-950 mt-0.5">{systemStats.connectedTerminalsNode} Active Nodes</p></div>
          </div>
        </div>

        {/* ACTIVE ROOMS TELEMETRY GRID DISPLAY */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs h-[340px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 shrink-0">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Live Examination Surveillance Monitor Channels</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {liveSessions.map((session) => (
              <div key={session.id} className="p-4 border border-slate-100 rounded-lg bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-100 animate-pulse">LIVE</span>
                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight">{session.subject} — {session.arm}</h4>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 font-mono uppercase">Invigilator: <span className="font-sans font-bold text-slate-700">{session.supervisor}</span></p>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] font-bold">
                  {session.alertsCount > 0 ? (
                    <span className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase"><AlertTriangle className="w-3.5 h-3.5" /> {session.alertsCount} Breaches</span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase"><CheckCircle className="w-3.5 h-3.5" /> Secure</span>
                  )}
                  <button onClick={() => onNavigateToLiveSurveillance(session)} className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all active:scale-[0.96]">Infiltrate</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">Veritas Intranet Executive Security Systems</footer>

      {/* ========================================================================= */}
      {/* 💡 PREMIUM SLIDE-UP LOGOUT DRAWER OVERLAY                                 */}
      {/* ========================================================================= */}
      <div className={`fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-rose-600 p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Administrative Token Authorization?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">Terminating session closes all active network surveillance logs instantly.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto font-sans">
              <button 
                onClick={() => setShowLogoutDrawer(false)}
                className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-all"
              >
                Cancel Audit
              </button>
              <button 
                onClick={onLogOut}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md cursor-pointer transition-all font-mono"
              >
                KILL_SERVER_ACCESS_TOKEN
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}