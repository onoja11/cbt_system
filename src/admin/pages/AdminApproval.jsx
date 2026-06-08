import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Eye, FileText, Layers, ListChecks } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function AdminApproval({ onNavigateBack }) {
  // 💡 DETAILED PRESENTATION REGISTRY PACKET
  const [pendingReviews, setPendingReviews] = useState([
    { 
      id: 'asm_4', 
      classGroup: 'Grade 9 / JSS 3', 
      subject: 'COMPUTER SCIENCE', 
      type: 'Exam', 
      duration: '60 Mins', 
      teacher: 'Mr. Ochigbo Godswill', 
      status: 'Under Review',
      objectivesList: [
        { id: 'o_1', num: 1, text: 'Which network topology connects all endpoints back to one single central hub switch node device?', options: ['Bus Topology Layout', 'Ring Topology Layout', 'Star Hub Layout', 'Mesh Network Layout'], correctIndex: 2 },
        { id: 'o_2', num: 2, text: 'Evaluate the database architecture rule. Which form normal structural model targets dropping partial primary dependencies cleanly?', options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'], correctIndex: 1 }
      ],
      theoriesList: [
        { id: 't_1', num: 1, text: 'Examine the microprocessor chip outline illustration. Explain how clock cycles govern binary ingestion calculations inside the Arithmetic Logic Unit.', points: 10, rubricSchema: 'Full marks require explaining clock frequency synchronization, fetch-execute lifecycle steps, and instruction register status shifts.' },
        { id: 't_2', num: 2, text: 'Detail why a school computing lab operating an isolated intranet local server remains immune to public internet breaches, and specify two physical security threats to manage.', points: 10, rubricSchema: 'Must explicitly outline NAT boundary exclusion, local router subnet air-gapping, and physical port locking access nodes.' }
      ]
    },
    { 
      id: 'asm_7', 
      classGroup: 'Grade 7 / JSS 1', 
      subject: 'BASIC DIGITAL LITERACY', 
      type: 'CA 2', 
      duration: '30 Mins', 
      teacher: 'Mr. Dung Stephen Nyam', 
      status: 'Under Review',
      objectivesList: [
        { id: 'o_3', num: 1, text: 'Which internal hardware module processes volatile temporary runtime instruction threads direct for the CPU register caches?', options: ['Solid State Disk (SSD)', 'Read Only Memory (ROM)', 'Random Access Memory (RAM)', 'Graphics Processing Core (GPU)'], correctIndex: 2 }
      ],
      theoriesList: [
        { id: 't_3', num: 1, text: 'Differentiate between input peripheral signals and hardware output rendering pipelines with clear real-world deployment examples.', points: 10, rubricSchema: 'Requires mapping signal conversion micro-controllers for data ingestion vs hardware rendering drivers.' }
      ]
    }
  ]);

  const [activeReviewId, setActiveReviewId] = useState('asm_4');
  const [activeSectorTab, setActiveSectorTab] = useState('obj'); // 'obj' | 'theory'
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });

  const currentPaper = pendingReviews.find(p => p.id === activeReviewId);

  const handleExecuteApproval = () => {
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
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none font-sans text-slate-900">
      
      {/* Header View */}
      <header className="w-full bg-slate-950 text-white px-4 md:px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white mr-1 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm shrink-0">ADM</div>
            <div className="truncate">
              <h2 className="text-xs font-black text-white uppercase tracking-wider truncate">Question Paper Inspection Desk</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tight truncate">Principal Oversight Panel</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/60 px-2.5 py-1 rounded uppercase tracking-wide shrink-0">
            {pendingReviews.length} Papers Pending Signature
          </span>
        </div>
      </header>

      {/* Main Framework Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-auto">
        
        {/* LEFT COLUMN: Vetting Ledger Incoming Queue List */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[200px] lg:h-[540px] shadow-2xs overflow-hidden w-full">
          <div className="mb-4 pb-2 border-b border-slate-100 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Vetting Queue List</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 w-full">
            {pendingReviews.map((paper) => {
              const isSelected = paper.id === activeReviewId;
              return (
                <div
                  key={paper.id}
                  onClick={() => {
                    setActiveReviewId(paper.id);
                    setRejectionFeedback('');
                  }}
                  className={`p-4 border rounded-lg text-left cursor-pointer transition-all w-full ${
                    isSelected ? 'border-slate-950 bg-slate-50 shadow-3xs' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-bold uppercase border px-1.5 py-0.5 rounded-sm bg-white text-slate-500 shrink-0">{paper.type}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">{paper.duration}</span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-950 mt-2.5 truncate">{paper.subject}</h4>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-1 truncate">{paper.classGroup} • {paper.teacher}</p>
                </div>
              );
            })}
            {pendingReviews.length === 0 && (
              <div className="text-center p-8 font-medium text-slate-400 italic text-xs mt-12 w-full">All submitted papers verified. Queue completely empty!</div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Review Sandbox Preview Pane */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col min-h-[460px] lg:h-[540px] shadow-2xs overflow-hidden w-full">
          {currentPaper ? (
            <div className="w-full h-full flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 flex-1 overflow-y-auto pb-4 pr-1 w-full">
                
                {/* Active Inspecting Metadata Strip Card */}
                <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs shrink-0 w-full">
                  <div className="truncate w-full sm:w-auto">
                    <span className="text-[8px] font-mono font-bold uppercase text-slate-400 tracking-wider block">Inspecting Assessment Ledger</span>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-tight mt-0.5 truncate">{currentPaper.subject}</h3>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-0.5 font-mono truncate">{currentPaper.classGroup}</p>
                  </div>
                  <div className="sm:text-right font-mono text-[10px] text-slate-400 uppercase shrink-0">
                    Instructor: <span className="text-white block mt-0.5 font-sans font-black text-xs">{currentPaper.teacher}</span>
                  </div>
                </div>

                {/* 💡 THE DOUBLE SECTOR TAB CONTROLLER */}
                <div className="flex bg-slate-100 p-1 rounded-lg border font-mono text-[10px] font-bold shrink-0 w-full">
                  <button 
                    onClick={() => setActiveSectorTab('obj')} 
                    className={`flex-1 py-2 rounded text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all ${activeSectorTab === 'obj' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Section A: Objectives ({currentPaper.objectivesList.length})
                  </button>
                  <button 
                    onClick={() => setActiveSectorTab('theory')} 
                    className={`flex-1 py-2 rounded text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all ${activeSectorTab === 'theory' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Section B: Theory ({currentPaper.theoriesList.length})
                  </button>
                </div>

                {/* ITEM BANK PREVIEW RENDER CORE */}
                <div className="border border-slate-200 rounded-lg p-3 md:p-4 bg-slate-50/50 w-full">
                  
                  {/* TAB CARD VIEW A: OBJECTIVE MULTIPLE CHOICE MATRIX */}
                  {activeSectorTab === 'obj' && (
                    <div className="space-y-4 w-full">
                      {currentPaper.objectivesList.map((q) => (
                        <div key={q.id} className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-3 shadow-3xs w-full">
                          <h4 className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed uppercase select-text">
                            <span className="font-mono text-slate-400 mr-1">[OBJ 0{q.num}]</span> {q.text}
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 w-full">
                            {q.options.map((option, idx) => {
                              const isCorrectAnswer = q.correctIndex === idx;
                              return (
                                <div 
                                  key={idx} 
                                  className={`px-3 py-2 border text-[11px] font-mono font-bold uppercase rounded-md tracking-tight ${
                                    isCorrectAnswer 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black' 
                                      : 'bg-slate-50/50 border-slate-100 text-slate-500'
                                  }`}
                                >
                                  <span className="text-slate-400 mr-1">[0{idx + 1}]</span> {option} {isCorrectAnswer && "✓"}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB CARD VIEW B: THEORIES &蓝BLUEPRINT RUBRIC DETAILS */}
                  {activeSectorTab === 'theory' && (
                    <div className="space-y-4 w-full">
                      {currentPaper.theoriesList.map((q) => (
                        <div key={q.id} className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-3 shadow-3xs w-full">
                          <div className="flex justify-between items-start gap-2 border-b border-slate-50 pb-2 flex-wrap">
                            <h4 className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed uppercase select-text">
                              <span className="font-mono text-slate-400 mr-1">[TH 0{q.num}]</span> Question Prompt
                            </h4>
                            <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-50 border px-2 py-0.5 rounded-sm shrink-0">Weight: {q.points} Marks</span>
                          </div>

                          <p className="text-xs md:text-sm font-medium text-slate-800 leading-relaxed uppercase select-text pl-1">{q.text}</p>
                          
                          {/* Dedicated Evaluation Rubric Card Slot Container */}
                          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-1.5 font-mono text-[11px] tracking-tight text-slate-300">
                            <span className="text-[9px] text-amber-400 font-black tracking-wider block uppercase">💡 Expected Answer Rubric Grading Blueprint:</span>
                            <p className="leading-relaxed uppercase font-medium">{q.rubricSchema}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Feedback Input Block */}
                <div className="space-y-1.5 pt-1 w-full shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Rejection Corrections / Adjustments Comments
                  </label>
                  <textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="If executing a rejection drop back to faculty workspace, specify the mandatory adjustments text guidelines here..."
                    className="w-full h-16 px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-950 transition-all rounded-md resize-none leading-relaxed font-sans"
                  />
                </div>

              </div>

              {/* Lower Operation Action Triggers row cells */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0 w-full">
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'reject' })}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                >
                  <XCircle className="w-4 h-4" /> Reject Back
                </button>
                <button
                  onClick={() => setModalConfig({ isOpen: true, type: 'approve' })}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Grant Clearance
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-400 italic text-xs font-sans">
              Select an entry envelope item from the vetting list queue to open the active preview sandbox pane.
            </div>
          )}
        </section>

      </main>

      {/* Confirmation Modals */}
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

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase px-4 shrink-0">
        Veritas Intranet School Administration Core Layer
      </footer>

    </div>
  );
}