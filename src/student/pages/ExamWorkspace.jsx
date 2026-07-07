import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronLeft, ChevronRight, ShieldAlert, CheckCircle, Lock, Loader2, Award, Sparkles } from 'lucide-react';
import { saveAnswerLocally } from '../../core/offlineDb';
import { useOfflineSync } from '../../core/useOfflineSync';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function ExamWorkspace({ student, assessmentId, onExamSubmit }) {
  // 🛰️ AUTOMATIC LAN BUFFER LOCAL SYNC PIPELINE
  const syncStatus = useOfflineSync(assessmentId, student?.id || 'VTS-2026', 15000);

  // Core structural memory registers
  const [questions, setQuestions] = useState({ objective: [], theory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('objective'); 
  const [activeIndices, setActiveIndices] = useState({ objective: 0, theory: 0 });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null); 
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [examMeta, setExamMeta] = useState(null);

  const timerStorageKey = `exam_time_left_${assessmentId}_${student?.id || 'VTS-2026'}`;
  const localStorageKey = `exam_strikes_${assessmentId}_${student?.id || 'VTS-2026'}`;
  
  const [strikeCounter, setStrikeCounter] = useState(() => {
    const savedStrikes = localStorage.getItem(localStorageKey);
    return savedStrikes ? parseInt(savedStrikes, 10) : 0;
  });
  const [violationType, setViolationType] = useState(null); 
  const [isHardLocked, setIsHardLocked] = useState(() => {
    const savedStrikes = localStorage.getItem(localStorageKey);
    return savedStrikes ? parseInt(savedStrikes, 10) >= 3 : false;
  });

  const [timeExtensionAlert, setTimeExtensionAlert] = useState({ isVisible: false, addedMinutes: 0 });
  const [isClockFlashing, setIsClockFlashing] = useState(false);
  const prevTimeLeftRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────
  // EFFECT HOOK: Ingest Questions & Reconcile Persistent Clock
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDatabaseExamSheet = async () => {
      try {
        const response = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/questions`, { method: 'GET' });
        const data = await response.json();

        const feedRes = await apiRequest('api/v1/student/lobby/active-feed', { method: 'GET' });
        const feedData = await feedRes.json();

        if (response.ok && feedRes.ok) {
          const dbQuestions = data.questions || [];
          setExamMeta(feedData.exam);
          
          // 🎯 FIXED: Normalizing types to lowercase to handle database string mismatch fields cleanly
          const objectives = dbQuestions.filter(q => {
            const cleanType = String(q.type || '').trim().toLowerCase();
            return cleanType === 'objective' || cleanType === 'true/false';
          }).map((q, idx) => ({
            id: q.id,
            number: idx + 1,
            text: q.question_text,
            imageUrl: q.image_url,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
          }));

          const theories = dbQuestions.filter(q => {
            const cleanType = String(q.type || '').trim().toLowerCase();
            return cleanType === 'theory';
          }).map((q, idx) => ({
            id: q.id,
            number: idx + 1,
            text: q.question_text,
            imageUrl: q.image_url
          }));

          setQuestions({ objective: objectives, theory: theories });
          
          let finalizedSecondsLeft = 3600;
          const localStoredTime = localStorage.getItem(timerStorageKey);

          if (localStoredTime !== null) {
            finalizedSecondsLeft = Math.max(0, parseInt(localStoredTime, 10));
          } else if (feedData.exam) {
            const rawDuration = parseInt(feedData.exam.duration, 10);
            const durationMinutes = isNaN(rawDuration) ? 60 : rawDuration;
            finalizedSecondsLeft = durationMinutes * 60;
          }

          setTimeLeft(finalizedSecondsLeft);
          prevTimeLeftRef.current = finalizedSecondsLeft;
          localStorage.setItem(timerStorageKey, finalizedSecondsLeft.toString());

          if (objectives.length === 0 && theories.length > 0) {
            setActiveSection('theory');
          }

          let activeStrikes = parseInt(localStorage.getItem(localStorageKey), 10) || 0;
          if (!document.fullscreenElement && activeStrikes < 3 && !showSuccessModal) {
            activeStrikes = activeStrikes + 1;
            localStorage.setItem(localStorageKey, activeStrikes);
            setStrikeCounter(activeStrikes);
            
            if (activeStrikes >= 3) {
              setIsHardLocked(true);
            } else {
              setViolationType('fullscreen');
            }
          }

          await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
            method: 'POST',
            body: JSON.stringify({
              question_id: dbQuestions[0]?.id || 1,
              answered_index: null,
              theory_response: null,
              security_strikes: activeStrikes, 
              current_seconds_remaining: activeStrikes >= 3 ? 0 : finalizedSecondsLeft,
              objective_progress_string: `0 / ${objectives.length}`,
              theory_progress_string: `0 / ${theories.length}`
            })
          });

          if (activeStrikes >= 3) {
            localStorage.removeItem(localStorageKey);
            localStorage.removeItem(timerStorageKey);
            setShowSuccessModal(true);
          }
        }
      } catch (error) {
        console.error(error);
        setTimeLeft(3600); 
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) fetchDatabaseExamSheet();
  }, [assessmentId]);

  // ─────────────────────────────────────────────────────────────────
  // EFFECT HOOK: Live Proctor Dynamic Listener Loops
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || showSuccessModal) return;

    const checkProctorCommandUpdates = async () => {
      try {
        const monitorRes = await apiRequest(`api/v1/teacher/monitor/${assessmentId}`, { method: 'GET' });
        const monitorData = await monitorRes.json();

        if (monitorRes.ok && monitorData.students) {
          const currentStudentId = student?.id || 'VTS-2026';
          const activeSession = monitorData.students.find(s => 
            String(s.student_profile_id) === String(currentStudentId) || String(s.id) === String(currentStudentId)
          );
          
          if (activeSession) {
            if (activeSession.status.includes('Submitted') || activeSession.is_submitted == true) {
              localStorage.removeItem(localStorageKey);
              localStorage.removeItem(timerStorageKey);
              setShowSuccessModal(true);
              return;
            }

            const serverViolations = parseInt(activeSession.violations, 10) || 0;
            if (serverViolations === 0 && strikeCounter > 0) {
              localStorage.setItem(localStorageKey, '0');
              setStrikeCounter(0);
              setIsHardLocked(false);
              setViolationType(null);
            }

            const currentMasterSeconds = parseInt(activeSession.seconds_remaining, 10);
            if (!isNaN(currentMasterSeconds) && prevTimeLeftRef.current !== null) {
              const clockDifference = currentMasterSeconds - prevTimeLeftRef.current;
              
              if (clockDifference >= 30) { 
                const addedMins = Math.round(clockDifference / 60);
                setTimeLeft(currentMasterSeconds);
                prevTimeLeftRef.current = currentMasterSeconds;
                localStorage.setItem(timerStorageKey, currentMasterSeconds.toString());
                
                setIsClockFlashing(true);
                setTimeExtensionAlert({ isVisible: true, addedMinutes: addedMins || 5 });
                
                setTimeout(() => setIsClockFlashing(false), 5000);
                setTimeout(() => setTimeExtensionAlert({ isVisible: false, addedMinutes: 0 }), 6000);
              } else {
                prevTimeLeftRef.current = timeLeft;
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const monitorIntervalId = setInterval(checkProctorCommandUpdates, 4000);
    return () => clearInterval(monitorIntervalId);
  }, [isLoading, showSuccessModal, assessmentId, student, timeLeft, strikeCounter]);

  // ─────────────────────────────────────────────────────────────────
  // EFFECT HOOK: Live Clock Ticker Pipeline
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || isHardLocked || isLoading || showSuccessModal) return;

    if (timeLeft <= 0) {
      handleFinalEmergencyAutoSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(p => {
        if (p === null || p <= 1) {
          clearInterval(interval);
          handleFinalEmergencyAutoSubmit();
          return 0;
        }
        const nextTime = p - 1;
        prevTimeLeftRef.current = nextTime;
        localStorage.setItem(timerStorageKey, nextTime.toString());
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isHardLocked, isLoading, showSuccessModal]);

  const handleFinalEmergencyAutoSubmit = () => {
    localStorage.removeItem(localStorageKey);
    localStorage.removeItem(timerStorageKey);
    setShowSuccessModal(true);
  };

  // Anti-Cheat Surveillance Rule Set Handlers
  useEffect(() => {
    if (isLoading || isHardLocked || showSuccessModal) return; 

    const triggerViolationAlert = async (type) => {
      const currentStrikes = parseInt(localStorage.getItem(localStorageKey), 10) || 0;
      const nextCount = currentStrikes + 1;
      
      localStorage.setItem(localStorageKey, nextCount);
      setStrikeCounter(nextCount);
      
      if (nextCount >= 3) {
        setIsHardLocked(true); 
      } else {
        setViolationType(type); 
      }

      const currentQ = questions[activeSection]?.[activeIndices[activeSection]];
      if (currentQ) {
        const objCount = Object.keys(answers).filter(k => questions.objective.some(q => q.id === parseInt(k, 10))).length;
        const thyCount = Object.keys(answers).filter(k => questions.theory.some(q => q.id === parseInt(k, 10))).length;

        await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
          method: 'POST',
          body: JSON.stringify({
            question_id: currentQ.id,
            answered_index: activeSection === 'objective' ? (answers[currentQ.id] ?? null) : null,
            theory_response: activeSection === 'theory' ? (answers[currentQ.id] ?? null) : null,
            security_strikes: nextCount, 
            current_seconds_remaining: nextCount >= 3 ? 0 : timeLeft,
            objective_progress_string: `${objCount} / ${questions.objective.length}`,
            theory_progress_string: `${thyCount} / ${questions.theory.length}`
          })
        });

        if (nextCount >= 3) {
          localStorage.removeItem(localStorageKey);
          localStorage.removeItem(timerStorageKey);
          setShowSuccessModal(true);
        }
      }
    };

    const blockAction = (e, type) => {
      e.preventDefault();
      triggerViolationAlert(type);
    };

    const handleCopy = (e) => blockAction(e, 'copy');
    const handlePaste = (e) => blockAction(e, 'paste');
    const handleRightClick = (e) => e.preventDefault(); 
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isHardLocked && !showSuccessModal) {
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
  }, [isHardLocked, isLoading, showSuccessModal, questions, activeSection, activeIndices, answers, timeLeft]);

  const handleRequestRestoreFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => setViolationType(null))
        .catch(() => alert("Could not restore fullscreen mode automatically. Please contact your supervisor."));
    }
  };

  const handleInstructorOverrideClearance = () => {
    const passkey = prompt("ENTER INSTRUCTOR / OVERRIDE PASSWORD:");
    if (passkey === "override12") {
      localStorage.setItem(localStorageKey, '0');
      setStrikeCounter(0);
      setIsHardLocked(false);
      setViolationType(null);
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (passkey !== null) {
      alert("Invalid password.");
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentQuestionsList = questions[activeSection] || [];
  const currentIndex = activeIndices[activeSection] || 0;
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

  const handleSelectObjectiveOption = async (optionIdx) => {
    const updatedAnswers = { ...answers, [currentQuestion.id]: optionIdx };
    setAnswers(updatedAnswers);

    const objCount = Object.keys(updatedAnswers).filter(k => questions.objective.some(q => q.id === parseInt(k, 10))).length;
    const thyCount = Object.keys(updatedAnswers).filter(k => questions.theory.some(q => q.id === parseInt(k, 10))).length;

    const answerPacket = {
      question_id: currentQuestion.id,
      answered_index: optionIdx,
      theory_response: null,
      security_strikes: strikeCounter,
      current_seconds_remaining: timeLeft,
      objective_progress_string: `${objCount} / ${questions.objective.length}`,
      theory_progress_string: `${thyCount} / ${questions.theory.length}`
    };
    await saveAnswerLocally(answerPacket);
  };

  const handleTypeTheoryResponse = async (textValue) => {
    const updatedAnswers = { ...answers, [currentQuestion.id]: textValue };
    setAnswers(updatedAnswers);

    const objCount = Object.keys(updatedAnswers).filter(k => questions.objective.some(q => q.id === parseInt(k, 10))).length;
    const thyCount = Object.keys(updatedAnswers).filter(k => questions.theory.some(q => q.id === parseInt(k, 10))).length;

    const answerPacket = {
      question_id: currentQuestion.id,
      answered_index: null,
      theory_response: textValue,
      security_strikes: strikeCounter,
      current_seconds_remaining: timeLeft,
      objective_progress_string: `${objCount} / ${questions.objective.length}`,
      theory_progress_string: `${thyCount} / ${questions.theory.length}`
    };
    await saveAnswerLocally(answerPacket);
  };

  if (isLoading || timeLeft === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Loading your Start-Rite question paper safely...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none relative w-full overflow-x-hidden text-[#2A1A63]">
      
      {/* CLOCK EXTENSION FLOATING ALERT BANNER */}
      {timeExtensionAlert.isVisible && (
        <div className="fixed top-24 right-6 z-[99999] bg-emerald-600 text-white font-sans text-xs px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <div>
            <span className="font-black block">Extra Time Added!</span>
            <span className="text-[10px] text-emerald-100">Your supervisor added +{timeExtensionAlert.addedMinutes} minutes to your clock.</span>
          </div>
        </div>
      )}

      {/* HARD LOCKOUT OVERLAY */}
      {isHardLocked && (
        <div className="fixed inset-0 bg-slate-950/90 z-[20000] flex flex-col justify-center items-center text-center p-6 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-[#9A87A9]/40 rounded-xl p-8 shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-[#C62927] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-950">Workstation Locked</h3>
              <p className="text-xs text-[#C62927] font-bold font-mono uppercase mt-1">Rules Broken: {strikeCounter} / 3 Warning Strikes</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-4">
                This screen has been locked because the application rules were skipped multiple times (leaving fullscreen or attempting shortcuts). Please wait for an invigilator to inspect your station.
              </p>
            </div>
            <button onClick={handleInstructorOverrideClearance} className="w-full py-3 bg-[#C62927] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md cursor-pointer">
              Enter Supervisor Key
            </button>
          </div>
        </div>
      )}

      {/* WARNING POPUP ALERTS */}
      {violationType && !isHardLocked && !showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-[9999] flex flex-col justify-center items-center text-center p-6 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/30 p-6 rounded-xl shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#C62927] shrink-0 mt-0.5" />
              <h3 className="text-sm font-black uppercase text-slate-950">Security Rule Notice</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {violationType === 'copy' && "Copying text is completely locked on this examination panel."}
              {violationType === 'paste' && "Pasting external content inside answers is disabled."}
              {violationType === 'fullscreen' && "Exiting your test screen layout triggers a warning strike code."}
            </p>
            <button onClick={handleRequestRestoreFullscreen} className="w-full py-2 bg-[#2A1A63] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer">
              Return to Test Mode
            </button>
          </div>
        </div>
      )}

      {/* HEADER COHORT BAR */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2A1A63] text-white font-black text-xs flex items-center justify-center rounded-lg shadow-sm uppercase">
              {student?.initials || student?.name?.substring(0,2) || 'EX'}
            </div>
            <div className="text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">{examMeta?.subject || "Examination Paper"}</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] mt-0.5 uppercase font-mono">{student?.name || "Candidate Row"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-2.5 py-1.5 border rounded border-[#9A87A9]/20 text-[9px] font-mono font-black uppercase tracking-wider ${
              syncStatus ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
            }`}>
              {syncStatus ? '✓ Channels Synced' : '⚠ Buffer Staging'}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold shadow-3xs font-mono text-left ${
              timeLeft < 300 ? 'text-[#C62927] bg-rose-50 border-rose-100 animate-pulse font-black' : 'text-[#2A1A63] bg-[#FAF9FA]'
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION SELECTORS */}
      <div className="w-full max-w-7xl mx-auto px-4 py-2 mt-4 flex gap-2 shrink-0">
        {questions.objective.length > 0 && (
          <button onClick={() => setActiveSection('objective')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider cursor-pointer font-mono transition-all duration-150 ${activeSection === 'objective' ? 'bg-[#2A1A63] text-white shadow-sm border-[#2A1A63]' : 'bg-white border border-[#9A87A9]/30 text-[#9A87A9] hover:bg-slate-50'}`}>Section A: Objectives</button>
        )}
        {questions.theory.length > 0 && (
          <button onClick={() => setActiveSection('theory')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider cursor-pointer font-mono transition-all duration-150 ${activeSection === 'theory' ? 'bg-[#2A1A63] text-white shadow-sm border-[#2A1A63]' : 'bg-white border border-[#9A87A9]/30 text-[#9A87A9] hover:bg-slate-50'}`}>Section B: Theory</button>
        )}
      </div>

      {/* CORE PRESENTATION WORKSPACE VIEWPORT */}
      {currentQuestionsList.length === 0 ? (
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white border border-dashed border-[#9A87A9]/30 rounded-xl py-24 flex items-center justify-center">
          No active question matrix rows found in this section boundary partition.
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 my-auto items-stretch overflow-hidden">
          
          <section className="md:col-span-3 bg-white border border-[#9A87A9]/30 rounded-xl p-6 flex flex-col justify-between min-h-[440px] shadow-3xs text-left">
            <div>
              <div className="flex justify-between items-center border-b border-[#FAF9FA] pb-3 mb-5 font-mono text-[10px] font-black text-[#9A87A9] uppercase">
                <span>{activeSection === 'objective' ? 'Multiple Choice' : 'Written Theory Essay'} Slot {currentIndex + 1}</span>
                <span className="bg-[#FAF9FA] border px-2 py-0.5 rounded text-slate-950 font-black">Weight: 2 Marks</span>
              </div>

              {currentQuestion?.imageUrl && (
                <div className="mb-5 border border-[#9A87A9]/20 rounded-xl overflow-hidden bg-[#FAF9FA] max-w-sm h-48 flex items-center justify-center shadow-3xs">
                  <img src={currentQuestion.imageUrl} alt="Reference Attachment" className="w-full h-full object-contain p-2" />
                </div>
              )}

              <h3 className="text-sm font-bold text-slate-950 leading-relaxed mb-6 font-sans">
                {currentQuestion?.text}
              </h3>

              {activeSection === 'objective' ? (
                <div className="space-y-2.5 w-full">
                  {currentQuestion?.options.map((option, idx) => {
                    const isSelected = answers[currentQuestion.id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectObjectiveOption(idx)}
                        className={`w-full px-4 py-3 border rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-between text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-[#2A1A63] text-white border-[#2A1A63] shadow-md scale-[1.005]' 
                            : 'bg-[#FAF9FA] border-[#9A87A9]/20 text-slate-800 hover:border-[#9A87A9]/50'
                        }`}
                      >
                        <span>{String.fromCharCode(65 + idx)}) {option}</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white/20' : 'border-[#9A87A9]/40'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  rows={7}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleTypeTheoryResponse(e.target.value)}
                  placeholder="Type your structured written answer script response neatly here..."
                  className="w-full px-4 py-3 bg-[#FAF9FA] border border-[#9A87A9]/40 text-sm font-bold font-sans text-slate-950 rounded-xl focus:outline-none focus:border-[#2A1A63] focus:bg-white transition-all shadow-inner placeholder:font-mono placeholder:text-slate-400 placeholder:text-xs"
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-50 font-mono">
              <button 
                disabled={currentIndex === 0} 
                onClick={handlePrevQuestion} 
                className="px-4 py-2 border border-[#9A87A9]/30 rounded-lg text-[10px] font-black uppercase text-slate-700 hover:border-slate-950 disabled:opacity-30 cursor-pointer transition-all active:scale-[0.97]"
              >
                Back Item
              </button>
              <button 
                disabled={currentIndex === currentQuestionsList.length - 1} 
                onClick={handleNextQuestion} 
                className="px-4 py-2 bg-white border border-[#9A87A9]/30 text-[10px] font-black uppercase text-slate-700 rounded-lg hover:border-slate-950 disabled:opacity-30 cursor-pointer transition-all active:scale-[0.97]"
              >
                Next Item
              </button>
            </div>
          </section>

          {/* RIGHT ROADMAP NAV GRID */}
          <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 flex flex-col justify-between shadow-3xs overflow-hidden text-left">
            <div className="w-full h-full flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black text-[#9A87A9] font-mono uppercase tracking-wider mb-3 border-b pb-1.5">Questions Ledger Grid</h4>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-1 flex-1 max-h-[290px]">
                {currentQuestionsList.map((q, idx) => {
                  const active = idx === currentIndex;
                  const answered = answers[q.id] !== undefined && answers[q.id] !== '';
                  return (
                    <button 
                      key={q.id} 
                      onClick={() => setActiveIndices({ ...activeIndices, [activeSection]: idx })} 
                      className={`h-9 text-xs font-black font-mono border transition-all rounded-lg flex items-center justify-center relative cursor-pointer active:scale-[0.93] ${
                        active ? 'bg-[#2A1A63] text-white border-[#2A1A63] shadow-md font-black' : 
                        answered ? 'bg-indigo-50 border-indigo-200 text-[#2A1A63] font-black' : 'bg-white border-[#9A87A9]/20 text-[#9A87A9] hover:border-[#9A87A9]/40'
                      }`}
                    >
                      {idx + 1}
                      {answered && !active && <div className="absolute top-1 right-1 w-1 h-1 bg-[#2A1A63] rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-50 mt-4 shrink-0">
              <button onClick={() => setShowSubmitModal(true)} className="w-full py-3 bg-[#C62927] hover:opacity-90 text-white font-black text-xs uppercase tracking-wider tracking-widest transition-all rounded-lg shadow-md cursor-pointer text-center active:scale-[0.98]">
                Submit Exam Paper
              </button>
            </div>
          </section>
        </main>
      )}

      {/* CONFIRMATION IN-VIEW MODAL OVERLAYS */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-[25000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/30 p-6 rounded-xl shadow-2xl space-y-4 text-left font-sans">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2 text-[#2A1A63]">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <h5 className="text-xs font-black uppercase tracking-tight font-mono">Finish Examination Sheet</h5>
            </div>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              Are you sure you want to finalize this test paper? Clicking submit logs your responses securely onto the core school mainframe matrix database and seals your submission.
            </p>
            <div className="flex justify-end gap-2 pt-1 font-mono">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-slate-50">Review Answers</button>
              <button onClick={() => { localStorage.removeItem(localStorageKey); localStorage.removeItem(timerStorageKey); setShowSubmitModal(false); setShowSuccessModal(true); }} className="px-4 py-2 bg-[#2A1A63] text-white text-xs font-black uppercase rounded-lg shadow-md cursor-pointer">Yes, Submit Paper</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[30000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/40 p-6 rounded-xl shadow-2xl space-y-5 text-center select-none">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center mx-auto border-emerald-100 shadow-3xs">
              <Award className="w-6 h-6 shrink-0" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight font-sans">Paper Submitted Successfully</h4>
              <p className="text-[10px] text-emerald-600 font-bold font-mono uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block">Status: Sealed & Secured</p>
              <p className="text-xs text-slate-500 font-bold font-sans leading-relaxed pt-2">
                Your examination answers have been safely logged into your instructor's grading queue folder portfolio. You may now close this browser window. Well done!
              </p>
            </div>
            <button onClick={() => { setShowSuccessModal(false); onExamSubmit(); }} className="w-full py-2.5 bg-[#2A1A63] text-white text-xs font-black uppercase rounded-lg shadow-md cursor-pointer tracking-wider font-mono">
              Exit Testing Window
            </button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Intranet Testing Services Engine Layer
      </footer>

    </div>
  );
}