import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Eye, FileText, User } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function AdminApproval({ onNavigateBack }) {
  // 💡 MOCK QUEUE DATA: Papers flagged as "Under Review" awaiting administrative verification
  const [pendingReviews, setPendingReviews] = useState([
    { id: 'asm_4', classGroup: 'Grade 9 / JSS 3', subject: 'COMPUTER SCIENCE', type: 'Exam', duration: '60 Mins', totalQuestions: 25, teacher: 'Mr. Ochigbo Godswill', status: 'Under Review' },
    { id: 'asm_7', classGroup: 'Grade 7 / JSS 1', subject: 'BASIC DIGITAL LITERACY', type: 'CA 2', duration: '30 Mins', totalQuestions: 15, teacher: 'Mr. Dung Stephen Nyam', status: 'Under Review' }
  ]);

  const [activeReviewId, setActiveReviewId] = useState('asm_4');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  
  // Modal control prompts
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null }); // 'approve' | 'reject' | null

  const currentPaper = pendingReviews.find(p => p.id === activeReviewId);

  const handleExecuteApproval = () => {
    // Simulate setting status to ready and dropping out of review ledger bounds
    setPendingReviews(pendingReviews.filter(p => p.id !== activeReviewId));
    setModalConfig({ isOpen: false, type: null });
    alert(`Authorized: ${currentPaper?.subject} has been officially approved and marked READY for student delivery!`);
    
    if (pendingReviews.length > 1) {
      setActiveReviewId(pendingReviews.find(p => p.id !== activeReviewId).id);
    }
  };

  const handleExecuteRejection = () => {
    if (!rejectionFeedback.trim()) {
      alert("Please enter adjustment corrections notes for the teacher before rejecting.");
      return;
    }
    setPendingReviews(pendingReviews.filter(p => p.id !== activeReviewId));
    setModalConfig({ isOpen: false, type: null });
    alert(`Returned: Question paper sheet kicked back to teacher dashboard work desk with feedback context.`);
    setRejectionFeedback('');
    
    if (pendingReviews.length > 1) {
      setActiveReviewId(pendingReviews.find(p => p.id !== activeReviewId).id);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      {/* Upper Navigation Row Header */}
      <header className="w-full bg-slate-950 text-white px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm">ADM</div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Question Paper Inspection Desk</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tight">Principal Oversight Panel</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900 px-2.5 py-1 rounded uppercase tracking-wide">
            {pendingReviews.length} Papers Pending Signature
          </span>
        </div>
      </header>

      {/* Main Structural Column Splits Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch my-auto overflow-hidden">
        
        {/* LEFT COLUMN: Vetting Ledger Incoming Queue List */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[520px] shadow-2xs overflow-hidden">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Vetting Queue List</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {pendingReviews.map((paper) => {
              const isSelected = paper.id === activeReviewId;
              return (
                <div
                  key={paper.id}
                  onClick={() => {
                    setActiveReviewId(paper.id);
                    setRejectionFeedback('');
                  }}
                  className={`p-4 border rounded-lg text-left cursor-pointer transition-all ${
                    isSelected ? 'border-slate-950 bg-slate-50 shadow-3xs' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-mono font-bold uppercase border px-1.5 py-0.5 rounded-sm bg-white text-slate-500">{paper.type}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">{paper.duration}</span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-950 mt-2.5 truncate">{paper.subject}</h4>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1">{paper.classGroup} • {paper.teacher}</p>
                </div>
              );
            })}
            {pendingReviews.length === 0 && (
              <div className="text-center p-8 font-medium text-slate-400 italic text-xs mt-12">All submitted papers verified. Queue completely empty!</div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive review sandbox preview pane */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-[520px] shadow-2xs overflow-hidden">
          {currentPaper ? (
            <div className="w-full h-full flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 flex-1 overflow-y-auto pb-4 pr-1">
                
                {/* Active Inspecting Metadata Strip Card */}
                <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-[8px] font-mono font-bold uppercase text-slate-400 tracking-wider">Inspecting Assessment Ledger</span>
                    <h3 className="text-xs font-black uppercase tracking-tight mt-0.5">{currentPaper.subject}</h3>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">{currentPaper.classGroup} • {currentPaper.totalQuestions} Questions Loaded</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400 uppercase">
                    Instructor: <span className="text-white block mt-0.5 font-sans font-black text-xs">{currentPaper.teacher}</span>
                  </div>
                </div>

                {/* Locked Question Sheet Roll Simulator Container Preview */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3.5">
                  <div className="flex items-center gap-1.5 border-b pb-1.5 font-mono text-[10px] font-bold text-slate-500 uppercase">
                    <Eye className="w-4 h-4 text-slate-400" /> Locked Question Sheet Roll View
                  </div>
                  
                  {/* Mock content representation of what the Admin inspects */}
                  <div className="space-y-2.5">
                    <div className="p-3 bg-white border border-slate-100 rounded shadow-3xs text-xs font-semibold text-slate-900 leading-relaxed">
                      <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">QUESTION 1 (Objective — 2 pts)</span>
                      Study the network infrastructure diagram below. Which topology type is displayed where all endpoints branch off one single backbone line?
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded shadow-3xs text-xs font-semibold text-slate-900 leading-relaxed">
                      <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">QUESTION 2 (Theory — 10 pts)</span>
                      Examine the microprocessor chip outline illustration. Explain how clock cycles govern binary ingestion calculations inside the Arithmetic Logic Unit.
                    </div>
                  </div>
                </div>

                {/* Feedback Input Block */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Rejection Corrections / Adjustments Comments
                  </label>
                  <textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="If rejecting, specify the precise adjustments the teacher needs to make... (e.g., Fix typography layout error on Option B, reduce total theory point weight)"
                    className="w-full h-20 px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-950 transition-all rounded-md resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Lower Operation Action Triggers row cells */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'reject' })}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer active:scale-[0.97] flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" /> Reject Back to Draft
                </button>
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'approve' })}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-3xs cursor-pointer active:scale-[0.97] flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approve & Set Ready
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 italic text-xs">
              Select an entry envelope item from the vetting list queue to open the active preview sandbox pane.
            </div>
          )}
        </section>

      </main>

      {/* Reusable system safety confirmation modal prompts */}
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'approve' ? "Authorize Exam Deployment" : "Reject Question Sheet"}
        message={modalConfig.type === 'approve'
          ? `Are you confident with the structure and content quality of the question paper for ${currentPaper?.subject}? Approving locks it for live CBT delivery.`
          : `Confirm kicking ${currentPaper?.subject} back to the teacher's workspace workbench for mandatory adjustments?`
        }
        confirmLabel={modalConfig.type === 'approve' ? "Approve & Publish" : "Reject to Teacher"}
        cancelLabel="Cancel Audit"
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
        summaryData={{
          "Course Subject": currentPaper?.subject,
          "Class Partition": currentPaper?.classGroup,
          "Workflow Action": modalConfig.type === 'approve' ? "MARK_READY_FOR_CBT" : "RETURN_FOR_MUTATION_DRAFT"
        }}
      />

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        Veritas Intranet School Administration Core Layer
      </footer>

    </div>
  );
}