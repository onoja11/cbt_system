import React, { useState } from 'react';
import { Shield, FileText, Activity, Folder, CheckCircle, Monitor, ChevronRight, Radio, Clock, AlertTriangle, LogOut, ShieldAlert } from 'lucide-react';

export default function AdminDashboard({ onNavigateToApproval, onNavigateToClasses, onNavigateToArchive, onNavigateToLiveSurveillance, onLogOut }) {
  // 💡 STATE FOR SLIDE-UP LOGOUT DRAWER INTERACTION
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);

  const [systemStats] = useState({
    pendingVettingSlips: 3,
    connectedTerminalsNode: 84
  });

  const [liveSessions] = useState([
    { id: 'session_cs', code: 'CMP 301', subject: 'COMPUTER SCIENCE', arm: 'JSS 3A', supervisor: 'Mr. Ochigbo Godswill', studentsActive: 32, alertsCount: 2, duration: '45m left' },
    { id: 'session_dp', code: 'DTP 402', subject: 'DATA PROCESSING', arm: 'SS 1 GOLD', supervisor: 'Mrs. Faith Oche', studentsActive: 24, alertsCount: 0, duration: '1h 10m left' }
  ]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none font-sans text-slate-900 relative overflow-hidden w-full">
      
      {/* EXECUTIVE CONTROL HEADER BANNER */}
      <header className="w-full bg-slate-950 text-white px-4 md:px-6 py-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm shrink-0">ADM</div>
            <div className="truncate">
              <h1 className="text-xs font-black uppercase tracking-wider truncate">Veritas Command Center</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tight truncate">Institutional Operator System</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2 py-0.5 rounded-sm shrink-0">● SERVER ACTIVE</span>
            <button 
              onClick={() => setShowLogoutDrawer(true)} 
              className="p-1.5 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all shrink-0 active:scale-[0.95]"
              title="Terminate Admin Token"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 flex flex-col justify-start">
        
        {/* EXECUTIVE CARD COMMAND TIER (4-Column fluid brutalist layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono w-full shrink-0">
          
          {/* Card 1: Register */}
          <div onClick={onNavigateToClasses} className="p-4 bg-white border border-slate-200 hover:border-slate-900 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-slate-50 border rounded-lg flex items-center justify-center text-slate-900 group-hover:bg-slate-950 group-hover:text-white transition-all shrink-0"><Folder className="w-4 h-4" /></div>
              <div className="truncate"><span className="text-[9px] font-sans font-bold text-slate-400 uppercase block tracking-wider">School Register</span><p className="text-xs font-black text-slate-950 mt-0.5 truncate">Class Folders</p></div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-950 transition-all shrink-0" />
          </div>

          {/* Card 2: Vetting Audits */}
          <div onClick={onNavigateToApproval} className="p-4 bg-white border border-slate-200 hover:border-amber-500 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0"><FileText className="w-4 h-4" /></div>
              <div className="truncate"><span className="text-[9px] font-sans font-bold text-slate-400 uppercase block tracking-wider">Audits Queue</span><p className="text-xs font-black text-amber-600 mt-0.5 truncate">{systemStats.pendingVettingSlips} Slips Pending</p></div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-amber-500 transition-all shrink-0" />
          </div>

          {/* Card 3: Master Archives Vault */}
          <div onClick={onNavigateToArchive} className="p-4 bg-white border border-slate-200 hover:border-blue-600 rounded-xl flex items-center justify-between shadow-3xs cursor-pointer group transition-all w-full">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0"><CheckCircle className="w-4 h-4" /></div>
              <div className="truncate"><span className="text-[9px] font-sans font-bold text-slate-400 uppercase block tracking-wider">Exams Vault</span><p className="text-xs font-black text-blue-600 mt-0.5 truncate">Historical Logs</p></div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all shrink-0" />
          </div>

          {/* Card 4: Network Node Mesh */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-3xs w-full">
            <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0"><Activity className="w-4 h-4 animate-pulse" /></div>
            <div className="truncate"><span className="text-[9px] font-sans font-bold text-slate-400 uppercase block tracking-wider">Client Core Mesh</span><p className="text-xs font-black text-slate-950 mt-0.5 truncate">{systemStats.connectedTerminalsNode} Active Nodes</p></div>
          </div>

        </div>

        {/* ACTIVE ROOMS SURVEILLANCE FEED VIEWPORT */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-2xs min-h-[300px] lg:h-[360px] flex flex-col overflow-hidden w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 shrink-0 w-full">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Active Room Surveillance Monitor Channels</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 w-full pb-1">
            {liveSessions.map((session) => (
              <div key={session.id} className="p-4 border border-slate-100 rounded-lg bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                <div className="space-y-1 w-full sm:w-auto truncate">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-100 tracking-wide shrink-0">LIVE</span>
                    <h4 className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-tight truncate">{session.subject} — {session.arm}</h4>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 font-mono uppercase truncate">Invigilator: <span className="font-sans font-bold text-slate-700 text-xs">{session.supervisor}</span></p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 shrink-0 font-mono text-[11px] font-bold">
                  {session.alertsCount > 0 ? (
                    <span className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-wide shrink-0"><AlertTriangle className="w-3.5 h-3.5" /> {session.alertsCount} Breaches</span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wide shrink-0"><CheckCircle className="w-3.5 h-3.5" /> Secure</span>
                  )}
                  <button onClick={() => onNavigateToLiveSurveillance(session)} className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer shadow-3xs shrink-0 transition-all">Infiltrate</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase px-4 shrink-0">
        Veritas Intranet Executive Security Systems
      </footer>

      {/* ========================================================================= */}
      {/* 💡 THE COOL LOGOUT SLIDING DRAWER MODAL                                   */}
      {/* ========================================================================= */}
      <div className={`fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-rose-600 p-4 md:p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full select-none">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg flex items-center justify-center shrink-0"><ShieldAlert className="w-5 h-5" /></div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Admin Access Token?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide font-mono">Closing terminates administrative inspection control sessions immediately.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto font-sans border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
              <button onClick={() => setShowLogoutDrawer(false)} className="flex-1 md:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase rounded cursor-pointer transition-all text-center">Cancel</button>
              <button onClick={onLogOut} className="flex-1 md:flex-none px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase rounded shadow-md cursor-pointer font-mono text-center">Logout</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}