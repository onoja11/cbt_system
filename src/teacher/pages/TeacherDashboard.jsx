import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Folder, ArrowLeft, ChevronRight, LogOut, ShieldAlert, 
  Loader2, FileSpreadsheet, Plus, Clock, Activity, CheckSquare, Play, Layers, FileText, ChevronDown, AlertTriangle, Users, Check, X, Search, CalendarDays, UserCheck 
} from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

// -----------------------------------------------------------------------------
// 🧠 FRONTEND IN-MEMORY CACHE STORES
// -----------------------------------------------------------------------------
const frontendCache = {
  folders: null, // { timestamp, data }
  assessments: new Map(), // key: "classArmId_subjectId" => { timestamp, data }
  roster: new Map(), // key: assessmentId => { timestamp, data }
  TTL_MS: 300000, // 5 minutes default TTL for static views

  clearAssessments(classArmId, subjectId) {
    if (classArmId && subjectId) {
      this.assessments.delete(`${classArmId}_${subjectId}`);
    } else {
      this.assessments.clear();
    }
  },

  clearRoster(assessmentId) {
    if (assessmentId) {
      this.roster.delete(assessmentId);
    } else {
      this.roster.clear();
    }
  }
};

// 🎓 EMBEDDED STUDENT ROSTER & ALLOWLIST MANAGER COMPONENT
const StudentRosterModal = React.memo(function StudentRosterModal({ assessmentId, isOpen, onClose, onRosterSaved }) {
  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoster = useCallback(async (forceRefresh = false) => {
    if (!assessmentId) return;

    // Check frontend cache first
    const cachedRoster = frontendCache.roster.get(assessmentId);
    const isCacheValid = cachedRoster && (Date.now() - cachedRoster.timestamp < frontendCache.TTL_MS);

    if (!forceRefresh && isCacheValid) {
      setRoster(cachedRoster.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/roster`, { method: 'GET' });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        const rosterData = data.roster || [];
        setRoster(rosterData);
        frontendCache.roster.set(assessmentId, { timestamp: Date.now(), data: rosterData });
      }
    } catch (err) {
      console.error("Failed to load student roster:", err);
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchRoster();
    }
  }, [isOpen, assessmentId, fetchRoster]);

  const handleToggleStudent = useCallback((studentProfileId) => {
    setRoster(prev => prev.map(student => {
      if (student.student_profile_id === studentProfileId) {
        return { ...student, is_allowed: !student.is_allowed };
      }
      return student;
    }));
  }, []);

  const handleSelectAll = useCallback((status) => {
    setRoster(prev => prev.map(student => ({ ...student, is_allowed: status })));
  }, []);

  const handleSaveRosterAndLaunch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const allowedIds = roster.filter(s => s.is_allowed).map(s => s.student_profile_id);
      
      const res = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ student_profile_ids: allowedIds })
      });

      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        // Invalidate roster cache on successful mutation
        frontendCache.clearRoster(assessmentId);

        const launchRes = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/status`, { 
          method: 'PATCH',
          body: JSON.stringify({ status: 'Exam in Progress' })
        });
        
        const launchData = await launchRes.json();

        if (launchRes.ok && launchData.status === 'SUCCESS') {
          onRosterSaved({ success: true, message: "Roster saved & exam session is now live!" });
          onClose();
        } else {
          const errorMsg = launchData.message || "Failed to initiate live start sequence.";
          onRosterSaved({ success: false, message: errorMsg });
          onClose();
        }
      } else {
        const errorMsg = data.message || "Failed to update student roster.";
        onRosterSaved({ success: false, message: errorMsg });
        onClose();
      }
    } catch (err) {
      console.error("Failed to save roster and launch:", err);
      onRosterSaved({ success: false, message: "Network communication error during live launch sequence." });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return roster;
    return roster.filter(s => 
      s.student_name.toLowerCase().includes(query) ||
      (s.admission_no && s.admission_no.toLowerCase().includes(query))
    );
  }, [roster, searchQuery]);

  const allowedCount = useMemo(() => roster.filter(s => s.is_allowed).length, [roster]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E2D5F8] overflow-hidden flex flex-col max-h-[85vh] font-sans">
        
        <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Exam Roster & Allowlist Manager</h3>
              <p className="text-[10px] font-mono text-purple-100 uppercase tracking-widest mt-0.5">
                Cleared Candidates: {allowedCount} / {roster.length} Selected
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSaving} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center cursor-pointer transition-all disabled:opacity-50">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-4 sm:p-5 border-b border-[#E2D5F8]/60 bg-[#F7F5FC] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 font-mono">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search candidate name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2D5F8] rounded-xl text-xs font-sans font-semibold text-slate-800 focus:outline-none focus:border-[#7C3AED] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button onClick={() => handleSelectAll(true)} className="px-3 py-1.5 bg-white border border-[#E2D5F8] text-[10px] font-black uppercase text-[#7C3AED] rounded-xl hover:bg-purple-50 cursor-pointer shadow-2xs">Select All</button>
            <button onClick={() => handleSelectAll(false)} className="px-3 py-1.5 bg-white border border-[#E2D5F8] text-[10px] font-black uppercase text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer shadow-2xs">Deselect All</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 font-mono text-xs uppercase text-[#7C6B93]">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Loading student roster class matrix...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center font-mono text-xs uppercase text-[#7C6B93]">No candidate records matched your search query.</div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.student_profile_id}
                onClick={() => handleToggleStudent(student.student_profile_id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer shadow-2xs ${
                  student.is_allowed ? 'bg-purple-50/60 border-purple-200 text-slate-900 font-bold' : 'bg-white border-[#E2D5F8] text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${student.is_allowed ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-white border-[#E2D5F8]'}`}>
                    {student.is_allowed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight font-sans text-slate-900">{student.student_name}</p>
                    <p className="text-[10px] font-mono text-[#7C6B93] uppercase tracking-wider">{student.admission_no || 'NO ADMISSION ID'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider ${student.is_allowed ? 'bg-purple-100 text-[#7C3AED]' : 'bg-slate-100 text-slate-500'}`}>
                  {student.is_allowed ? 'Cleared' : 'Restricted'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-[#E2D5F8]/60 bg-[#F7F5FC] flex justify-end gap-3 font-mono shrink-0">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs disabled:opacity-50">Cancel</button>
          <button disabled={isSaving} onClick={handleSaveRosterAndLaunch} className="px-6 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.97] disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Play className="w-4 h-4 fill-current shrink-0" />} 
            {isSaving ? 'Launching...' : 'Save Roster & Launch Live Exam'}
          </button>
        </div>

      </div>
    </div>
  );
});

// 🏫 TEACHER DASHBOARD COMPONENT
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const [rosterModalAssessmentId, setRosterModalAssessmentId] = useState(null);

  const baseAvailableSlots = useMemo(() => [
    { value: 'CA 1', label: 'CONTINUOUS ASSESSMENT 1 (CA 1)' },
    { value: 'Exam', label: 'TERMINAL EXAMINATION PAPER' }
  ], []);

  const folderCardStyles = useMemo(() => [
    { bg: 'bg-[#F3EEFC]', border: 'border-[#E2D5F8]', iconColor: 'text-[#7C3AED]' },
    { bg: 'bg-[#FCE7EE]', border: 'border-[#F8D3DF]', iconColor: 'text-[#E11D48]' },
    { bg: 'bg-[#EBFBF3]', border: 'border-[#C6F6D5]', iconColor: 'text-[#059669]' },
    { bg: 'bg-[#FFFBEB]', border: 'border-[#FEF3C7]', iconColor: 'text-[#D97706]' }
  ], []);

  const triggerBannerAlert = useCallback((message, type = 'error') => {
    setNotification({ isVisible: true, type, message });
    setTimeout(() => {
      setNotification({ isVisible: false, type: 'error', message: '' });
    }, 5000);
  }, []);

  // Fetch allocated folders on mount (with Frontend Caching)
  useEffect(() => {
    let isMounted = true;

    const fetchAllocatedFolders = async () => {
      // Return cached folders if valid
      if (frontendCache.folders && (Date.now() - frontendCache.folders.timestamp < frontendCache.TTL_MS)) {
        if (isMounted) {
          setAssignedCourses(frontendCache.folders.data);
          setIsLoadingFolders(false);
        }
        return;
      }

      try {
        const response = await apiRequest('api/v1/teacher/folders', { method: 'GET' });
        const data = await response.json();

        if (isMounted && response.ok && data.status === 'SUCCESS') {
          const formattedCourses = data.folders.map(folder => ({
            id: folder.class_arm_id, 
            assignmentId: folder.assignment_id,
            subjectId: folder.subject_id, 
            name: folder.subject_name,
            classGroup: folder.class_arm_name,
            code: folder.subject_name.substring(0, 3) + ' ' + (300 + folder.assignment_id)
          }));

          frontendCache.folders = { timestamp: Date.now(), data: formattedCourses };
          setAssignedCourses(formattedCourses);
        }
      } catch (error) {
        console.error("❌ [TEACHER ALLOCATION INGESTION FAULT]:", error);
      } finally {
        if (isMounted) setIsLoadingFolders(false);
      }
    };

    fetchAllocatedFolders();
    return () => { isMounted = false; };
  }, []);

  // Load Folder Assessments (with Cache-First Strategy & Invalidation Support)
  const loadFolderAssessments = useCallback(async (folder, forceRefresh = false) => {
    if (!folder || !folder.id || !folder.subjectId) return;

    const cacheKey = `${folder.id}_${folder.subjectId}`;
    const cachedData = frontendCache.assessments.get(cacheKey);
    const isCacheValid = cachedData && (Date.now() - cachedData.timestamp < frontendCache.TTL_MS);

    if (!forceRefresh && isCacheValid) {
      setAssessmentsRegistry(cachedData.data);
      const createdTypes = cachedData.data.map(a => a.type);
      const firstAvailable = baseAvailableSlots.find(slot => !createdTypes.includes(slot.value));
      if (firstAvailable) setAssessmentType(firstAvailable.value);
      setIsLoadingSlots(false);
      return;
    }

    setIsLoadingSlots(true);
    try {
      const response = await apiRequest(`api/v1/teacher/folders/${folder.id}/assessments?subject_id=${folder.subjectId}`, { method: 'GET' });
      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        const assessmentsList = data.assessments || [];
        setAssessmentsRegistry(assessmentsList);

        // Store in frontend state cache
        frontendCache.assessments.set(cacheKey, { timestamp: Date.now(), data: assessmentsList });
        
        const createdTypes = assessmentsList.map(a => a.type);
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
  }, [baseAvailableSlots]);

  // Synchronize folder context
  useEffect(() => {
    if (activeCourseFolder) {
      loadFolderAssessments(activeCourseFolder);
    }
  }, [activeCourseFolder, loadFolderAssessments]);

  const handleSetFolderContext = useCallback((folder) => {
    setActiveCourseFolder(folder);
    onFolderContextChange(folder);
    if (!folder) {
      setAssessmentsRegistry([]);
    }
  }, [onFolderContextChange]);

  const handleOpenInitModal = (e) => {
    if (e) e.preventDefault();
    if (!activeCourseFolder) return;

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
        // Clear frontend assessments cache for this folder so fresh data will be retrieved
        frontendCache.clearAssessments(activeCourseFolder.id, activeCourseFolder.subjectId);

        const updatedList = [...assessmentsRegistry, data.assessment];
        setAssessmentsRegistry(updatedList);
        triggerBannerAlert(`Assessment envelope [${assessmentType}] initialized successfully.`, 'success');
        
        const createdTypes = updatedList.map(a => a.type);
        const nextAvailable = baseAvailableSlots.find(slot => !createdTypes.includes(slot.value));
        if (nextAvailable) {
          setAssessmentType(nextAvailable.value);
        }
      } else {
        triggerBannerAlert(data.message || "Failed to create assessment folder link.", "error");
      }
    } catch (error) {
      console.error(error);
      triggerBannerAlert("Network communication fault occurred: " + error.message, "error");
    } finally {
      setModalConfig({ isOpen: false, type: null, targetId: null });
    }
  };

  const handleModalConfirm = async () => {
    if (isProcessing) return;
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
          // Clear cache on status transition
          frontendCache.clearAssessments(activeCourseFolder?.id, activeCourseFolder?.subjectId);
          setAssessmentsRegistry(prev => prev.map(asm => asm.id === modalConfig.targetId ? { ...asm, status: 'Pending Admin' } : asm));
          triggerBannerAlert("Question sheet locked and dispatched to admin queue.", "success");
        } else {
          triggerBannerAlert(data.message || "Failed to submit assessment to administrative queue.");
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

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (onLogOut) await onLogOut();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDrawer(false);
    }
  };

  const openFolderSlots = useMemo(() => 
    assessmentsRegistry.filter(asm => asm.courseId === activeCourseFolder?.id),
    [assessmentsRegistry, activeCourseFolder]
  );

  const allSlotsTaken = useMemo(() => 
    baseAvailableSlots.every(slot => assessmentsRegistry.some(asm => asm.type === slot.value && asm.courseId === activeCourseFolder?.id)),
    [baseAvailableSlots, assessmentsRegistry, activeCourseFolder]
  );

  const isClassCurrentlyRunningAssessment = useMemo(() => 
    openFolderSlots.some(asm => asm.status === 'Exam in Progress'),
    [openFolderSlots]
  );

  const formatDisplayDuration = useCallback((rawMinutes) => {
    const mins = parseInt(rawMinutes, 10) || 30;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? 's' : ''}`;
    }
    return `${mins} Mins`;
  }, []);

  const dynamicConfirmLabel = isProcessing ? (
    <span className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      <span>Processing...</span>
    </span>
  ) : (
    modalConfig.type === 'create_slot' ? "Create Assessment" : "Submit for Approval"
  );

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none relative text-[#2A1A63] font-sans w-full overflow-x-hidden">
      
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          {activeCourseFolder ? (
            <button 
              onClick={() => handleSetFolderContext(null)}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1"
              title="Back to Allocated Classes"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-black uppercase tracking-wider text-white">START-RITE WORKSPACE</h2>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Teacher: {teacher?.name || "STAFF MEMBER"}</p>
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
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 my-auto flex flex-col justify-start">
          <div className="mb-6 text-left">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">YOUR ALLOCATED CLASSES</h3>
            <p className="text-xs text-[#7C6B93] font-medium mt-1">Select an individual subject path folder to manage continuous assessment questions or review score reports.</p>
          </div>

          {isLoadingFolders ? (
            <div className="p-12 border border-dashed border-[#E2D5F8] rounded-3xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white shadow-xs py-24 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" /> Loading allocated subject directories...
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="p-12 border border-dashed border-[#E2D5F8] rounded-3xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white shadow-xs py-24">
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
                    className={`${style.bg} border ${style.border} rounded-3xl p-5 hover:shadow-md cursor-pointer group transition-all duration-200 flex flex-col justify-between h-44 relative overflow-hidden`}
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto items-start">
          
          {/* LEFT COLUMN: CREATE TEST FORM */}
          <section className="lg:col-span-4 bg-white border border-[#E2D5F8] rounded-3xl p-6 shadow-sm flex flex-col justify-between text-left">
            <form onSubmit={handleOpenInitModal} className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-[#E2D5F8]/60 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center border border-purple-100">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-[#7C3AED] uppercase tracking-wider font-mono">CREATE NEW TEST LINK</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Target Subject Class</label>
                <div className="px-4 py-3 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-black text-slate-900 rounded-2xl uppercase font-mono shadow-2xs">
                  {activeCourseFolder.name} ({activeCourseFolder.classGroup})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Assessment Slot Label</label>
                <div className="relative">
                  <select 
                    value={assessmentType} 
                    onChange={(e) => setAssessmentType(e.target.value)} 
                    disabled={allSlotsTaken}
                    className="w-full px-4 py-3 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl focus:outline-none focus:border-[#7C3AED] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs appearance-none pr-8 uppercase"
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
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Test Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="12" 
                      value={durationHours} 
                      onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value || 0, 10)))}
                      className="w-full px-4 py-3 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl focus:outline-none focus:border-[#7C3AED] shadow-2xs text-center font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-black">HR</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="59" 
                      step="5" 
                      value={durationMinutes} 
                      onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value || 0, 10)))}
                      className="w-full px-4 py-3 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-2xl focus:outline-none focus:border-[#7C3AED] shadow-2xs text-center font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-black">MIN</span>
                  </div>
                </div>
              </div>
            </form>

            <button 
              type="button" 
              onClick={handleOpenInitModal} 
              disabled={allSlotsTaken}
              className="w-full py-4 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all mt-8 flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-mono"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> {allSlotsTaken ? 'All Folders Populated' : 'SET TEST'}
            </button>
          </section>

          {/* RIGHT COLUMN: ASSESSMENT INDEX MATRIX */}
          <section className="lg:col-span-8 bg-white border border-[#E2D5F8] rounded-3xl p-6 shadow-sm flex flex-col justify-between text-left">
            <div className="w-full h-full flex flex-col">
              
              <div className="mb-5 pb-4 border-b border-[#E2D5F8]/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider font-mono">CONTINUOUS ASSESSMENT DISTRIBUTION MATRIX</span>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">{activeCourseFolder.name} ASSESSMENT INDEX</h3>
                </div>

                <button 
                  onClick={() => onNavigateToGradebook(activeCourseFolder)}
                  className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer font-mono shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" /> COURSE MARKS SPREADSHEET
                </button>
              </div>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {isLoadingSlots ? (
                  <div className="p-16 border border-dashed border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-[#F7F5FC]/60 shadow-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Synchronizing active test tokens folder ledger...
                  </div>
                ) : openFolderSlots.length === 0 ? (
                  <div className="p-16 bg-[#F7F5FC] border border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase shadow-2xs py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 opacity-90 flex items-center justify-center">
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
                  openFolderSlots.map((asm, idx) => {
                    const hasAdminAccessTime = asm.scheduled_start && asm.scheduled_end;

                    const now = new Date();
                    const startTime = hasAdminAccessTime ? new Date(asm.scheduled_start.replace(' ', 'T')) : null;
                    const endTime = hasAdminAccessTime ? new Date(asm.scheduled_end.replace(' ', 'T')) : null;
                    
                    const isAfterStart = startTime ? now >= startTime : false;
                    const isBeforeEnd = endTime ? now <= endTime : true;
                    const isAccessTimeValid = isAfterStart && isBeforeEnd;

                    return (
                      <div key={asm.id || idx} className="p-5 bg-[#FAF9FA] border border-[#E2D5F8] rounded-2xl flex flex-col gap-4 hover:border-[#7C3AED] transition-all shadow-2xs">
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E2D5F8]/50 pb-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[10px] font-mono font-black border border-[#7C3AED]/30 px-3 py-1 rounded-xl bg-purple-50 text-[#7C3AED] uppercase tracking-wider">{asm.type}</span>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activeCourseFolder.name} Test File</h4>
                          </div>

                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono tracking-wider border shrink-0 ${
                            asm.status === 'Exam in Progress' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse' :
                            asm.status === 'Pending Admin' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            asm.status === 'Approved' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            asm.status === 'Finished (Ready to Grade)' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            asm.status === 'Graded' ? 'bg-emerald-600 border-emerald-600 text-white' :
                            asm.status === 'Rejected' ? 'bg-rose-50 border-rose-200 text-[#C62927]' :
                            'bg-white border-[#E2D5F8] text-[#7C6B93]'
                          }`}>
                            {asm.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#7C6B93] font-mono">
                          <p className="font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                            <span>{activeCourseFolder.classGroup}</span> &bull; 
                            <span className="text-slate-900 font-black">{asm.totalQuestions || 0} Stored Questions</span> &bull; 
                            <span>Timer:</span> 
                            <span className="text-slate-900 bg-white px-2 py-0.5 rounded border border-[#E2D5F8]">{formatDisplayDuration(asm.duration)}</span>
                          </p>
                          {hasAdminAccessTime && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 border border-indigo-200 text-indigo-900 rounded-xl text-[11px] font-black uppercase tracking-tight">
                              <CalendarDays className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                              <span>Access Window: {asm.scheduled_start} to {asm.scheduled_end}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2D5F8]/50 justify-end">
                          
                          {hasAdminAccessTime && asm.status !== 'Exam in Progress' && asm.status !== 'Finished (Ready to Grade)' && asm.status !== 'Graded' && (
                            isAccessTimeValid ? (
                              isClassCurrentlyRunningAssessment ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-black uppercase rounded-xl">
                                    ⚠️ Another Exam Active in Class
                                  </span>
                                  <button 
                                    disabled 
                                    className="px-4 py-2 bg-slate-200 text-slate-400 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-not-allowed font-mono border border-slate-300"
                                    title="Another assessment is currently running for this class."
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" /> Start Exam
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setRosterModalAssessmentId(asm.id)} 
                                  className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.97] transition-all font-mono"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" /> Start Exam (Select Roster)
                                </button>
                              )
                            ) : (
                              <button 
                                disabled 
                                className="px-4 py-2 bg-white text-slate-400 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-not-allowed font-mono border border-slate-200"
                                title="Outside configured access window bounds."
                              >
                                <Clock className="w-3.5 h-3.5" /> Window Inactive
                              </button>
                            )
                          )}

                          {asm.status === 'Exam in Progress' && (
                            <button 
                              onClick={() => setRosterModalAssessmentId(asm.id)} 
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.97] transition-all font-mono"
                              title="Add or manage students in the allowlist roster during active session"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Manage Roster
                            </button>
                          )}

                          {asm.status === 'Exam in Progress' && (
                            <button 
                              onClick={() => onNavigateToMonitor(asm.id)} 
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.96] cursor-pointer font-mono"
                            >
                              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Monitor Desks
                            </button>
                          )}

                          {(asm.status === 'Exam in Progress' || asm.status === 'Finished (Ready to Grade)' || asm.status === 'Graded') && (
                            <button 
                              onClick={() => onNavigateToMonitor(asm.id)} 
                              className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-[#7C3AED] border border-purple-300 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.96] cursor-pointer font-mono"
                              title="Inspect live or historical room telemetry logs"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Exam Logs
                            </button>
                          )}

                          <button onClick={() => onNavigateToBuilder(asm.id)} className="px-3.5 py-2 border border-[#E2D5F8] bg-white text-slate-700 hover:border-slate-900 text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer transition-all font-mono shadow-2xs">
                            {asm.status === 'Rejected' ? 'Fix Layout' : asm.status === 'Draft' ? 'Compile Quiz' : 'Review Paper'}
                          </button>

                          {(asm.status === 'Draft' || asm.status === 'Rejected') && !asm.is_teacher_delegated && (
                            <button onClick={() => setModalConfig({ isOpen: true, type: 'send_review', targetId: asm.id })} className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer shadow-sm transition-all font-mono">
                              Submit Paper
                            </button>
                          )}

                          {asm.status === 'Finished (Ready to Grade)' && (
                            <button 
                              onClick={() => onNavigateToGrading(asm.id)} 
                              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.96] cursor-pointer font-mono"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-white" /> Mark Essays
                            </button>
                          )}

                          {asm.status === 'Graded' && (
                            <button 
                              onClick={() => onNavigateToGrading(asm.id)} 
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.96] cursor-pointer font-mono"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Open Scores
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 🌟 EMBEDDED STUDENT ROSTER MODAL */}
      <StudentRosterModal 
        assessmentId={rosterModalAssessmentId}
        isOpen={!!rosterModalAssessmentId}
        onClose={() => setRosterModalAssessmentId(null)}
        onRosterSaved={(result) => {
          if (result && result.success) {
            triggerBannerAlert(result.message || "Roster saved successfully!", "success");
          } else if (result) {
            triggerBannerAlert(result.message || "Failed to launch exam.", "error");
          }
          if (activeCourseFolder) {
            // Force refresh of folder assessments when exam goes live
            loadFolderAssessments(activeCourseFolder, true);
          }
        }}
      />

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        isConfirming={isProcessing}
        isLoading={isProcessing}
        loading={isProcessing}
        title={
          modalConfig.type === 'create_slot' ? "Create Assessment File" : 
          "Lock & Submit Paper for Moderation"
        }
        message={
          modalConfig.type === 'create_slot' ? `Confirm creation of a new, blank ${assessmentType} testing folder for this subject?` : 
          "Are you sure you want to finish drafting this paper and submit it for administrative review? This will lock modification features until approved."
        }
        confirmLabel={dynamicConfirmLabel} 
        cancelLabel="Cancel Action"
        onConfirm={handleModalConfirm}
        onCancel={() => !isProcessing && setModalConfig({ isOpen: false, type: null, targetId: null })}
        summaryData={
          modalConfig.type === 'create_slot' ? { "Class Group Folder": activeCourseFolder?.classGroup, "Assessment Slot": assessmentType } : 
          { "Forward Destination": "Administrative Review Desk Queue", "Editing Constraints": "Restricts Question Editor Canvas Changes" }
        }
      />

      {/* LOGOUT CONFIRMATION DRAWER */}
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
              <button disabled={isLoggingOut} onClick={() => setShowLogoutDrawer(false)} className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-xs font-bold uppercase rounded-lg cursor-pointer transition-all text-center disabled:opacity-50">Cancel Actions</button>
              <button disabled={isLoggingOut} onClick={handleConfirmLogout} className="px-5 py-2.5 bg-[#2A1A63] text-white text-xs font-bold uppercase rounded-lg shadow-md cursor-pointer font-mono text-center flex items-center gap-2 justify-center disabled:opacity-50">
                {isLoggingOut && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {isLoggingOut ? 'Signing out...' : 'Confirm Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>
    </div>
  );
}