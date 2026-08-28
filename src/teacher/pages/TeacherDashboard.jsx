import React, { useState, useEffect } from 'react';
import { 
  Folder, ArrowLeft, ChevronRight, LogOut, ShieldAlert, 
  Loader2, FileSpreadsheet, Plus, Clock, Activity, CheckSquare, Play, Layers, FileText, ChevronDown, AlertTriangle 
} from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function TeacherDashboard({ 
  teacher, 
  initialFolderContext, 
  onFolderContextChange, 
  onNavigateToBuilder, 
  onNavigateToMonitor, 
  onNavigateToGrading, 
  onNavigateToReview,
  onNavigateToGradebook, 
  onLogOut 
}) {
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);
  const [activeCourseFolder, setActiveCourseFolder] = useState(initialFolderContext || null);
  
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [assessmentsRegistry, setAssessmentsRegistry] = useState([]);
  
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  const [assessmentType, setAssessmentType] = useState('CA 1');
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, targetId: null });
  const [notification, setNotification] = useState({ isVisible: false, type: 'error', message: '' });

  const baseAvailableSlots = [
    { value: 'CA 1', label: 'CONTINUOUS ASSESMENT 1 (CA 1)' },
    { value: 'CA 2', label: 'CONTINUOUS ASSESMENT 2 (CA 2)' },
    { value: 'CA 3', label: 'CONTINUOUS ASSESMENT 3 (CA 3)' },
    { value: 'Exam', label: 'TERMINAL EXAMINATION PAPER' }
  ];

  const triggerBannerAlert = (message, type = 'error') => {
    setNotification({ isVisible: true, type, message });
    setTimeout(() => {
      setNotification({ isVisible: false, type: 'error', message: '' });
    }, 5000);
  };

  useEffect(() => {
    const fetchAllocatedFolders = async () => {
      try {
        const response = await apiRequest('api/v1/teacher/folders', { method: 'GET' });
        const data = await response.json();

        if (response.ok && data.status === 'SUCCESS') {
          const formattedCourses = data.folders.map(folder => ({
            id: folder.class_arm_id, 
            assignmentId: folder.assignment_id,
            subjectId: folder.subject_id, 
            name: folder.subject_name,
            classGroup: folder.class_arm_name,
            code: folder.subject_name.substring(0, 3) + ' ' + (300 + folder.assignment_id)
          }));
          setAssignedCourses(formattedCourses);
        }
      } catch (error) {
        console.error("❌ [TEACHER ALLOCATION INGESTION FAULT]:", error);
      } finally {
        setIsLoadingFolders(false);
      }
    };

    fetchAllocatedFolders();
  }, []);

  useEffect(() => {
    const synchronizeActiveFolderContent = async () => {
      if (activeCourseFolder && assessmentsRegistry.length === 0) {
        setIsLoadingSlots(true);
        try {
          const response = await apiRequest(`api/v1/teacher/folders/${activeCourseFolder.id}/assessments?subject_id=${activeCourseFolder.subjectId}`, { method: 'GET' });
          const data = await response.json();

          if (response.ok && data.status === 'SUCCESS') {
            setAssessmentsRegistry(data.assessments);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingSlots(false);
        }
      }
    };

    synchronizeActiveFolderContent();
  }, [activeCourseFolder, assessmentsRegistry.length]);

  const handleSetFolderContext = async (folder) => {
    setActiveCourseFolder(folder);
    onFolderContextChange(folder);

    if (folder) {
      setIsLoadingSlots(true);
      try {
        const response = await apiRequest(`api/v1/teacher/folders/${folder.id}/assessments?subject_id=${folder.subjectId}`, { method: 'GET' });
        const data = await response.json();

        if (response.ok && data.status === 'SUCCESS') {
          setAssessmentsRegistry(data.assessments);
          
          const createdTypes = data.assessments.map(a => a.type);
          const firstAvailable = baseAvailableSlots.find(slot => !createdTypes.includes(slot.value));
          if (firstAvailable) {
            setAssessmentType(firstAvailable.value);
          }
        } else {
          setAssessmentsRegistry([]);
        }
      } catch (error) {
        console.error(error);
        setAssessmentsRegistry([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
  };

  const handleOpenInitModal = (e) => {
    e.preventDefault();
    const slotAlreadyExists = assessmentsRegistry.some(asm => asm.type === assessmentType && asm.courseId === activeCourseFolder.id);
    if (slotAlreadyExists) {
      triggerBannerAlert(`A folder setup link for [${assessmentType}] already exists for this class.`, 'warning');
      return;
    }

    const calculatedTotalMinutes = (parseInt(durationHours || 0, 10) * 60) + parseInt(durationMinutes || 0, 10);
    if (calculatedTotalMinutes <= 0) {
      triggerBannerAlert("Please specify a valid test duration greater than 0 minutes.", "warning");
      return;
    }

    setModalConfig({ isOpen: true, type: 'create_slot', targetId: null });
  };

  const handleCreateSlotShell = async () => {
    try {
      const calculatedTotalMinutes = (parseInt(durationHours || 0, 10) * 60) + parseInt(durationMinutes || 0, 10);
      const response = await apiRequest('api/v1/teacher/assessments', {
        method: 'POST',
        body: JSON.stringify({
          class_arm_id: activeCourseFolder.id,
          subject_id: activeCourseFolder.subjectId, 
          type: assessmentType,
          duration: calculatedTotalMinutes
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        const updatedList = [...assessmentsRegistry, data.assessment];
        setAssessmentsRegistry(updatedList);
        triggerBannerAlert(`Assessment envelope [${assessmentType}] initialized successfully.`, 'success');
        
        const createdTypes = updatedList.map(a => a.type);
        const nextAvailable = baseAvailableSlots.find(slot => !createdTypes.includes(slot.value));
        if (nextAvailable) {
          setAssessmentType(nextAvailable.value);
        }
      } else {
        triggerBannerAlert(data.message || "Failed to create assessment folder link.");
      }
    } catch (error) {
      console.error(error);
      triggerBannerAlert("School server communication dropped. Please verify network connection status.");
    } finally {
      setModalConfig({ isOpen: false, type: null, targetId: null });
    }
  };

  const handleModalConfirm = async () => {
    setIsProcessing(true);
    try {
      if (modalConfig.type === 'create_slot') {
        await handleCreateSlotShell();
      } 
      else if (modalConfig.type === 'send_review') {
        const response = await apiRequest(`api/v1/teacher/assessments/${modalConfig.targetId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Pending Admin' })
        });
        const data = await response.json();

        if (response.ok && data.status === 'SUCCESS') {
          setAssessmentsRegistry(prev => prev.map(asm => asm.id === modalConfig.targetId ? { ...asm, status: 'Pending Admin' } : asm));
          triggerBannerAlert("Question sheet locked and dispatched to admin queue.", "success");
        } else {
          triggerBannerAlert(data.message || "Failed to submit assessment to administrative queue.");
        }
      } 
      else if (modalConfig.type === 'start_exam_now') {
        const response = await apiRequest(`api/v1/admin/scheduler/force-launch/${modalConfig.targetId}`, {
          method: 'POST'
        });
        const data = await response.json();

        if (response.ok) {
          setAssessmentsRegistry(prev => prev.map(asm => 
            asm.id === modalConfig.targetId ? { ...asm, status: 'Exam in Progress' } : asm
          ));
          triggerBannerAlert("CBT Session Activated. Timer synced to current time.", "success");
        } else {
          triggerBannerAlert(data.message || "Launch failed.");
        }
      }
    } catch (error) {
      console.error(error);
      triggerBannerAlert("Network communication fault occurred.");
    } finally {
      setIsProcessing(false);
      setModalConfig({ isOpen: false, type: null, targetId: null });
    }
  };

  const openFolderSlots = assessmentsRegistry.filter(asm => asm.courseId === activeCourseFolder?.id);
  const allSlotsTaken = baseAvailableSlots.every(slot => assessmentsRegistry.some(asm => asm.type === slot.value && asm.courseId === activeCourseFolder?.id));

  const formatDisplayDuration = (rawMinutes) => {
    const mins = parseInt(rawMinutes, 10) || 30;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? 's' : ''}`;
    }
    return `${mins} Mins`;
  };

  const folderCardStyles = [
    { bg: 'bg-[#F3EEFC]', border: 'border-[#E2D5F8]', iconColor: 'text-[#7C3AED]' },
    { bg: 'bg-[#FCE7EE]', border: 'border-[#F8D3DF]', iconColor: 'text-[#E11D48]' },
    { bg: 'bg-[#EBFBF3]', border: 'border-[#C6F6D5]', iconColor: 'text-[#059669]' },
    { bg: 'bg-[#FFFBEB]', border: 'border-[#FEF3C7]', iconColor: 'text-[#D97706]' }
  ];

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none relative text-[#2A1A63] font-sans w-full overflow-x-hidden">
      
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-3.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          {activeCourseFolder ? (
            <button 
              onClick={() => handleSetFolderContext(null)}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1"
              title="Back to Allocated Classes"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <div className="bg-white p-1 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white">START-RITE WORKSPACE</h2>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Teacher: {teacher?.name || "OCHIGBO GODSWILL"}</p>
          </div>
        </div>

        <div className="flex items-center">
          <button 
            onClick={() => setShowLogoutDrawer(true)}
            className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {notification.isVisible && (
        <div className={`fixed top-20 right-6 z-[1000] p-4 border rounded-xl flex items-center gap-3 max-w-sm shadow-2xl font-mono text-xs uppercase transition-all transform translate-y-0 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' :
          notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold' :
          'bg-rose-50 border-rose-200 text-[#C62927] font-black'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div className="font-sans font-bold">{notification.message}</div>
        </div>
      )}

      {!activeCourseFolder ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 my-auto flex flex-col justify-start">
          <div className="mb-6 text-left">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">YOUR ALLOCATED CLASSES</h3>
            <p className="text-xs text-[#7C6B93] font-medium mt-1">Select an individual subject path folder to manage continuous assessment questions or review score reports.</p>
          </div>

          {isLoadingFolders ? (
            <div className="p-12 border border-dashed border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white shadow-xs py-24 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" /> Loading allocated subject directories...
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="p-12 border border-dashed border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white shadow-xs py-24">
              No active subject teacher allocations mapped to your profile matrix yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {assignedCourses.map((course, idx) => {
                const style = folderCardStyles[idx % folderCardStyles.length];
                const isFirstCard = idx === 0;

                return (
                  <div 
                    key={course.assignmentId}
                    onClick={() => handleSetFolderContext(course)}
                    className={`${style.bg} border ${style.border} rounded-2xl p-5 hover:shadow-sm cursor-pointer group transition-all duration-200 flex flex-col justify-between h-44 relative overflow-hidden`}
                  >
                    {isFirstCard && (
                      <div className="absolute top-3 right-3 pointer-events-none opacity-95">
                        <img 
                          src="/folder-character.png" 
                          alt="Folder Character" 
                          className="w-16 h-16 object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div className="space-y-2 text-left">
                      <div className={`w-9 h-9 bg-white/80 border ${style.border} rounded-xl flex items-center justify-center ${style.iconColor} shadow-2xs`}>
                        <Folder className="w-4 h-4 fill-current opacity-20" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#7C6B93] block uppercase tracking-wider">{course.code} . {course.classGroup}</span>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight mt-0.5">{course.name}</h4>
                      </div>
                    </div>

                    <div className="border-t border-black/5 pt-2.5 flex justify-between items-center text-[10px] font-black text-slate-700 font-mono uppercase tracking-wide">
                      <span>MANAGE FOLDER CONTENTS</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-stretch">
          
          <section className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col justify-between shadow-xs text-left">
            <form onSubmit={handleOpenInitModal} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2D5F8]/60 pb-3 mb-2">
                <FileText className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider font-mono">CREATE NEW TEST LINK</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">TARGET SUBJECT CLASS</label>
                <div className="px-3.5 py-3 bg-white border border-[#E2D5F8] text-xs font-black text-slate-900 rounded-xl uppercase font-mono shadow-2xs">
                  {activeCourseFolder.name} ({activeCourseFolder.classGroup})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">ASSESSMENT SLOT LABEL</label>
                <div className="relative">
                  <select 
                    value={assessmentType} 
                    onChange={(e) => setAssessmentType(e.target.value)} 
                    disabled={allSlotsTaken}
                    className="w-full px-3.5 py-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs appearance-none pr-8 uppercase"
                  >
                    {baseAvailableSlots.map((slot) => {
                      const isCreated = assessmentsRegistry.some(asm => asm.type === slot.value && asm.courseId === activeCourseFolder.id);
                      return (
                        <option key={slot.value} value={slot.value} disabled={isCreated} className="font-bold uppercase">
                          {slot.label} {isCreated ? '— (CREATED)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Test Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="12" 
                      value={durationHours} 
                      onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value || 0, 10)))}
                      className="w-full px-3.5 py-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs text-center font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-black">HR</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="59" 
                      step="5" 
                      value={durationMinutes} 
                      onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value || 0, 10)))}
                      className="w-full px-3.5 py-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs text-center font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-black">MIN</span>
                  </div>
                </div>
              </div>
            </form>

            <button 
              type="button" 
              onClick={handleOpenInitModal} 
              disabled={allSlotsTaken}
              className="w-full py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all mt-6 flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {allSlotsTaken ? 'All Folders Populated' : 'SET TEST'}
            </button>
          </section>

          <section className="lg:col-span-2 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col justify-between shadow-xs overflow-hidden text-left">
            <div className="w-full h-full flex flex-col overflow-hidden">
              
              <div className="mb-4 pb-3 border-b border-[#E2D5F8]/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider font-mono">CONTINUOUS ASSESSMENT DISTRIBUTION MATRIX</span>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">{activeCourseFolder.name} ASSESSMENT INDEX</h3>
                </div>

                <button 
                  onClick={() => onNavigateToGradebook(activeCourseFolder)}
                  className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" /> COURSE MARKS SPREADSHEET
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoadingSlots ? (
                  <div className="p-12 border border-dashed border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white/60 shadow-xs py-24 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" /> Synchronizing active test tokens folder ledger...
                  </div>
                ) : openFolderSlots.length === 0 ? (
                  <div className="p-12 bg-white border border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase shadow-2xs py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-24 opacity-90 flex items-center justify-center">
                      <img 
                        src="/thinking-character.png" 
                        alt="Thinking Character" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-800">NO INDIVIDUAL TEST ENVELOPES CONFIGURED IN THIS SUBJECT DIRECTORY PATH YET.</span>
                  </div>
                ) : (
                  openFolderSlots.map((asm, idx) => (
                    <div key={asm.id || idx} className="p-4 bg-white border border-[#E2D5F8] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-[#7C3AED] transition-all gap-3 shadow-2xs">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black border border-[#E2D5F8] px-2 py-0.5 rounded-lg bg-[#FAF9FA] text-slate-800 uppercase tracking-wide">{asm.type}</span>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activeCourseFolder.name} Test File</h4>
                        </div>
                        <p className="text-[11px] font-medium text-[#7C6B93] uppercase tracking-wide">
                          {activeCourseFolder.classGroup} • {asm.totalQuestions || 0} Stored Questions • Timer: <span className="font-mono font-bold text-slate-800 bg-[#FAF9FA] px-1.5 py-0.5 rounded border border-[#E2D5F8]">{formatDisplayDuration(asm.duration)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase font-mono tracking-wider border ${
                          asm.status === 'Exam in Progress' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse' :
                          asm.status === 'Pending Admin' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          asm.status === 'Approved' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                          asm.status === 'Finished (Ready to Grade)' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          asm.status === 'Graded' ? 'bg-emerald-600 border-emerald-600 text-white' :
                          asm.status === 'Rejected' ? 'bg-rose-50 border-rose-200 text-[#C62927]' :
                          'bg-[#FAF9FA] border-[#E2D5F8] text-[#7C6B93]'
                        }`}>
                          {asm.status}
                        </span>

                        <div className="flex gap-1.5">
                          {asm.status === 'Exam in Progress' && (
                            <button 
                              onClick={() => onNavigateToMonitor(asm.id)} 
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-[0.96] cursor-pointer"
                            >
                              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Monitor Desks
                            </button>
                          )}

                          {asm.is_teacher_delegated && asm.status !== 'Graded' && asm.status !== 'Exam in Progress' && asm.status !== 'Finished (Ready to Grade)' && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-3 py-1.5 border border-[#E2D5F8] text-slate-700 hover:border-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer">Review Paper</button>
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'start_exam_now', targetId: asm.id })} className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.97] transition-all">
                                <Play className="w-3.5 h-3.5 text-white fill-current" /> Launch Live
                              </button>
                            </>
                          )}

                          {asm.status === 'Approved' && !asm.is_teacher_delegated && (
                            <button onClick={() => onNavigateToBuilder(asm.id)} className="px-3 py-1.5 border border-[#E2D5F8] text-slate-700 hover:border-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer">
                              Review Paper
                            </button>
                          )}

                          {asm.status === 'Finished (Ready to Grade)' && (
                            <button 
                              onClick={() => onNavigateToGrading(asm.id)} 
                              className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-[0.96] cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-white" /> Mark Essays
                            </button>
                          )}

                          {asm.status === 'Graded' && (
                            <button 
                              onClick={() => onNavigateToGrading(asm.id)} 
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.96] cursor-pointer font-mono"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Open Scores
                            </button>
                          )}

                          {(asm.status === 'Draft' || asm.status === 'Rejected') && !asm.is_teacher_delegated && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-3 py-1.5 border border-[#E2D5F8] text-slate-700 hover:border-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer">
                                {asm.status === 'Rejected' ? 'Fix Layout' : 'Compile Quiz'}
                              </button>
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'send_review', targetId: asm.id })} className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer shadow-xs">Submit Paper</button>
                            </>
                          )}

                          {asm.status === 'Pending Admin' && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-3 py-1.5 bg-white border border-[#E2D5F8] text-slate-700 hover:text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer">Preview Paper</button>
                              <span className="text-[10px] font-mono font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">Pending Moderation</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={
          modalConfig.type === 'create_slot' ? "Create Assessment File" : 
          modalConfig.type === 'start_exam_now' ? "Launch Assessment Session Live" : "Lock & Submit Paper"
        }
        message={
          modalConfig.type === 'create_slot' ? `Confirm creation of a new, blank ${assessmentType} testing folder for this cohort?` : 
          modalConfig.type === 'start_exam_now' ? "ATTENTION SUPERVISOR: This activates the examination session instantly on the school network. Authorized students will be allowed entry on their local computer workstations right away." :
          "Are you sure you want to finish drafting this paper and submit it for administrative review? This will lock modification features until approved."
        }
        confirmLabel={modalConfig.type === 'create_slot' ? "Create Assessment" : modalConfig.type === 'start_exam_now' ? "Launch Test Package" : "Submit for Approval"} 
        cancelLabel="Cancel Action"
        onConfirm={handleModalConfirm}
        onCancel={() => setModalConfig({ isOpen: false, type: null, targetId: null })}
        summaryData={
          modalConfig.type === 'create_slot' ? { "Class Group Folder": activeCourseFolder?.classGroup, "Assessment Slot": assessmentType } : 
          modalConfig.type === 'start_exam_now' ? { "Authorization Level": "BROADCAST_LAUNCH_TRIGGER", "Workstation Rule": "Grants Student Computer Entry" } :
          { "Forward Destination": "Administrative Review Desk Queue", "Editing Constraints": "Restricts Question Editor Canvas Changes" }
        }
      />

      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end w-full ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-[#C62927] p-4 md:p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full select-none text-left">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-rose-50 text-[#C62927] border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Revoke Administrative Session Token?</h3>
                <p className="text-[10px] font-bold text-[#9A87A9] uppercase mt-0.5 tracking-wide font-mono">Signing out terminates active management control feeds immediately.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto font-sans border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 justify-end">
              <button onClick={() => setShowLogoutDrawer(false)} className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-lg cursor-pointer transition-all text-center">Cancel Actions</button>
              <button onClick={onLogOut} className="px-5 py-2.5 bg-[#2A1A63] text-white text-xs font-bold uppercase rounded-lg shadow-md cursor-pointer font-mono text-center">Confirm Logout</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}