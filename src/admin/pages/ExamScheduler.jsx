import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  ShieldAlert,
  Settings,
  ToggleLeft,
  ToggleRight,
  Save,
  User,
  Tag
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function ExamScheduler({ onNavigateBack }) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 📝 LOCAL INLINE CONFIGURATION BUFFER STATES
  const [editingExamId, setEditingExamId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [delegationMode, setDelegationMode] = useState(false); 

  // 🏛️ MODAL MATRIX STATE REGISTERS
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm', 
    title: '',
    message: '',
    targetId: null
  });

  const fetchScheduledLedger = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('api/v1/admin/scheduler/list', { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        setExams(payload.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledLedger();
  }, []);

  const closeNotificationModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const initExamConfigMode = (exam) => {
    setEditingExamId(exam.id);
    setDelegationMode(exam.is_teacher_delegated === true);
    if (exam.scheduled_start) {
      setScheduleDate(exam.scheduled_start.replace(' ', 'T').substring(0, 16));
    } else {
      setScheduleDate('');
    }
  };

  const handleSaveConstraints = async (examId) => {
    setIsProcessing(true);
    try {
      const res = await apiRequest(`api/v1/admin/scheduler/assessments/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduled_start: delegationMode ? null : scheduleDate,
          is_teacher_delegated: delegationMode ? 1 : 0
        })
      });
      
      if (res.ok) {
        setEditingExamId(null);
        fetchScheduledLedger();
      } else {
        const payload = await res.json();
        alert(payload.message || "Failed to update scheduler bounds.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerLaunchConfirmation = (examId, subjectName, armName) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Exam Activation Gate',
      message: `Are you sure you want to force-launch ${subjectName} for ${armName} immediately? This overrides any timestamp metrics and makes the session live on the local intranet candidate desks.`,
      targetId: examId
    });
  };

  const executeForceLaunchPipeline = async () => {
    const examId = modalConfig.targetId;
    if (!examId) return;

    setIsProcessing(true);
    closeNotificationModal();

    try {
      const res = await apiRequest(`api/v1/admin/scheduler/force-launch/${examId}`, { method: 'POST' });
      const payload = await res.json();
      
      if (res.ok && payload.status === 'SUCCESS') {
        setModalConfig({
          isOpen: true,
          type: 'success',
          title: 'Activation Complete',
          message: 'The examination channel is now live. Student computers are authorized to initialize tests.',
          targetId: null
        });
        fetchScheduledLedger();
      } else if (payload.status === 'CLASH_DETECTED') {
        setModalConfig({
          isOpen: true,
          type: 'clash',
          title: 'Scheduling Conflict Blocked',
          message: payload.message,
          targetId: null
        });
      } else {
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Execution Error Fault',
          message: payload.message || 'An unhandled constraint failure occurred.',
          targetId: null
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Synchronizing exam timetable schedules neatly...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none text-[#2A1A63] font-sans relative overflow-hidden w-full text-left">
      
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 flex items-center gap-2 shadow-3xs shrink-0">
        <button onClick={onNavigateBack} className="p-1.5 border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] hover:bg-[#FAF9FA] cursor-pointer transition-all active:scale-[0.95] mr-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="mr-1"><Logo size={45} showText={false} /></div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Exam Timetable Scheduler</h2>
          <p className="text-[10px] font-bold text-[#9A87A9] uppercase font-mono tracking-tight mt-0.5">Automated Activation Pipeline Desk</p>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start space-y-4">
        {exams.map((exam, idx) => {
          const isConfiguringThisRow = editingExamId === exam.id;
          const isDelegatedToFaculty = exam.is_teacher_delegated === true;

          return (
            <div key={exam.id || idx} className="bg-white border border-[#9A87A9]/20 rounded-xl p-5 flex flex-col gap-4 shadow-3xs w-full transition-all hover:border-[#9A87A9]/40">
              
              {/* UPPER DESK INFO TIER */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-3">
                <div className="space-y-1.5 truncate">
                  <div className="flex items-center gap-2 flex-wrap">
                    {exam.status === 'Exam in Progress' ? (
                      <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-emerald-600 text-white rounded-md uppercase tracking-wider animate-pulse">● LIVE RUNNING</span>
                    ) : isDelegatedToFaculty ? (
                      <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-indigo-600 text-white rounded-md uppercase tracking-wider">TEACHER MANAGED</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-slate-900 text-white rounded-md uppercase tracking-wider">TIMED CONTROL</span>
                    )}
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#FAF9FA] border border border-[#9A87A9]/20 text-slate-700 font-black rounded-md uppercase">{exam.code}</span>
                    {/* 💡 EXPOSED: Rendered Assessment Category tag label alongside paper name headings */}
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-md uppercase tracking-wide flex items-center gap-1"><Tag className="w-2.5 h-3" /> {exam.category}</span>
                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight truncate">{exam.subject} — {exam.arm}</h4>
                  </div>

                  <div className="flex items-center gap-x-6 gap-y-2 text-[11px] text-[#9A87A9] font-mono uppercase tracking-tight font-bold flex-wrap">
                    {/* 💡 EXPOSED: Added Teacher's Name allocation badge onto metadata metadata parameters trail */}
                    <span className="flex items-center gap-1 text-slate-800 bg-[#FAF9FA] border border-[#9A87A9]/10 px-2 py-0.5 rounded-md font-sans font-black text-[10px]"><User className="w-3.5 h-3.5 text-slate-500" /> Instructor: {exam.teacher_name}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#9A87A9]/50" /> Execution: {isDelegatedToFaculty ? 'OPEN START VIA FACULTY' : (exam.scheduled_start || 'NOT SCHEDULED')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#9A87A9]/50" /> Duration: {exam.duration} Mins</span>
                  </div>
                </div>

                {/* MAIN RUNTIME BUTTON ACTION CHANNELS */}
                <div className="shrink-0 w-full sm:w-auto flex gap-2 justify-end">
                  {exam.status === 'Exam in Progress' ? (
                    <div className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Surveillance Room Live
                    </div>
                  ) : !isConfiguringThisRow && (
                    <>
                      <button
                        onClick={() => initExamConfigMode(exam)}
                        className="px-3 py-2 bg-white border border-[#9A87A9]/30 hover:border-[#2A1A63] text-slate-700 text-xs font-mono font-black uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <Settings className="w-3.5 h-3.5" /> Adjust Control
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => triggerLaunchConfirmation(exam.id, exam.subject, exam.arm)}
                        className="px-4 py-2 bg-[#2A1A63] hover:opacity-90 disabled:bg-slate-300 text-white text-xs font-mono font-black uppercase rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Force Launch Now
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* LOWER CONFIGURATION PANEL: ACTIVE SELECTION TOGGLES */}
              {isConfiguringThisRow && (
                <div className="p-4 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs uppercase animate-fadeIn">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1 items-stretch sm:items-center">
                    
                    <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => setDelegationMode(!delegationMode)}>
                      {delegationMode ? (
                        <ToggleRight className="w-6 h-6 text-indigo-600 shrink-0" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400 shrink-0" />
                      )}
                      <span className="font-sans text-xs font-black tracking-tight text-slate-900">
                        {delegationMode ? 'Allow Teacher Start' : 'Admin Enforces Timestamp'}
                      </span>
                    </div>

                    {!delegationMode && (
                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <span className="text-[10px] font-black text-[#9A87A9]">Set Time:</span>
                        <input 
                          type="datetime-local" 
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-[#9A87A9]/40 text-xs font-bold font-sans text-slate-950 rounded-lg shadow-3xs focus:outline-none focus:border-[#2A1A63]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setEditingExamId(null)}
                      className="px-3 py-1.5 border border-[#9A87A9]/30 bg-white text-slate-600 font-sans font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isProcessing || (!delegationMode && !scheduleDate)}
                      onClick={() => handleSaveConstraints(exam.id)}
                      className="px-4 py-1.5 bg-[#2A1A63] text-white font-black rounded-lg flex items-center gap-1 shadow-md cursor-pointer disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Lock rules
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}

        {exams.length === 0 && (
          <div className="text-center p-16 text-[#9A87A9] font-black uppercase font-mono text-xs py-24 bg-white border border-dashed border-[#9A87A9]/30 rounded-xl w-full">
            No upcoming approved test sheets are registered on the scheduler timeline rows.
          </div>
        )}
      </main>

      {/* INSTITUTIONAL SCHEDULER INFRASTRUCTURE INTERCEPT MODAL */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${modalConfig.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white p-6 shadow-2xl transition-all duration-300 transform font-mono border-t-2 ${
          modalConfig.type === 'confirm' ? 'border-[#2A1A63]' :
          modalConfig.type === 'success' ? 'border-emerald-600' : 'border-[#C62927]'
        } ${modalConfig.isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full relative">
            <button onClick={closeNotificationModal} className="absolute -top-1.5 right-0 p-1 text-slate-300 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
              <div className={`w-10 h-10 border rounded-lg flex items-center justify-center shrink-0 ${
                modalConfig.type === 'confirm' ? 'bg-indigo-50 text-[#2A1A63] border-indigo-100' :
                modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                modalConfig.type === 'clash' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-[#C62927] border-rose-100'
              }`}>
                {modalConfig.type === 'confirm' && <ShieldAlert className="w-5 h-5" />}
                {modalConfig.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {modalConfig.type === 'clash' && <AlertTriangle className="w-5 h-5" />}
                {modalConfig.type === 'error' && <XCircle className="w-5 h-5" />}
              </div>
              <div className="pr-6 text-left">
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">{modalConfig.title}</h3>
                <p className="text-[10px] font-bold text-[#9A87A9] uppercase mt-0.5 tracking-wide leading-relaxed">{modalConfig.message}</p>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto font-sans border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 justify-end">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button onClick={closeNotificationModal} className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-lg cursor-pointer transition-all text-center">Cancel Action</button>
                  <button onClick={executeForceLaunchPipeline} className="px-5 py-2.5 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase rounded-lg shadow-md cursor-pointer font-mono text-center tracking-wide">Confirm Launch</button>
                </>
              ) : (
                <button onClick={closeNotificationModal} className="px-5 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase rounded-lg cursor-pointer transition-all text-center font-mono">Dismiss Notice</button>
              )}
            </div>

          </div>
        </div>
      </div>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Scheduler Registry Systems Layer © 2026
      </footer>

    </div>
  );
}