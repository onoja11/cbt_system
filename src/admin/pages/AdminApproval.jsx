import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Layers, ListChecks, Loader2, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
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
      }
    } catch (err) { console.error("Rejection error:", err); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Opening question paper vetting repository files...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2F5] flex flex-col font-sans text-[#1A1A2E]">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onNavigateBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <Logo size={35} showText={false} />
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Moderation Desk</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Principal Oversight Panel</p>
          </div>
        </div>
        <span className="px-4 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full border border-indigo-100 uppercase tracking-widest">
          {pendingReviews.length} Papers Pending
        </span>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-12 gap-6 h-[calc(100vh-85px)]">
        <div className="col-span-3 h-full overflow-y-auto space-y-3">
          {pendingReviews.map((paper) => (
            <div
              key={paper.id}
              onClick={() => { setActiveReviewId(paper.id); setRejectionFeedback(''); }}
              className={`p-4 rounded-xl border-l-4 transition-all cursor-pointer shadow-sm ${
                paper.id === activeReviewId ? 'bg-white border-[#2A1A63]' : 'bg-white border-transparent hover:border-slate-300'
              }`}
            >
              <h4 className="text-[11px] font-black uppercase text-slate-900 truncate">{paper.subject}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{paper.classGroup}</p>
            </div>
          ))}
        </div>

        <div className="col-span-9 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
          {currentPaper ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-black">{currentPaper.subject}</h2>
                  <p className="text-[11px] font-medium text-slate-400 uppercase">
                    Instructor: <span className="text-indigo-700 font-bold">{currentPaper.teacher}</span>
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setActiveSectorTab('obj')} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${activeSectorTab === 'obj' ? 'bg-white shadow' : ''}`}>Objectives</button>
                  <button onClick={() => setActiveSectorTab('theory')} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${activeSectorTab === 'theory' ? 'bg-white shadow' : ''}`}>Theory</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {(activeSectorTab === 'obj' ? (currentPaper.objectivesList || []) : (currentPaper.theoriesList || [])).map((q, i) => (
                  <div key={i} className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-800 mb-3"><span className="text-slate-400 font-mono">Q{i + 1}.</span> <SafeMathText text={q.text} /></p>
                    {activeSectorTab === 'obj' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options?.map((o, oIdx) => {
                          const label = typeof o === 'object' ? (o.text || o.text_value) : o;
                          const isCorrect = typeof o === 'object' ? (o.isCorrect || o.is_correct) : (q.correctIndex === oIdx);
                          return (
                            <div key={oIdx} className={`text-[10px] p-2 rounded border font-bold ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200'}`}>
                              {String.fromCharCode(65 + oIdx)}) <SafeMathText text={label} />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-indigo-700 bg-indigo-50 p-3 rounded border border-indigo-100 font-medium">
                        <span className="block font-black uppercase mb-1">Rubric:</span> {q.rubricSchema || q.rubric}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">
                  Correction Notes {modalConfig.type === 'reject' && <span className="text-rose-500">*Required</span>}
                </label>
                <textarea 
                  value={rejectionFeedback} 
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  placeholder="Need changes? Leave your correction notes here..." 
                  className={`w-full h-20 p-3 bg-slate-50 rounded-xl text-[11px] mb-3 border ${!rejectionFeedback.trim() && modalConfig.type === 'reject' ? 'border-rose-300' : 'border-slate-200'}`}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'reject' })} className="px-4 py-2 text-[10px] font-black uppercase text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50">Request Adjustments</button>
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'approve' })} className="px-4 py-2 text-[10px] font-black uppercase text-white bg-[#2A1A63] rounded-lg">Approve</button>
                </div>
              </div>
            </>
          ) : <div className="text-xs text-slate-400">Select paper...</div>}
        </div>
      </main>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'approve' ? "Approve Paper" : "Reject Paper"}
        message={modalConfig.type === 'approve' ? "Grant final clearance?" : "Return to teacher with notes?"}
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
      />

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[30000] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-2xl max-w-xs">
            <h4 className="text-xs font-black uppercase text-rose-600 mb-2">{errorModal.title}</h4>
            <p className="text-[11px] text-slate-600 mb-4">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ isOpen: false })} className="w-full py-2 bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}