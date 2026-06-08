import React from 'react';
import { Terminal, ShieldCheck } from 'lucide-react';

export default function Lobby({ student, onStartExam, examDetails = { title: "Computer Science Terminal Examination", duration: "60 Minutes", totalQuestions: "5" } }) {
  
  const handleRequestSecureFullscreen = () => {
    // 💡 FORCE FULLSCREEN: Request native frame magnification via DOM API before unlocking workspace
    const documentElement = document.documentElement;
    if (documentElement.requestFullscreen) {
      documentElement.requestFullscreen()
        .then(() => onStartExam())
        .catch((err) => alert(`Security Alert: Fullscreen must be enabled to write this exam. (${err.message})`));
    } else {
      // Fallback for custom school terminals
      onStartExam();
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-6 flex flex-col justify-between select-none">
      
      <header className="max-w-4xl w-full mx-auto flex justify-between items-center py-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">
            {student?.initials || "DS"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-none">{student?.name || "Candidate User"}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{student?.classGroup || "Grade 9 / JSS 3"}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 tracking-wider font-mono bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm uppercase">Terminal Cleared</span>
      </header>

      <main className="w-full max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-lg shadow-2xs my-auto">
        
        <div className="mb-5 pb-3 border-b border-slate-100">
          <span className="text-[9px] font-mono font-bold bg-slate-50 border px-2 py-0.5 text-slate-500 uppercase tracking-wider rounded-xs">
            Ready to Ingest Sheet
          </span>
          <h1 className="text-base font-bold text-slate-900 tracking-tight mt-2">{examDetails.title}</h1>
        </div>

        <div className="grid grid-cols-2 border border-slate-200 bg-slate-50/40 mb-5 divide-x divide-slate-200 rounded-md overflow-hidden font-mono">
          <div className="p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Allotted</span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{examDetails.duration}</p>
          </div>
          <div className="p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Pool</span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{examDetails.totalQuestions} Tasks Ingested</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="space-y-2.5 text-xs font-medium text-slate-500 leading-relaxed">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1">Mandatory Security Instructions:</p>
            <div className="flex items-start gap-2">
              <span className="font-bold text-rose-500">•</span>
              <p>This exam runs **strictly in Fullscreen Mode**. Pressing <kbd className="px-1 py-0.5 bg-slate-100 border text-[10px] font-mono rounded">Esc</kbd> or attempting to minimize window grids instantly locks your exam.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-900">•</span>
              <p>Your answers are continuously saved locally to the machine memory buffer and sync back over the school LAN.</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded text-[10px] font-semibold text-slate-600 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p>Ready to go. Launching full sheet demands immediate fullscreen activation properties.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleRequestSecureFullscreen}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider text-white transition-all rounded-sm shadow-2xs cursor-pointer text-center"
          >
            Launch Locked Exam Sheet
          </button>
        </div>

      </main>

      <div className="w-full text-center py-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">StartriteUnified Campus Environment Core</span>
      </div>

    </div>
  );
}