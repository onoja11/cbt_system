import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Layers, ListChecks, Loader2, ChevronRight, FileText, AlertTriangle, Clock, ShieldCheck, ClipboardList, Check } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText';

export default function AdminApproval({ onNavigateBack }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [activeSectorTab, setActiveSectorTab] = useState('obj'); 
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchVettingQueue = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('api/v1/admin/vetting/pending-papers', { method: 'GET' });
      const resData = await res.json();
      if (res.ok && resData.papers) {
        setPendingReviews(resData.papers);
        if (resData.papers.length > 0) setActiveReviewId(resData.papers[0].id);
      }
    } catch (err) {
      console.error("❌ [VETTING DESK NETWORK DROP]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchVettingQueue(); }, []);

  const currentPaper = pendingReviews.find(p => p.id === activeReviewId);

  const handleExecuteApproval = async () => {
    if (!currentPaper) return;
    try {
      const res = await apiRequest(`api/v1/admin/vetting/assessments/${currentPaper.id}/approve`, { method: 'POST' });
      if (res.ok) {
        const structuralRemaining = pendingReviews.filter(p => p.id !== currentPaper.id);
        setPendingReviews(structuralRemaining);
        setModalConfig({ isOpen: false, type: null });
        setActiveReviewId(structuralRemaining.length > 0 ? structuralRemaining[0].id : null);
        showToast(`Successfully approved ${currentPaper.subject} assessment paper.`);
      }
    } catch (err) { console.error("Approval error:", err); }
  };

  const handleExecuteRejection = async () => {
    if (!currentPaper) return;
    
    if (!rejectionFeedback.trim()) {
      setErrorModal({ 
        isOpen: true, 
        title: 'Feedback Required', 
        message: 'You must provide a reason/note for the teacher before rejecting this paper.' 
      });
      setModalConfig({ isOpen: false, type: null });
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/vetting/assessments/${currentPaper.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ feedback_comment: rejectionFeedback })
      });
      if (res.ok) {
        const structuralRemaining = pendingReviews.filter(p => p.id !== currentPaper.id);
        setPendingReviews(structuralRemaining);
        setModalConfig({ isOpen: false, type: null });
        setRejectionFeedback('');
        setActiveReviewId(structuralRemaining.length > 0 ? structuralRemaining[0].id : null);
        showToast(`Successfully requested adjustments for ${currentPaper.subject}.`);
      }
    } catch (err) { console.error("Rejection error:", err); }
  };

  const formatDisplayDuration = (rawMinutes) => {
    const mins = parseInt(rawMinutes, 10) || 30;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? 's' : ''}`;
    }
    return `${mins} Mins`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Opening question paper vetting repository files...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col font-sans text-[#2A1A63] relative">
      
      {/* Header Banner matching AdminDashboard & Class Directory gradient style */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Moderation Desk</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Principal Oversight Panel</p>
          </div>
        </div>
        <span className="px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-black rounded-xl uppercase tracking-widest font-mono shadow-2xs">
          {pendingReviews.length} Papers Pending
        </span>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 grid grid-cols-12 gap-6 h-[calc(100vh-85px)]">
        
        {/* SIDEBAR NAVIGATION LIST */}
        <div className="col-span-3 h-full overflow-y-auto space-y-3 pr-1">
          {pendingReviews.length === 0 ? (
            <div className="p-6 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F3EEFC]  flex items-center justify-center text-[#7C3AED] mx-auto">
                <img 
                  src="/thinking-character.png" 
                  alt="Thinking Character" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans">Queue Clear</p>
              <p className="text-[11px] text-[#7C6B93] font-mono uppercase">All submissions have been successfully moderated.</p>
            </div>
          ) : (
            pendingReviews.map((paper) => (
              <div
                key={paper.id}
                onClick={() => { setActiveReviewId(paper.id); setRejectionFeedback(''); }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs text-left ${
                  paper.id === activeReviewId ? 'bg-white border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'bg-[#F3EEFC] border-[#E2D5F8] hover:border-[#7C3AED]'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="text-xs font-black uppercase text-slate-900 truncate font-sans">{paper.subject}</h4>
                  <span className="text-[9px] font-mono font-black bg-white border border-[#E2D5F8] text-[#7C3AED] px-2 py-0.5 rounded-lg shadow-2xs">
                    {formatDisplayDuration(paper.duration_minutes || paper.duration)}
                  </span>
                </div>
                <p className="text-[10px] text-[#7C6B93] font-mono uppercase font-bold">{paper.classGroup}</p>
              </div>
            ))
          )}
        </div>

        {/* MAIN VETTING CANVAS */}
        <div className="col-span-9 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 shadow-xs flex flex-col h-full overflow-hidden">
          {currentPaper ? (
            <>
              {/* HEADER WITH TIME DURATION BADGE */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#E2D5F8]/60">
                <div className="text-left">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm md:text-base font-black uppercase text-slate-900 font-sans">{currentPaper.subject}</h2>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E2D5F8] text-[#7C3AED] text-[11px] font-mono font-black rounded-xl shadow-2xs">
                      <Clock className="w-3.5 h-3.5" /> Duration Window: {formatDisplayDuration(currentPaper.duration_minutes || currentPaper.duration)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#7C6B93] font-mono uppercase mt-1">
                    Instructor: <span className="text-slate-900 font-bold font-sans">{currentPaper.teacher}</span> • Cohort: <span className="text-slate-900 font-bold font-sans">{currentPaper.classGroup}</span>
                  </p>
                </div>
                <div className="flex bg-white border border-[#E2D5F8] p-1 rounded-xl shadow-2xs font-mono">
                  <button onClick={() => setActiveSectorTab('obj')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${activeSectorTab === 'obj' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'}`}>Objectives</button>
                  <button onClick={() => setActiveSectorTab('theory')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${activeSectorTab === 'theory' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'}`}>Theory</button>
                </div>
              </div>

              {/* SECTION INSTRUCTIONS BANNER */}
              <div className="mb-4 p-4 bg-white border border-[#E2D5F8] rounded-2xl text-left flex items-start gap-3 shadow-2xs">
                <ClipboardList className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                <div className="space-y-0.5 font-mono">
                  <span className="text-[9px] font-black text-[#7C6B93] uppercase tracking-wider block">
                    {activeSectorTab === 'obj' ? 'Section A Instructions (Objectives):' : 'Section B Instructions (Theory):'}
                  </span>
                  <p className="text-xs font-sans font-bold text-slate-900 uppercase">
                    {activeSectorTab === 'obj' 
                      ? (currentPaper.objective_instructions || 'Answer all multiple-choice questions in this section.') 
                      : (currentPaper.theory_instructions || 'Answer all questions out of this section comprehensively.')}
                  </p>
                </div>
              </div>

              {/* QUESTIONS VIEWER */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 text-left">
                {(activeSectorTab === 'obj' ? (currentPaper.objectivesList || []) : (currentPaper.theoriesList || [])).map((q, i) => (
                  <div key={i} className="border border-[#E2D5F8] p-4 rounded-2xl bg-white shadow-2xs">
                    <p className="text-xs font-bold text-slate-900 mb-3 font-sans"><span className="text-[#7C6B93] font-mono font-black">Q{i + 1}.</span> <SafeMathText text={q.text} /></p>
                    {activeSectorTab === 'obj' ? (
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        {q.options?.map((o, oIdx) => {
                          const label = typeof o === 'object' ? (o.text || o.text_value) : o;
                          const isCorrect = typeof o === 'object' ? (o.isCorrect || o.is_correct) : (q.correctIndex === oIdx);
                          return (
                            <div key={oIdx} className={`text-[10px] p-2.5 rounded-xl border font-bold ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-[#FAF9FA] border-[#E2D5F8] text-slate-700'}`}>
                              {String.fromCharCode(65 + oIdx)}) <SafeMathText text={label} />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#7C6B93] bg-[#FAF9FA] p-3 rounded-xl border border-[#E2D5F8] font-mono">
                        <span className="block font-black uppercase mb-1 text-slate-900">Rubric:</span> {q.rubricSchema || q.rubric}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* FEEDBACK & APPROVAL CONTROLS */}
              <div className="pt-4 border-t border-[#E2D5F8]/60 text-left font-mono">
                <label className="text-[10px] font-black uppercase text-[#7C6B93] mb-1.5 block">
                  Correction Notes {modalConfig.type === 'reject' && <span className="text-rose-600">*Required</span>}
                </label>
                <textarea 
                  value={rejectionFeedback} 
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  placeholder="Need changes? Leave your correction notes here..." 
                  className={`w-full h-20 p-3 bg-white rounded-2xl text-xs mb-3 border font-sans text-slate-900 font-bold focus:outline-none shadow-2xs ${!rejectionFeedback.trim() && modalConfig.type === 'reject' ? 'border-rose-300' : 'border-[#E2D5F8]'}`}
                />
                <div className="flex justify-end gap-2.5">
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'reject' })} className="px-4 py-2.5 text-[10px] font-black uppercase text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer shadow-2xs transition-all active:scale-[0.97]">Request Adjustments</button>
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'approve' })} className="px-5 py-2.5 text-[10px] font-black uppercase text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.97]">Approve Paper</button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center font-mono py-20 bg-white/60 rounded-2xl my-auto">
              <div className="w-32 h-32 flex items-center justify-center text-[#7C3AED] mb-3">
                <img 
                  src="/thinking-character.png" 
                  alt="Thinking Character" 
                  className="w-28 h-28 object-contain drop-shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO PENDING VETTING SLIPS CURRENTLY FOUND IN MODERATION QUEUE.</p>
            </div>
          )}
        </div>
      </main>

      {/* 🎯 TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[60000] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-mono text-xs uppercase border border-slate-800 animate-slideUp">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="font-bold tracking-wider">{toastMessage}</span>
        </div>
      )}

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'approve' ? "Approve Paper" : "Reject Paper"}
        message={modalConfig.type === 'approve' ? "Grant final clearance?" : "Return to teacher with notes?"}
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
      />

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-2xl max-w-xs text-left font-mono">
            <h4 className="text-xs font-black uppercase text-rose-600 mb-2 font-sans">{errorModal.title}</h4>
            <p className="text-[11px] text-slate-600 mb-4 font-bold uppercase">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ isOpen: false })} className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase rounded-xl cursor-pointer shadow-md transition-all">Dismiss</button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>

    </div>
  );
}