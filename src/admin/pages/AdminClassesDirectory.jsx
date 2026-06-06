import React, { useState } from 'react';
import { Folder, ArrowLeft, ChevronRight, ShieldCheck, Layers, Calendar, Clock } from 'lucide-react';

export default function AdminClassesDirectory({ onNavigateToMasterRecords, onNavigateBack }) {
  // Navigation layout sub-tab switcher context
  const [activeSubTab, setActiveSubTab] = useState('classes'); // 'classes' | 'approved_vault'

  // Structural Class Cohorts Directories
  const [classGroups] = useState([
    { id: 'jss1', name: 'Grade 7 / JSS 1', track: 'Junior Academy', division: 'Core Basic', arms: 3 },
    { id: 'jss2', name: 'Grade 8 / JSS 2', track: 'Junior Academy', division: 'Core Basic', arms: 3 },
    { id: 'jss3', name: 'Grade 9 / JSS 3', track: 'Junior Academy', division: 'Core Basic', arms: 3 },
    { id: 'ss1', name: 'Grade 10 / SS 1', track: 'Senior Academy', division: 'Sciences & Arts', arms: 2 },
    { id: 'ss2', name: 'Grade 11 / SS 2', track: 'Senior Academy', division: 'Sciences & Arts', arms: 2 },
    { id: 'ss3', name: 'Grade 12 / SS 3', track: 'Senior Academy', division: 'Sciences & Arts', arms: 2 }
  ]);

  // 💡 NEW DUMMY DATA PACKET: Approved exams signed off by admin, waiting for teacher activation over LAN
  const [approvedExamsVault] = useState([
    { id: 'app_1', code: 'CMP 301', subject: 'COMPUTER SCIENCE', arm: 'JSS 3A', author: 'Mr. Ochigbo Godswill', type: 'Terminal Exam', duration: '60 Mins', questions: 25 },
    { id: 'app_2', code: 'DTP 402', subject: 'DATA PROCESSING', arm: 'SS 1 GOLD', author: 'Mrs. Faith Oche', type: 'CA 3 Obj', duration: '30 Mins', questions: 15 }
  ]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none text-slate-900 font-sans">
      
      {/* Header Panel Navigation */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-3xs">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.95]"><ArrowLeft className="w-4 h-4" /></button>
          <h2 className="text-xs font-black uppercase tracking-wider">Institutional Repositories Vault</h2>
        </div>

        {/* Inner Sub-tab Segment Selectors */}
        <div className="flex bg-slate-100 p-1 rounded-lg border font-mono text-[10px] font-bold">
          <button 
            onClick={() => setActiveSubTab('classes')} 
            className={`px-3 py-1.5 rounded uppercase cursor-pointer transition-all ${activeSubTab === 'classes' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Class Folders
          </button>
          <button 
            onClick={() => setActiveSubTab('approved_vault')} 
            className={`px-3 py-1.5 rounded uppercase cursor-pointer transition-all flex items-center gap-1 ${activeSubTab === 'approved_vault' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Approved Papers Vault
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW SUB-LAYER A: CLASS DIRECTORIES MATRIX RECONCILIATION                */}
      {/* ========================================================================= */}
      {activeSubTab === 'classes' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 my-auto flex flex-col justify-start">
          <div className="mb-5 pb-1 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">School Register Indices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a cohort class folder container file to review final marks matrices and spreadsheet portfolios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classGroups.map((group) => (
              <div key={group.id} onClick={() => onNavigateToMasterRecords(group)} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-950 cursor-pointer group transition-all h-36 flex flex-col justify-between shadow-2xs">
                <div className="space-y-1">
                  <Folder className="w-5 h-5 text-slate-400 group-hover:text-slate-950 transition-all" />
                  <h4 className="text-sm font-black text-slate-950 mt-2 uppercase">{group.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{group.track} • {group.division}</p>
                </div>
                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 uppercase">
                  <span>Access {group.arms} Stream Books</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-950 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW SUB-LAYER B: DEDICATED VAULT WINDOW SPACE FOR APPROVED PAPERS        */}
      {/* ========================================================================= */}
      {activeSubTab === 'approved_vault' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 my-auto flex flex-col justify-start">
          <div className="mb-5 pb-1 border-b border-slate-100">
            <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider font-mono flex items-center gap-1">🔒 Certified Cryptographic Question Banks</h3>
            <p className="text-xs text-slate-500 mt-0.5">These compiled exam sheets have passed formatting requirements, possess clearance validation hashes, and are ready for LAN deployment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {approvedExamsVault.map((exam) => (
              <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between h-40">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase bg-slate-900 text-white rounded-sm tracking-wide">LOCKED BUNDLE</span>
                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight">{exam.subject} — {exam.arm}</h4>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 font-mono uppercase">
                    Course Owner: <span className="font-sans font-bold text-slate-700">{exam.author}</span>
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-slate-300" /> {exam.questions} Tasks Saved</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-300" /> {exam.duration} Bound</span>
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm uppercase tracking-wider font-sans font-black text-[9px]">APPROVED READY</span>
                </div>
              </div>
            ))}
            {approvedExamsVault.length === 0 && (
              <div className="text-center p-12 text-slate-400 italic text-xs font-medium font-sans">No question blocks currently occupy the approved clearance vault pool.</div>
            )}
          </div>
        </main>
      )}

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        Veritas Core Ledger Systems Infrastructure Layer
      </footer>

    </div>
  );
}