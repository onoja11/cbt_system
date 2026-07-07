import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Activity, 
  CheckSquare, 
  Send, 
  FileText, 
  FileSpreadsheet, 
  ArrowLeft, 
  Folder, 
  ChevronRight, 
  Eye, 
  LogOut, 
  ShieldAlert, 
  AlertTriangle, 
  Play, 
  Layers,
  Loader2 // 💡 FIXED: Added missing Loader2 token register here
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
  // 🔐 CONTROL LAYER STATES
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);
  const [activeCourseFolder, setActiveCourseFolder] = useState(initialFolderContext || null);
  
  // 📁 LIVE DATABASE CONTAINER DATA STORES
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [assessmentsRegistry, setAssessmentsRegistry] = useState([]);
  
  // ⏳ LOADING SPINNER INDICATORS
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // ⚙️ MODAL LOCAL FORMS MEMORY PIPES
  const [assessmentType, setAssessmentType] = useState('CA 1');
  const [durationWindow, setDurationWindow] = useState('30');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, targetId: null });

  // 🚨 INLINE NOTIFICATION STATES
  const [notification, setNotification] = useState({ isVisible: false, type: 'error', message: '' });

  // Available school testing slots matrix
  const baseAvailableSlots = [
    { value: 'CA 1', label: 'Continuous Assessment 1 (CA 1)' },
    { value: 'CA 2', label: 'Continuous Assessment 2 (CA 2)' },
    { value: 'CA 3 Obj', label: 'Continuous Assessment 3 Objective (CA 3 Obj)' },
    { value: 'CA 3 Theory', label: 'Continuous Assessment 3 Theory (CA 3 Theory)' },
    { value: 'Exam', label: 'Terminal Examination Paper' }
  ];

  const triggerBannerAlert = (message, type = 'error') => {
    setNotification({ isVisible: true, type, message });
    setTimeout(() => {
      setNotification({ isVisible: false, type: 'error', message: '' });
    }, 5000);
  };

  // ─────────────────────────────────────────────────────────────────
  // EFFECT HOOK: Ingest Teacher's Assigned Classes On Mount
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // BACK-NAV FIX HOOK: Auto-Sync Content on Reverse Layout Transitions
  // ─────────────────────────────────────────────────────────────────
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
  }, [activeCourseFolder]);

  // ─────────────────────────────────────────────────────────────────
  // ACTION HANDLER: Sync Assessment Slots on Subject Card Click
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // MODAL INTERACTION CONTROLLERS
  // ─────────────────────────────────────────────────────────────────
  const handleOpenInitModal = (e) => {
    e.preventDefault();
    
    const slotAlreadyExists = assessmentsRegistry.some(asm => asm.type === assessmentType && asm.courseId === activeCourseFolder.id);
    if (slotAlreadyExists) {
      triggerBannerAlert(`A folder setup link for [${assessmentType}] already exists for this class.`, 'warning');
      return;
    }

    setModalConfig({ isOpen: true, type: 'create_slot', targetId: null });
  };

  const handleCreateSlotShell = async () => {
    try {
      const response = await apiRequest('api/v1/teacher/assessments', {
        method: 'POST',
        body: JSON.stringify({
          class_arm_id: activeCourseFolder.id,
          subject_id: activeCourseFolder.subjectId, 
          type: assessmentType,
          duration: parseInt(durationWindow, 10)
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

  const openFolderSlots = assessmentsRegistry.filter(asm => asm.courseId === activeCourseFolder?.id);
  const allSlotsTaken = baseAvailableSlots.every(slot => assessmentsRegistry.some(asm => asm.type === slot.value && asm.courseId === activeCourseFolder?.id));

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none relative text-[#2A1A63] font-sans w-full overflow-x-hidden">
      
      {/* MANAGEMENT WORKSPACE HEADER */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {activeCourseFolder && (
              <button 
                onClick={() => handleSetFolderContext(null)}
                className="p-1.5 border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] hover:bg-[#FAF9FA] cursor-pointer mr-1 transition-all active:scale-[0.95]"
                title="Back to Assigned Classes"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="mr-1 shrink-0">
              <Logo size={45} showText={false} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Staff Dashboard Workspace</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] mt-0.5 uppercase font-mono">Teacher: {teacher?.name || "Ochigbo Godswill"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-black text-[#9A87A9] uppercase bg-[#FAF9FA] border border-[#9A87A9]/20 px-2.5 py-0.5 rounded-md hidden sm:inline-block">SCHOOL NETWORK ONLINE</span>
            <button 
              onClick={() => setShowLogoutDrawer(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-rose-200 bg-rose-50/60 text-[#C62927] hover:bg-[#C62927] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-[0.95] shadow-3xs"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* POPUP ACTION FEED ALERT TOASTS */}
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

      {/* VIEW LAYER 1: ROSTER CLASSES GRID CHANNELS */}
      {!activeCourseFolder ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
          <div className="mb-6 text-left">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Your Allocated Classes</h3>
            <p className="text-xs text-[#9A87A9] font-medium mt-0.5">Select an individual subject path folder to manage continuous assessment questions or review score reports.</p>
          </div>

          {isLoadingFolders ? (
            <div className="p-12 border border-dashed border-[#9A87A9]/30 rounded-xl text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white shadow-3xs py-24 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#2A1A63]" /> Loading allocated subject directories...
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="p-12 border border-dashed border-[#9A87A9]/30 rounded-xl text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white shadow-3xs py-24">
              No active subject teacher allocations mapped to your profile matrix yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {assignedCourses.map((course) => (
                <div 
                  key={course.assignmentId}
                  onClick={() => handleSetFolderContext(course)}
                  className="bg-white border border-[#9A87A9]/20 rounded-xl p-5 hover:border-[#2A1A63] cursor-pointer group transition-all duration-200 flex flex-col justify-between h-44 shadow-3xs"
                >
                  <div className="space-y-2 text-left">
                    <div className="w-9 h-9 bg-[#FAF9FA] border border-[#9A87A9]/20 rounded-lg flex items-center justify-center text-[#9A87A9] group-hover:bg-[#2A1A63] group-hover:text-white transition-all shadow-3xs">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-black text-[#9A87A9] block">{course.code} • {course.classGroup}</span>
                      <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight mt-0.5">{course.name}</h4>
                    </div>
                  </div>

                  <div className="border-t border-[#FAF9FA] pt-3 flex justify-between items-center text-[11px] font-black text-[#9A87A9] font-mono uppercase tracking-wide">
                    <span>Manage Folder Contents</span>
                    <ChevronRight className="w-4 h-4 text-[#9A87A9] group-hover:text-[#2A1A63] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        
        /* VIEW LAYER 2: ASSESSMENT ENVELOPES DEEP DIVE */
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-stretch">
          
          <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 flex flex-col justify-between shadow-3xs h-[520px] text-left">
            <form onSubmit={handleOpenInitModal} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#FAF9FA] pb-2.5 mb-2">
                <FileText className="w-4 h-4 text-[#9A87A9]" />
                <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Create New Test Link</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1 font-mono">Target Subject Class</label>
                <div className="px-3 py-2 bg-[#FAF9FA] border border-[#9A87A9]/20 text-xs font-black text-slate-950 rounded-lg uppercase font-mono">
                  {activeCourseFolder.name} ({activeCourseFolder.classGroup})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Assessment Slot Label</label>
                <select 
                  value={assessmentType} 
                  onChange={(e) => setAssessmentType(e.target.value)} 
                  disabled={allSlotsTaken}
                  className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 rounded-lg focus:outline-none focus:border-[#2A1A63] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs"
                >
                  {baseAvailableSlots.map((slot) => {
                    const isCreated = assessmentsRegistry.some(asm => asm.type === slot.value && asm.courseId === activeCourseFolder.id);
                    return (
                      <option key={slot.value} value={slot.value} disabled={isCreated} className="font-bold">
                        {slot.label} {isCreated ? '— (CREATED)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Allowed Duration</label>
                <select value={durationWindow} onChange={(e) => setDurationWindow(e.target.value)} className="w-full px-3 py-2 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 rounded-lg focus:outline-none focus:border-[#2A1A63] shadow-3xs cursor-pointer font-bold">
                  <option value="30" className="font-bold">30 Minutes Timer Limit</option>
                  <option value="45" className="font-bold">45 Minutes Timer Limit</option>
                  <option value="60" className="font-bold">60 Minutes Timer Limit</option>
                  <option value="90" className="font-bold">90 Minutes Timer Limit</option>
                </select>
              </div>
            </form>

            <button 
              type="button" 
              onClick={handleOpenInitModal} 
              disabled={allSlotsTaken}
              className="w-full py-3 bg-[#2A1A63] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all mt-4 flex items-center justify-center gap-1 shadow-md cursor-pointer active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> {allSlotsTaken ? 'All Folders Populated' : 'Initialize Test Package'}
            </button>
          </section>

          <section className="lg:col-span-2 bg-white border border-[#9A87A9]/30 rounded-xl p-5 flex flex-col justify-between shadow-3xs h-[520px] overflow-hidden text-left">
            <div className="w-full h-full flex flex-col overflow-hidden">
              
              <div className="mb-4 pb-2 border-b border-[#FAF9FA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Continuous Assessment Distribution Matrix</span>
                  <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">{activeCourseFolder.name} Assessment Index</h3>
                </div>

                <button 
                  onClick={() => onNavigateToGradebook(activeCourseFolder)}
                  className="px-3.5 py-2 bg-[#2A1A63] text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#FAF9FA]" /> Course Marks Spreadsheet
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {isLoadingSlots ? (
                  <div className="p-12 border border-dashed border-[#9A87A9]/30 rounded-xl text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white shadow-3xs py-24 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2A1A63]" /> Synchronizing active test tokens folder ledger...
                  </div>
                ) : openFolderSlots.length === 0 ? (
                  <div className="p-12 border border-dashed border-[#9A87A9]/30 rounded-xl text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white shadow-3xs py-24">
                    No individual test envelopes configured in this subject directory path yet.
                  </div>
                ) : (
                  openFolderSlots.map((asm, idx) => (
                    <div key={asm.id || idx} className="p-4 border border-[#9A87A9]/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white hover:border-[#9A87A9]/50 transition-all gap-3 shadow-3xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black x-track border px-1.5 py-0.5 rounded bg-[#FAF9FA] text-slate-700 uppercase tracking-wide">{asm.type}</span>
                          <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">{activeCourseFolder.name} Test File</h4>
                        </div>
                        <p className="text-[11px] font-medium text-[#9A87A9] uppercase tracking-wide">{activeCourseFolder.classGroup} • {asm.totalQuestions || 0} Stored Questions • Timer: <span className="font-mono font-bold text-slate-800 bg-[#FAF9FA] px-1 rounded">{asm.duration} Mins</span></p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase font-mono tracking-wider border ${
                          asm.status === 'Exam in Progress' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse' :
                          asm.status === 'Pending Admin' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          asm.status === 'Approved' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                          asm.status === 'Finished (Ready to Grade)' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          asm.status === 'Graded' ? 'bg-emerald-600 border-emerald-600 text-white' :
                          'bg-[#FAF9FA] border-[#9A87A9]/20 text-[#9A87A9]'
                        }`}>
                          {asm.status}
                        </span>

                        <div className="flex gap-1.5">
                          {asm.status === 'Exam in Progress' && (
                            <button 
                              onClick={() => onNavigateToMonitor(asm.id)} 
                              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-md transition-all active:scale-[0.96] cursor-pointer"
                            >
                              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Monitor Desks
                            </button>
                          )}

                          {asm.status === 'Approved' && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-2.5 py-1.5 border border-[#9A87A9]/30 text-slate-700 hover:border-slate-950 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer">Review Paper</button>
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'start_exam_now', targetId: asm.id })} className="px-3 py-1.5 bg-[#2A1A63] text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer active:scale-[0.97] transition-all">
                                <Play className="w-3.5 h-3.5 text-white fill-current" /> Launch Live
                              </button>
                            </>
                          )}

                          {asm.status === 'Finished (Ready to Grade)' && (
                            <button 
                              onClick={() => onNavigateToGrading(asm.id)} 
                              className="px-3 py-1.5 bg-[#2A1A63] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-md transition-all active:scale-[0.96] cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-white" /> Mark Essays
                            </button>
                          )}

                          {asm.status === 'Graded' && (
                            <button 
                              onClick={() => onNavigateToGradebook(activeCourseFolder)} 
                              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-[0.96] cursor-pointer font-mono"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Open Scores
                            </button>
                          )}

                          {asm.status === 'Draft' && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-2.5 py-1.5 border border-[#9A87A9]/30 text-slate-700 hover:border-slate-950 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer">Compile Quiz</button>
                              <button onClick={() => setModalConfig({ isOpen: true, type: 'send_review', targetId: asm.id })} className="px-2.5 py-1.5 bg-[#2A1A63] text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer shadow-md">Submit Paper</button>
                            </>
                          )}

                          {asm.status === 'Pending Admin' && (
                            <>
                              <button onClick={() => onNavigateToBuilder(asm.id)} className="px-2.5 py-1.5 bg-[#FAF9FA] border border-[#9A87A9]/30 text-[#9A87A9] hover:text-[#2A1A63] text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer">Preview Paper</button>
                              <span className="text-[10px] font-mono font-black text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg">Pending Moderation</span>
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

      {/* CONFIRMATION SYSTEM MODALS OVERLAYS */}
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
        confirmLabel={modalConfig.type === 'create_slot' ? "Create Assessment" : modalConfig.type === 'start_exam_now' ? "Launch Test Package" : "Submit for Approval"} cancelLabel="Cancel Action"
        onConfirm={async () => {
          if (modalConfig.type === 'create_slot') {
            await handleCreateSlotShell();
          } else if (modalConfig.type === 'send_review') {
            try {
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
            } catch (error) { 
              console.error(error); 
              triggerBannerAlert("Connection failed. Could not transmit approval request.");
            } finally {
              setModalConfig({ isOpen: false, type: null, targetId: null });
            }
          } else if (modalConfig.type === 'start_exam_now') {
            try {
              const response = await apiRequest(`api/v1/teacher/assessments/${modalConfig.targetId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'Exam in Progress' })
              });
              const data = await response.json();

              if (response.status === 422 && data.status === 'CLASS_ALREADY_RUNNING') {
                triggerBannerAlert(data.message, 'warning');
                return;
              }

              if (response.ok && data.status === 'SUCCESS') {
                setAssessmentsRegistry(prev => prev.map(asm => asm.id === modalConfig.targetId ? { ...asm, status: 'Exam in Progress' } : asm));
                triggerBannerAlert("CBT Session Activated! Monitoring room is now live.", "success");
              } else {
                triggerBannerAlert(data.message || "Failed to trigger examination runtime session.");
              }
            } catch (error) {
              console.error(error);
              triggerBannerAlert("Failed to transmit system activation command.");
            } finally {
              setModalConfig({ isOpen: false, type: null, targetId: null });
            }
          }
        }}
        onCancel={() => setModalConfig({ isOpen: false, type: null, targetId: null })}
        summaryData={
          modalConfig.type === 'create_slot' ? { "Class Group Folder": activeCourseFolder?.classGroup, "Assessment Slot": assessmentType } : 
          modalConfig.type === 'start_exam_now' ? { "Authorization Level": "BROADCAST_LAUNCH_TRIGGER", "Workstation Rule": "Grants Student Computer Entry" } :
          { "Forward Destination": "Administrative Review Desk Queue", "Editing Constraints": "Restricts Question Editor Canvas Changes" }
        }
      />

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Corporate Intranet School Management Cluster
      </footer>

      {/* PRIVILEGE TERMINATION DRAWER MODAL OVERLAY */}
      <div className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-[#C62927] p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-rose-50 text-[#C62927] border border-rose-100 rounded-lg flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">Disconnect Dashboard Session?</h3>
                <p className="text-[10px] font-bold text-[#9A87A9] uppercase mt-0.5 tracking-wide">Signing out will close down your current class and question marking pipelines immediately.</p>
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto font-sans justify-end">
              <button 
                onClick={() => setShowLogoutDrawer(false)}
                className="px-6 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all active:scale-[0.98]"
              >
                Go Back
              </button>
              <button 
                onClick={onLogOut}
                className="px-6 py-2.5 bg-[#2A1A63] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all font-mono active:scale-[0.98]"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}