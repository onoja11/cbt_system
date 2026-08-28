import React, { useState, useEffect, useRef } from 'react';
import { Clock, ShieldAlert, CheckCircle, Lock, Loader2, Award, Maximize, AlertTriangle, Check, User, Sparkles } from 'lucide-react';
import { saveAnswerLocally } from '../../core/offlineDb';
import { useOfflineSync } from '../../core/useOfflineSync';
import { apiRequest, BASE_URL } from '../../core/api';
import Logo from '../../shared/Logo'; 
import SafeMathText from '../../shared/SafeMathText'; 

export default function ExamWorkspace({ student, assessmentId, onExamSubmit }) {
  const syncStatus = useOfflineSync(assessmentId, student?.id || 'VTS-2026', 15000);

  const [questions, setQuestions] = useState({ objective: [], theory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isNeedsFullscreenEntry, setIsNeedsFullscreenEntry] = useState(true); 
  const [activeSection, setActiveSection] = useState('objective'); 
  const [activeIndices, setActiveIndices] = useState({ objective: 0, theory: 0 });
  
  const cachedAnswersKey = `exam_answers_${assessmentId}_${student?.id || 'VTS-2026'}`;
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`exam_answers_${assessmentId}_${student?.id || 'VTS-2026'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }); 

  // 🎯 Unified Wall-Clock Total Seconds State (Matches LiveMonitor exactly)
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(null); 
  const [isExtended, setIsExtended] = useState(false);

  const [examMeta, setExamMeta] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 

  const [isSubmittingNetworkPacket, setIsSubmittingNetworkPacket] = useState(false); 

  const [candidateName, setCandidateName] = useState('');
  const [candidateClass, setCandidateClass] = useState('');

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
  const activeStateRef = useRef({ strikeCounter, totalSecondsLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry });
  
  useEffect(() => {
    activeStateRef.current = { strikeCounter, totalSecondsLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry };
  }, [strikeCounter, totalSecondsLeft, questions, activeSection, activeIndices, answers, isHardLocked, isNeedsFullscreenEntry]);

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
      setCandidateName(student?.name || 'DUNG STEPHEN NYAM');
      setCandidateClass(student?.class_arm || 'JSS 3A');
    }
  }, [student]);

  const resolvedClassArm = React.useMemo(() => {
    return candidateClass || 'JSS 3A';
  }, [candidateClass]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(secs)}s`;
    return `${pad(minutes)}:${pad(secs)}`;
  };

  // 🎯 EXACT ABSOLUTE WALL-CLOCK TICKER (Identical math to LiveMonitor)
  useEffect(() => {
    if (isLoading || showSuccessModal || isHardLocked || examEndTimeRef.current === null) return;

    const ticker = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
      setTotalSecondsLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(ticker);
        handleFinalEmergencyAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [isLoading, showSuccessModal, isHardLocked]);

  // 🎯 SUPERVISORY SYNC (Mirrors LiveMonitor's exact end time tracking)
  useEffect(() => {
    if (isLoading || showSuccessModal) return;

    const supervisorySyncInterval = setInterval(async () => {
      try {
        const feedRes = await apiRequest('api/v1/student/lobby/active-feed', { method: 'GET' });
        const feedData = await feedRes.json();

        if (feedRes.status === 200 && feedData.status === 'ALREADY_SUBMITTED') {
          setShowSuccessModal(true);
          return;
        }

        const rawScheduledEnd = 
          feedData.assessment_meta?.scheduled_end || 
          feedData.assessment?.scheduled_end || 
          feedData.session?.scheduled_end || 
          feedData.exam?.scheduled_end || 
          feedData.scheduled_end;

        if (rawScheduledEnd) {
          const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
          const newEndTime = new Date(targetTimeString).getTime();
          if (examEndTimeRef.current && newEndTime !== examEndTimeRef.current) {
            if (newEndTime > examEndTimeRef.current) {
              setIsExtended(true);
            }
            examEndTimeRef.current = newEndTime;
          }
        }
      } catch (err) {
        console.error("Supervisory sync error:", err);
      }
    }, 4000); // Polling at the exact same 4-second cadence as LiveMonitor

    return () => clearInterval(supervisorySyncInterval);
  }, [isLoading, showSuccessModal, assessmentId]);

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
            current_seconds_remaining: totalSecondsLeft || 0,
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

  const handleFinalDatabaseSubmission = async () => {
    setIsSubmittingNetworkPacket(true);
    const activeCtx = activeStateRef.current;

    try {
      const objCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.objective.some(q => q.id === parseInt(k, 10))).length;
      const thyCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.theory.some(q => q.id === parseInt(k, 10))).length;

      const submissionPromises = Object.entries(activeCtx.answers).map(([qId, responseVal]) => {
        return apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
          method: 'POST',
          body: JSON.stringify({
            question_id: parseInt(qId, 10),
            answered_index: typeof responseVal === 'number' ? responseVal : null,
            theory_response: typeof responseVal === 'string' ? responseVal : null,
            security_strikes: strikeCounter,
            current_seconds_remaining: 0,
            objective_progress_string: `${objCount} / ${activeCtx.questions.objective.length}`,
            theory_progress_string: `${thyCount} / ${activeCtx.questions.theory.length}`,
            status_override: 'SUBMITTED'
          })
        });
      });

      await Promise.all(submissionPromises);

      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, {
        method: 'POST',
        body: JSON.stringify({ terminal_context: 'MANUAL_SUBMIT_TRIGGER' })
      });

      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(cachedAnswersKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("❌ Submission Network Failure:", err);
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(cachedAnswersKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } finally {
      setIsSubmittingNetworkPacket(false);
    }
  };

  const handleFinalEmergencyAutoSubmit = async () => {
    const activeCtx = activeStateRef.current;
    localStorage.removeItem(localStorageKey);
    localStorage.removeItem(cachedAnswersKey);

    try {
      const objCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.objective.some(q => q.id === parseInt(k, 10))).length;
      const thyCount = Object.keys(activeCtx.answers).filter(k => activeCtx.questions.theory.some(q => q.id === parseInt(k, 10))).length;

      const autoPromises = Object.entries(activeCtx.answers).map(([qId, responseVal]) => {
        return apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
          method: 'POST',
          body: JSON.stringify({
            question_id: parseInt(qId, 10),
            answered_index: typeof responseVal === 'number' ? responseVal : null,
            theory_response: typeof responseVal === 'string' ? responseVal : null,
            security_strikes: strikeCounter,
            current_seconds_remaining: 0,
            objective_progress_string: `${objCount} / ${activeCtx.questions.objective.length}`,
            theory_progress_string: `${thyCount} / ${activeCtx.questions.theory.length}`,
            status_override: 'CONCLUDED'
          })
        });
      });

      await Promise.all(autoPromises);

      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, {
        method: 'POST',
        body: JSON.stringify({ terminal_context: 'TIMEOUT_AUTO_SUBMIT_TRIGGER' })
      });
    } catch (err) {
      console.error("❌ [EMERGENCY AUTO-SUBMIT FAULT]:", err);
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
        .then(() => { setIsNeedsFullscreenEntry(false); setViolationType(null); })
        .catch(() => { setIsNeedsFullscreenEntry(false); setViolationType(null); });
    } else {
      setIsNeedsFullscreenEntry(false);
      setViolationType(null);
    }
  };

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
          
          const teacherDurationMins = parseInt(feedData.exam?.duration_minutes || 30, 10);
          const baseDurationSecs = teacherDurationMins * 60;
          
          if (feedData.session) {
            const serverStrikes = parseInt(feedData.session.violations || 0, 10);
            localStorage.setItem(localStorageKey, serverStrikes.toString());
            setStrikeCounter(serverStrikes);

            if (serverStrikes < 3) {
              setIsHardLocked(false);
              setViolationType(null);
            } else {
              setIsHardLocked(true);
            }
          }

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
              points_weight: q.points_weight || 2, 
              correct_option_index: q.correct_option_index !== undefined ? q.correct_option_index : 0,
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
              points_weight: q.points_weight || 2, 
              rubric: q.theory_rubric || '', 
              imageUrl: processedImageUrl,
              options: []
            };
          });

          setQuestions({ objective: objectives, theory: theories });
          
          // 🎯 EXACT ABSOLUTE WALL-CLOCK TIME INITIALIZATION (Identical to LiveMonitor)
          const rawScheduledEnd = 
            feedData.assessment_meta?.scheduled_end || 
            feedData.assessment?.scheduled_end || 
            feedData.session?.scheduled_end || 
            feedData.exam?.scheduled_end || 
            feedData.scheduled_end;

          if (rawScheduledEnd) {
            const targetTimeString = String(rawScheduledEnd).replace(' ', 'T');
            examEndTimeRef.current = new Date(targetTimeString).getTime();
          } else if (feedData.session && feedData.session.seconds_remaining) {
            examEndTimeRef.current = Date.now() + (parseInt(feedData.session.seconds_remaining, 10) * 1000);
          } else {
            examEndTimeRef.current = Date.now() + (baseDurationSecs * 1000);
          }

          const initialRemainingSecs = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
          setTotalSecondsLeft(initialRemainingSecs);

          if (objectives.length === 0 && theories.length > 0) {
            setActiveSection('theory');
          }

          if (document.fullscreenElement) {
            setIsNeedsFullscreenEntry(false);
          }
        }
      } catch (error) {
        console.error(error);
        setTotalSecondsLeft(1800); 
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) fetchDatabaseExamSheet();
  }, [assessmentId]);

  const handleSelectObjectiveOption = async (optionIdx) => {
    const qId = parseInt(currentQuestion.id, 10);
    const updatedAnswers = { ...answers, [qId]: optionIdx, [currentQuestion.id]: optionIdx };
    setAnswers(updatedAnswers);

    localStorage.setItem(cachedAnswersKey, JSON.stringify(updatedAnswers));

    const objCount = Object.keys(updatedAnswers).filter(k => questions.objective.some(q => q.id === parseInt(k, 10))).length;
    const thyCount = Object.keys(updatedAnswers).filter(k => questions.theory.some(q => q.id === parseInt(k, 10))).length;

    const answerPacket = {
      question_id: qId,
      answered_index: optionIdx,
      theory_response: null,
      security_strikes: parseInt(localStorage.getItem(localStorageKey), 10) || strikeCounter,
      current_seconds_remaining: totalSecondsLeft || 0,
      objective_progress_string: `${objCount} / ${questions.objective.length}`,
      theory_progress_string: `${thyCount} / ${questions.theory.length}`
    };
    await saveAnswerLocally(answerPacket);
  };

  const handleRequestRestoreFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().then(() => setViolationType(null)).catch(() => {});
    }
  };

  const currentQuestionsList = questions[activeSection] || [];
  const currentIndex = activeIndices[activeSection] || 0;
  const currentQuestion = currentQuestionsList[currentIndex];

  const currentSectionInstructions = React.useMemo(() => {
    if (activeSection === 'objective') {
      return examMeta?.objective_instructions || 'Answer all multiple-choice questions in this section.';
    }
    return examMeta?.theory_instructions || 'Answer all questions out of this section comprehensively.';
  }, [activeSection, examMeta]);

  if (isLoading || totalSecondsLeft === null) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Synchronizing examination room matrices...
      </div>
    );
  }

  if (isNeedsFullscreenEntry) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center p-6 text-center select-none text-[#2A1A63]">
        <div className="w-full max-w-md bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-8 shadow-xs space-y-5 text-left">
          <div className="flex items-center gap-3 border-b border-[#E2D5F8]/60 pb-4 text-slate-900">
            <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
              <Logo size={32} showText={false} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-sans">{examMeta?.subject || "Secure Entry"}</h3>
              <p className="text-[11px] font-bold text-[#7C6B93] font-mono uppercase tracking-wider mt-0.5">
                Candidate: {candidateName} {resolvedClassArm ? `(${resolvedClassArm})` : ''}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-sans font-semibold">
            Your secure session requires absolute desktop environment prioritization. Click below to re-initialize native fullscreen mode and secure your terminal workspace desk.
          </p>
          <button onClick={handleInitialForceStartExam} className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer font-mono transition-all active:scale-[0.97]">
            <Maximize className="w-4 h-4 text-white" /> Return to Question Paper Sheet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none relative w-full overflow-x-hidden text-[#2A1A63]">
      
      {isHardLocked && (
        <div className="fixed inset-0 bg-slate-950/90 z-[20000] flex flex-col justify-center items-center text-center p-6 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black uppercase text-slate-900 font-sans">Workstation Locked Out</h3>
              <p className="text-xs text-rose-600 font-bold font-mono uppercase">Strikes Threshold Breached: {strikeCounter} / 3</p>
              <p className="text-xs text-slate-600 font-sans leading-relaxed pt-2">
                Your examination session has been automatically sealed and locked due to multiple security boundary violations. Please notify your hall supervisor.
              </p>
            </div>
            <button onClick={handleFinalEmergencyAutoSubmit} className="w-full py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer font-mono transition-all active:scale-[0.97]">
              Finalize & Return to Lobby
            </button>
          </div>
        </div>
      )}

      {violationType && !isHardLocked && !showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9999] flex flex-col justify-center items-center text-center p-6">
          <div className="w-full max-w-sm bg-white border border-rose-200 p-6 rounded-3xl shadow-2xl space-y-4 text-left font-sans">
            <div className="flex items-center gap-2 text-rose-600 pb-2 border-b border-rose-100">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black uppercase tracking-wider">Proctor Security Alert</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              A security boundary compromise was observed (<span className="font-mono uppercase font-black text-slate-900">{violationType}</span>). Strike count: <span className="font-mono font-black text-rose-600">{strikeCounter} / 3</span>. Returning to test mode now.
            </p>
            <button onClick={handleRequestRestoreFullscreen} className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer font-mono transition-all active:scale-[0.97]">
              Return to Test Mode Immediately
            </button>
          </div>
        </div>
      )}

      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
              <Logo size={32} showText={false} />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-white">{examMeta?.subject || "Examination Paper"}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 font-mono">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-white/30 rounded-2xl bg-white/20 text-white shadow-2xs">
              <User className="w-3.5 h-3.5 text-white" />
              <div className="text-left leading-tight">
                <p className="text-[10px] font-black uppercase">{candidateName}</p>
                <p className="text-[8px] font-bold text-white/80 font-mono uppercase">{resolvedClassArm}</p>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-2xl text-xs font-mono font-bold uppercase shadow-2xs ${
              strikeCounter > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white/20 border-white/30 text-white'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Strikes: {strikeCounter} / 3</span>
            </div>

            {/* 🎯 Perfectly Matched Total Wall-Clock Timer Display */}
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-2xl text-sm font-bold font-mono bg-white/20 text-white shadow-2xs ${
                isExtended ? 'border-purple-300 ring-1 ring-purple-300' : 'border-white/30'
              }`}>
                <Clock className="w-4 h-4 text-white shrink-0" />
                <span className={totalSecondsLeft <= 300 ? "text-rose-200 font-black animate-pulse" : ""}>
                  {formatTime(totalSecondsLeft)}
                </span>
              </div>
              {isExtended && (
                <span className="text-[9px] font-black font-mono text-purple-200 uppercase tracking-widest mt-1 animate-pulse flex items-center ">
                  Time Extended
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-8 py-2 mt-4 flex gap-2 shrink-0 font-mono">
        {questions.objective.length > 0 && (
          <button onClick={() => setActiveSection('objective')} className={`px-4 py-2 text-xs font-black uppercase rounded-xl tracking-wider cursor-pointer shadow-2xs transition-all ${activeSection === 'objective' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3EEFC] text-[#7C6B93] border border-[#E2D5F8]'}`}>Section A: Objectives</button>
        )}
        {questions.theory.length > 0 && (
          <button onClick={() => setActiveSection('theory')} className={`px-4 py-2 text-xs font-black uppercase rounded-xl tracking-wider cursor-pointer shadow-2xs transition-all ${activeSection === 'theory' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3EEFC] text-[#7C6B93] border border-[#E2D5F8]'}`}>Section B: Theory</button>
        )}
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-4 grid grid-cols-1 md:grid-cols-4 gap-6 my-auto items-stretch overflow-hidden">
        <section className="md:col-span-3 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col justify-between min-h-[440px] shadow-xs text-left">
          <div>
            <div className="bg-white border border-[#E2D5F8] p-3.5 rounded-2xl text-[11px] font-sans font-semibold text-slate-700 leading-relaxed uppercase tracking-tight mb-5 shadow-2xs">
              <span className="font-mono text-[9px] font-black text-[#7C3AED] block mb-0.5">Section Directions:</span>
              <SafeMathText text={currentSectionInstructions} />
            </div>

            {currentQuestion?.imageUrl && (
              <div className="mb-5 border border-[#E2D5F8] rounded-2xl overflow-hidden bg-white max-w-sm h-48 flex items-center justify-center shadow-2xs">
                <img src={currentQuestion.imageUrl} alt="Reference Attachment" className="w-full h-full object-contain p-2" />
              </div>
            )}

            <div className="flex justify-between items-center pb-2 mb-4 border-b border-[#E2D5F8]/60 font-mono text-[10px] text-[#7C6B93] font-black uppercase">
              <span>Question Slot {currentIndex + 1} of {currentQuestionsList.length}</span>
              <span>Weight: {currentQuestion?.points_weight || 2} Marks</span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 leading-relaxed mb-6 font-sans">
              <SafeMathText text={currentQuestion?.text} />
            </h3>

            <div className="space-y-2.5 w-full">
              {activeSection === 'objective' ? (
                currentQuestion?.options?.map((option, idx) => {
                  const qId = currentQuestion.id;
                  const isSelected = answers[qId] === idx || answers[parseInt(qId, 10)] === idx;
                  const optionText = typeof option === 'object' ? option.text : option;

                  return (
                    <button
                      key={idx} 
                      onClick={() => handleSelectObjectiveOption(idx)}
                      className={`w-full px-5 py-3.5 border-2 rounded-2xl text-xs font-bold font-sans transition-all duration-150 flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                        isSelected 
                          ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED] shadow-inner ring-1 ring-[#7C3AED]/20 font-black' 
                          : 'bg-white border-[#E2D5F8] hover:border-[#7C3AED]/50 text-slate-700'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + idx)}) <SafeMathText text={optionText} /></span>
                      {isSelected && (
                        <span className="w-5 h-5 bg-[#7C3AED] rounded-full flex items-center justify-center shrink-0 ml-3 shadow-2xs">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-6 bg-white border border-[#E2D5F8] rounded-2xl flex flex-col items-center justify-center text-center space-y-3 min-h-[180px] shadow-2xs">
                  <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center text-[#7C3AED]">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-black text-[#7C6B93] uppercase tracking-wider block">Theory Answer Model</span>
                    <p className="text-xs font-semibold text-slate-600 font-sans max-w-sm">
                      This subjective question is evaluated by your administrator. A complete diagnostic review guideline and key criteria rubric will be provided at exam completion.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-5 mt-6 border-t border-[#E2D5F8]/60 font-mono">
            <button disabled={currentIndex === 0} onClick={handlePrevQuestion} className="px-4 py-2 border border-[#E2D5F8] rounded-xl text-[10px] uppercase text-slate-700 disabled:opacity-30 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs">Back Item</button>
            <button disabled={currentIndex === currentQuestionsList.length - 1} onClick={handleNextQuestion} className="px-4 py-2 bg-white border border-[#E2D5F8] text-[10px] uppercase text-slate-700 rounded-xl disabled:opacity-30 hover:bg-slate-50 cursor-pointer shadow-2xs">Next Item</button>
          </div>
        </section>

        <section className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-5 flex flex-col justify-between shadow-xs text-left">
          <div className="space-y-4 overflow-hidden flex flex-col h-full">
            <div className="border-b border-[#E2D5F8]/60 pb-2">
              <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wider font-mono">Review Panel Ledger</h4>
              <p className="text-[8px] font-bold text-[#7C6B93] font-mono uppercase">Select index block to jump</p>
            </div>

            <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[280px] pr-1 py-1">
              {currentQuestionsList.map((q, idx) => {
                const isAnswered = (answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim() !== '') || 
                                   (answers[parseInt(q.id, 10)] !== undefined && answers[parseInt(q.id, 10)] !== null);
                const isActive = idx === currentIndex;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setActiveIndices({ ...activeIndices, [activeSection]: idx })}
                    className={`h-10 text-xs font-black font-mono rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-[#7C6B93] border-[#E2D5F8] hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2D5F8]/60 mt-4 shrink-0">
            <button onClick={() => setShowSubmitModal(true)} className="w-full py-3 bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer text-center font-mono transition-all active:scale-[0.97]">
              Submit Exam Paper
            </button>
          </div>
        </section>
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[25000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl space-y-4 text-left border border-[#E2D5F8] font-sans">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100 font-mono">
                <Clock className="w-5 h-5 text-[#7C3AED] shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">Confirm Exam Submission</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">Are you absolutely sure you are ready to conclude and submit your answers to the academic board matrix? This action cannot be reversed.</p>
            </div>
            <div className="flex gap-2 font-mono">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold uppercase text-[#7C6B93] cursor-pointer hover:bg-slate-50">Resume Test</button>
              <button disabled={isSubmittingNetworkPacket} onClick={handleFinalDatabaseSubmission} className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.97]">
                {isSubmittingNetworkPacket && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Submit Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl text-center space-y-4 border border-[#E2D5F8] shadow-2xl font-sans">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-1 shadow-2xs">
                <Check className="w-6 h-6 shrink-0 stroke-[3]" />
              </div>
              <h4 className="text-sm font-black uppercase text-slate-900">Submission Concluded</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">Your answers are safely cached and synced to the core school repository.</p>
            </div>
            <button 
              className="w-full py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase rounded-xl cursor-pointer font-mono shadow-md transition-all active:scale-[0.97]" 
              onClick={() => { 
                setShowSuccessModal(false); 
                onExamSubmit(); 
              }}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>
    </div>
  );
}