import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, BookOpen, Clock, Loader2, LogOut, Award, 
  CheckCircle, ChevronRight, X, Users, Compass, Info, FileText 
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import SafeMathText from '../../shared/SafeMathText';
import Logo from '../../shared/Logo';

export default function StudentLobby({ student, onLaunchWorkspace, onLogoutSuccess }) {
  const [activeExam, setActiveExam] = useState(null);
  const [lobbyState, setLobbyState] = useState('INGESTING'); 
  const [serverMessage, setServerMessage] = useState('');
  const [isFullscreenApproved, setIsFullscreenApproved] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // 🎯 Past Results Modal States
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [pastAssessmentsList, setPastAssessmentsList] = useState([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [selectedAssessmentReview, setSelectedAssessmentReview] = useState(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const checkExamEligibilityFeed = async () => {
    try {
      const response = await apiRequest('api/v1/student/lobby/active-feed', { method: 'GET' });
      const data = await response.json();

      if (data.status === 'SUCCESS' && data.exam) {
        setActiveExam(data.exam);
        setLobbyState('READY');
      } else if (data.status === 'ALREADY_SUBMITTED') {
        setLobbyState('SUBMITTED_LOCKOUT');
        setServerMessage(data.message);
      } else if (data.status === 'ROSTER_PENDING') {
        setLobbyState('ROSTER_PENDING');
        setServerMessage(data.message);
      } else if (data.status === 'WINDOW_EXPIRED_OR_INSUFFICIENT') {
        setLobbyState('WINDOW_INSUFFICIENT');
        setServerMessage(data.message);
      } else {
        setLobbyState('NO_EXAM');
      }
    } catch (error) {
      console.error(error);
      setLobbyState('NO_EXAM');
    }
  };

  useEffect(() => {
    checkExamEligibilityFeed();
    const handleScreenSizeTracker = () => {
      setIsFullscreenApproved(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleScreenSizeTracker);
    return () => document.removeEventListener('fullscreenchange', handleScreenSizeTracker);
  }, []);

  const handleOpenResultsModal = async () => {
    setIsResultsModalOpen(true);
    setSelectedAssessmentReview(null);
    setIsLoadingResults(true);
    try {
      const res = await apiRequest('api/v1/student/results/history', { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setPastAssessmentsList(payload.assessments || []);
        }
      }
    } catch (err) {
      console.error("❌ [RESULTS HISTORY FAULT]:", err);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleInspectAssessmentReview = async (assessmentId) => {
    setIsReviewLoading(true);
    try {
      const res = await apiRequest(`api/v1/student/results/assessments/${assessmentId}/review`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setSelectedAssessmentReview(payload.data);
        }
      }
    } catch (err) {
      console.error("❌ [ASSESSMENT REVIEW FAULT]:", err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const executeTerminalLogout = async () => {
    try {
      setIsLogoutModalOpen(false);
      setIsLoggingOut(true);
      localStorage.clear();
      sessionStorage.clear();
      if (typeof onLogoutSuccess === 'function') {
        onLogoutSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleRequestSecureExamSession = () => {
    const docEl = document.documentElement;
    if (typeof onLaunchWorkspace !== 'function') {
      alert("System configuration callback missing. Please inform your coordinator.");
      return;
    }

    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => {
          setIsFullscreenApproved(true);
          onLaunchWorkspace(activeExam.id);
        })
        .catch((err) => {
          console.warn(err);
          setIsFullscreenApproved(false);
          onLaunchWorkspace(activeExam.id);
        });
    } else {
      onLaunchWorkspace(activeExam.id);
    }
  };

  const formatCleanDuration = (durationInput) => {
    if (!durationInput) return '30 Mins';
    const totalMinutes = Math.round(parseFloat(durationInput));
    if (isNaN(totalMinutes)) return `${durationInput} Mins`;

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hour${hours > 1 ? 's' : ''}`;
    }
    return `${totalMinutes} Minutes`;
  };

  // Group specific section instructions by section type
  const sectionInstructionsGrouped = useMemo(() => {
    if (!activeExam?.section_instructions || !Array.isArray(activeExam.section_instructions)) {
      return { objective: [], theory: [], other: [] };
    }

    const objective = [];
    const theory = [];
    const other = [];

    activeExam.section_instructions.forEach((sec) => {
      const title = (sec.title || sec.section_title || '').toLowerCase();
      if (title.includes('obj') || title.includes('section a') || title.includes('multiple')) {
        objective.push(sec);
      } else if (title.includes('theory') || title.includes('section b') || title.includes('essay')) {
        theory.push(sec);
      } else {
        other.push(sec);
      }
    });

    return { objective, theory, other };
  }, [activeExam]);

  if (lobbyState === 'INGESTING' || isLoggingOut) {
    return (
      <div className="h-screen bg-[#F8F9FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-slate-500 tracking-wider gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
        <span>{isLoggingOut ? "Securing session context..." : "Preparing exam lobby..."}</span>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-[#F8F9FC] flex flex-col justify-between select-none font-sans text-slate-800 w-full overflow-hidden">
      
      {/* HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-5 py-2.5 flex flex-row justify-between items-center gap-3 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-xs flex items-center justify-center shrink-0">
            <Logo size={26} showText={false} />
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-xs font-black text-white leading-none uppercase truncate">{student?.name || 'Student Candidate'}</h2>
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-0.5 font-mono truncate">
              ID: {student?.id || 'VTS-2026'} &bull; {student?.details?.class_group || 'STARTRITE REPOSITORIES'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 font-mono">
          <button 
            onClick={handleOpenResultsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 text-white bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Scores Repository</span>
          </button>

          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 text-white bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-2 flex flex-col justify-center items-center my-auto min-h-0">
        
        {/* CASE 1: SUBMISSION LOCKOUT */}
        {lobbyState === 'SUBMITTED_LOCKOUT' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Assessment Concluded</h3>
              <p className="text-[10px] text-indigo-600 font-black font-mono uppercase tracking-wider">Answer Script Lodged</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "Your script has been saved. Re-entry is restricted."}
              </p>
            </div>
            <div className="pt-2 max-w-xs mx-auto">
              <button 
                onClick={handleOpenResultsModal}
                className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all"
              >
                Review Score Breakdown
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: WAITING ROOM IDLE */}
        {lobbyState === 'NO_EXAM' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Compass className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Waiting Room Active</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                Your station is connected. There are no active examination streams running right now.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
              <button onClick={checkExamEligibilityFeed} className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all">
                Refresh Feed
              </button>
              <button onClick={handleOpenResultsModal} className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-2xs">
                View Graded History
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: ROSTER PENDING */}
        {lobbyState === 'ROSTER_PENDING' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Awaiting Teacher Verification</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "Please inform your supervisor to check you in on the exam roster."}
              </p>
            </div>
            <div className="pt-2 max-w-xs mx-auto w-full">
              <button 
                onClick={checkExamEligibilityFeed}
                className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all"
              >
                Re-check Verification
              </button>
            </div>
          </div>
        )}

        {/* CASE 4: WINDOW INSUFFICIENT */}
        {lobbyState === 'WINDOW_INSUFFICIENT' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Window Closed</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "Late entry restricted as remaining window duration is insufficient."}
              </p>
            </div>
          </div>
        )}

        {/* CASE 5: READY TO START (OPTIMIZED ZERO-SCROLL CARD) */}
        {lobbyState === 'READY' && activeExam && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 text-left my-auto">
            
            {/* PAPER META HEADER */}
            <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block">
                  Cleared to Write
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase mt-0.5 tracking-tight">
                  {activeExam.subject} &mdash; {activeExam.category}
                </h3>
              </div>

              <div className="flex gap-2 font-mono">
                <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">Time Allowed</span>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-tight mt-0.5">{formatCleanDuration(activeExam.duration_minutes)}</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">Format</span>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-tight mt-0.5">CBT Module</p>
                  </div>
                </div>
              </div>
            </div>

            {/* PAPER INSTRUCTIONS SECTION */}
            {(activeExam.objective_instructions || activeExam.theory_instructions || (Array.isArray(activeExam.section_instructions) && activeExam.section_instructions.length > 0)) && (
              <div className="space-y-2 font-sans">
                <div className="flex items-center gap-1.5 text-slate-900 font-black uppercase text-[10px] font-mono tracking-tight pb-0.5 border-b border-slate-200/60">
                  <Info className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  Exam Directions & Rubric Notes:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* SECTION A: OBJECTIVE BOX */}
                  {(activeExam.objective_instructions || sectionInstructionsGrouped.objective.length > 0) && (
                    <div className="bg-[#FAF8FF] border border-[#E2D5F8] p-3 rounded-2xl text-xs space-y-1">
                      <span className="text-[10px] font-black text-[#7C3AED] font-mono uppercase tracking-wider block">
                        Section A: Objective
                      </span>
                      {activeExam.objective_instructions && (
                        <div className="text-slate-800 font-medium leading-relaxed text-[11px]">
                          <SafeMathText text={activeExam.objective_instructions} />
                        </div>
                      )}

                      {/* Section notes specifically for Objective */}
                      {sectionInstructionsGrouped.objective.map((sec, idx) => (
                        <div key={idx} className="bg-amber-50/90 border border-amber-200/90 p-2 rounded-xl text-[10px] space-y-0.5 mt-1">
                          <span className="font-black text-amber-800 font-mono uppercase tracking-wider flex items-center gap-1 text-[9px]">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                            {sec.title || sec.section_title || 'Section Note'}:
                          </span>
                          <div className="text-amber-950 font-medium leading-normal">
                            <SafeMathText text={sec.instruction || sec.text || (typeof sec === 'string' ? sec : '')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SECTION B: THEORY BOX */}
                  {(activeExam.theory_instructions || sectionInstructionsGrouped.theory.length > 0) && (
                    <div className="bg-[#F8FAFC] border border-slate-200 p-3 rounded-2xl text-xs space-y-1">
                      <span className="text-[10px] font-black text-slate-800 font-mono uppercase tracking-wider block">
                        Section B: Theory
                      </span>
                      {activeExam.theory_instructions && (
                        <div className="text-slate-800 font-medium leading-relaxed text-[11px]">
                          <SafeMathText text={activeExam.theory_instructions} />
                        </div>
                      )}

                      {/* Section notes specifically for Theory */}
                      {sectionInstructionsGrouped.theory.map((sec, idx) => (
                        <div key={idx} className="bg-amber-50/90 border border-amber-200/90 p-2 rounded-xl text-[10px] space-y-0.5 mt-1">
                          <span className="font-black text-amber-800 font-mono uppercase tracking-wider flex items-center gap-1 text-[9px]">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                            {sec.title || sec.section_title || 'Section Note'}:
                          </span>
                          <div className="text-amber-950 font-medium leading-normal">
                            <SafeMathText text={sec.instruction || sec.text || (typeof sec === 'string' ? sec : '')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* UNASSIGNED / OTHER SECTION NOTES */}
                {sectionInstructionsGrouped.other.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    {sectionInstructionsGrouped.other.map((sec, idx) => (
                      <div key={idx} className="bg-amber-50/90 border border-amber-200/90 p-2 rounded-xl text-[11px] space-y-0.5">
                        <span className="text-[9px] font-black text-amber-800 font-mono uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                          {sec.title || sec.section_title || `Note ${idx + 1}`}:
                        </span>
                        <div className="text-amber-950 font-medium leading-relaxed">
                          <SafeMathText text={sec.instruction || sec.text || (typeof sec === 'string' ? sec : '')} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECURITY & RULES DISPLAY BOX */}
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1 text-xs font-medium text-slate-600 font-sans">
              <div className="flex items-center gap-1.5 text-slate-900 font-black uppercase text-[10px] font-mono tracking-tight pb-0.5 border-b border-slate-200/60 mb-0.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                Security Rules:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] leading-tight">
                <p className="flex items-start gap-1">
                  <span className="text-slate-900 font-black font-mono shrink-0">1.</span>
                  <span>Fullscreen required. Exiting logs a strike.</span>
                </p>
                <p className="flex items-start gap-1">
                  <span className="text-slate-900 font-black font-mono shrink-0">2.</span>
                  <span>Copying/pasting is disabled.</span>
                </p>
                <p className="flex items-start gap-1 text-slate-800 font-semibold">
                  <span className="font-mono font-black shrink-0">3.</span>
                  <span>3 strikes automatically submits paper.</span>
                </p>
              </div>
            </div>

            {/* CTA LAUNCH BUTTON */}
            <div className="pt-1">
              <button 
                onClick={handleRequestSecureExamSession}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-mono"
              >
                Launch Secure Exam Workspace
              </button>
            </div>
          </div>
        )}

      </main>

      {/* GRADED OBJECTIVE RESULTS & ANSWERS REVIEW MODAL */}
      {isResultsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden font-sans text-left max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Student Performance Repository</span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">
                  Graded Objective Assessments & Chosen Answers Review
                </h3>
              </div>
              <button 
                onClick={() => { setIsResultsModalOpen(false); setSelectedAssessmentReview(null); }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-[#F8F9FC]">
              {isLoadingResults ? (
                <div className="py-20 text-center font-mono text-xs uppercase text-slate-500 font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Loading graded objective records...
                </div>
              ) : selectedAssessmentReview ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs font-mono">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Selected Objective Paper Ledger</span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase mt-0.5">{selectedAssessmentReview.assessment.subject} &mdash; {selectedAssessmentReview.assessment.category}</h4>
                    </div>
                    <button 
                      onClick={() => setSelectedAssessmentReview(null)}
                      className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-[#7C3AED] rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 cursor-pointer"
                    >
                      &larr; Back to All Subjects
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {selectedAssessmentReview.questions
                      .filter(q => String(q.type || '').trim().toLowerCase() !== 'theory')
                      .map((q, idx) => (
                      <div key={q.id || idx} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs text-xs">
                        <div className="flex justify-between items-center font-mono text-[10px] text-slate-400 font-black uppercase border-b border-slate-100 pb-2">
                          <span>Question {idx + 1} (Objective)</span>
                          <span className={q.is_correct ? 'text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200' : 'text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200'}>
                            {q.is_correct ? `✓ Correct (+${q.score_awarded} Marks)` : `✗ Incorrect (0 / ${q.points_weight} Marks)`}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 font-sans">
                          <SafeMathText text={q.question_text} />
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="space-y-1.5 pt-1 font-sans">
                            {q.options.map((opt, oIdx) => {
                              const isStudentChoice = q.student_selected_index === oIdx;
                              const isCorrectChoice = q.correct_option_index === oIdx;
                              const optText = typeof opt === 'object' ? opt.text : opt;

                              let optStyle = 'bg-white border-slate-200 text-slate-700';
                              if (isCorrectChoice) {
                                optStyle = 'bg-emerald-50 border-emerald-200 text-emerald-900 font-black';
                              } else if (isStudentChoice && !isCorrectChoice) {
                                optStyle = 'bg-rose-50 border-rose-200 text-rose-900 font-black';
                              }

                              return (
                                <div key={oIdx} className={`p-2.5 rounded-xl border text-xs flex justify-between items-center ${optStyle}`}>
                                  <span className="flex items-center gap-1.5">
                                    {String.fromCharCode(65 + oIdx)}) 
                                    <SafeMathText text={optText} />
                                  </span>
                                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase shrink-0 pl-3">
                                    {isStudentChoice && (
                                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md font-black shadow-2xs">
                                        Your Choice
                                      </span>
                                    )}
                                    {isCorrectChoice && (
                                      <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-md font-black shadow-2xs">
                                        Correct Key
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : pastAssessmentsList.length === 0 ? (
                <div className="text-center p-12 text-slate-500 font-black uppercase font-mono text-xs py-20 bg-white border border-slate-200 rounded-3xl shadow-2xs">
                  No graded objective assessment records found in your ledger at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">Graded Objective Subjects & Papers</h4>
                  
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-h-[60vh] overflow-y-auto shadow-2xs">
                    <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[600px]">
                      <thead>
                        <tr className="bg-[#7C3AED] text-white font-black uppercase text-[9px] tracking-wider border-b border-[#6D28D9] sticky top-0 z-10">
                          <th className="p-3.5 sm:p-4 pl-6 bg-[#7C3AED]">Subject Title</th>
                          <th className="p-3.5 sm:p-4 bg-[#7C3AED]/90">Category</th>
                          <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/80">Objective Score</th>
                          <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/70">Status</th>
                          <th className="p-3.5 sm:p-4 text-center pr-6 font-sans bg-[#7C3AED]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 uppercase font-bold text-slate-700 bg-white">
                        {pastAssessmentsList.map((item, idx) => (
                          <tr key={`past-${item.assessment_id || idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 sm:p-4 pl-6 font-sans font-black text-slate-900 text-xs">{item.subject}</td>
                            <td className="p-3.5 sm:p-4 text-slate-500">{item.category}</td>
                            <td className="p-3.5 sm:p-4 text-center font-black text-[#7C3AED]">
                              {item.score} / {item.max_score}
                            </td>
                            <td className="p-3.5 sm:p-4 text-center">
                              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-black uppercase inline-block">
                                Graded
                              </span>
                            </td>
                            <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                              <button
                                disabled={isReviewLoading}
                                onClick={() => handleInspectAssessmentReview(item.assessment_id)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
                              >
                                {isReviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                Review Answers
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-slate-200 flex justify-end shrink-0">
              <button 
                onClick={() => { setIsResultsModalOpen(false); setSelectedAssessmentReview(null); }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
              >
                Close Results Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isLogoutModalOpen}  
        title="Sign Out of Station"
        message="Are you completely sure you want to exit your student terminal room context now?"
        confirmLabel="Confirm Exit"
        cancelLabel="Stay in Lobby"
        onConfirm={executeTerminalLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        summaryData={{
          "Student User": student?.name?.toUpperCase() || "CANDIDATE NODE",
          "Terminal Key Scope": student?.id || "VTS-2026",
          "Action Context": "LOGOUT_TERMINATION"
        }}
      />

      {/* FOOTER BAR */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-1.5 text-center text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>

    </div>
  );
}