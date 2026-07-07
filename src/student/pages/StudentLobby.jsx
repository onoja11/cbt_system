import React, { useState, useEffect } from 'react';
import { ShieldAlert, BookOpen, Clock, Loader2, Lock, AlertTriangle, MonitorCheck, LogOut } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function StudentLobby({ student, onLaunchWorkspace, onLogoutSuccess }) {
  const [activeExam, setActiveExam] = useState(null);
  const [lobbyState, setLobbyState] = useState('INGESTING'); 
  const [serverMessage, setServerMessage] = useState('');
  const [isFullscreenApproved, setIsFullscreenApproved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const checkExamEligibilityFeed = async () => {
    try {
      const response = await apiRequest('api/v1/student/lobby/active-feed', { method: 'GET' });
      const data = await response.json();

      if (data.status === 'ALREADY_SUBMITTED') {
        setLobbyState('SUBMITTED_LOCKOUT');
        setServerMessage(data.message);
      } else if (data.status === 'SUCCESS' && data.exam) {
        setActiveExam(data.exam);
        setLobbyState('READY');
      } else {
        setLobbyState('NO_EXAM');
      }
    } catch (error) {
      console.error(error);
      setLobbyState('NO_EXAM');
    }
  };

  useEffect(() => {
    checkExamEligibilityFeed();
    const handleScreenSizeTracker = () => {
      setIsFullscreenApproved(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleScreenSizeTracker);
    return () => document.removeEventListener('fullscreenchange', handleScreenSizeTracker);
  }, []);

  const executeTerminalLogout = async () => {
    try {
      setIsLogoutModalOpen(false);
      setIsLoggingOut(true);
      localStorage.clear();
      sessionStorage.clear();
      if (typeof onLogoutSuccess === 'function') {
        onLogoutSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleRequestSecureExamSession = () => {
    const docEl = document.documentElement;
    if (typeof onLaunchWorkspace !== 'function') {
      alert("System configuration callback missing. Please inform your coordinator.");
      return;
    }

    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => {
          setIsFullscreenApproved(true);
          onLaunchWorkspace(activeExam.id);
        })
        .catch((err) => {
          console.warn(err);
          setIsFullscreenApproved(false);
          onLaunchWorkspace(activeExam.id);
        });
    } else {
      onLaunchWorkspace(activeExam.id);
    }
  };

  if (lobbyState === 'INGESTING' || isLoggingOut) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        {isLoggingOut ? "Signing out of your secure station..." : "Checking for active school papers..."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      {/* BRAND HEADER BAR */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-4xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-[#2A1A63] text-white font-black text-xs flex items-center justify-center rounded-lg shrink-0 uppercase shadow-sm">
              {student?.initials || student?.name?.substring(0, 2).toUpperCase() || 'ST'}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-slate-950 leading-none uppercase truncate">{student?.name || 'Student Candidate'}</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] mt-1 uppercase tracking-wider font-mono truncate">
                ID: {student?.id || 'VTS-2026'} // {student?.details?.class_group || 'STARTRITE REPOSITORIES'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[10px] font-mono font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded hidden sm:block tracking-wide">
              Station Ready
            </div>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 hover:border-rose-300 text-[#C62927] hover:bg-rose-50/40 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-3xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* CENTER DESK CARD HUB */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col justify-center items-center my-auto">
        
        {/* CASE 1: PAPERS RE-ENTRY LOCKOUT */}
        {lobbyState === 'SUBMITTED_LOCKOUT' && (
          <div className="w-full max-w-md bg-white border border-[#9A87A9]/30 rounded-xl p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-[#C62927] rounded-full flex items-center justify-center mx-auto shadow-3xs">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Assessment Completed</h3>
              <p className="text-[10px] text-[#C62927] font-black font-mono uppercase tracking-wider">Access Locked: Script Already Submitted</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed pt-2">
                {serverMessage || "You have successfully finished and locked your answers for this assessment. Multiple attempts are blocked by system settings."}
              </p>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-mono text-[#9A87A9] font-bold uppercase bg-[#FAF9FA] border border-[#9A87A9]/20 p-2.5 rounded-lg">
                Please speak with the hall coordinator if this is a mistake.
              </p>
            </div>
          </div>
        )}

        {/* CASE 2: IDLE TIMELINE NO PAPERS READY */}
        {lobbyState === 'NO_EXAM' && (
          <div className="w-full max-w-md bg-white border border-[#9A87A9]/30 rounded-xl p-8 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-[#FAF9FA] border border-[#9A87A9]/20 text-[#9A87A9] rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-[#C62927]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">Waiting for Paper</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">
                There are currently no active question sheets assigned to your class stream right now. Please sit quietly until your teacher starts the session.
              </p>
            </div>
            <button onClick={checkExamEligibilityFeed} className="mt-2 px-4 py-2 bg-[#2A1A63] text-white font-black text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-all active:scale-[0.98]">
              Refresh Waiting Room Feed
            </button>
          </div>
        )}

        {/* CASE 3: READY TO START TEST MODULE */}
        {lobbyState === 'READY' && activeExam && (
          <div className="w-full max-w-lg bg-white border border-[#9A87A9]/30 rounded-xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[9px] font-black font-mono uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                Question Sheet Ready
              </span>
              <h3 className="text-base font-black text-slate-950 uppercase mt-2 tracking-tight leading-snug">
                {activeExam.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-xl flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#9A87A9] shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-[#9A87A9] uppercase font-mono block">Allowed Time</span>
                  <p className="text-xs font-black text-slate-800 font-mono uppercase">{activeExam.duration} Minutes</p>
                </div>
              </div>
              <div className="p-3 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-xl flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#9A87A9] shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-[#9A87A9] uppercase font-mono block">Test Medium</span>
                  <p className="text-xs font-black text-slate-800 font-mono uppercase">Computer-Based Examination</p>
                </div>
              </div>
            </div>

            {/* CLEAR EASY TO UNDERSTAND RULES INSIDE INTUATIVE BOX */}
            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2 text-xs font-medium text-slate-600 leading-relaxed">
              <div className="flex items-center gap-2 text-slate-950 font-black uppercase text-[10px] font-mono tracking-tight pb-1 border-b border-rose-100 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[#C62927] shrink-0" />
                Important Exam Instructions:
              </div>
              <p className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-950 font-black font-mono shrink-0">1.</span>
                Starting the test forces a secure fullscreen layout. Leaving the fullscreen view will alert your supervisor and add a warning strike to your screen.
              </p>
              <p className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-950 font-black font-mono shrink-0">2.</span>
                Do not attempt to right-click, copy questions, or paste content into answer areas. These actions are completely disabled.
              </p>
              <p className="flex items-start gap-2 text-[11px] text-[#C62927]">
                <span className="font-mono font-black shrink-0">3.</span>
                <span className="font-black">If you receive up to 3 warning strikes, the application locks you out immediately and auto-submits your test paper script straight to the teacher.</span>
              </p>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleRequestSecureExamSession}
                className="w-full py-3.5 bg-[#2A1A63] text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                Launch Secure Exam Workspace
              </button>
            </div>
          </div>
        )}

      </main>

      {/* CONFIRMATION INJECTION TERMINALS CLOSE TRIGGER */}
      <ConfirmationModal 
        isOpen={isLogoutModalOpen}
        title="Sign Out of Station"
        message="Are you completely sure you want to exit your student terminal room context now?"
        confirmLabel="Confirm Exit"
        cancelLabel="Stay in Lobby"
        onConfirm={executeTerminalLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        summaryData={{
          "Student User": student?.name?.toUpperCase() || "CANDIDATE NODE",
          "Terminal Key Scope": student?.id || "VTS-2026",
          "Action Context": "LOGOUT_TERMINATION"
        }}
      />

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-3 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Intranet CBT Registry © 2026
      </footer>

    </div>
  );
}