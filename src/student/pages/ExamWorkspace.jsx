import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Clock, ShieldAlert, CheckCircle, Lock, Loader2, Award, Maximize, 
  AlertTriangle, Check, User, Sparkles, BookOpen, ArrowRight, ArrowLeft, Send,
  ChevronDown, ChevronRight, FileText, Info, Zap
} from 'lucide-react';
import { saveAnswerLocally } from '../../core/offlineDb';
import { useOfflineSync } from '../../core/useOfflineSync';
import { apiRequest, BASE_URL } from '../../core/api';
import Logo from '../../shared/Logo'; 
import SafeMathText from '../../shared/SafeMathText'; 
import windowEcho from '../../core/echo';

export default function ExamWorkspace({ student, assessmentId, onExamSubmit }) {
  const syncStatus = useOfflineSync(assessmentId, student?.id || 'VTS-2026', 15000);
  const [, forceUpdate] = useState({});

  const [rawQuestions, setRawQuestions] = useState({ objective: [], theory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isNeedsFullscreenEntry, setIsNeedsFullscreenEntry] = useState(true); 
  const [activeSection, setActiveSection] = useState('objective'); 
  const [activeGroupIndex, setActiveGroupIndex] = useState({ objective: 0, theory: 0 });
  const questionCardRef = useRef(null);

  const [expandedSections, setExpandedSections] = useState({});

  const pausedStorageKey = `exam_paused_${assessmentId}`;
  const [isExamPausedByAdmin, setIsExamPausedByAdmin] = useState(() => {
    try {
      return localStorage.getItem(pausedStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  const cachedAnswersKey = `exam_answers_${assessmentId}_${student?.id || 'VTS-2026'}`;
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(cachedAnswersKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }); 

  const [totalSecondsLeft, setTotalSecondsLeft] = useState(null); 
  const [individualExtraSeconds, setIndividualExtraSeconds] = useState(0);

  const [examMeta, setExamMeta] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 

  const [submitWarningMsg, setSubmitWarningMsg] = useState(null);
  const [isSubmittingNetworkPacket, setIsSubmittingNetworkPacket] = useState(false); 

  const [candidateName, setCandidateName] = useState('');
  const [candidateClass, setCandidateClass] = useState('');

  const examEndTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
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

  const activeStateRef = useRef({ strikeCounter, totalSecondsLeft, rawQuestions, activeSection, activeGroupIndex, answers, isHardLocked, isNeedsFullscreenEntry, isExamPausedByAdmin });

  useEffect(() => {
    activeStateRef.current = { strikeCounter, totalSecondsLeft, rawQuestions, activeSection, activeGroupIndex, answers, isHardLocked, isNeedsFullscreenEntry, isExamPausedByAdmin };
  }, [strikeCounter, totalSecondsLeft, rawQuestions, activeSection, activeGroupIndex, answers, isHardLocked, isNeedsFullscreenEntry, isExamPausedByAdmin]);

  const setExamPauseState = useCallback((isPaused) => {
    setIsExamPausedByAdmin(isPaused);
    try {
      if (isPaused) {
        localStorage.setItem(pausedStorageKey, 'true');
      } else {
        localStorage.removeItem(pausedStorageKey);
      }
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }, [pausedStorageKey]);

  useEffect(() => {
    try {
      const storedCandidate = localStorage.getItem('candidate') || localStorage.getItem('student_profile') || localStorage.getItem('user');
      if (storedCandidate) {
        const parsed = JSON.parse(storedCandidate);
        setCandidateName(parsed.full_name || parsed.name || student?.name || student?.details?.full_name || 'STUDENT');
        setCandidateClass(parsed.class_group || parsed.details?.class_group || student?.details?.class_group || student?.class_group || 'CLASS');
      } else {
        setCandidateName(student?.name || student?.details?.full_name || 'STUDENT');
        setCandidateClass(student?.details?.class_group || student?.class_group || student?.class_arm || 'CLASS');
      }
    } catch {
      setCandidateName(student?.name || student?.details?.full_name || 'STUDENT');
      setCandidateClass(student?.details?.class_group || student?.class_group || 'CLASS');
    }
  }, [student]);

  const resolvedClassArm = useMemo(() => {
    return student?.details?.class_group || candidateClass || student?.class_group || 'CLASS';
  }, [student, candidateClass]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(secs)}s`;
    return `${pad(minutes)}:${pad(secs)}`;
  };

  const renderFormattedText = useCallback((rawText) => {
    if (!rawText) return null;

    if (rawText.includes('<') && rawText.includes('>')) {
      return (
        <div 
          className="text-xs sm:text-sm text-slate-800 leading-relaxed prose prose-purple max-w-none space-y-2 whitespace-pre-wrap font-sans" 
          dangerouslySetInnerHTML={{ __html: rawText }} 
        />
      );
    }

    const cleaned = String(rawText).trim();
    const paragraphs = cleaned.split(/\r?\n/);

    return (
      <div className="space-y-2 whitespace-pre-wrap font-sans">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="leading-relaxed text-slate-800 text-xs sm:text-sm font-sans">
            <SafeMathText text={para} />
          </p>
        ))}
      </div>
    );
  }, []);

  const groupedQuestions = useMemo(() => {
    const processObjectives = (list) => {
      return list.map((q, idx) => ({
        groupKey: `obj_single_${q.id}`,
        displayNumber: `${idx + 1}`,
        parentNumber: idx + 1,
        sectionTitle: q.sectionTitle || 'Section A: Objectives',
        sectionInstructions: q.sectionInstructions || null,
        passageText: q.passageText || null,
        subQuestions: [q]
      }));
    };

    const processTheory = (list) => {
      const groups = [];
      const map = new Map();

      list.forEach((q) => {
        const key = q.parentNumber 
          ? `parent_${q.parentNumber}` 
          : q.passageText 
          ? `passage_${q.passageText.substring(0, 30)}` 
          : `single_${q.id}`;

        if (!map.has(key)) {
          const groupObj = {
            groupKey: key,
            displayNumber: q.parentNumber ? `${q.parentNumber}` : `${groups.length + 1}`,
            parentNumber: q.parentNumber || groups.length + 1,
            sectionTitle: q.sectionTitle || 'Section B: Theory',
            sectionInstructions: q.sectionInstructions || null,
            passageText: q.passageText || null,
            subQuestions: []
          };
          map.set(key, groupObj);
          groups.push(groupObj);
        }

        map.get(key).subQuestions.push(q);
      });

      return groups;
    };

    return {
      objective: processObjectives(rawQuestions.objective || []),
      theory: processTheory(rawQuestions.theory || [])
    };
  }, [rawQuestions]);

  const sectionGroupedNavigator = useMemo(() => {
    const list = groupedQuestions[activeSection] || [];
    const sections = [];
    const map = new Map();

    list.forEach((grp, gIdx) => {
      const title = grp.sectionTitle || (activeSection === 'objective' ? 'Section A: Objectives' : 'Section B: Theory');

      if (!map.has(title)) {
        const secObj = {
          sectionTitle: title,
          questionGroups: []
        };
        map.set(title, secObj);
        sections.push(secObj);
      }

      map.get(title).questionGroups.push({
        ...grp,
        globalGroupIdx: gIdx
      });
    });

    return sections;
  }, [groupedQuestions, activeSection]);

  useEffect(() => {
    const currentGroupList = groupedQuestions[activeSection] || [];
    const currentIdx = activeGroupIndex[activeSection] || 0;
    const currentActiveGroup = currentGroupList[currentIdx];

    if (currentActiveGroup) {
      const title = currentActiveGroup.sectionTitle || (activeSection === 'objective' ? 'Section A: Objectives' : 'Section B: Theory');
      setExpandedSections(prev => ({ ...prev, [title]: true }));
    }
  }, [activeSection, activeGroupIndex, groupedQuestions]);

  const toggleSectionExpand = (sectionTitle) => {
    setExpandedSections(prev => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  const handleFinalEmergencyAutoSubmit = async () => {
    const activeCtx = activeStateRef.current;
    localStorage.removeItem(localStorageKey);
    localStorage.removeItem(cachedAnswersKey);
    localStorage.removeItem(pausedStorageKey);

    try {
      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, { 
        method: 'POST', 
        body: JSON.stringify({ 
          terminal_context: 'TIMEOUT',
          answers_payload: activeCtx.answers 
        }) 
      });
    } catch {
      // Gracefully silent on fallbacks
    } finally {
      setShowSubmitModal(false);
      setSubmitWarningMsg(null);
      setShowSuccessModal(true);
    }
  };

 // REAL-TIME WEBSOCKET COMMAND INTERCEPTOR
  useEffect(() => {
    if (!assessmentId) return;

    const channelName = `room-${assessmentId}`;
    const roomChannel = windowEcho.channel(channelName);

    const handleRoomCommand = (event) => {
      const action = event?.action || event?.commandData?.action;
      const targetStudentId = event?.student_profile_id || event?.studentProfileId || event?.commandData?.student_profile_id || event?.commandData?.studentProfileId;
      const addedMinutes = event?.added_minutes || event?.addedMinutes || event?.commandData?.added_minutes || event?.commandData?.addedMinutes;

      if (action === 'PAUSE_EXAM') {
        setExamPauseState(true);
        forceUpdate({});
        return;
      }

      if (action === 'RESUME_EXAM') {
        setExamPauseState(false);
        const extraDurationSecs = parseInt(event?.paused_duration_seconds || event?.commandData?.paused_duration_seconds || 0, 10);

        // Adjust target end time cleanly by adding the exact paused duration
        if (extraDurationSecs > 0 && examEndTimeRef.current) {
          examEndTimeRef.current += (extraDurationSecs * 1000);
        } else {
          // Fallback if local drift occurred while paused
          examEndTimeRef.current = Date.now() + ((totalSecondsLeft || 0) * 1000);
        }

        const updatedRemaining = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
        setTotalSecondsLeft(updatedRemaining);

        forceUpdate({});
        return;
      }

      if (action === 'FORCE_SUBMIT' || action === 'TERMINATE_EXAM') {
        setExamPauseState(false);
        handleFinalEmergencyAutoSubmit();
        return;
      }

      const possibleStudentIds = [
        student?.student_profile_id,
        student?.id,
        student?.details?.id,
        student?.student_id,
        student?.student_profile?.id
      ].filter(Boolean).map(id => String(id));

      const targetIdStr = targetStudentId ? String(targetStudentId) : null;
      const isTargetedToMe = !targetIdStr || possibleStudentIds.length === 0 || possibleStudentIds.includes(targetIdStr);

      if (isTargetedToMe) {
        if (action === 'ADD_TIME' && addedMinutes) {
          const addedSecsVal = parseInt(addedMinutes, 10) * 60;
          const addMs = addedSecsVal * 1000;

          const baseTime = (examEndTimeRef.current && examEndTimeRef.current > Date.now()) 
            ? examEndTimeRef.current 
            : Date.now();

          examEndTimeRef.current = baseTime + addMs;
          const updatedRemaining = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));

          setIndividualExtraSeconds(prev => prev + addedSecsVal);
          setTotalSecondsLeft(updatedRemaining);
          setSubmitWarningMsg(`⏰ Extra Time Granted: +${addedMinutes} minute(s) added by your supervisor.`);

          forceUpdate({});
          setTimeout(() => setSubmitWarningMsg(null), 8000);
        } else if (action === 'CLEAR_STRIKES') {
          localStorage.setItem(localStorageKey, '0');
          setStrikeCounter(0);
          setIsHardLocked(false);
          setViolationType(null);
          setSubmitWarningMsg('🛡️ Your supervisor cleared your security warnings.');
          forceUpdate({});
          setTimeout(() => setSubmitWarningMsg(null), 5000);
        } else if (action === 'HARD_RESTART') {
          localStorage.removeItem(localStorageKey);
          localStorage.removeItem(cachedAnswersKey);
          localStorage.removeItem(pausedStorageKey);
          window.location.reload();
        }
      }
    };

    roomChannel.listen('.terminal.command.executed', handleRoomCommand);

    return () => {
      roomChannel.stopListening('.terminal.command.executed', handleRoomCommand);
      windowEcho.leaveChannel(channelName);
    };
  }, [assessmentId, student, localStorageKey, cachedAnswersKey, pausedStorageKey, setExamPauseState, totalSecondsLeft]);
  // COUNTDOWN TIMER TICKER (Completely suspended during pauses)
  useEffect(() => {
    if (isLoading || showSuccessModal || examEndTimeRef.current === null || isExamPausedByAdmin) return;

    const ticker = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.floor((examEndTimeRef.current - Date.now()) / 1000));
      setTotalSecondsLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(ticker);
        handleFinalEmergencyAutoSubmit(); 
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [isLoading, showSuccessModal, isExamPausedByAdmin]);

  // SINGLE ATOMIC WORKSPACE INITIALIZATION
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const startRes = await apiRequest(`api/v1/student/assessments/${assessmentId}/start-session`, { method: 'POST' });
        const startData = await startRes.json();

        if (startRes.ok && startData.status === 'SUCCESS') {
          const dbQuestions = startData.questions || [];

          // Hydrate Pause State
          const isPausedOnServer = Boolean(startData.is_paused) || startData.exam?.status === 'Exam Paused';

          setExamPauseState(isPausedOnServer);
          if (isPausedOnServer) {
            pauseStartRef.current = Date.now();
          }

          setExamMeta({
            ...(startData.exam || {}),
            objective_instructions: startData.instructions?.objective_instructions || '',
            theory_instructions: startData.instructions?.theory_instructions || '',
          });

          if (startData.existing_answers) {
            setAnswers(prev => {
              const merged = { ...startData.existing_answers, ...prev };
              localStorage.setItem(cachedAnswersKey, JSON.stringify(merged));
              return merged;
            });
          }

          const mapDbQuestion = (q, idx) => {
            let processedImageUrl = null;
            if (q.image_url || q.imageUrl) {
              const rawImg = q.image_url || q.imageUrl;
              const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
              processedImageUrl = rawImg.startsWith('http') ? rawImg : `${BASE_URL}/${cleanPath}`;
            }

            return {
              id: q.id,
              type: q.type,
              number: idx + 1,
              text: q.question_text || q.text,
              points_weight: q.points_weight || 2,
              correct_option_index: q.correct_option_index ?? 0,
              imageUrl: processedImageUrl,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
              sectionTitle: q.section_title || null,
              sectionInstructions: q.section_instructions || null,
              passageText: q.passage_text || null,
              parentNumber: q.parent_number || null,
              subLabel: q.sub_label || null
            };
          };

          const objectives = dbQuestions.filter(q => ['objective', 'true/false'].includes(String(q.type || '').trim().toLowerCase())).map(mapDbQuestion);
          const theories = dbQuestions.filter(q => String(q.type || '').trim().toLowerCase() === 'theory').map(mapDbQuestion);

          setRawQuestions({ objective: objectives, theory: theories });

          const remainingSecs = parseInt(startData.seconds_remaining || 1800, 10);
          const dbExtraSecs = parseInt(startData.individual_extra_seconds || 0, 10);
          setIndividualExtraSeconds(dbExtraSecs);

          // Absolute wall-clock expiration calculation
          examEndTimeRef.current = Date.now() + (remainingSecs * 1000);
          setTotalSecondsLeft(remainingSecs);

          if (objectives.length === 0 && theories.length > 0) {
            setActiveSection('theory');
          }

          if (document.fullscreenElement) {
            setIsNeedsFullscreenEntry(false);
          }
        }
      } catch (err) {
        console.error("Workspace init error:", err);
        setTotalSecondsLeft(1800); 
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) initWorkspace();
  }, [assessmentId, cachedAnswersKey, setExamPauseState]);

  const handleSelectObjectiveOption = async (qId, optionIdx) => {
    const parsedQId = parseInt(qId, 10);
    const updatedAnswers = { ...answers, [parsedQId]: optionIdx, [qId]: optionIdx };
    setAnswers(updatedAnswers);
    localStorage.setItem(cachedAnswersKey, JSON.stringify(updatedAnswers));

    const objCount = Object.keys(updatedAnswers).filter(k => rawQuestions.objective.some(q => q.id === parseInt(k, 10))).length;
    const thyCount = Object.keys(updatedAnswers).filter(k => rawQuestions.theory.some(q => q.id === parseInt(k, 10))).length;

    const answerPacket = {
      question_id: parsedQId,
      answered_index: optionIdx,
      theory_response: null,
      security_strikes: parseInt(localStorage.getItem(localStorageKey), 10) || strikeCounter,
      current_seconds_remaining: totalSecondsLeft || 0,
      objective_progress_string: `${objCount} / ${rawQuestions.objective.length}`,
      theory_progress_string: `${thyCount} / ${rawQuestions.theory.length}`
    };
    await saveAnswerLocally(answerPacket);
  };

  const handleAttemptManualSubmit = () => {
    setSubmitWarningMsg(null);

    const objectiveList = rawQuestions.objective || [];
    const unansweredList = objectiveList.filter(q => {
      const val = answers[q.id] !== undefined ? answers[q.id] : answers[parseInt(q.id, 10)];
      return val === undefined || val === null || String(val).trim() === '';
    });

    if (unansweredList.length > 0) {
      const firstUnansweredQ = unansweredList[0];
      const targetGroupIdx = groupedQuestions.objective.findIndex(g => 
        g.subQuestions.some(sq => sq.id === firstUnansweredQ.id)
      );

      setActiveSection('objective');
      if (targetGroupIdx !== -1) {
        setActiveGroupIndex(prev => ({ ...prev, objective: targetGroupIdx }));
      }
      setSubmitWarningMsg(`You have ${unansweredList.length} unanswered objective question(s). Moved to Question ${groupedQuestions.objective[targetGroupIdx]?.displayNumber || ''}.`);

      const timer = setTimeout(() => setSubmitWarningMsg(null), 5000);
      return () => clearTimeout(timer);
    }

    setShowSubmitModal(true);
  };

  const handleFinalDatabaseSubmission = async () => {
    setIsSubmittingNetworkPacket(true);
    const activeCtx = activeStateRef.current;

    try {
      await apiRequest(`api/v1/student/assessments/${assessmentId}/finalize-submission`, { 
        method: 'POST', 
        body: JSON.stringify({ 
          terminal_context: 'MANUAL_SUBMIT',
          answers_payload: activeCtx.answers 
        }) 
      });

      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(cachedAnswersKey);
      localStorage.removeItem(pausedStorageKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } catch {
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(cachedAnswersKey);
      localStorage.removeItem(pausedStorageKey);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
    } finally {
      setIsSubmittingNetworkPacket(false);
    }
  };

  const currentGroupList = groupedQuestions[activeSection] || [];
  const currentGroupIndex = activeGroupIndex[activeSection] || 0;
  const currentGroup = currentGroupList[currentGroupIndex];

  const handleNextGroup = () => {
    if (currentGroupIndex < currentGroupList.length - 1) {
      setActiveGroupIndex({ ...activeGroupIndex, [activeSection]: currentGroupIndex + 1 });
      if (questionCardRef.current) questionCardRef.current.scrollTop = 0;
    }
  };

  const handlePrevGroup = () => {
    if (currentGroupIndex > 0) {
      setActiveGroupIndex({ ...activeGroupIndex, [activeSection]: currentGroupIndex - 1 });
      if (questionCardRef.current) questionCardRef.current.scrollTop = 0;
    }
  };

  const handleSelectQuestionGroup = (gIdx) => {
    setActiveGroupIndex(prev => ({ ...prev, [activeSection]: gIdx }));
    if (questionCardRef.current) questionCardRef.current.scrollTop = 0;
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

  const handleRequestRestoreFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().then(() => setViolationType(null)).catch(() => {});
    }
  };

  const mainExamSectionInstructions = useMemo(() => {
    if (activeSection === 'objective') {
      const objInst = examMeta?.objective_instructions;
      if (objInst && String(objInst).trim() !== '') return objInst;
      return 'Choose the single best answer for each question below.';
    }

    if (activeSection === 'theory') {
      const thyInst = examMeta?.theory_instructions;
      if (thyInst && String(thyInst).trim() !== '') return thyInst;
      return 'Write your clear answers in your paper script booklet.';
    }

    return '';
  }, [activeSection, examMeta]);

  const specificQuestionGroupInstructions = useMemo(() => {
    if (currentGroup?.sectionInstructions && String(currentGroup.sectionInstructions).trim() !== '') {
      return currentGroup.sectionInstructions;
    }
    return null;
  }, [currentGroup]);

  const answeredObjectiveCount = useMemo(() => {
    return rawQuestions.objective.filter(q => {
      const val = answers[q.id] !== undefined ? answers[q.id] : answers[parseInt(q.id, 10)];
      return val !== undefined && val !== null;
    }).length;
  }, [rawQuestions.objective, answers]);

  if (isLoading || totalSecondsLeft === null) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center text-xs font-semibold text-[#7C3AED] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
        <span>Preparing your test paper... Please wait!</span>
      </div>
    );
  }

  if (isNeedsFullscreenEntry) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center p-6 text-center select-none text-[#2A1A63]">
        <div className="w-full max-w-md bg-white border border-[#E2D5F8] rounded-3xl p-8 shadow-md space-y-6 text-left">
          <div className="flex items-center gap-3 border-b border-[#E2D5F8] pb-4">
            <div className="bg-[#F3EEFC] p-2 rounded-2xl">
              <Logo size={32} showText={false} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{examMeta?.subject || "Exam Paper"}</h3>
              <p className="text-xs font-bold text-[#7C3AED]">
                {candidateName} &bull; {resolvedClassArm}
              </p>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              Ready to begin? Click the big button below to make your screen full-size and enter your exam workspace.
            </p>
          </div>

          <button 
            onClick={handleInitialForceStartExam} 
            className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
          >
            <Maximize className="w-4 h-4" /> Start My Exam Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F5FC] flex flex-col justify-between select-none relative w-full overflow-hidden text-[#2A1A63] font-sans">

      {/* ADMIN PAUSE OVERLAY */}
      {isExamPausedByAdmin && (
        <div className="fixed inset-0 bg-slate-950/90 z-[35000] flex flex-col justify-center items-center text-center p-6 backdrop-blur-md text-white font-sans animate-fadeIn">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Clock className="w-8 h-8 animate-spin text-amber-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Examination Session Paused</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Your supervisor has temporarily paused this examination. Your timer is frozen. Please remain seated quietly until the exam is resumed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HARD LOCK MODAL */}
      {isHardLocked && (
        <div className="fixed inset-0 bg-slate-950/85 z-[20000] flex flex-col justify-center items-center text-center p-6 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Screen Locked</h3>
              <p className="text-xs text-rose-600 font-bold">Security Warning ({strikeCounter} / 3)</p>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Your exam screen has been paused. Please raise your hand for your teacher or supervisor to assist you.
              </p>
            </div>
            <button onClick={handleFinalEmergencyAutoSubmit} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]">
              Submit Work & Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* VIOLATION WARNING */}
      {violationType && !isHardLocked && !showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9999] flex flex-col justify-center items-center text-center p-6">
          <div className="w-full max-w-sm bg-white border border-rose-200 p-6 rounded-3xl shadow-2xl space-y-4 text-left font-sans">
            <div className="flex items-center gap-2 text-rose-600 pb-2 border-b border-rose-100">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black uppercase tracking-wider">Screen Warning</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Please stay on this test window! Screen warning: <span className="font-bold text-rose-600">{strikeCounter} / 3</span>. Click below to return to full screen.
            </p>
            <button onClick={handleRequestRestoreFullscreen} className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]">
              Return to Exam Screen
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full bg-[#7C3AED] px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-40 shrink-0 text-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-2xl flex items-center justify-center shadow-2xs">
              <Logo size={28} showText={false} />
            </div>
            <div className="text-left">
              <h2 className="text-xs sm:text-sm font-black tracking-wide text-white">{examMeta?.subject || "Exam Paper"}</h2>
              <p className="text-[10px] font-semibold text-purple-200 mt-0.5">
                {candidateName} &bull; {resolvedClassArm}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-sans">
            {individualExtraSeconds > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-sm animate-fadeIn">
                <Zap className="w-3.5 h-3.5 fill-amber-950 text-amber-950 shrink-0" />
                <span>+{Math.round(individualExtraSeconds / 60)}m Extra Time</span>
              </div>
            )}

            {strikeCounter > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500 text-white shadow-2xs">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Warnings: {strikeCounter}/3</span>
              </div>
            )}

            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/15 border border-white/20 text-white shadow-2xs ${
              totalSecondsLeft <= 300 ? 'bg-rose-500/90 text-white animate-pulse' : ''
            }`}>
              <Clock className="w-4 h-4 text-white shrink-0" />
              <span>{formatTime(totalSecondsLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* EXTRA TIME ALERT BANNER */}
      {submitWarningMsg && (
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 pt-2 shrink-0 z-50">
          <div className="bg-yellow-200/50 border border-purple-300 text-purple-900 px-5 py-2 rounded-2xl shadow-sm flex items-center justify-between text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-yellow-200/80 flex items-center justify-center text-[#7C3AED] shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span>{submitWarningMsg}</span>
            </div>
            <button onClick={() => setSubmitWarningMsg(null)} className="text-purple-800 hover:text-purple-950 text-xs font-bold uppercase cursor-pointer px-2 py-1">Dismiss</button>
          </div>
        </div>
      )}

      {/* SECTION TABS */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 py-2 mt-1 flex gap-3 shrink-0 font-sans">
        {groupedQuestions.objective.length > 0 && (
          <button 
            onClick={() => setActiveSection('objective')} 
            className={`px-5 py-2 text-xs font-bold rounded-2xl tracking-wide cursor-pointer transition-all flex items-center gap-2 shadow-2xs ${
              activeSection === 'objective' 
                ? 'bg-[#7C3AED] text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-[#E2D5F8] hover:bg-purple-50/50'
            }`}
          >
            <span>Section A: Objectives</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSection === 'objective' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#7C3AED]'
            }`}>
              {answeredObjectiveCount}/{rawQuestions.objective.length}
            </span>
          </button>
        )}

        {groupedQuestions.theory.length > 0 && (
          <button 
            onClick={() => setActiveSection('theory')} 
            className={`px-5 py-2 text-xs font-bold rounded-2xl tracking-wide cursor-pointer transition-all flex items-center gap-2 shadow-2xs ${
              activeSection === 'theory' 
                ? 'bg-[#7C3AED] text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-[#E2D5F8] hover:bg-purple-50/50'
            }`}
          >
            <span>Section B: Theory</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSection === 'theory' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#7C3AED]'
            }`}>
              {rawQuestions.theory.length} Qs
            </span>
          </button>
        )}
      </div>

      {/* SECTION INSTRUCTIONS */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 py-1.5 shrink-0 font-sans">
        <div className="bg-[#F3EEFC] border border-[#E2D5F8] px-5 py-3 rounded-2xl text-xs font-semibold text-slate-800 flex items-start gap-3 shadow-2xs">
          <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[11px] font-extrabold text-[#7C3AED] uppercase block tracking-wider">
              {activeSection === 'objective' ? 'Objective Instructions:' : 'Theory Instructions:'}
            </span>
            {renderFormattedText(mainExamSectionInstructions)}
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-8 py-2 grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch overflow-hidden min-h-0">

        {/* LEFT QUESTION CARD */}
        <section 
          ref={questionCardRef}
          className="md:col-span-3 bg-white border border-[#E2D5F8] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs text-left overflow-y-auto max-h-full"
        >
          <div>
            {currentGroup?.sectionTitle && (
              <div className="mb-3">
                <span className="px-3.5 py-1 bg-purple-100 border border-purple-200 text-[#7C3AED] rounded-xl text-xs font-bold inline-block">
                  {currentGroup.sectionTitle}
                </span>
              </div>
            )}

            {specificQuestionGroupInstructions && (
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-xs font-semibold text-amber-900 leading-relaxed mb-5 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-1 text-[11px] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Section Note:</span>
                </div>
                {renderFormattedText(specificQuestionGroupInstructions)}
              </div>
            )}

            {currentGroup?.passageText && (
              <div className="mb-6 p-5 bg-[#FAF8FF] border border-purple-200 rounded-2xl shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#7C3AED] border-b border-purple-100 pb-2">
                  <BookOpen className="w-4 h-4 text-[#7C3AED]" /> Read the passage carefully:
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pt-1 font-sans">
                  {renderFormattedText(currentGroup.passageText)}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pb-3 mb-6 border-b border-slate-100 text-xs font-bold text-slate-500">
              <span className="text-base font-black text-slate-900">
                Question {currentGroup?.displayNumber}
              </span>
              {activeSection === 'theory' && (
                <span className="text-xs font-semibold text-[#7C3AED] bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                  {currentGroup?.subQuestions?.length || 1} Sub-item(s)
                </span>
              )}
            </div>

            <div className="space-y-6 transition-all duration-300 ease-out animate-fadeIn">
              {currentGroup?.subQuestions?.map((subQ, subIdx) => {
                const subQId = subQ.id;

                return (
                  <div key={subQId || subIdx} className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFE] border border-[#E2D5F8]/80 space-y-4">

                    {activeSection === 'theory' && (
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-[#7C3AED] text-white rounded-xl text-xs font-black flex items-center justify-center">
                            {subQ.subLabel || `${subIdx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-700">Sub-Question</span>
                        </div>
                        <span className="bg-white text-[#7C3AED] px-2.5 py-1 rounded-lg border border-purple-100 text-[11px] font-bold">
                          {subQ.points_weight || 2} Marks
                        </span>
                      </div>
                    )}

                    {subQ.imageUrl && (
                      <div className="mb-4 border border-[#E2D5F8] rounded-2xl overflow-hidden bg-white max-w-md h-48 flex items-center justify-center shadow-2xs mx-auto">
                        <img src={subQ.imageUrl} alt="Question Reference" className="w-full h-full object-contain p-2" />
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed font-sans">
                      <SafeMathText text={subQ.text} />
                    </h4>

                    {activeSection === 'objective' ? (
                      <div className="space-y-2.5 pt-1">
                        {subQ.options?.map((option, optIdx) => {
                          const isSelected = answers[subQId] === optIdx || answers[parseInt(subQId, 10)] === optIdx;
                          const optionText = typeof option === 'object' ? option.text : option;

                          return (
                            <button
                              key={optIdx} 
                              onClick={() => handleSelectObjectiveOption(subQId, optIdx)}
                              className={`w-full px-4 py-3 border-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                                isSelected 
                                  ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED] ring-2 ring-[#7C3AED]/20 font-bold' 
                                  : 'bg-white border-[#E2D5F8] hover:border-[#7C3AED]/50 text-slate-700 hover:bg-purple-50/30'
                              }`}
                            >
                              <span className="flex items-start gap-2">
                                <span className="font-bold text-[#7C3AED] min-w-[20px]">{String.fromCharCode(65 + optIdx)}.</span>
                                <SafeMathText text={optionText} />
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 bg-[#7C3AED] rounded-full flex items-center justify-center shrink-0 ml-3 shadow-2xs">
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-[#7C3AED] shrink-0" />
                        <p className="text-xs text-slate-600 font-semibold">
                          Answer this question in your written answer booklet.
                        </p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-100 shrink-0">
            <button 
              disabled={currentGroupIndex === 0} 
              onClick={handlePrevGroup} 
              className="px-5 py-2.5 border border-[#E2D5F8] rounded-xl text-xs font-bold text-slate-700 disabled:opacity-30 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Question
            </button>
            <button 
              disabled={currentGroupIndex === currentGroupList.length - 1} 
              onClick={handleNextGroup} 
              className="px-5 py-2.5 bg-[#7C3AED] text-white text-xs font-bold rounded-xl disabled:opacity-30 hover:bg-[#6D28D9] cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* RIGHT REVIEW PANEL */}
        <section className="bg-white border border-[#E2D5F8] rounded-3xl p-5 flex flex-col justify-between shadow-xs text-left h-full overflow-hidden">
          <div className="space-y-3 flex flex-col h-full overflow-hidden">
            <div className="border-b border-slate-100 pb-2 shrink-0">
              <h4 className="text-xs font-black text-slate-900 tracking-wide uppercase">Question Navigator</h4>
              <p className="text-[11px] text-slate-500 font-medium">Click section to expand or collapse</p>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 bg-purple-50/50 p-2 rounded-xl border border-purple-100/60 shrink-0">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Complete
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED] inline-block"></span> Active
              </div>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 py-1">
              {sectionGroupedNavigator.map((sec) => {
                const isExpanded = expandedSections[sec.sectionTitle] ?? true;

                return (
                  <div key={sec.sectionTitle} className="border border-[#E2D5F8] rounded-2xl overflow-hidden bg-[#FAFAFE] transition-all">

                    <button
                      onClick={() => toggleSectionExpand(sec.sectionTitle)}
                      className="w-full px-3.5 py-2.5 bg-[#F3EEFC] hover:bg-purple-100/80 text-left flex items-center justify-between text-xs font-black text-[#2A1A63] cursor-pointer transition-colors"
                    >
                      <span className="truncate pr-2">{sec.sectionTitle}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-extrabold text-[#7C3AED] bg-white px-2 py-0.5 rounded-full border border-purple-200">
                          {sec.questionGroups.length} Qs
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#7C3AED]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#7C3AED]" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 grid grid-cols-4 gap-2 bg-white transition-all duration-200 animate-fadeIn">
                        {sec.questionGroups.map((grp) => {
                          const gIdx = grp.globalGroupIdx;
                          const isAllSubAnswered = grp.subQuestions.every(sq => {
                            const val = answers[sq.id] !== undefined ? answers[sq.id] : answers[parseInt(sq.id, 10)];
                            return val !== undefined && val !== null && String(val).trim() !== '';
                          });

                          const isActive = gIdx === currentGroupIndex;

                          return (
                            <button
                              key={grp.groupKey || gIdx}
                              onClick={() => handleSelectQuestionGroup(gIdx)}
                              className={`h-10 text-xs font-black rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-2xs relative ${
                                isActive
                                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm font-black'
                                  : isAllSubAnswered
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                  : 'bg-white text-slate-700 border-[#E2D5F8] hover:bg-purple-50'
                              }`}
                            >
                              <span>{grp.displayNumber}</span>
                              {isAllSubAnswered && !isActive && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 shrink-0 mt-2">
            <button 
              onClick={handleAttemptManualSubmit} 
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Submit Exam Paper
            </button>
          </div>
        </section>
      </main>

      {/* SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[25000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl space-y-5 text-left border border-[#E2D5F8]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
                <Clock className="w-5 h-5 text-[#7C3AED] shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">Ready to Submit?</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Are you sure you want to hand in your test paper now? Once submitted, your answers will be finalized.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSubmitModal(false)} 
                className="flex-1 py-3 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                Go Back & Review
              </button>
              <button 
                disabled={isSubmittingNetworkPacket} 
                onClick={handleFinalDatabaseSubmission} 
                className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.97]"
              >
                {isSubmittingNetworkPacket && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[30000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-3xl text-center space-y-5 border border-[#E2D5F8] shadow-2xl">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-1 shadow-2xs">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h4 className="text-base font-black text-slate-900">Great Job! Test Submitted</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Your answers have been submitted safely. Safe Exam Browser will close now.
              </p>
            </div>
            <button 
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.97]" 
              onClick={() => { 
                setShowSuccessModal(false); 
                onExamSubmit(); 
                setTimeout(() => {
                  window.location.href = 'seb://quit';
                }, 500);
              }}
            >
              Exit Exam Window
            </button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/15 bg-white py-2 text-center text-[10px] font-bold text-[#7C6B93] tracking-wider uppercase px-4 shrink-0">
        Start-rite Institutional Exam System
      </footer>
    </div>
  );
}