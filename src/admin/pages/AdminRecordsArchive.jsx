import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Clock, Archive, Layers, CheckCircle2, AlertCircle, FileSearch, Search, Calendar } from 'lucide-react';

export default function AdminRecordsArchive({ onNavigateBack }) {
  // Navigation active tab context selector
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' | 'active_live' | 'completed'
  const [searchFilter, setSearchFilter] = useState('');

  // 💡 COMPREHENSIVE DATA LEDGER SCENARIOS REGISTER MATRIX
  const [archiveDataset] = useState({
    approved: [
      { id: 'app_vts_1', code: 'CMP 301', subject: 'COMPUTER SCIENCE', arm: 'JSS 3A', author: 'Mr. Ochigbo Godswill', classification: 'Terminal Exam', scope: '25 Objectives // 2 Theory prompts', duration: '60 Mins' },
      { id: 'app_vts_2', code: 'DTP 402', subject: 'DATA PROCESSING', arm: 'SS 1 GOLD', author: 'Mrs. Faith Oche', classification: 'CA 3 Obj', scope: '15 Objectives', duration: '30 Mins' }
    ],
    completed: [
      { id: 'comp_vts_1', code: 'CMP 301', subject: 'COMPUTER SCIENCE', arm: 'JSS 3B', author: 'Mr. Ochigbo Godswill', classification: 'CA 3 Theory', dateLogged: 'June 05, 2026', gradingFinished: true, enrollment: 34 },
      { id: 'comp_vts_2', code: 'DTP 402', subject: 'DATA PROCESSING', arm: 'SS 2 SILVER', author: 'Mrs. Faith Oche', classification: 'Terminal Paper', dateLogged: 'June 02, 2026', gradingFinished: false, enrollment: 28 },
      { id: 'comp_vts_3', code: 'BDL 101', name: 'BASIC DIGITAL LITERACY', subject: 'DIGITAL LITERACY', arm: 'JSS 2A', author: 'Mr. Dung Stephen Nyam', classification: 'CA 2 Obj', dateLogged: 'May 28, 2026', gradingFinished: true, enrollment: 42 }
    ]
  });

  const getFilteredCollection = () => {
    const currentPool = archiveDataset[activeTab] || [];
    if (!searchFilter.trim()) return currentPool;
    return currentPool.filter(item => 
      item.subject.toLowerCase().includes(searchFilter.toLowerCase()) || 
      item.author.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.arm.toLowerCase().includes(searchFilter.toLowerCase())
    );
  };

  const currentList = getFilteredCollection();

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none text-slate-900 font-sans w-full overflow-x-hidden">
      
      {/* Upper Framework Top Navbar Navigation Header */}
      <header className="w-full bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-3xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onNavigateBack} className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.95] shrink-0"><ArrowLeft className="w-4 h-4" /></button>
          <div className="truncate">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Master Institutional Records Registry</h2>
            <p className="text-[10px] font-bold text-slate-400 font-mono uppercase mt-0.5">Comprehensive Examination Lifecycle Ledger</p>
          </div>
        </div>

        {/* Dynamic Tab Switcher Bar Context Menu */}
        <div className="flex bg-slate-100 p-1 rounded-lg border font-mono text-[10px] font-bold shrink-0 w-full sm:w-auto">
          <button onClick={() => { setActiveTab('approved'); setSearchFilter(''); }} className={`flex-1 sm:flex-none px-3 py-1.5 rounded uppercase tracking-wide cursor-pointer transition-all ${activeTab === 'approved' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
            Approved Papers
          </button>
         
          <button onClick={() => { setActiveTab('completed'); setSearchFilter(''); }} className={`flex-1 sm:flex-none px-3 py-1.5 rounded uppercase tracking-wide cursor-pointer transition-all ${activeTab === 'completed' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
            Completed Papers
          </button>
        </div>
      </header>

      {/* Main Framework Content Body Panel Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
        
        {/* Dynamic Search Filtering Row */}
        <div className="w-full relative max-w-md mb-6 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search repository registry criteria... (e.g., COMPUTER, GODSWILL, JSS 3)" 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none focus:border-slate-950 focus:shadow-3xs transition-all uppercase"
          />
        </div>

        {/* CONTENT RENDER CONTEXT SWITCHER PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start w-full pb-6">
          
          {/* TAB SECTOR 1: RENDERING APPROVED EXAM SLOTS VAULT */}
          {activeTab === 'approved' && currentList.map((exam) => (
            <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between h-40 relative overflow-hidden w-full transition-all hover:border-slate-400">
              <div className="space-y-1.5 truncate">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-black bg-slate-900 text-white border border-slate-950 rounded-sm uppercase tracking-wide">CERTIFIED BUNDLE</span>
                  <h4 className="text-xs md:text-sm font-black text-slate-950 tracking-tight uppercase truncate">{exam.subject} — {exam.arm}</h4>
                </div>
                <p className="text-[11px] font-medium text-slate-400 font-mono uppercase truncate">Course Owner: <span className="font-sans font-bold text-slate-700 text-xs">{exam.author}</span></p>
                <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-tight truncate">Contents: {exam.scope}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-300" /> Allotment: {exam.duration}</span>
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm font-sans font-black text-[9px] tracking-wider shrink-0 uppercase">● AUDITED READY</span>
              </div>
            </div>
          ))}

         

          {/* TAB SECTOR 3: RENDERING COMPLETED EXAMINATIONS WITH EVALUATION STAMP CONDITIONS */}
          {activeTab === 'completed' && currentList.map((exam) => (
            <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between h-40 relative overflow-hidden w-full transition-all hover:border-slate-400">
              <div className="space-y-1.5 truncate">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-black bg-slate-100 text-slate-500 border border-slate-200 rounded-sm uppercase tracking-wide">SCRIPTS CLOSED</span>
                  <h4 className="text-xs md:text-sm font-black text-slate-950 tracking-tight uppercase truncate">{exam.subject} — {exam.arm}</h4>
                </div>
                <p className="text-[11px] font-medium text-slate-400 font-mono uppercase truncate">Evaluator: <span className="font-sans font-bold text-slate-700 text-xs">{exam.author}</span></p>
                <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-tight truncate">Parameters: {exam.classification} • {exam.enrollment} Papers Bound</p>
              </div>

              {/* 💡 THE GRADING STATE STAMPS CONSOLE */}
              <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0">
                <span className="flex items-center gap-1 text-[9px]"><Calendar className="w-3.5 h-3.5 text-slate-300" /> Logged: {exam.dateLogged}</span>
                
                {exam.gradingFinished ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-sans font-black text-[9px] tracking-wider uppercase shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Graded & Closed
                  </span>
                ) : (
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded font-sans font-black text-[9px] tracking-wider uppercase shrink-0 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> Ready for Marking
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* FALLBACK: IF FILTER RESULTS IN NOTHING FOUND */}
          {currentList.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center p-12 text-slate-400 italic text-xs font-medium font-sans w-full">
              No historical file parameters found matching the specified filter criteria options inside this track index.
            </div>
          )}

        </div>
      </main>

      {/* Static Footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase shrink-0 px-4">
        Veritas Intranet Institutional Ledger Systems Archive Core Layer
      </footer>

    </div>
  );
}