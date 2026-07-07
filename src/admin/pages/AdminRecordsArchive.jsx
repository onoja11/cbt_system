import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, Search, Calendar, CheckCircle2, Loader2, XCircle, Edit3, Layers, BookOpen, ChevronRight, Inbox, HelpCircle } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminRecordsArchive({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('approved'); 
  const [searchFilter, setSearchFilter] = useState('');
  const [recordsList, setRecordsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 ACTIVE UX SELECTION KEYS (Defaults to 'ALL' to maximize flexibility)
  const [selectedArm, setSelectedArm] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    const pullArchivedRepositoryRecords = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest(`api/v1/admin/archive/${activeTab}`, { method: 'GET' });
        if (res.ok && isMounted) {
          const payload = await res.json();
          if (payload && payload.status === 'SUCCESS' && payload.data) {
            setRecordsList(payload.data);
            // Auto-reset side panel scopes on tab alteration mutations
            setSelectedArm('ALL');
            setSelectedSubject('ALL');
          }
        }
      } catch (err) {
        console.error("🚨 [ARCHIVE INFRASTRUCTURE FAULT]:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    pullArchivedRepositoryRecords();
    return () => { isMounted = false; };
  }, [activeTab]);

  // 🏎️ PERFORMANCE OPTIMIZED COMPUTATION ENGINES
  const processedDataMaps = useMemo(() => {
    const filterTerm = searchFilter.toLowerCase().trim();
    
    // 1. Structural search vectors intersection filter
    const filtered = recordsList.filter(item => {
      if (!filterTerm) return true;
      return (
        (item.subject && item.subject.toLowerCase().includes(filterTerm)) || 
        (item.author && item.author.toLowerCase().includes(filterTerm)) ||
        (item.arm && item.arm.toLowerCase().includes(filterTerm)) ||
        (item.classGroup && item.classGroup.toLowerCase().includes(filterTerm)) ||
        (item.code && item.code.toLowerCase().includes(filterTerm))
      );
    });

    // 2. Extract uniquely aggregated dimensions for sidebar filters safely
    const armsSet = new Set();
    const subjectsSet = new Set();

    filtered.forEach(q => {
      // 💡 FIXED: Safely parsing items using the iterator object binding key context matching rows
      const targetArmLabel = q.classGroup || q.arm || 'N/A';
      if (targetArmLabel) armsSet.add(targetArmLabel);
      if (q.subject) subjectsSet.add(q.subject);
    });

    // 3. Apply active scope constraints on display collections
    const finalDisplayList = filtered.filter(item => {
      const currentArmLabel = item.classGroup || item.arm || 'N/A';
      const matchArm = selectedArm === 'ALL' || currentArmLabel === selectedArm;
      const matchSub = selectedSubject === 'ALL' || item.subject === selectedSubject;
      return matchArm && matchSub;
    });

    return {
      arms: ['ALL', ...Array.from(armsSet).sort()],
      subjects: ['ALL', ...Array.from(subjectsSet).sort()],
      displayList: finalDisplayList,
      totalCount: filtered.length
    };
  }, [recordsList, searchFilter, selectedArm, selectedSubject]);

  return (
    <div className="h-screen bg-[#FAF9FA] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-hidden text-left">
      
      {/* 🌌 Master Navigation Top Header Banner */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-3xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={onNavigateBack} 
            className="p-1.5 border border-[#9A87A9]/30 bg-white hover:bg-[#FAF9FA] text-[#9A87A9] hover:text-[#2A1A63] rounded-lg cursor-pointer transition-all active:scale-[0.95]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="mr-1">
            <Logo size={45} showText={false} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Gradebook History Archive</h2>
            <p className="text-[10px] font-bold text-[#9A87A9] font-mono uppercase tracking-wider mt-0.5">Official Performance History Ledger</p>
          </div>
        </div>

        {/* Dynamic Navigation Sub-Tabs */}
        <div className="flex bg-[#FAF9FA] p-1 rounded-xl border border-[#9A87A9]/30 font-mono text-[10px] font-bold gap-1">
          {['approved', 'ready_to_grade', 'completed', 'rejected'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`px-3.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all font-mono font-black ${
                activeTab === tab 
                  ? 'bg-[#2A1A63] text-white shadow-sm' 
                  : 'text-[#9A87A9] hover:text-[#2A1A63]'
              }`}
            >
              {tab === 'ready_to_grade' ? 'Awaiting Grading' : tab === 'completed' ? 'Graded & Closed' : tab}
            </button>
          ))}
        </div>
      </header>

      {/* 🎛️ Search Context Modifier Row Strip */}
      <div className="w-full bg-white border-b border-[#9A87A9]/20 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-[#9A87A9] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setSelectedArm('ALL'); setSelectedSubject('ALL'); }}
            placeholder="Search archive indices neatly..." 
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 placeholder-[#9A87A9]/70 rounded-lg focus:outline-none focus:bg-white focus:border-[#2A1A63] transition-all uppercase"
          />
        </div>
        <div className="text-[10px] font-mono font-bold text-[#9A87A9] uppercase hidden sm:block">
          Records Scope: <span className="text-slate-950 font-sans font-black">{processedDataMaps.totalCount} Indexes Located</span>
        </div>
      </div>

      {/* 🚀 SPLIT ROW VIEW STAGE AREA */}
      <div className="flex-1 w-full flex overflow-hidden">
        
        {/* PANEL LEFT: SIDEBAR FILTERS CHANNELS */}
        <aside className="w-64 bg-white border-r border-[#9A87A9]/20 flex flex-col divide-y divide-slate-100 overflow-y-auto shrink-0 hidden md:flex">
          
          {/* Class Arm Navigator Track */}
          <div className="p-4 space-y-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-[#9A87A9] font-mono uppercase">
              <Layers className="w-3 h-3" /> Filter By Class Arm
            </span>
            <div className="space-y-0.5">
              {processedDataMaps.arms.map(arm => (
                <button
                  key={arm}
                  onClick={() => { setSelectedArm(arm); setSelectedSubject('ALL'); }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-between cursor-pointer ${selectedArm === arm ? 'bg-[#2A1A63] text-white font-black' : 'text-slate-700 hover:bg-[#FAF9FA] hover:text-[#2A1A63]'}`}
                >
                  <span className="uppercase truncate max-w-[160px] font-mono">{arm === 'ALL' ? '● Show All Classes' : arm}</span>
                  <ChevronRight className={`w-3 h-3 opacity-45 ${selectedArm === arm ? 'text-white' : 'text-[#9A87A9]'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Subject Area Navigator Track */}
          <div className="p-4 space-y-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-[#9A87A9] font-mono uppercase">
              <BookOpen className="w-3 h-3" /> Filter By Subject
            </span>
            <div className="space-y-0.5">
              {processedDataMaps.subjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-between cursor-pointer ${selectedSubject === sub ? 'bg-[#2A1A63] text-white font-black' : 'text-slate-700 hover:bg-[#FAF9FA] hover:text-[#2A1A63]'}`}
                >
                  <span className="uppercase truncate max-w-[160px]">{sub === 'ALL' ? '● Show All Subjects' : sub}</span>
                  <ChevronRight className={`w-3 h-3 opacity-45 ${selectedSubject === sub ? 'text-white' : 'text-[#9A87A9]'}`} />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* PANEL RIGHT: CARDS INDEX GRID CONTEXT CONTAINER */}
        <main className="flex-1 bg-[#FAF9FA] p-6 overflow-y-auto h-full">
          {processedDataMaps.displayList.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-[#9A87A9] p-8 text-center bg-white border border-dashed border-[#9A87A9]/30 rounded-xl py-24 shadow-3xs max-w-lg mx-auto my-auto">
              <Inbox className="w-8 h-8 text-[#9A87A9]/40 stroke-[1.5] mb-2" />
              <p className="text-xs font-black uppercase tracking-wide font-mono">No Records Located</p>
              <p className="text-xs text-slate-500 font-medium normal-case mt-1.5 leading-relaxed">No continuous assessment files or test templates match the selected criteria choices inside this category tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 items-start w-full pb-12 animate-fadeIn">
              {processedDataMaps.displayList.map((exam, idx) => (
                <div key={exam.id || idx} className="bg-white border border-[#9A87A9]/20 rounded-xl p-5 shadow-3xs flex flex-col justify-between h-40 relative overflow-hidden transition-all hover:border-[#9A87A9]/50 hover:shadow-2xs">
                  
                  <div className="space-y-1.5 truncate">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#2A1A63] text-white font-black rounded-md">{exam.classGroup || exam.arm || 'N/A'}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#FAF9FA] border border-[#9A87A9]/20 text-slate-700 font-black rounded-md shrink-0">{exam.code || 'CA'}</span>
                        <h4 className="text-xs md:text-sm font-black text-slate-950 tracking-tight uppercase truncate" title={exam.subject}>{exam.subject}</h4>
                      </div>
                      
                      <span className="px-1.5 py-0.5 bg-[#FAF9FA] border border-[#9A87A9]/30 text-slate-900 font-mono text-[9px] font-black rounded-md shrink-0">
                        ID: {exam.id ? String(exam.id).replace(/[^\d]/g, '') : 'N/A'}
                      </span>
                    </div>
                    
                    <p className="text-[11px] font-medium text-[#9A87A9] uppercase truncate">
                      Assigned Teacher: <span className="font-sans font-black text-slate-950 text-xs">{exam.author || exam.teacher || 'Staff Node'}</span>
                    </p>
                    
                    {activeTab === 'rejected' ? (
                      <p className="text-[10px] font-black text-[#C62927] font-mono uppercase tracking-tight truncate bg-rose-50 border border-rose-100 rounded-md px-2 py-0.5 mt-1 leading-snug">
                        Correction Note: {exam.rejection_reason || 'Requires question layout revisions.'}
                      </p>
                    ) : (
                      <p className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-tight truncate flex items-center gap-1 mt-1">
                        <HelpCircle className="w-3.5 h-3.5 text-[#9A87A9]/50" />
                        {activeTab === 'approved' ? `Test Scope: Fully Configured Ready` : `Ingested Total: ${exam.enrollment || 0} Student Answer Scripts`}
                      </p>
                    )}
                  </div>

                  {/* Operational Metric Footer Ribbon */}
                  <div className="border-t border-[#FAF9FA] pt-3 mt-3 flex justify-between items-center font-mono text-[10px] font-black text-[#9A87A9] uppercase tracking-wider shrink-0">
                    {activeTab === 'approved' ? (
                      <>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#9A87A9]/50" /> Allowed: {exam.duration} Mins</span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-sans font-black text-[9px] tracking-wider shrink-0 uppercase">● AUDITED / APPROVED</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 text-[9px]"><Calendar className="w-3.5 h-3.5 text-[#9A87A9]/50" /> Log Date: {exam.dateLogged || '2026 TERM'}</span>
                        {activeTab === 'ready_to_grade' && (
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded font-sans font-black text-[9px] tracking-wider uppercase shrink-0 flex items-center gap-1 animate-pulse">
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Awaiting Grading
                          </span>
                        )}
                        {activeTab === 'completed' && (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-sans font-black text-[9px] tracking-wider uppercase shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Graded & Closed
                          </span>
                        )}
                        {activeTab === 'rejected' && (
                          <span className="text-[#C62927] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded font-sans font-black text-[9px] tracking-wider uppercase shrink-0 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-[#C62927]" /> Returned Paper
                          </span>
                        )}
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </main>

      </div>

      {/* Sticky Bottom Frame Footer Layer */}
      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Corporate Records Archive Registers System Layer © 2026
      </footer>

    </div>
  );
}