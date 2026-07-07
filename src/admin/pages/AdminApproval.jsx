import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Layers, ListChecks, Loader2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function AdminApproval({ onNavigateBack }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [activeSectorTab, setActiveSectorTab] = useState('obj'); 
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });

  // Error modal toggle states for removing standard alerts
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  // Load pending exam configurations from the backend on mount
  const fetchVettingQueue = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('api/v1/admin/vetting/pending-papers', { method: 'GET' });
      const resData = await res.json();
      if (res.ok && resData.papers) {
        setPendingReviews(resData.papers);
        if (resData.papers.length > 0) {
          setActiveReviewId(resData.papers[0].id);
        }
      }
    } catch (err) {
      console.error("❌ [VETTING DESK NETWORK DROP]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVettingQueue();
  }, []);

  const currentPaper = pendingReviews.find(p => p.id === activeReviewId);

  const handleExecuteApproval = async () => {
    if (!currentPaper) return;
    try {
      const res = await apiRequest(`api/v1/admin/vetting/assessments/${currentPaper.id}/approve`, { method: 'POST' });
      if (res.ok) {
        const structuralRemaining = pendingReviews.filter(p => p.id !== currentPaper.id);
        setPendingReviews(structuralRemaining);
        setModalConfig({ isOpen: false, type: null });
        
        if (structuralRemaining.length > 0) {
          setActiveReviewId(structuralRemaining[0].id);
        } else {
          setActiveReviewId(null);
        }
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Authorization Failure',
          message: 'The server could not authorize deployment clearance for this test paper.'
        });
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const handleExecuteRejection = async () => {
    if (!currentPaper) return;
    if (!rejectionFeedback.trim()) {
      setErrorModal({
        isOpen: true,
        title: 'Feedback Required',
        message: 'Please write out correction notes for the teacher explaining what needs adjustment before returning the paper.'
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
        
        if (structuralRemaining.length > 0) {
          setActiveReviewId(structuralRemaining[0].id);
        } else {
          setActiveReviewId(null);
        }
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Transmission Failed',
          message: 'Could not transmit correction notes back to the teacher profile workbench.'
        });
      }
    } catch (err) {
      console.error("Rejection error:", err);
    }
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
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none font-sans text-[#2A1A63]">
      
      {/* BRAND SUB-LAYER CONTROL HEADER */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Question Paper Moderation Desk</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] uppercase font-mono tracking-tight">Principal Oversight Panel</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-[#C62927] bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wide shrink-0">
            {pendingReviews.length} Papers Awaiting Review
          </span>
        </div>
      </header>

      {/* Main Framework Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-auto">
        
        {/* LEFT COLUMN: Vetting Ledger Incoming Queue List */}
        <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-4 flex flex-col min-h-[200px] lg:h-[540px] shadow-3xs overflow-hidden w-full">
          <div className="mb-4 pb-2 text-left border-b border-[#FAF9FA] shrink-0">
            <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Moderation Queue Roll</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 w-full">
            {pendingReviews.map((paper, idx) => {
              const isSelected = paper.id === activeReviewId;
              return (
                <div
                  key={paper.id || idx}
                  onClick={() => {
                    setActiveReviewId(paper.id);
                    setRejectionFeedback('');
                  }}
                  className={`p-4 border rounded-xl text-left cursor-pointer transition-all w-full ${
                    isSelected ? 'border-[#2A1A63] bg-[#FAF9FA] shadow-3xs' : 'border-[#9A87A9]/20 bg-white hover:border-[#9A87A9]/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black uppercase border px-1.5 py-0.5 rounded bg-white text-slate-700 shrink-0">{paper.type}</span>
                    <span className="text-[10px] text-[#9A87A9] font-mono font-black bg-[#FAF9FA] px-1.5 py-0.5 rounded tracking-wide shrink-0">{paper.duration} Mins</span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-950 mt-2.5 truncate">{paper.subject}</h4>
                  <p className="text-[11px] font-bold text-[#9A87A9] uppercase tracking-wide mt-1 truncate">{paper.classGroup} • {paper.teacher}</p>
                </div>
              );
            })}
            {pendingReviews.length === 0 && (
              <div className="text-center p-8 font-black text-[#9A87A9] uppercase tracking-wide font-mono text-xs mt-12 py-24 w-full bg-[#FAF9FA]/40 rounded-xl border border-dashed border-[#9A87A9]/30">Queue completely clear! All papers reviewed.</div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Review Sandbox Preview Pane */}
        <section className="lg:col-span-2 bg-white border border-[#9A87A9]/30 rounded-xl p-4 md:p-5 flex flex-col min-h-[460px] lg:h-[540px] shadow-3xs overflow-hidden w-full">
          {currentPaper ? (
            <div className="w-full h-full flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 flex-1 overflow-y-auto pb-4 pr-1 w-full">
                
                {/* Active Inspecting Metadata Strip Card */}
                <div className="bg-[#2A1A63] text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm shrink-0 w-full">
                  <div className="truncate w-full sm:w-auto text-left">
                    <span className="text-[8px] font-black uppercase text-[#9A87A9] tracking-wider block">Inspecting Assessment Blueprint</span>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-tight text-white mt-0.5 truncate">{currentPaper.subject}</h3>
                    <p className="text-[11px] font-bold text-[#9A87A9] uppercase tracking-wide mt-0.5 font-mono truncate">{currentPaper.classGroup}</p>
                  </div>
                  <div className="sm:text-right font-mono text-[10px] text-[#9A87A9] uppercase shrink-0 text-left">
                    Instructor Staff: <span className="text-white block mt-0.5 font-sans font-black text-xs">{currentPaper.teacher}</span>
                  </div>
                </div>

                {/* THE DOUBLE SECTOR TAB CONTROLLER */}
                <div className="flex bg-[#FAF9FA] p-1 rounded-lg border border-[#9A87A9]/20 font-mono text-[10px] font-bold shrink-0 w-full">
                  <button 
                    onClick={() => setActiveSectorTab('obj')} 
                    className={`flex-1 py-2 rounded-md text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all font-mono ${activeSectorTab === 'obj' ? 'bg-[#2A1A63] text-white shadow-sm' : 'text-[#9A87A9] hover:text-[#2A1A63]'}`}
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Part A: Objectives ({currentPaper.objectivesList?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveSectorTab('theory')} 
                    className={`flex-1 py-2 rounded-md text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all font-mono ${activeSectorTab === 'theory' ? 'bg-[#2A1A63] text-white shadow-sm' : 'text-[#9A87A9] hover:text-[#2A1A63]'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Part B: Theory ({currentPaper.theoriesList?.length || 0})
                  </button>
                </div>

                {/* ITEM BANK PREVIEW RENDER CORE */}
                <div className="border border-[#9A87A9]/20 rounded-xl p-3 md:p-4 bg-[#FAF9FA]/40 w-full">
                  
                  {/* TAB CARD VIEW A: OBJECTIVE MULTIPLE CHOICE */}
                  {activeSectorTab === 'obj' && (
                    <div className="space-y-4 w-full">
                      {(!currentPaper.objectivesList || currentPaper.objectivesList.length === 0) ? (
                        <div className="text-center py-6 text-xs font-mono uppercase text-[#9A87A9] font-black">No Objective questions found inside this draft sheet.</div>
                      ) : (
                        currentPaper.objectivesList.map((q, idx) => (
                          <div key={q.id || idx} className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl space-y-3 shadow-3xs w-full text-left">
                            <h4 className="text-xs md:text-sm font-bold text-slate-950 leading-relaxed uppercase select-text">
                              <span className="font-mono text-[#9A87A9] mr-1">Question {q.num || idx + 1}:</span> {q.text}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 w-full">
                              {q.options?.map((option, optIdx) => {
                                const isCorrectAnswer = q.correctIndex === optIdx;
                                return (
                                  <div 
                                    key={optIdx} 
                                    className={`px-3 py-2 border text-[11px] font-mono font-bold uppercase rounded-md tracking-tight ${
                                      isCorrectAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-black' : 'bg-[#FAF9FA] border-[#9A87A9]/10 text-slate-500'
                                    }`}
                                  >
                                    <span className="text-[#9A87A9] mr-1">{String.fromCharCode(65 + optIdx)})</span> {option}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB CARD VIEW B: THEORIES & RUBRICS */}
                  {activeSectorTab === 'theory' && (
                    <div className="space-y-4 w-full">
                      {(!currentPaper.theoriesList || currentPaper.theoriesList.length === 0) ? (
                        <div className="text-center py-6 text-xs font-mono uppercase text-[#9A87A9] font-black">No Theory essay questions found inside this draft sheet.</div>
                      ) : (
                        currentPaper.theoriesList.map((q, idx) => (
                          <div key={q.id || idx} className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl space-y-3 shadow-3xs w-full text-left">
                            <div className="flex justify-between items-center border-b border-[#FAF9FA] pb-2 flex-wrap">
                              <h4 className="text-xs md:text-sm font-bold text-slate-950 leading-relaxed uppercase select-text">
                                <span className="font-mono text-[#9A87A9] mr-1">Theory Prompt {q.num || idx + 1}:</span>
                              </h4>
                              <span className="text-[9px] font-mono font-black text-slate-900 bg-[#FAF9FA] border px-2 py-0.5 rounded-md shrink-0">Weight: {q.points} Marks</span>
                            </div>
                            <p className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed uppercase select-text pl-1">{q.text}</p>
                            <div className="p-3 bg-[#2A1A63] border border-[#2A1A63] rounded-xl space-y-1.5 font-mono text-[11px] tracking-tight text-white shadow-sm">
                              <span className="text-[9px] text-[#9A87A9] font-black tracking-wider block uppercase">💡 Correction & Expected Scoring Rubric Key:</span>
                              <p className="leading-relaxed font-bold">{q.rubricSchema || q.rubric}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>

                {/* Feedback Input Block */}
                <div className="space-y-1.5 pt-1 w-full shrink-0 text-left">
                  <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider flex items-center gap-1 font-sans">
                    <MessageSquare className="w-3.5 h-3.5 text-[#9A87A9]" /> Moderator Adjustment / Correction Notes
                  </label>
                  <textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="If sending this paper back for corrections, write down the required adjustments here for the teacher..."
                    className="w-full h-16 px-3 py-2 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 placeholder-[#9A87A9]/70 focus:outline-none focus:bg-white focus:border-[#2A1A63] transition-all rounded-lg resize-none leading-relaxed font-sans shadow-3xs"
                  />
                </div>

              </div>

              {/* Lower Operation Action Triggers */}
              <div className="pt-3 border-t border-[#FAF9FA] flex justify-end gap-2 shrink-0 w-full">
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'reject' })}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-[#C62927] text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-3xs font-black"
                >
                  <XCircle className="w-4 h-4" /> Request Adjustments
                </button>
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'approve' })}
                  className="px-4 py-2 bg-[#2A1A63] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" /> Grant Clearance
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-[#9A87A9] font-black uppercase tracking-wide font-mono text-xs py-24">
              Select a question sheet paper from the queue list to initialize the vetting preview sandbox pane.
            </div>
          )}
        </section>

      </main>

      {/* Confirmation Modals */}
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'approve' ? "Authorize Examination Paper Release" : "Return Paper for Corrections"}
        message={modalConfig.type === 'approve'
          ? `Are you completely satisfied with the quality and curriculum alignment of the questions for ${currentPaper?.subject}? Authorization deploys it live for testing schedules.`
          : `Are you sure you want to kick the question sheets for ${currentPaper?.subject} back to the teacher profile workbench for modifications?`
        }
        confirmLabel={modalConfig.type === 'approve' ? "Approve & Deploy Paper" : "Return to Teacher"}
        cancelLabel="Go Back"
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
        summaryData={{
          "Course Subject": currentPaper?.subject,
          "Target Cohort Group": currentPaper?.classGroup,
          "Moderator Routing Action": modalConfig.type === 'approve' ? "SIGN_OFF_AND_PUBLISH_LIVE" : "DISPATCH_FOR_CORRECTIONS"
        }}
      />

      {/* CORE FRAME NOTIFICATION ERROR OVERLAYS */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[30000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/40 p-6 rounded-xl shadow-2xl space-y-4 text-left font-mono">
            <div className="flex items-center gap-2 text-[#C62927] font-sans font-black text-xs uppercase tracking-tight border-b border-[#FAF9FA] pb-2">
              <AlertTriangle className="w-4 h-4" /> {errorModal.title}
            </div>
            <p className="text-xs text-slate-500 font-bold font-sans leading-relaxed">{errorModal.message}</p>
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2 bg-[#2A1A63] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md font-sans"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Vetting & Quality Assurance Systems Infrastructure © 2026
      </footer>

    </div>
  );
}