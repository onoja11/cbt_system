import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal, Lock } from 'lucide-react';

export default function SecurityProvider({ children, onSecurityViolation }) {
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  useEffect(() => {
    // 💡 BLOCKS CLIPBOARD SHORTCUTS AND RIGHT-CLICK CONTEXT CHANNELS
    const blockActions = (e) => e.preventDefault();

    document.addEventListener('copy', blockActions);
    document.addEventListener('paste', blockActions);
    document.addEventListener('contextmenu', blockActions);

    // 💡 THE FOCUS SURVEILLANCE INTERCEPTOR: Catches Alt+Tab, window loss, or split screen
    const executeSystemLockdown = () => {
      // Ignore lockdown triggers if the terminal is already locked out
      if (isLockedOut) return;

      setIsLockedOut(true);
      setViolationCount((prev) => {
        const totalStrikes = prev + 1;
        if (onSecurityViolation) {
          onSecurityViolation(`Security Alert: Terminal focus drop caught. Active Strikes: ${totalStrikes}`);
        }
        return totalStrikes;
      });
    };

    // Listeners for window focus drop and tab change states
    window.addEventListener('blur', executeSystemLockdown);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) executeSystemLockdown();
    });

    return () => {
      document.removeEventListener('copy', blockActions);
      document.removeEventListener('paste', blockActions);
      document.removeEventListener('contextmenu', blockActions);
      window.removeEventListener('blur', executeSystemLockdown);
      document.removeEventListener('visibilitychange', executeSystemLockdown);
    };
  }, [isLockedOut, onSecurityViolation]);

  // 💡 LIVE PRESENTATION EXCLUSIVE OVERRIDE PRIVILEGE KEY HOOK
  const handleRequestTeacherClearance = () => {
    const overrideKey = prompt("ENTER INSTRUCTOR / INVENTOR COMPLIANCE PRIVILEGE KEY:");
    
    if (overrideKey === "override12") {
      setIsLockedOut(false);
      // Automatically force the browser window back into native fullscreen containment layer
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (overrideKey !== null) {
      alert("INVALID PASSKEY MATCH // ACCESS GRANTED DENIED.");
    }
  };

  if (isLockedOut) {
    return (
      <div className="fixed inset-0 bg-[#070a12] z-[99999] flex items-center justify-center p-6 select-none animate-none">
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-xl shadow-2xl space-y-6">
          
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight">CBT Workstation Frozen</h1>
              <p className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider mt-0.5">Focus Violation Strikes: {violationCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 font-mono text-[11px] leading-relaxed rounded shadow-inner space-y-1">
              <p className="text-rose-400 font-bold">&gt; [ALERT] WINDOW FOCUS LOST CELL</p>
              <p className="text-slate-400">&gt; CAPTURE_VECTOR: ALT_TAB // WIN_KEY_DROP</p>
              <p className="text-slate-400">&gt; HARDWARE FRAME STATE: RESTRICTED</p>
              <p className="text-emerald-400 font-bold">&gt; METRICS BROADCASTED OVER LAN SERVER</p>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              The platform detected that this device lost window focus, likely via an <kbd className="px-1 py-0.5 bg-slate-100 border text-[10px] font-mono rounded">Alt</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 border text-[10px] font-mono rounded">Tab</kbd> shortcut or an application window change. Access to the question sheet material is locked down.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded text-[11px] text-slate-600 leading-relaxed">
              💡 <span className="font-bold text-amber-800 uppercase font-mono text-[9px] block mb-0.5">Demo Key context:</span> 
              Type <code className="font-mono bg-white border px-1 rounded font-black text-rose-600">override12</code> to unlock the screen live during your presentation.
            </div>
          </div>

          <button 
            onClick={handleRequestTeacherClearance} 
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" /> Apply Invigilator Authorization Override
          </button>

        </div>
      </div>
    );
  }

  return <>{children}</>;
}