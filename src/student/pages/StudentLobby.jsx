import React, { useState, useEffect } from 'react';
import { ShieldAlert, BookOpen, Clock, Loader2, Lock, AlertTriangle, MonitorCheck, LogOut, Award, CheckCircle, XCircle, ChevronRight, X, Users, Compass } from 'lucide-react';
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

  if (lobbyState === 'INGESTING' || isLoggingOut) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-slate-500 tracking-wider gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        <span>{isLoggingOut ? "Securing and closing session..." : "Preparing your workspace..."}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col justify-between select-none font-sans text-slate-800 w-full overflow-x-hidden">
      
      {/* Header with Logo Integrated */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-white p-1.5 rounded-2xl shadow-xs flex items-center justify-center shrink-0">
            <Logo size={32} showText={false} />
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-xs font-black text-white leading-none uppercase truncate">{student?.name || 'Student Candidate'}</h2>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-1 font-mono truncate">
              ID: {student?.id || 'VTS-2026'} &bull; {student?.details?.class_group || 'STARTRITE REPOSITORIES'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 font-mono w-full sm:w-auto justify-end">
          <button 
            onClick={handleOpenResultsModal}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-white/30 text-white bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-white" />
            <span>Score Repository</span>
          </button>

          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-white/30 text-white bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center items-center my-auto">
        
        {/* CASE 1: STRICT SUBMISSION LOCKOUT */}
        {lobbyState === 'SUBMITTED_LOCKOUT' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide font-sans">Assessment Concluded</h3>
              <p className="text-[10px] text-indigo-600 font-black font-mono uppercase tracking-wider">Script Successfully Lodged</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "Your answer script has been securely saved to the school records. Re-entry is no longer permitted."}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
              <button 
                onClick={handleOpenResultsModal}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all"
              >
                Review Objective Breakdown
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: IDLE TIMELINE NO PAPERS READY */}
        {lobbyState === 'NO_EXAM' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Compass className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">Waiting Room Active</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                Your station is secure and connected. There are no active examination streams running right now. Please relax and await instructions from your teacher.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2 max-w-xs mx-auto">
              <button onClick={checkExamEligibilityFeed} className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all">
                Refresh Waiting Room Feed
              </button>
              <button onClick={handleOpenResultsModal} className="w-full py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-2xs">
                View Past Graded Records
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: AWAITING ROSTER CLEARANCE BY TEACHER */}
        {lobbyState === 'ROSTER_PENDING' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight font-sans">Awaiting Teacher Verification</h3>
              <p className="text-[10px] text-amber-700 font-black font-mono uppercase tracking-wider">Exam Hall Session is Open</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "The test session has started, but your supervisor has not yet checked you in on the allowlist roster. Please notify your teacher."}
              </p>
            </div>
            <div className="pt-2 max-w-xs mx-auto w-full">
              <button 
                onClick={checkExamEligibilityFeed}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer font-mono shadow-sm transition-all"
              >
                Check Verification Status Again
              </button>
            </div>
          </div>
        )}

        {/* CASE 4: INSUFFICIENT HALL WINDOW HEADROOM */}
        {lobbyState === 'WINDOW_INSUFFICIENT' && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight font-sans">Access Window Closed</h3>
              <p className="text-[10px] text-slate-500 font-black font-mono uppercase tracking-wider">Late Entry Restricted</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1 max-w-sm mx-auto">
                {serverMessage || "The remaining time left in the examination window is shorter than the required test duration. Entry is no longer permitted."}
              </p>
            </div>
          </div>
        )}

        {/* CASE 5: READY TO START TEST MODULE */}
        {lobbyState === 'READY' && activeExam && (
          <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block">
                Question Paper Cleared
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase mt-2.5 tracking-tight font-sans">
                {activeExam.subject} &mdash; {activeExam.category}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-2xs">
                <Clock className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Duration</span>
                  <p className="text-xs font-black text-slate-800 uppercase">{formatCleanDuration(activeExam.duration_minutes)}</p>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-2xs">
                <BookOpen className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Medium</span>
                  <p className="text-xs font-black text-slate-800 uppercase">CBT Examination</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs font-medium text-slate-600 leading-relaxed font-sans">
              <div className="flex items-center gap-2 text-slate-900 font-black uppercase text-[10px] font-mono tracking-tight pb-1 border-b border-slate-200/60 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                Examination Guidelines:
              </div>
              <p className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-900 font-black font-mono shrink-0">1.</span>
                Starting the test enters secure mode. Do not exit fullscreen view; leaving the window logs a warning strike.
              </p>
              <p className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-900 font-black font-mono shrink-0">2.</span>
                Right-clicking, copying, or pasting is disabled to protect academic integrity.
              </p>
              <p className="flex items-start gap-2 text-[11px] text-slate-700">
                <span className="font-mono font-black shrink-0">3.</span>
                <span className="font-semibold">Accumulating 3 security strikes will automatically conclude and submit your paper. Stay focused and calm!</span>
              </p>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleRequestSecureExamSession}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-mono"
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

      <footer className="w-full border-t border-slate-200/80 bg-white py-2.5 text-center text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>

    </div>
  );
}