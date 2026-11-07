import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Clock, Play, Pause, Square, Power, Loader2, 
  CheckCircle2, AlertTriangle, XCircle, X, ShieldAlert, Settings, Save, 
  User, Tag, CalendarDays, Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Sparkles, Radio
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function ExamScheduler({ onNavigateBack, adminUser }) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingActionId, setProcessingActionId] = useState(null);

  // Search, Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, per_page: 15, last_page: 1 });

  const [editingExamId, setEditingExamId] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm', 
    title: '',
    message: '',
    targetId: null,
    actionType: 'launch'
  });

  // Debounce search inputs by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const subAdminScope = useMemo(() => {
    if (!adminUser) return { isSubAdmin: false, allowedClassNames: [] };

    const primaryRole = (adminUser.role || '').toLowerCase();
    const staffRole = (adminUser.staff_role || '').toLowerCase();
    const nestedStaffRole = (adminUser.staff_profile?.staff_role || '').toLowerCase();
    const detailsStaffRole = (adminUser.details?.staff_role || '').toLowerCase();

    const isSubAdmin = primaryRole === 'sub_admin' || 
                       staffRole === 'sub_admin' || 
                       nestedStaffRole === 'sub_admin' || 
                       detailsStaffRole === 'sub_admin';

    if (!isSubAdmin) return { isSubAdmin: false, allowedClassNames: [] };

    const assignedClasses = adminUser.assigned_classes || adminUser.staff_profile?.assigned_classes || adminUser.details?.assigned_classes || [];
    const allowedClassNames = assignedClasses.map(c => (typeof c === 'string' ? c : c.class_name || c.name)).filter(Boolean);

    return { isSubAdmin: true, allowedClassNames };
  }, [adminUser]);

  const fetchScheduledLedger = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        per_page: 15,
        search: debouncedSearch,
        status: statusFilter
      });

      const res = await apiRequest(`api/v1/admin/scheduler/list?${queryParams.toString()}`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        let fetchedExams = payload.data || [];

        if (subAdminScope.isSubAdmin && subAdminScope.allowedClassNames.length > 0) {
          fetchedExams = fetchedExams.filter(exam => 
            subAdminScope.allowedClassNames.includes(exam.arm) || 
            subAdminScope.allowedClassNames.includes(exam.class_arm)
          );
        }

        setExams(fetchedExams);
        if (payload.pagination) {
          setPaginationMeta(payload.pagination);
        }
      }
    } catch (err) {
      console.error('Scheduler Fetch Error:', err);
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, statusFilter, subAdminScope]);

  useEffect(() => {
    fetchScheduledLedger(false);
  }, [fetchScheduledLedger]);

  const closeNotificationModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const initExamConfigMode = useCallback((exam) => {
    setEditingExamId(exam.id);
    setScheduleStartDate(exam.scheduled_start ? exam.scheduled_start.replace(' ', 'T').substring(0, 16) : '');
    setScheduleEndDate(exam.scheduled_end ? exam.scheduled_end.replace(' ', 'T').substring(0, 16) : '');
  }, []);

  const handleSaveConstraints = async (examId) => {
    setProcessingActionId(examId);
    try {
      const res = await apiRequest(`api/v1/admin/scheduler/assessments/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduled_start: scheduleStartDate || null,
          scheduled_end: scheduleEndDate || null,
          is_teacher_delegated: 0
        })
      });
      
      if (res.ok) {
        setExams(prev => prev.map(ex => {
          if (ex.id === examId) {
            return {
              ...ex,
              scheduled_start: scheduleStartDate ? scheduleStartDate.replace('T', ' ') : null,
              scheduled_end: scheduleEndDate ? scheduleEndDate.replace('T', ' ') : null
            };
          }
          return ex;
        }));
        setEditingExamId(null);
      } else {
        const payload = await res.json();
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Constraint Validation Failed',
          message: payload.message || 'Failed to update scheduler bounds.',
          targetId: null,
          actionType: 'launch'
        });
      }
    } catch (err) {
      console.error('Save Bounds Error:', err);
    } finally {
      setProcessingActionId(null);
    }
  };

  const triggerActionConfirmation = useCallback((actionType, exam) => {
    const titles = {
      launch: 'Launch Examination Session',
      pause: 'Pause Live Examination',
      resume: 'Resume Examination',
      terminate: 'Terminate Examination (Emergency)',
      stop: 'Close Examination Portal Access'
    };

    const messages = {
      launch: `Are you sure you want to force-launch ${exam.subject} (${exam.arm}) now?`,
      pause: `Pause exam screen for all candidates taking ${exam.subject} (${exam.arm})?`,
      resume: `Unfreeze exam screen and resume taking ${exam.subject} (${exam.arm})?`,
      terminate: `WARNING: Terminating ${exam.subject} (${exam.arm}) will immediately auto-submit all active candidate scripts. Continue?`,
      stop: `Close and seal portal access for ${exam.subject} (${exam.arm})?`
    };

    setModalConfig({
      isOpen: true,
      type: actionType === 'terminate' ? 'clash' : 'confirm',
      title: titles[actionType],
      message: messages[actionType],
      targetId: exam.id,
      actionType
    });
  }, []);

  const executeActionConfirmed = async () => {
    const { targetId, actionType } = modalConfig;
    if (!targetId) return;

    setProcessingActionId(targetId);
    closeNotificationModal();

    const statusMap = {
      launch: 'Exam in Progress',
      pause: 'Exam Paused',
      resume: 'Exam in Progress',
      terminate: 'Finished (Ready to Grade)',
      stop: 'Finished (Ready to Grade)'
    };

    setExams(prevExams => prevExams.map(ex => {
      if (ex.id === targetId && statusMap[actionType]) {
        return { ...ex, status: statusMap[actionType] };
      }
      return ex;
    }));

    const endpoints = {
      launch: `api/v1/admin/scheduler/force-launch/${targetId}`,
      pause: `api/v1/admin/scheduler/pause/${targetId}`,
      resume: `api/v1/admin/scheduler/resume/${targetId}`,
      terminate: `api/v1/admin/scheduler/terminate/${targetId}`,
      stop: `api/v1/admin/scheduler/stop-window/${targetId}`
    };

    try {
      const res = await apiRequest(endpoints[actionType], { 
        method: 'POST',
        body: actionType === 'stop' ? JSON.stringify({ force: true }) : null
      });
      
      if (!res.ok) {
        const payload = await res.json();
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Action Execution Failed',
          message: payload.message || 'Operation failed.',
          targetId: null,
          actionType: 'dismiss'
        });
        fetchScheduledLedger(true);
      }
    } catch (err) {
      console.error('Execute Action Error:', err);
      fetchScheduledLedger(true);
    } finally {
      setProcessingActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between select-none text-[#2A1A63] font-sans relative overflow-x-hidden w-full text-left">
      
      {/* HEADER SECTION */}
      <header className="w-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] px-6 py-4 flex justify-between items-center shadow-md sticky top-0 z-40 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={onNavigateBack} 
            className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white/20 active:scale-95"
            title="Return to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-2xl shadow-sm flex items-center justify-center">
            <Logo size={28} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              {subAdminScope.isSubAdmin ? 'Sub-Admin Exam Scheduler' : 'Master Exam Control Center'}
            </h1>
            <p className="text-[10px] font-bold text-purple-100 uppercase tracking-widest mt-0.5">
              Real-Time Timetable Allocation & Operational Access Portal
            </p>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col justify-start space-y-5">
        
        {/* CONTROLS BAR */}
        <div className="bg-white/90 backdrop-blur-md border border-[#E2D5F8] p-4 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C6B93]" />
            <input
              type="text"
              placeholder="Search paper, code, class arm or supervisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl shadow-inner focus:outline-none focus:border-[#7C3AED] transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#FAF9FA] border border-[#E2D5F8] px-3.5 py-2 rounded-2xl shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-[#7C3AED]" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Approved">Approved (Pending Launch)</option>
                <option value="Exam in Progress">Live Running</option>
                <option value="Exam Paused">Paused Session</option>
              </select>
            </div>

            <button
              onClick={() => fetchScheduledLedger(false)}
              className="p-2.5 bg-white border border-[#E2D5F8] hover:border-[#7C3AED] text-[#7C3AED] rounded-2xl flex items-center justify-center cursor-pointer shadow-2xs transition-all hover:bg-purple-50 active:scale-95"
              title="Refresh Timetable Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TIMETABLE LISTING */}
        {isLoading ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center font-mono py-24 bg-white/70 border border-[#E2D5F8] rounded-3xl shadow-sm gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#7C3AED]" />
            <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Synchronizing Examination Timetable Matrix...</span>
          </div>
        ) : (!Array.isArray(exams) || exams.length === 0) ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center text-center font-mono py-24 bg-white/70 border border-[#E2D5F8] rounded-3xl shadow-sm space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 opacity-80" />
            <p className="text-xs font-black uppercase tracking-wide text-slate-800 font-sans">No scheduled assessment records match current search filter.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {exams.map((exam, idx) => {
              const isConfiguringThisRow = editingExamId === exam.id;
              const hasAdminWindowSet = exam.scheduled_start && exam.scheduled_end;
              const statusClean = String(exam.status || '').toLowerCase();
              const isLiveRunning = statusClean.includes('progress');
              const isPaused = statusClean.includes('paused');
              const isRowBusy = processingActionId === exam.id;

              return (
                <div key={exam.id || idx} className="bg-white border border-[#E2D5F8] rounded-3xl p-5 flex flex-col gap-4 shadow-sm w-full transition-all hover:border-[#7C3AED] hover:shadow-md relative overflow-hidden">
                  
                  {/* CARD HEADER */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#E2D5F8]/60 pb-3.5">
                    <div className="space-y-2 truncate flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLiveRunning ? (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-black bg-emerald-600 text-white rounded-xl uppercase tracking-wider animate-pulse border border-emerald-400 flex items-center gap-1">
                            <Radio className="w-3 h-3 text-emerald-200" /> LIVE RUNNING
                          </span>
                        ) : isPaused ? (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-black bg-amber-500 text-white rounded-xl uppercase tracking-wider border border-amber-300">
                            ⏸️ SESSION PAUSED
                          </span>
                        ) : hasAdminWindowSet ? (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-black bg-purple-600 text-white rounded-xl uppercase tracking-wider">
                            PORTAL CONFIGURED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[9px] font-mono font-black bg-slate-500 text-white rounded-xl uppercase tracking-wider">
                            PENDING WINDOW
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 text-[9px] font-mono bg-[#FAF9FA] border border-[#E2D5F8] text-slate-800 font-black rounded-lg uppercase">{exam.code}</span>
                        <span className="px-2.5 py-0.5 text-[9px] font-mono bg-purple-50 border border-purple-200 text-[#7C3AED] font-black rounded-lg uppercase tracking-wide flex items-center gap-1">
                          <Tag className="w-2.5 h-3" /> {exam.category}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                          {exam.subject} — <span className="text-[#7C3AED]">{exam.arm || exam.class_arm}</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-x-5 gap-y-2 text-[11px] text-[#7C6B93] font-mono uppercase font-bold flex-wrap">
                        <span className="flex items-center gap-1.5 text-slate-800 bg-[#FAF9FA] border border-[#E2D5F8] px-2.5 py-1 rounded-xl font-sans font-bold text-[10px]">
                          <User className="w-3.5 h-3.5 text-[#7C3AED]" /> Supervisor: {exam.teacher_name}
                        </span>
                        <span className="flex items-center gap-1.5 text-[#7C3AED]">
                          <CalendarDays className="w-3.5 h-3.5" /> Window: {hasAdminWindowSet ? `${exam.scheduled_start} to ${exam.scheduled_end}` : 'NOT CONFIGURED'}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-[#7C3AED]" /> Duration: {exam.duration} Mins
                        </span>
                      </div>
                    </div>

                    {/* ACTION BUTTON MATRIX */}
                    <div className="shrink-0 w-full lg:w-auto flex flex-wrap gap-2 justify-end font-mono">
                      {isRowBusy ? (
                        <div className="px-4 py-2 bg-purple-50 border border-purple-200 text-[#7C3AED] rounded-xl flex items-center gap-2 text-xs font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing Command...
                        </div>
                      ) : !isConfiguringThisRow && (
                        <>
                          {!isLiveRunning && !isPaused && (
                            <button 
                              disabled={isRowBusy} 
                              onClick={() => triggerActionConfirmation('launch', exam)} 
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Start Exam
                            </button>
                          )}

                          {isLiveRunning && (
                            <button 
                              disabled={isRowBusy} 
                              onClick={() => triggerActionConfirmation('pause', exam)} 
                              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                            </button>
                          )}

                          {isPaused && (
                            <button 
                              disabled={isRowBusy} 
                              onClick={() => triggerActionConfirmation('resume', exam)} 
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Resume
                            </button>
                          )}

                          {(isLiveRunning || isPaused) && (
                            <button 
                              disabled={isRowBusy} 
                              onClick={() => triggerActionConfirmation('terminate', exam)} 
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              <Power className="w-3.5 h-3.5" /> Terminate
                            </button>
                          )}

                          <button 
                            onClick={() => initExamConfigMode(exam)} 
                            className="px-3.5 py-2 bg-white border border-[#E2D5F8] hover:border-[#7C3AED] hover:bg-purple-50 text-slate-800 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#7C3AED]" /> Set Bounds
                          </button>
                          
                          {(isLiveRunning || hasAdminWindowSet) && (
                            <button 
                              disabled={isRowBusy} 
                              onClick={() => triggerActionConfirmation('stop', exam)} 
                              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" /> Close Window
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* INLINE BOUNDS CONFIGURATOR */}
                  {isConfiguringThisRow && (
                    <div className="p-5 bg-[#FAF8FF] border border-[#7C3AED] rounded-2xl flex flex-col gap-4 font-mono text-xs uppercase shadow-inner">
                      <div className="flex justify-between items-center border-b border-[#E2D5F8] pb-2">
                        <span className="font-black text-slate-900 text-xs flex items-center gap-2 font-sans">
                          <CalendarDays className="w-4 h-4 text-[#7C3AED]" /> Configure Portal Access Bounds
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-[#E2D5F8]">
                          <label className="text-[10px] font-black text-[#7C3AED] block flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Access Window Opens:
                          </label>
                          <input 
                            type="datetime-local" 
                            value={scheduleStartDate} 
                            onChange={(e) => setScheduleStartDate(e.target.value)} 
                            className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold font-sans text-slate-900 rounded-lg shadow-2xs focus:outline-none focus:border-[#7C3AED] cursor-pointer" 
                          />
                        </div>

                        <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-[#E2D5F8]">
                          <label className="text-[10px] font-black text-rose-600 block flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Access Window Closes:
                          </label>
                          <input 
                            type="datetime-local" 
                            value={scheduleEndDate} 
                            onChange={(e) => setScheduleEndDate(e.target.value)} 
                            className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold font-sans text-slate-900 rounded-lg shadow-2xs focus:outline-none focus:border-[#7C3AED] cursor-pointer" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E2D5F8]/60">
                        <button 
                          onClick={() => { setScheduleStartDate(''); setScheduleEndDate(''); }} 
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 uppercase cursor-pointer px-2 py-1"
                        >
                          Clear Window Bounds
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingExamId(null)} 
                            className="px-4 py-2 border border-[#E2D5F8] bg-white text-slate-600 font-sans font-bold text-xs uppercase rounded-xl cursor-pointer hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={isRowBusy || (!scheduleStartDate || !scheduleEndDate)} 
                            onClick={() => handleSaveConstraints(exam.id)} 
                            className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-40 transition-all active:scale-95"
                          >
                            {isRowBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Bounds
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {paginationMeta.last_page > 1 && (
          <div className="flex justify-between items-center bg-white border border-[#E2D5F8] px-6 py-3.5 rounded-2xl font-mono text-xs shadow-2xs mt-4">
            <span className="text-[#7C6B93] font-bold text-[11px] uppercase">
              Page {paginationMeta.current_page} of {paginationMeta.last_page} ({paginationMeta.total} Total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 border border-[#E2D5F8] rounded-xl text-slate-700 bg-white hover:bg-purple-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-bold transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                disabled={currentPage >= paginationMeta.last_page || isLoading}
                onClick={() => setCurrentPage(prev => Math.min(paginationMeta.last_page, prev + 1))}
                className="px-3.5 py-1.5 border border-[#E2D5F8] rounded-xl text-slate-700 bg-white hover:bg-purple-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-bold transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ACTION CONFIRMATION MODAL */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${modalConfig.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white p-6 shadow-2xl transition-all duration-300 transform font-mono border-t-4 ${modalConfig.type === 'confirm' ? 'border-[#7C3AED]' : modalConfig.type === 'clash' ? 'border-amber-500' : 'border-[#C62927]'} ${modalConfig.isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full relative">
            <button onClick={closeNotificationModal} className="absolute -top-1.5 right-0 p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start md:items-center gap-3.5 w-full md:w-auto">
              <div className={`w-11 h-11 border rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${modalConfig.type === 'confirm' ? 'bg-purple-50 text-[#7C3AED] border-purple-200' : modalConfig.type === 'clash' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-[#C62927] border-rose-200'}`}>
                {modalConfig.type === 'confirm' && <ShieldAlert className="w-5 h-5" />}
                {modalConfig.type === 'clash' && <AlertTriangle className="w-5 h-5" />}
                {modalConfig.type === 'error' && <XCircle className="w-5 h-5" />}
              </div>
              <div className="pr-6 text-left">
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">{modalConfig.title}</h3>
                <p className="text-[11px] font-bold text-slate-600 uppercase mt-0.5 tracking-wide leading-relaxed">{modalConfig.message}</p>
              </div>
            </div>
            <div className="flex gap-2.5 w-full md:w-auto font-sans border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 justify-end">
              <button onClick={closeNotificationModal} className="px-4 py-2.5 border border-[#E2D5F8] text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-xl cursor-pointer transition-all">Cancel</button>
              <button onClick={executeActionConfirmed} className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl shadow-md font-mono text-center tracking-wide transition-all active:scale-95">Confirm Action</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-3 text-center text-[10px] font-black text-[#7C6B93] tracking-widest font-mono uppercase px-4 shrink-0">
        Start-Rite Institutional Security & Examination Control Matrix
      </footer>
    </div>
  );
}