import React, { useState } from 'react';
import { Eye, CheckCircle2, ArrowLeft, HelpCircle } from 'lucide-react';

// Decoupled Module Components
import QuestionLedger from '../components/QuestionLedger';
import SectionConfigurator from '../components/SectionConfigurator';
import ManualForm from '../components/ManualForm';
import BulkUploader from '../components/BulkUploader';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function QuestionBuilder({ onNavigateBack }) {
  const [ingestionMode, setIngestionMode] = useState('manual'); 
  const [activeSectionTab, setActiveSectionTab] = useState('objective'); 

  const [sectionRules, setSectionRules] = useState({
    objective: { instructions: 'Answer all multiple-choice questions in this section.', maxToAnswer: 'all' },
    theory: { instructions: 'Answer any 3 questions out of 5.', maxToAnswer: 3 }
  });

  // Pre-populating a few questions so the teacher can see the multi-question list immediately
  const [questionBank, setQuestionBank] = useState([
    {
      id: 1,
      type: 'objective',
      text: 'Examine the computer lab network diagram below. Which topology model is displayed where all endpoint devices connect directly to one central distribution line?',
      score: 3,
      options: [
        { text: 'Bus Topology Layout', isCorrect: true },
        { text: 'Star Hub Layout', isCorrect: false }
      ]
    },
    {
      id: 2,
      type: 'theory',
      text: 'Explain how WebSocket connections manage live user focus loss telemetry across a distributed intranet network.',
      score: 10,
      rubric: 'Must highlight bidirectional frames and offline edge fallbacks.'
    },
    {
      id: 3,
      type: 'theory',
      text: 'Detail the operational hazards of running a concurrent exam portal over standard domestic routers rather than enterprise hardware.',
      score: 10,
      rubric: 'Must highlight bufferbloat and packet congestion limits.'
    }
  ]);

  const [activeQuestionId, setActiveQuestionId] = useState(1);
  const [questionText, setQuestionText] = useState('Examine the computer lab network diagram below. Which topology model is displayed where all endpoint devices connect directly to one central distribution line?');
  const [questionScore, setQuestionScore] = useState(3);
  const [manualImageFile, setManualImageFile] = useState(null);
  const [manualImagePreview, setManualImagePreview] = useState('');
  const [options, setOptions] = useState([{ text: 'Bus Topology Layout', isCorrect: true }, { text: 'Star Hub Layout', isCorrect: false }]);
  const [theoryRubric, setTheoryRubric] = useState('');

  // Bulk Upload States
  const [csvFile, setCsvFile] = useState(null);
  const [bulkImages, setBulkImages] = useState([]);
  const [detectedImageHandles, setDetectedImageHandles] = useState([]);

  // Modal Control Triggers
  const [modalType, setModalType] = useState(null); // 'manual_commit' | 'bulk_submit' | null
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      setDetectedImageHandles(['lab_network.png', 'cpu_core.jpg']);
    } else {
      alert("Invalid format. Please attach a validated .csv spreadsheet template.");
    }
  };

  const handleBulkImagesDrop = (e) => {
    const files = Array.from(e.target.files);
    const validatedImages = files.filter(f => f.type.startsWith('image/'));
    setBulkImages([...bulkImages, ...validatedImages]);
  };

  const handleManualImageDrop = (e) => {
    const file = e.target.files[0];
    if (file) { setManualImageFile(file); setManualImagePreview(URL.createObjectURL(file)); }
  };

  const handleAddNewQuestionShell = () => {
    const newId = questionBank.length > 0 ? Math.max(...questionBank.map(q => q.id)) + 1 : 1;
    const newQ = { id: newId, type: activeSectionTab, text: 'New question entry context...', score: 5, options: activeSectionTab === 'objective' ? [{ text: 'Option A', isCorrect: true }, { text: 'Option B', isCorrect: false }] : undefined };
    setQuestionBank([...questionBank, newQ]);
    loadQuestionIntoEditor(newQ);
  };

  const loadQuestionIntoEditor = (q) => {
    setActiveQuestionId(q.id);
    setQuestionText(q.text);
    setQuestionScore(q.score);
    setManualImageFile(q.imageFile || null);
    setManualImagePreview(q.imagePreview || '');
    if (q.type === 'objective') setOptions(q.options);
    else setTheoryRubric(q.rubric || '');
  };

  const handleConfirmActionDispatch = () => {
    if (modalType === 'manual_commit') {
      setQuestionBank(questionBank.map((q) => {
        if (q.id === activeQuestionId) {
          return { ...q, type: activeSectionTab, text: questionText, score: Number(questionScore), imageFile: manualImageFile, imagePreview: manualImagePreview, options: activeSectionTab === 'objective' ? options : undefined, rubric: activeSectionTab === 'theory' ? theoryRubric : undefined };
        }
        return q;
      }));
      setSuccessMessage(`${displayLabelString} successfully saved!`);
    } else if (modalType === 'bulk_submit') {
      setCsvFile(null);
      setBulkImages([]);
      setDetectedImageHandles([]);
      setSuccessMessage("Bulk spreadsheet ledger dataset successfully ingested!");
    }

    setModalType(null);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 2500);
  };

  const filteredBankList = questionBank.filter(q => q.type === activeSectionTab);
  const activeQuestionIndex = filteredBankList.findIndex(q => q.id === activeQuestionId);
  const displayLabelString = activeSectionTab === 'objective' ? `Objective Q${activeQuestionIndex + 1}` : `Theory Q${activeQuestionIndex + 1}`;

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between">
      
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* 💡 FIXED: Back arrow to escape builder canvas smoothly */}
            <button 
              onClick={onNavigateBack} 
              className="p-1 hover:bg-slate-50 border border-slate-200 rounded text-slate-500 mr-2 cursor-pointer transition-all active:scale-[0.97]"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">T</div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Question Manager Terminal</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIngestionMode(ingestionMode === 'manual' ? 'bulk' : 'manual')} className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded transition-all hover:bg-slate-50">
              {ingestionMode === 'manual' ? 'Switch to Bulk CSV Upload' : 'Switch to Manual Canvas'}
            </button>
          </div>
        </div>
      </header>

      {ingestionMode === 'manual' && (
        <div className="w-full max-w-7xl mx-auto px-4 py-2 mt-4 flex gap-2">
          <button onClick={() => { setActiveSectionTab('objective'); }} className={`px-4 py-2 text-xs font-bold uppercase rounded ${activeSectionTab === 'objective' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>Section A: Objectives</button>
          <button onClick={() => { setActiveSectionTab('theory'); }} className={`px-4 py-2 text-xs font-bold uppercase rounded ${activeSectionTab === 'theory' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>Section B: Theory</button>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <QuestionLedger questionBank={questionBank} activeQuestionId={activeQuestionId} activeSectionTab={activeSectionTab} onSelectQuestion={loadQuestionIntoEditor} onAddQuestion={handleAddNewQuestionShell} onDeleteQuestion={(id, e) => { e.stopPropagation(); const f = questionBank.filter(q => q.id !== id); setQuestionBank(f); if (activeQuestionId === id && f.length > 0) loadQuestionIntoEditor(f[0]); }} />

        <div className="lg:col-span-3 flex flex-col">
          {ingestionMode === 'manual' ? (
            <div className="space-y-6 h-full flex flex-col">
              <SectionConfigurator activeSectionTab={activeSectionTab} sectionRules={sectionRules} onRuleChange={(field, val) => setSectionRules({ ...sectionRules, [activeSectionTab]: { ...sectionRules[activeSectionTab], [field]: val } })} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
                <ManualForm activeSectionTab={activeSectionTab} questionScore={questionScore} setQuestionScore={setQuestionScore} manualImageFile={manualImageFile} onImageDrop={handleManualImageDrop} questionText={questionText} setQuestionText={setQuestionText} options={options} setOptions={setOptions} theoryRubric={theoryRubric} setTheoryRubric={setTheoryRubric} onAddOption={() => setOptions([...options, { text: 'New Option', isCorrect: false }])} onRemoveOption={(idx) => setOptions(options.filter((_, i) => i !== idx))} onCommitChanges={() => setModalType('manual_commit')} />
                
                {/* 💡 FIXED: Re-designed preview panel loops sequentially through ALL questions in section */}
                <section className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex-1 h-[440px] overflow-y-auto shadow-inner">
                  <div className="w-full space-y-4">
                    <div className="bg-white border border-slate-200 p-4 rounded shadow-2xs">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] font-medium text-slate-600 mb-2 uppercase font-mono">
                        <span className="font-bold text-slate-900 block mb-0.5">Section Instructions:</span>
                        {sectionRules[activeSectionTab].instructions}
                      </div>
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider px-1">Full Exam Paper Roll-View Preview</p>
                    
                    <div className="space-y-2.5">
                      {filteredBankList.map((q, idx) => (
                        <div key={q.id} className={`p-4 bg-white border rounded shadow-2xs transition-all ${q.id === activeQuestionId ? 'border-slate-400 ring-1 ring-slate-100' : 'border-slate-200/70'}`}>
                          <div className="flex justify-between items-center border-b border-slate-50 pb-1.5 mb-2 font-mono text-[9px] font-bold text-slate-400 uppercase">
                            <span>Question {idx + 1}</span>
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border">{q.score} Points</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 leading-relaxed">{q.text}</p>
                          
                          {q.type === 'objective' && q.options && (
                            <div className="mt-3 grid grid-cols-1 gap-1.5 pl-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="text-[11px] text-slate-600 font-medium flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                  <span>{String.fromCharCode(65 + oIdx)}) {opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'theory' && q.rubric && (
                            <div className="mt-3 p-2 bg-amber-50/40 border border-amber-100 rounded text-[10px] font-medium text-slate-500">
                              <span className="font-bold text-amber-800 block uppercase font-mono text-[9px]">Rubric Guide:</span>
                              💡 {q.rubric}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

              </div>
            </div>
          ) : (
            <BulkUploader csvFile={csvFile} onCSVUpload={handleCSVUpload} onClearCSV={() => { setCsvFile(null); setDetectedImageHandles([]); }} detectedImageHandles={detectedImageHandles} bulkImages={bulkImages} onBulkImagesDrop={handleBulkImagesDrop} onClearBulkImages={() => setBulkImages([])} onSubmitBatch={() => setModalType('bulk_submit')} />
          )}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={modalType !== null}
        title={modalType === 'manual_commit' ? "Confirm Single Ingestion" : "Confirm Batch Ingestion"}
        message={modalType === 'manual_commit' ? "Save modifications for this individual question sheet item card?" : "Are you ready to compile and upload this full spreadsheet batch data layout?"}
        confirmLabel={modalType === 'manual_commit' ? "Save Item" : "Ingest Bulk Batch"}
        cancelLabel="Abort Action"
        onConfirm={handleConfirmActionDispatch}
        onCancel={() => setModalType(null)}
        summaryData={modalType === 'manual_commit' ? { "Mode Type": activeSectionTab, "Question Index": displayLabelString, "Score Points": `${questionScore} pts` } : { "Source Document": csvFile?.name, "Target Capacity": `${detectedImageHandles.length} Questions Map`, "Attached Media": `${bulkImages.length} figures loaded` }}
      />

      {showSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-md shadow-xl flex items-center gap-2 font-mono text-xs uppercase transition-all">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          {successMessage}
        </div>
      )}
    </div>
  );
}