import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Play, Loader2, CheckCircle2, AlertTriangle, XCircle, X, ShieldAlert, Settings, ToggleLeft, ToggleRight, Save, User, Tag } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function ExamScheduler({ onNavigateBack }) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editingExamId, setEditingExamId] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState(''); 
  const [delegationMode, setDelegationMode] = useState(false); 

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
    setScheduleStartDate(exam.scheduled_start ? exam.scheduled_start.replace(' ', 'T').substring(0, 16) : '');
    setScheduleEndDate(exam.scheduled_end ? exam.scheduled_end.replace(' ', 'T').substring(0, 16) : '');
  };

  // 🎯 AUTOMATIC END TIME TIMESTAMPER CALCULATOR
  const handleStartDateChange = (startTimeValue, examDurationMinutes) => {
    setScheduleStartDate(startTimeValue);
    
    if (!startTimeValue) {
      setScheduleEndDate('');
      return;
    }

    try {
      const startDateObj = new Date(startTimeValue);
      const durationMs = parseInt(examDurationMinutes || 30, 10) * 60 * 1000;
      const endDateObj = new Date(startDateObj.getTime() + durationMs);
      
      const year = endDateObj.getFullYear();
      const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(endDateObj.getDate()).padStart(2, '0');
      const hours = String(endDateObj.getHours()).padStart(2, '0');
      const minutes = String(endDateObj.getMinutes()).padStart(2, '0');
      
      const formattedEndTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setScheduleEndDate(formattedEndTime);
    } catch (err) {
      console.error("Failed calculating auto closing bounds:", err);
    }
  };

  const handleSaveConstraints = async (examId) => {
    setIsProcessing(true);
    try {
      const res = await apiRequest(`api/v1/admin/scheduler/assessments/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduled_start: delegationMode ? null : scheduleStartDate,
          scheduled_end: delegationMode ? null : scheduleEndDate,
          is_teacher_delegated: delegationMode ? 1 : 0
        })
      });
      
      if (res.ok) {
        setEditingExamId(null);
        fetchScheduledLedger();
      } else {
        const payload = await res.json();
        setModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Constraint Validation Failed',
          message: payload.message || "Failed to update scheduler bounds.",
          targetId: null
        });
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
      message: `Are you sure you want to force-launch ${subjectName} for ${armName} immediately? This overrides any timestamp metrics and makes the session live on local area network candidate desks.`,
      targetId: examId
    });
  };

  const executeLaunchPipelineNow = async () => {
    const examId = modalConfig.targetId;
    if (!examId) return;

    setIsProcessing(true);
    closeNotificationModal();

    try {
        const res = await apiRequest(`api/v1/admin/scheduler/force-launch/${examId}`, { method: 'POST' });
        
        if (res.ok) {
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: 'Activation Complete',
                message: 'Exam is LIVE. End time automatically calculated from now.',
                targetId: null
            });
            fetchScheduledLedger();
        } else {
            const payload = await res.json();
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: 'Launch Failed',
                message: payload.message,
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
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Synchronizing examination timetable scheduler...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none text-[#2A1A63] font-sans relative overflow-hidden w-full text-left">
      
      {/* Header Banner matching AdminDashboard & Class Directory gradient style */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Exam Timetable Scheduler</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Automated Activation Pipeline Desk</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 flex flex-col justify-start space-y-4">
        {(!Array.isArray(exams) || exams.length === 0) ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center text-center font-mono py-24 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl my-auto shadow-xs">
            <div className="w-32 h-32 flex items-center justify-center text-[#7C3AED] mb-3">
              <img 
                src="/thinking-character.png" 
                alt="Thinking Character" 
                className="w-28 h-28 object-contain drop-shadow-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO SCHEDULED EXAMINATIONS FOUND IN TIMETABLE REGISTRY.</p>
          </div>
        ) : (
          exams.map((exam, idx) => {
            const isConfiguringThisRow = editingExamId === exam.id;
            const isDelegatedToFaculty = exam.is_teacher_delegated === true;

            return (
              <div key={exam.id || idx} className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-5 flex flex-col gap-4 shadow-xs w-full transition-all hover:border-[#7C3AED]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2D5F8]/60 pb-3">
                  <div className="space-y-1.5 truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      {exam.status.toLowerCase().includes('progress') ? (
                        <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-emerald-600 text-white rounded-lg uppercase tracking-wider animate-pulse border border-emerald-300">● LIVE RUNNING</span>
                      ) : isDelegatedToFaculty ? (
                        <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-[#7C3AED] text-white rounded-lg uppercase tracking-wider">TEACHER MANAGED</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[8px] font-mono font-black bg-slate-900 text-white rounded-lg uppercase tracking-wider">TIMED CONTROL</span>
                      )}
                      <span className="px-2 py-0.5 text-[9px] font-mono bg-white border border-[#E2D5F8] text-slate-800 font-black rounded-lg uppercase shadow-2xs">{exam.code}</span>
                      <span className="px-2 py-0.5 text-[9px] font-mono bg-white border border-[#E2D5F8] text-[#7C3AED] font-black rounded-lg uppercase tracking-wide flex items-center gap-1 shadow-2xs"><Tag className="w-2.5 h-3" /> {exam.category}</span>
                      <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate">{exam.subject} — {exam.arm}</h4>
                    </div>
                    <div className="flex items-center gap-x-6 gap-y-2 text-[11px] text-[#7C6B93] font-mono uppercase tracking-tight font-bold flex-wrap">
                      <span className="flex items-center gap-1 text-slate-900 bg-white border border-[#E2D5F8] px-2.5 py-1 rounded-xl font-sans font-black text-[10px] shadow-2xs"><User className="w-3.5 h-3.5 text-[#7C3AED]" /> Instructor: {exam.teacher_name}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#7C3AED]" /> Portal Active: {isDelegatedToFaculty ? 'OPEN START VIA FACULTY' : `${exam.scheduled_start || 'NOT SET'} to ${exam.scheduled_end || 'NOT SET'}`}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#7C3AED]" /> Duration: {exam.duration} Mins</span>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto flex gap-2 justify-end font-mono">
                    {exam.status.toLowerCase().includes('progress') ? (
                      <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Surveillance Room Live
                      </div>
                    ) : !isConfiguringThisRow && (
                      <>
                        <button onClick={() => initExamConfigMode(exam)} className="px-3.5 py-2 bg-white border border-[#E2D5F8] hover:border-[#7C3AED] text-slate-800 text-xs font-mono font-black uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                          <Settings className="w-3.5 h-3.5 text-[#7C3AED]" /> Adjust Control
                        </button>
                        <button disabled={isProcessing} onClick={() => triggerLaunchConfirmation(exam.id, exam.subject, exam.arm)} className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] disabled:bg-slate-300 text-white text-xs font-mono font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.97]">
                          <Play className="w-3.5 h-3.5 fill-current" /> Force Launch Now
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isConfiguringThisRow && (
                  <div className="p-4 bg-white border border-[#E2D5F8] rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 font-mono text-xs uppercase animate-fadeIn shadow-2xs">
                    <div className="flex flex-col lg:flex-row gap-4 flex-1 items-stretch lg:items-center">
                      <div className="flex items-center gap-2 select-none cursor-pointer shrink-0" onClick={() => setDelegationMode(!delegationMode)}>
                        {delegationMode ? <ToggleRight className="w-6 h-6 text-[#7C3AED] shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-400 shrink-0" />}
                        <span className="font-sans text-xs font-black tracking-tight text-slate-900">{delegationMode ? 'Allow Teacher Start' : 'Admin Enforces Timestamp'}</span>
                      </div>

                      {!delegationMode && (
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-black text-[#7C6B93] shrink-0">Gate Opens:</span>
                            <input 
                              type="datetime-local" 
                              value={scheduleStartDate} 
                              onChange={(e) => handleStartDateChange(e.target.value, exam.duration)} 
                              className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold font-sans text-slate-900 rounded-xl shadow-2xs focus:outline-none focus:border-[#7C3AED]" 
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-black text-[#7C6B93] shrink-0">Gate Closes:</span>
                            <input 
                              type="datetime-local" 
                              value={scheduleEndDate} 
                              onChange={(e) => setScheduleEndDate(e.target.value)} 
                              className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold font-sans text-slate-900 rounded-xl shadow-2xs focus:outline-none focus:border-[#7C3AED]" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end shrink-0">
                      <button onClick={() => setEditingExamId(null)} className="px-4 py-2 border border-[#E2D5F8] bg-white text-slate-600 font-sans font-bold text-xs uppercase rounded-xl cursor-pointer hover:bg-slate-50">Cancel</button>
                      <button disabled={isProcessing || (!delegationMode && (!scheduleStartDate || !scheduleEndDate))} onClick={() => handleSaveConstraints(exam.id)} className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"><Save className="w-3.5 h-3.5" /> Save Lock rules</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* NOTIFICATION MODAL BANNER */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${modalConfig.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white p-6 shadow-2xl transition-all duration-300 transform font-mono border-t-2 ${modalConfig.type === 'confirm' ? 'border-[#7C3AED]' : modalConfig.type === 'success' ? 'border-emerald-600' : 'border-[#C62927]'} ${modalConfig.isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full relative">
            <button onClick={closeNotificationModal} className="absolute -top-1.5 right-0 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
              <div className={`w-10 h-10 border rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${modalConfig.type === 'confirm' ? 'bg-purple-50 text-[#7C3AED] border-purple-200' : modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : modalConfig.type === 'clash' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-[#C62927] border-rose-200'}`}>
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
                  <button onClick={closeNotificationModal} className="px-4 py-2 border border-[#E2D5F8] text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-xl cursor-pointer text-center">Cancel Action</button>
                  <button onClick={executeLaunchPipelineNow} className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl shadow-md font-mono text-center tracking-wide">Confirm Launch</button>
                </>
              ) : (
                <button onClick={closeNotificationModal} className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold uppercase rounded-xl cursor-pointer text-center font-mono shadow-md">Dismiss Notice</button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite intrnet institutional security matrix
      </footer>
    </div>
  );
}