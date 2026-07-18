import React, { useState, useEffect, useRef } from 'react';
import { Clock, ShieldAlert, CheckCircle, Lock, Loader2, Award, Maximize, AlertTriangle, Check, User } from 'lucide-react';
import { saveAnswerLocally } from '../../core/offlineDb';
import { useOfflineSync } from '../../core/useOfflineSync';
import { apiRequest, BASE_URL } from '../../core/api';
import Logo from '../../shared/Logo'; 
import SafeMathText from '../../shared/SafeMathText'; 
import ExamReview from './ExamReview'; 

export default function ExamWorkspace({ student, assessmentId, onExamSubmit }) {
  const syncStatus = useOfflineSync(assessmentId, student?.id || 'VTS-2026', 15000);

  // 📁 Core exam state structures
  const [questions, setQuestions] = useState({ objective: [], theory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isNeedsFullscreenEntry, setIsNeedsFullscreenEntry] = useState(true); 
  const [activeSection, setActiveSection] = useState('objective'); 
  const [activeIndices, setActiveIndices] = useState({ objective: 0, theory: 0 });
  const [answers, setAnswers] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(null); 
  const [examMeta, setExamMeta] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [showReviewPage, setShowReviewPage] = useState(false); 
  const [isSubmittingNetworkPacket, setIsSubmittingNetworkPacket] = useState(false); 

  // 🎯 LOCAL STORAGE CANDIDATE PROFILE STATES
  const [candidateName, setCandidateName] = useState('');
  const [candidateClass, setCandidateClass] = useState('');

  // Explicit target references for central synchronized end time boundaries
  const examEndTimeRef = useRef(null);

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
  
  const isClearanceGraceActiveRef = useRef(false);
  const activeStateRef = useRef({ strikeCounter, timeLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry });
  
  useEffect(() => {
    activeStateRef.current = { strikeCounter, timeLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry };
  }, [strikeCounter, timeLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry]);

  // LOCAL STORAGE FALLBACK PARSER
  useEffect(() => {
    try {
      const storedCandidate = localStorage.getItem('candidate') || localStorage.getItem('student_profile') || localStorage.getItem('user');
      if (storedCandidate) {
        const parsed = JSON.parse(storedCandidate);
        setCandidateName(parsed.full_name || parsed.name || student?.name || 'DUNG STEPHEN NYAM');
        setCandidateClass(parsed.class_group || parsed.class_arm || parsed.class || student?.class_arm || 'JSS 3A');
      } else {
        setCandidateName(student?.name || 'DUNG STEPHEN NYAM');
        setCandidateClass(student?.class_arm || student?.class_group || 'JSS 3A');
      }
    } catch (err) {
      console.warn("Could not retrieve clean JSON profile block, using fallback props:", err);
      setCandidateName(student?.name || 'DUNG STEPHEN NYAM');
      setCandidateClass(student?.class_arm || 'JSS 3A');
    }
  }, [student]);

  const resolvedClassArm = React.useMemo(() => {
    return candidateClass || 'JSS 3A';
  }, [candidateClass]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinalDatabaseSubmission = async () => {
    setIsSubmittingNetworkPacket(true);
    const activeCtx = activeStateRef.current;

    try {
      const currentQ = activeCtx.questions[activeCtx.activeSection]?.[activeCtx.activeIndices[activeCtx.activeSection]];
      const objCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.objective.some(q => q.id === parseInt(k, 10))).length;
      const thyCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.theory.some(q => q.id === parseInt(k, 10))).length;

      await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
        method: 'POST',
        body: JSON.stringify({
          question_id: currentQ ? currentQ.id : null,
          answered_index: currentQ && typeof activeCtx.answers[currentQ.id] === 'number' ? activeCtx.answers[currentQ.id] : null,
          theory_response: currentQ && typeof activeCtx.answers[currentQ.id] === 'string' ? activeCtx.answers[currentQ.id] : null,
          security_strikes: strikeCounter,
          current_seconds_remaining: 0,
          objective_progress_string: `${objCount} / ${activeCtx.questions.objective.length}`,
          theory_progress_string: `${thyCount} / ${activeCtx.questions.theory.length}`,
          status_override: 'SUBMITTED'
        })
      });

      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, {
        method: 'POST',
        body: JSON.stringify({ terminal_context: 'MANUAL_SUBMIT_TRIGGER' })
      });

      localStorage.removeItem(localStorageKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("❌ Submission Network Failure, running fallback cache clearing:", err);
      localStorage.removeItem(localStorageKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } finally {
      setIsSubmittingNetworkPacket(false);
    }
  };

  const handleFinalEmergencyAutoSubmit = async () => {
    const activeCtx = activeStateRef.current;
    localStorage.removeItem(localStorageKey);

    try {
      const currentQ = activeCtx.questions[activeCtx.activeSection]?.[activeCtx.activeIndices[activeCtx.activeSection]];
      const objCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.objective.some(q => q.id === parseInt(k, 10))).length;
      const thyCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.theory.some(q => q.id === parseInt(k, 10))).length;

      await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
        method: 'POST',
        body: JSON.stringify({
          question_id: currentQ ? currentQ.id : null,
          answered_index: currentQ && typeof activeCtx.answers[currentQ.id] === 'number' ? activeCtx.answers[currentQ.id] : null,
          theory_response: currentQ && typeof activeCtx.answers[currentQ.id] === 'string' ? activeCtx.answers[currentQ.id] : null,
          security_strikes: strikeCounter,
          current_seconds_remaining: 0,
          objective_progress_string: `${objCount} / ${activeCtx.questions.objective.length}`,
          theory_progress_string: `${thyCount} / ${activeCtx.questions.theory.length}`,
          status_override: 'CONCLUDED'
        })
      });

      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, {
        method: 'POST',
        body: JSON.stringify({ terminal_context: 'TIMEOUT_AUTO_SUBMIT_TRIGGER' })
      });
    } catch (err) {
      console.error("❌ [EMERGENCY AUTO-SUBMIT TELEMETRY SYNC FAULT]:", err);
    }

    setShowSuccessModal(true);
  };

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

  const handleInitialForceStartExam = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => {
          setIsNeedsFullscreenEntry(false);
          setViolationType(null);
        })
        .catch(() => {
          setIsNeedsFullscreenEntry(false);
          setViolationType(null);
        });
    } else {
      setIsNeedsFullscreenEntry(false);
      setViolationType(null);
    }
  };

  // INITIAL LOAD: FETCH EXAMINATION CONTENT AND SET SYNCHRONIZED TARGET TIMES
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
          console.log(feedData.exam);
          const objectives = dbQuestions.filter(q => {
            const cleanType = String(q.type || '').trim().toLowerCase();
            return cleanType === 'objective' || cleanType === 'true/false';
          }).map((q, idx) => {
            let processedImageUrl = null;
            if (q.image_url) {
              const cleanPath = q.image_url.startsWith('/') ? q.image_url.slice(1) : q.image_url;
              processedImageUrl = `${BASE_URL}/${cleanPath}`;
            }
            return {
              id: q.id,
              type: 'Objective',
              number: idx + 1,
              text: q.question_text,
              points_weight: q.points_weight || q.pointsWeight || 2, 
              imageUrl: processedImageUrl,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
            };
          });

          const theories = dbQuestions.filter(q => {
            const cleanType = String(q.type || '').trim().toLowerCase();
            return cleanType === 'theory';
          }).map((q, idx) => {
            let processedImageUrl = null;
            if (q.image_url) {
              const cleanPath = q.image_url.startsWith('/') ? q.image_url.slice(1) : q.image_url;
              processedImageUrl = `${BASE_URL}/${cleanPath}`;
            }
            return {
              id: q.id,
              type: 'Theory',
              number: idx + 1,
              text: q.question_text,
              points_weight: q.points_weight || q.pointsWeight || 2, 
              rubric: q.theory_rubric || q.rubric || '', 
              imageUrl: processedImageUrl,
              options: []
            };
          });

          setQuestions({ objective: objectives, theory: theories });
          
          if (feedData.exam && feedData.exam.scheduled_end) {
            const targetTimeString = feedData.exam.scheduled_end.replace(' ', 'T');
            examEndTimeRef.current = new Date(targetTimeString).getTime();
          } else {
            const fallbackDuration = parseInt(feedData.exam?.duration_minutes || feedData.exam?.duration || 30, 10);
            examEndTimeRef.current = Date.now() + (fallbackDuration * 60 * 1000);
          }

          const deltaSeconds = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
          setTimeLeft(deltaSeconds);

          if (objectives.length === 0 && theories.length > 0) {
            setActiveSection('theory');
          }

          if (document.fullscreenElement) {
            setIsNeedsFullscreenEntry(false);
          }
        }
      } catch (error) {
        console.error(error);
        setTimeLeft(1800); 
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) fetchDatabaseExamSheet();
  }, [assessmentId]);

  // LIVE COGNITIVE SYSTEM COUNTDOWN MONITOR PIPELINE
  useEffect(() => {
    if (!examEndTimeRef.current || isHardLocked || isLoading || showSuccessModal) return;

    const interval = setInterval(() => {
      const remainingSeconds = Math.floor((examEndTimeRef.current - Date.now()) / 1000);
      
      if (remainingSeconds <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        handleFinalEmergencyAutoSubmit();
      } else {
        setTimeLeft(remainingSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHardLocked, isLoading, showSuccessModal]);

  // ANTI-CHEAT SECURITY HOOKS
  useEffect(() => {
    if (isLoading || showSuccessModal) return; 

    const triggerViolationAlert = async (type) => {
      const activeCtx = activeStateRef.current;
      if (activeCtx.isNeedsFullscreenEntry || activeCtx.isHardLocked || isClearanceGraceActiveRef.current) return;

      const currentStrikes = parseInt(localStorage.getItem(localStorageKey), 10) || 0;
      const nextCount = currentStrikes + 1;
      
      localStorage.setItem(localStorageKey, nextCount.toString());
      setStrikeCounter(nextCount);
      
      if (nextCount >= 3) {
        setIsHardLocked(true); 
      } else {
        setViolationType(type); 
      }

      const currentQ = activeCtx.questions[activeCtx.activeSection]?.[activeCtx.activeIndices[activeCtx.activeSection]];
      
      if (currentQ) {
        const objCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.objective.some(q => q.id === parseInt(k, 10))).length;
        const thyCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.theory.some(q => q.id === parseInt(k, 10))).length;

        await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
          method: 'POST',
          body: JSON.stringify({
            question_id: currentQ.id,
            answered_index: typeof activeCtx.answers[currentQ.id] === 'number' ? activeCtx.answers[currentQ.id] : null,
            theory_response: typeof activeCtx.answers[currentQ.id] === 'string' ? activeCtx.answers[currentQ.id] : null,
            security_strikes: nextCount, 
            current_seconds_remaining: activeCtx.timeLeft,
            objective_progress_string: `${objCount} / ${activeCtx.questions.objective.length}`,
            theory_progress_string: `${thyCount} / ${activeCtx.questions.theory.length}`
          })
        });
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
      const activeCtx = activeStateRef.current;
      if (!document.fullscreenElement && !activeCtx.isHardLocked && !showSuccessModal && !activeCtx.isNeedsFullscreenEntry && !isClearanceGraceActiveRef.current) {
        triggerViolationAlert('fullscreen');
      }
    };

    const handlePreventBrowserReload = (e) => {
      if (showSuccessModal) return;
      e.preventDefault();
      e.returnValue = 'Start-Rite Security';
      return e.returnValue;
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handlePreventBrowserReload);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handlePreventBrowserReload);
    };
  }, [isLoading, showSuccessModal, assessmentId]);

  const handleSelectObjectiveOption = async (optionIdx) => {
    const updatedAnswers = { ...answers, [currentQuestion.id]: optionIdx };
    setAnswers(updatedAnswers);

    const objCount = Object.keys(updatedAnswers).filter(k => questions.objective.some(q => q.id === parseInt(k, 10))).length;
    const thyCount = Object.keys(updatedAnswers).filter(k => questions.theory.some(q => q.id === parseInt(k, 10))).length;

    const answerPacket = {
      question_id: currentQuestion.id,
      answered_index: optionIdx,
      theory_response: null,
      security_strikes: parseInt(localStorage.getItem(localStorageKey), 10) || strikeCounter,
      current_seconds_remaining: timeLeft,
      objective_progress_string: `${objCount} / ${questions.objective.length}`,
      theory_progress_string: `${thyCount} / ${questions.theory.length}`
    };
    await saveAnswerLocally(answerPacket);
  };

  const handleRequestRestoreFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => setViolationType(null))
        .catch(() => {});
    }
  };

  const currentQuestionsList = questions[activeSection] || [];
  const currentIndex = activeIndices[activeSection] || 0;
  const currentQuestion = currentQuestionsList[currentIndex];

  // 🎯 NEW: RESOLVE DYNAMIC DIRECTIONS FALLBACKS SAFELY
  const currentSectionInstructions = React.useMemo(() => {
      if (activeSection === 'objective') {
        return examMeta?.objective_instructions || 'Answer all multiple-choice questions in this section.';
      }
      return examMeta?.theory_instructions || 'Answer all questions out of this section comprehensively.';
    }, [activeSection, examMeta]);

  if (showReviewPage) {
    return (
      <ExamReview 
        student={{ name: candidateName, class_arm: candidateClass }} 
        assessment={examMeta}
        questions={questions.objective.concat(questions.theory)}
        answers={answers}
        timeSpentSeconds={timeLeft !== null ? Math.max(0, ((examMeta?.duration_minutes || examMeta?.duration || 30) * 60) - timeLeft) : 0}
        onExit={onExamSubmit}
      />
    );
  }

  if (isLoading || timeLeft === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Synchronizing global room countdown matrices...
      </div>
    );
  }

  if (isNeedsFullscreenEntry) {
    return (
      <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-center items-center p-6 text-center select-none text-[#2A1A63]">
        <div className="w-full max-w-md bg-white border border-[#9A87A9]/30 rounded-2xl p-8 shadow-2xl space-y-5 text-left">
          <div className="flex items-center gap-3 border-b pb-4 text-slate-950">
            <Logo size={40} showText={false} />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">{examMeta?.subject || "Secure Entry"}</h3>
              <p className="text-[10px] text-[#9A87A9] font-mono uppercase tracking-wider font-bold">
                Candidate: {candidateName} {resolvedClassArm ? `(${resolvedClassArm})` : ''}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            Your secure session requires absolute desktop environment prioritization. Click below to re-initialize native fullscreen mode and secure your terminal workspace desk.
          </p>
          <button onClick={handleInitialForceStartExam} className="w-full py-3 bg-[#2A1A63] text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer font-mono">
            <Maximize className="w-4 h-4 text-white" /> Return to Question Paper Sheet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none relative w-full overflow-x-hidden text-[#2A1A63]">
      {/* SECURITY OVERLAYS */}
      {isHardLocked && (
        <div className="fixed inset-0 bg-slate-950/95 z-[20000] flex flex-col justify-center items-center text-center p-6 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-[#9A87A9]/40 rounded-2xl p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black uppercase text-slate-950">Workstation Locked</h3>
            <p className="text-xs text-[#C62927] font-bold font-mono uppercase">Strikes Threshold Breached: {strikeCounter} / 3</p>
          </div>
        </div>
      )}

      {violationType && !isHardLocked && !showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-[9999] flex flex-col justify-center items-center text-center p-6 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/30 p-6 rounded-2xl shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2 text-[#C62927] pb-2 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black uppercase tracking-wider font-sans">Proctor Alert Warning</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              A security boundary compromise was observed ({violationType.toUpperCase()}). Please return to active exam layout focus immediately to avoid an automated lock-out event.
            </p>
            <button onClick={handleRequestRestoreFullscreen} className="w-full py-2.5 bg-[#2A1A63] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer font-mono">
              Return to Test Mode
            </button>
          </div>
        </div>
      )}

      {/* HEADER NAVBAR CONTAINER */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <Logo size={36} showText={false} />
            <div className="text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">{examMeta?.subject || "Examination Paper"}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-[#FAF9FA]">
              <User className="w-3.5 h-3.5 text-[#2A1A63]" />
              <div className="text-left leading-tight">
                <p className="text-[10px] font-black uppercase text-slate-900">{candidateName}</p>
                <p className="text-[8px] font-bold text-[#9A87A9] font-mono uppercase">{resolvedClassArm}</p>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-mono font-bold uppercase ${
              strikeCounter > 0 ? 'bg-rose-50 border-rose-200 text-[#C62927]' : 'bg-[#FAF9FA] border-slate-200 text-slate-500'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Strikes: {strikeCounter} / 3</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold font-mono bg-[#FAF9FA]">
              <Clock className="w-4 h-4 text-[#2A1A63] shrink-0" />
              <span className={timeLeft <= 300 ? "text-[#C62927] font-black animate-pulse" : ""}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION TABS */}
      <div className="w-full max-w-7xl mx-auto px-4 py-2 mt-4 flex gap-2 shrink-0">
        {questions.objective.length > 0 && (
          <button onClick={() => setActiveSection('objective')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider font-mono ${activeSection === 'objective' ? 'bg-[#2A1A63] text-white' : 'bg-white text-[#9A87A9]'}`}>Section A: Objectives</button>
        )}
        {questions.theory.length > 0 && (
          <button onClick={() => setActiveSection('theory')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider font-mono ${activeSection === 'theory' ? 'bg-[#2A1A63] text-white' : 'bg-white text-[#9A87A9]'}`}>Section B: Theory</button>
        )}
      </div>

      {/* CANVAS ELEMENT SPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 my-auto items-stretch overflow-hidden">
        <section className="md:col-span-3 bg-white border border-[#9A87A9]/30 rounded-xl p-6 flex flex-col justify-between min-h-[440px] shadow-3xs text-left">
          <div>
            {/* 🎯 FIXED: DYNAMIC DIRECTIONS BANNER LINKED DIRECTLY TO BACKEND BLUEPRINTS */}
            <div className="bg-[#FAF9FA] border border-[#9A87A9]/20 p-3 rounded-xl text-[11px] font-sans font-bold text-slate-700 leading-relaxed uppercase tracking-tight mb-5 shadow-3xs">
              <span className="font-mono text-[9px] font-black text-[#2A1A63] block mb-0.5">📋 Section Directions:</span>
              <SafeMathText text={currentSectionInstructions} />
            </div>

            {currentQuestion?.imageUrl && (
              <div className="mb-5 border border-[#9A87A9]/20 rounded-xl overflow-hidden bg-[#FAF9FA] max-w-sm h-48 flex items-center justify-center">
                <img src={currentQuestion.imageUrl} alt="Reference Attachment" className="w-full h-full object-contain p-2" />
              </div>
            )}

            <div className="flex justify-between items-center pb-2 mb-4 border-b border-slate-50 font-mono text-[10px] text-[#9A87A9] font-black uppercase">
              <span>Question Slot {currentIndex + 1} of {currentQuestionsList.length}</span>
              <span>Weight: {currentQuestion?.points_weight || 2} Marks</span>
            </div>

            <h3 className="text-sm font-bold text-slate-950 leading-relaxed mb-6">
              <SafeMathText text={currentQuestion?.text} />
            </h3>

            <div className="space-y-2.5 w-full">
              {activeSection === 'objective' ? (
                currentQuestion?.options?.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === idx;
                  const optionText = typeof option === 'object' ? option.text : option;

                  return (
                    <button
                      key={idx} 
                      onClick={() => handleSelectObjectiveOption(idx)}
                      className={`w-full px-5 py-4 border-2 rounded-xl text-xs font-bold font-sans transition-all duration-150 flex items-center justify-between text-left cursor-pointer ${
                        isSelected 
                          ? 'bg-[#2A1A63]/5 border-[#2A1A63] text-[#2A1A63] shadow-inner ring-1 ring-[#2A1A63]/10 font-black' 
                          : 'bg-[#FAF9FA] border-[#9A87A9]/20 hover:bg-slate-50 hover:border-slate-350 text-slate-700'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + idx)}) <SafeMathText text={optionText} /></span>
                      {isSelected && (
                        <span className="w-5 h-5 bg-[#2A1A63] rounded-full flex items-center justify-center shrink-0 ml-3">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-6 bg-[#FAF9FA] border border-[#9A87A9]/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-[#2A1A63]">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-black text-[#9A87A9] uppercase tracking-wider block">Theory Answer Model</span>
                    <p className="text-xs font-medium text-slate-600 font-sans max-w-sm">
                      This subjective question is evaluated by your administrator. A complete diagnostic review guideline and key criteria rubric will be provided at exam completion.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-100 font-mono">
            <button disabled={currentIndex === 0} onClick={handlePrevQuestion} className="px-4 py-2 border border-[#9A87A9]/30 rounded-lg text-[10px] uppercase text-slate-700 disabled:opacity-30 hover:bg-slate-50">Back Item</button>
            <button disabled={currentIndex === currentQuestionsList.length - 1} onClick={handleNextQuestion} className="px-4 py-2 bg-white border border-[#9A87A9]/30 text-[10px] uppercase text-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50">Next Item</button>
          </div>
        </section>

        {/* REVIEW SIDEBAR LEDGER MATRIX */}
        <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 flex flex-col justify-between shadow-3xs text-left">
          <div className="space-y-4 overflow-hidden flex flex-col h-full">
            <div className="border-b pb-2">
              <h4 className="text-[10px] font-black uppercase text-slate-950 tracking-wider">Review Panel Ledger</h4>
              <p className="text-[8px] font-bold text-[#9A87A9] font-mono uppercase">Select index block to jump</p>
            </div>

            <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[280px] pr-1 py-1">
              {currentQuestionsList.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                const isActive = idx === currentIndex;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setActiveIndices({ ...activeIndices, [activeSection]: idx })}
                    className={`h-10 text-xs font-black font-mono rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2A1A63] text-white border-[#2A1A63] shadow-sm'
                        : isAnswered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-[#FAF9FA] text-[#9A87A9] border-[#9A87A9]/20 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 mt-4 shrink-0">
            <button onClick={() => setShowSubmitModal(true)} className="w-full py-3 bg-[#C62927] text-[#FAF9FA] font-black text-xs uppercase tracking-wider rounded-lg shadow-md cursor-pointer text-center">
              Submit Exam Paper
            </button>
          </div>
        </section>
      </main>

      {/* CONFIRMATION OVERLAYS */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-[25000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl space-y-4 text-left border border-[#9A87A9]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-950 pb-2 border-b border-slate-100">
                <Clock className="w-5 h-5 text-[#2A1A63] shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">Confirm Exam Submission</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Are you absolutely sure you are ready to conclude and submit your answers to the academic board matrix? This action cannot be reversed.</p>
            </div>
            <div className="flex gap-2 font-mono">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-2 bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg text-xs font-bold uppercase text-[#9A87A9]">Resume Test</button>
              <button onClick={handleFinalDatabaseSubmission} className="flex-1 py-2 bg-[#2A1A63] text-white text-xs font-black uppercase rounded-lg">Yes, Submit Paper</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[30000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl text-center space-y-4 border border-[#9A87A9]/30">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-1">
                <Check className="w-6 h-6 shrink-0" />
              </div>
              <h4 className="text-sm font-black uppercase text-slate-950">Submission Concluded</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Your answers are safely cached and synced to the core school repository.</p>
            </div>
            <button 
              className="w-full py-2.5 bg-[#2A1A63] text-white text-xs font-black uppercase rounded-lg cursor-pointer font-mono" 
              onClick={() => { 
                setShowSuccessModal(false); 
                setShowReviewPage(true); 
              }}
            >
              View Performance Review
            </button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Intranet CBT Registry © 2026
      </footer>
    </div>
  );
}