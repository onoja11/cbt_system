import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, AlertCircle, Image as ImageIcon, ShieldAlert, Monitor, Lock } from 'lucide-react';
import { saveAnswerLocally } from '../../core/offlineDb';
import { useOfflineSync } from '../../core/useOfflineSync';

export default function ExamWorkspace({ student, onExamSubmit }) {
  // 💡 1. ACTIVATE THE SEAMLESS OFFLINE BACKEND AUTOMATIC BACKGROUND SYNC
  // Targets dynamic syncing packets every 15 seconds to minimize LAN router pressure points
  const syncStatus = useOfflineSync('asm_3', student?.id || 'VTS-2026-001', 15000);

  // Master Question Dataset Matrix
  const [examData] = useState({
    objective: [
      { id: 'obj_1', number: 1, text: 'Study the network infrastructure diagram below. Which topology type is displayed where all endpoints branch off one single backbone line?', imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80', options: ['Ring Topology Layout', 'Star Hub Layout', 'Bus Backbone Line', 'Mesh Network Layout'] },
      { id: 'obj_2', number: 2, text: 'Evaluate the database architecture rule. Which form normal structural model targets dropping partial primary dependencies cleanly?', options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'] },
      { id: 'obj_3', number: 3, text: 'Which internal hardware module processes volatile temporary runtime instruction threads direct for the CPU register caches?', options: ['Solid State Disk (SSD)', 'Read Only Memory (ROM)', 'Random Access Memory (RAM)', 'Graphics Processing Core (GPU)'] }
    ],
    theory: [
      { id: 'th_1', number: 1, text: 'Examine the microprocessor chip outline illustration. Explain how clock cycles govern binary ingestion calculations inside the Arithmetic Logic Unit.', imageUrl: 'https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=600&q=80' },
      { id: 'th_2', number: 2, text: 'Detail why a school computing lab operating an isolated intranet local server remains immune to public internet breaches, and specify two physical security threats to manage.' }
    ]
  });

  const [activeSection, setActiveSection] = useState('objective'); 
  const [activeIndices, setActiveIndices] = useState({ objective: 0, theory: 0 });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(3600); 
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // SECURITY ENFORCEMENT PROTOCOLS STATES
  const [violationType, setViolationType] = useState(null); 
  const [strikeCounter, setStrikeCounter] = useState(0);
  const [isHardLocked, setIsHardLocked] = useState(false);

  // 1. Countdown Timer decrements
  useEffect(() => {
    if (timeLeft <= 0 || isHardLocked) return;
    const interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isHardLocked]);

  // 2. Anti-Cheat Interceptions
  useEffect(() => {
    const triggerViolationAlert = (type) => {
      setStrikeCounter(prev => {
        const nextCount = prev + 1;
        if (nextCount >= 3) {
          setIsHardLocked(true); 
        } else {
          setViolationType(type); 
        }
        return nextCount;
      });
    };

    const blockAction = (e, type) => {
      e.preventDefault();
      triggerViolationAlert(type);
    };

    const handleCopy = (e) => blockAction(e, 'copy');
    const handlePaste = (e) => blockAction(e, 'paste');
    const handleRightClick = (e) => e.preventDefault(); 
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isHardLocked) {
        triggerViolationAlert('fullscreen');
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isHardLocked]);

  const handleRequestRestoreFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => setViolationType(null))
        .catch(() => alert("Re-entry blocked by browser sandbox bounds."));
    }
  };

  const handleInstructorOverrideClearance = () => {
    const passkey = prompt("ENTER INSTRUCTOR / ADMIN NETWORK OVERRIDE PRIVILEGE KEY:");
    if (passkey === "override12") {
      setStrikeCounter(0);
      setIsHardLocked(false);
      setViolationType(null);
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (passkey !== null) {
      alert("INVALID AUTHORIZATION PASSKEY CELL // ACCESS REJECTED");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentQuestionsList = examData[activeSection];
  const currentIndex = activeIndices[activeSection];
  const currentQuestion = currentQuestionsList[currentIndex];

  const handleNextQuestion = () => {
    if (currentIndex < currentQuestionsList.length - 1) {
      setActiveIndices({ ...activeIndices, [activeSection]: currentIndex + 1 });
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setActiveIndices({ ...activeIndices, [activeSection]: currentIndex - 1 });
    }
  };

  // 💡 2. OBJECTIVE SELECTION INTERCEPTOR: Write instantly to local memory storage disk asynchronously
  const handleSelectObjectiveOption = async (optionIdx) => {
    setAnswers({ ...answers, [currentQuestion.id]: optionIdx });

    const answerPacket = {
      question_id: currentQuestion.id,
      answered_index: optionIdx,
      theory_response: null,
      security_strikes: strikeCounter
    };

    await saveAnswerLocally(answerPacket);
  };

  // 💡 3. THEORETICAL TEXT FIELDS KEYSTROKE INTERCEPTOR
  const handleTypeTheoryResponse = async (textValue) => {
    setAnswers({ ...answers, [currentQuestion.id]: textValue });

    const answerPacket = {
      question_id: currentQuestion.id,
      answered_index: null,
      theory_response: textValue,
      security_strikes: strikeCounter
    };

    await saveAnswerLocally(answerPacket);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none relative">
      
      {/* LOCKOUT OVERLAY SCREEN */}
      {isHardLocked && (
        <div className="fixed inset-0 bg-slate-950 z-[10000] flex flex-col justify-center items-center text-center p-6 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">TERMINAL ACCOUNT LOCKED OUT</h3>
              <p className="text-xs text-rose-600 font-bold font-mono uppercase mt-1">Total Integrity Breaches: {strikeCounter} / 3 Strikes Met</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-4">
                This workstation terminal has been completely frozen due to repeated rule violations (attempting to copy text, paste shortcuts, or exit fullscreen mode). 
              </p>
              <p className="text-[11px] text-slate-400 font-medium bg-slate-50 border p-2.5 rounded mt-3 leading-relaxed">
                💡 <span className="font-bold text-slate-700">Presentation Note:</span> Type <code className="font-mono bg-slate-100 font-black text-rose-600 px-1 rounded">override12</code> below to simulate unlocking the screen.
              </p>
            </div>
            <button onClick={handleInstructorOverrideClearance} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded cursor-pointer text-center">
              Apply Instructor Authorization Key
            </button>
          </div>
        </div>
      )}

      {/* WARNING MODAL LAYER */}
      {violationType && !isHardLocked && (
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex flex-col justify-center items-center text-center p-6 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight">Warning: Security Alert Triggered</h3>
              <p className="text-[11px] text-amber-600 font-bold font-mono uppercase mt-0.5">Alert Strike counter: {strikeCounter} / 3</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3">
                {violationType === 'copy' && "Copying question text blocks is strictly forbidden by the system engine rules."}
                {violationType === 'paste' && "Pasting external text paragraphs into submission fields is completely blocked."}
                {violationType === 'fullscreen' && "Exiting fullscreen layout structures triggers system security logs."}
              </p>
            </div>
            <button onClick={handleRequestRestoreFullscreen} className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-sm cursor-pointer">
              Re-engage Fullscreen & Continue
            </button>
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">
              {student?.initials || 'DS'}
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-none uppercase">{student?.name || 'DUNG STEPHEN NYAM'}</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-mono">{student?.classGroup || 'DESK ROOM JSS3'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 💡 PREMIUM DYNAMIC CONNECTION BADGE */}
            <div className={`px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 ${
              syncStatus === 'Synced' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              syncStatus === 'Syncing...' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'Synced' ? 'bg-emerald-600' : syncStatus === 'Syncing...' ? 'bg-blue-600' : 'bg-amber-500 animate-ping'}`} />
              LAN BUFFER: {syncStatus === 'Offline_Saving_Local' ? 'LOCAL RECOVERY SAVE' : syncStatus}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-sm font-bold shadow-2xs">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Section Switcher Tabs */}
      <div className="w-full max-w-7xl mx-auto px-4 py-2 mt-4 flex gap-2">
        <button onClick={() => { setActiveSection('objective'); }} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded cursor-pointer ${activeSection === 'objective' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500'}`}>Section A: Objectives</button>
        <button onClick={() => { setActiveSection('theory'); }} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded cursor-pointer ${activeSection === 'theory' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500'}`}>Section B: Theory</button>
      </div>

      {/* Main Form Split Viewports Layout Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 my-auto items-stretch">
        
        {/* Left Workspace Panel */}
        <section className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between min-h-[460px] shadow-2xs">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {activeSection === 'objective' ? 'Objective Task' : 'Theory Assignment'} {currentIndex + 1} of {currentQuestionsList.length}
              </span>
            </div>

            {currentQuestion.imageUrl && (
              <div className="mb-5 border border-slate-200 bg-slate-50 p-2 max-w-xs rounded overflow-hidden shadow-3xs">
                <img src={currentQuestion.imageUrl} alt="Exam reference diagram" className="w-full h-auto object-cover rounded-xs" />
              </div>
            )}

            <h3 className="text-sm font-medium text-slate-900 leading-relaxed mb-6">
              {currentQuestion.text}
            </h3>

            {activeSection === 'objective' ? (
              <div className="space-y-2.5">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectObjectiveOption(idx)}
                      className={`w-full text-left px-4 py-3 border text-xs font-medium rounded transition-all flex items-center justify-between cursor-pointer ${
                        isSelected ? 'border-slate-900 bg-slate-50/80 text-slate-900 ring-1 ring-slate-900 font-bold' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{option}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={6}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleTypeTheoryResponse(e.target.value)}
                placeholder="Type your comprehensive written theory script lines response here..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all resize-none leading-relaxed"
              />
            )}
          </div>

          <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-100">
            <button 
              disabled={currentIndex === 0} 
              onClick={handlePrevQuestion} 
              className="px-4 py-2 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button 
              disabled={currentIndex === currentQuestionsList.length - 1} 
              onClick={handleNextQuestion} 
              className="px-4 py-2 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Right Navigation Roadmaps panel */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">{activeSection === 'objective' ? 'Section A Roadmap' : 'Section B Roadmap'}</h4>
            <div className="grid grid-cols-5 gap-2">
              {currentQuestionsList.map((q, idx) => {
                const active = idx === currentIndex;
                const answered = answers[q.id] !== undefined && answers[q.id] !== '';
                return (
                  <button 
                    key={q.id} 
                    onClick={() => setActiveIndices({ ...activeIndices, [activeSection]: idx })} 
                    className={`h-9 text-xs font-bold font-mono border transition-all rounded flex items-center justify-center relative cursor-pointer ${
                      active ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 
                      answered ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {idx + 1}
                    {answered && !active && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-slate-400 rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 mt-6">
            <button onClick={() => setShowSubmitModal(true)} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all rounded-sm shadow-2xs cursor-pointer text-center">Submit Full Paper</button>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">Intranet Client Sync Buffer Engine: Active</footer>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/30 z-[10000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3"><AlertCircle className="w-4 h-4 text-slate-400" /><h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Submit Verification</h5></div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Are you completely finished with both sections? Submitting closes your active terminal worksheet data bundle on the school intranet node.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase rounded cursor-pointer">Review Paper</button>
              <button onClick={() => { setShowSubmitModal(false); document.exitFullscreen().catch(() => {}); onExamSubmit(); }} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer shadow-2xs">Confirm Submit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}