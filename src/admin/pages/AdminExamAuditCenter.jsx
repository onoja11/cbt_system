import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Search, BookOpen, ChevronRight, BarChart3, TrendingUp, TrendingDown, 
  RotateCcw, Loader2, X, ChevronLeft, MoreVertical, Edit3, Trash2, CheckCircle2, 
  AlertCircle, RefreshCw, CheckSquare, Square, Check, AlertTriangle, FileEdit
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';
import GlobalTermFilterBar from '../components/GlobalTermFilterBar';

export default function AdminExamAuditCenter({ onNavigateBack, onNavigateToMarking, adminUser }) {
  const [activeTab, setActiveTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [selectedArmFilter, setSelectedArmFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 15;

  const [assessmentsList, setAssessmentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Deep Inspection Modal State
  const [inspectingAssessment, setInspectingAssessment] = useState(null);
  const [auditDetails, setAuditDetails] = useState(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Multi-Student Selection State for Reset
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Action Loading States
  const [resettingStudentId, setResettingStudentId] = useState(null);
  const [isBatchResetting, setIsBatchResetting] = useState(false);
  const [isResettingEntire, setIsResettingEntire] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Dropdown Menu State
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Category Edit Modal State
  const [editingCategoryAssessment, setEditingCategoryAssessment] = useState(null);
  const [newCategoryValue, setNewCategoryValue] = useState('CA1');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Toast & Confirm Modal States
  const [toastNotification, setToastNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: false
  });

  const [highlightedStudentId, setHighlightedStudentId] = useState(null);
  const studentRowRefs = useRef({});

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Auto-dismiss toast notifications
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const cleanStatus = (status) => String(status || '').trim().toLowerCase();

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

  const fetchMasterAssessments = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const activeSession = localStorage.getItem('admin_filter_session') || '';
      const activeTerm = localStorage.getItem('admin_filter_term') || '';

      let queryParams = `?page=${page}&per_page=${itemsPerPage}`;
      if (activeSession && activeTerm) {
        queryParams += `&session=${encodeURIComponent(activeSession)}&term=${encodeURIComponent(activeTerm)}`;
      }
      if (activeTab !== 'all') {
        queryParams += `&tab=${encodeURIComponent(activeTab)}`;
      }
      if (debouncedSearch) {
        queryParams += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (selectedArmFilter !== 'ALL') {
        queryParams += `&class_arm=${encodeURIComponent(selectedArmFilter)}`;
      }
      if (selectedSubjectFilter !== 'ALL') {
        queryParams += `&subject=${encodeURIComponent(selectedSubjectFilter)}`;
      }
      if (selectedStaffFilter !== 'ALL') {
        queryParams += `&staff=${encodeURIComponent(selectedStaffFilter)}`;
      }

      const res = await apiRequest(`api/v1/admin/audit/assessments-comprehensive${queryParams}`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          const rawList = payload.assessments;
          const fetchedAssessments = Array.isArray(rawList)
            ? rawList
            : (rawList && typeof rawList === 'object' ? Object.values(rawList) : []);

          setAssessmentsList(fetchedAssessments);
          setLastPage(payload.last_page || 1);
          setTotalRecords(payload.total !== undefined ? payload.total : fetchedAssessments.length);
        }
      }
    } catch {
      setToastNotification({ type: 'error', text: 'Failed to synchronize assessment data.' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearch, selectedArmFilter, selectedSubjectFilter, selectedStaffFilter]);

  useEffect(() => {
    fetchMasterAssessments(currentPage);
  }, [currentPage, fetchMasterAssessments]);

  const filterOptions = useMemo(() => {
    const arms = new Set();
    const subjects = new Set();
    const staff = new Set();

    const safeList = Array.isArray(assessmentsList) ? assessmentsList : [];
    safeList.forEach(item => {
      if (item && item.class_arm) arms.add(item.class_arm);
      if (item && item.subject) subjects.add(item.subject);
      if (item && item.teacher_name) staff.add(item.teacher_name);
    });

    return {
      arms: ['ALL', ...Array.from(arms).sort()],
      subjects: ['ALL', ...Array.from(subjects).sort()],
      staff: ['ALL', ...Array.from(staff).sort()]
    };
  }, [assessmentsList]);

  const handleOpenInspectionModal = async (assessment) => {
    setInspectingAssessment(assessment);
    setIsAuditLoading(true);
    setActionMessage(null);
    setHighlightedStudentId(null);
    setSelectedStudentIds([]);

    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${assessment.id}/deep-metrics`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setAuditDetails(payload.data);
        }
      }
    } catch {
      setToastNotification({ type: 'error', text: 'Error loading inspection metrics.' });
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleResetStudentSessions = async (profileIds) => {
    if (!inspectingAssessment || !profileIds || profileIds.length === 0) return;
    
    const isBatch = profileIds.length > 1;
    if (isBatch) setIsBatchResetting(true);
    else setResettingStudentId(profileIds[0]);

    try {
      const endpoint = isBatch 
        ? `api/v1/admin/audit/assessments/${inspectingAssessment.id}/reopen-batch-students`
        : `api/v1/admin/audit/assessments/${inspectingAssessment.id}/reopen-student`;

      const payloadBody = isBatch 
        ? { student_profile_ids: profileIds }
        : { student_profile_id: profileIds[0] };

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payloadBody)
      });

      if (res.ok) {
        const successText = isBatch 
          ? `Successfully reset ${profileIds.length} candidate sessions!`
          : 'Student exam session re-opened live with full duration!';

        setActionMessage({ type: 'success', text: successText });
        setToastNotification({ type: 'success', text: successText });
        setSelectedStudentIds([]);

        await handleOpenInspectionModal(inspectingAssessment);
        await fetchMasterAssessments(currentPage);
      } else {
        throw new Error('Failed to reset session');
      }
    } catch {
      const errText = 'Failed to reset candidate session(s).';
      setActionMessage({ type: 'error', text: errText });
      setToastNotification({ type: 'error', text: errText });
    } finally {
      setIsBatchResetting(false);
      setResettingStudentId(null);
    }
  };

  const promptResetStudentSession = (student) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Candidate Session',
      message: `Are you sure you want to reset the session for ${student.name}? This will clear their current responses and grant a fresh exam timer.`,
      isDanger: false,
      onConfirm: () => handleResetStudentSessions([student.student_profile_id])
    });
  };

  const promptResetSelectedStudents = () => {
    if (selectedStudentIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Reset ${selectedStudentIds.length} Selected Candidates`,
      message: `Are you sure you want to reset the exam session for the ${selectedStudentIds.length} selected candidates? This will clear their current responses and grant them fresh timers.`,
      isDanger: true,
      onConfirm: () => handleResetStudentSessions(selectedStudentIds)
    });
  };

  const executeResetEntireAssessment = async (assessmentId) => {
    setIsResettingEntire(true);
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${assessmentId}/reset-entire`, {
        method: 'POST'
      });

      if (res.ok) {
        setToastNotification({ type: 'success', text: 'Entire assessment reset successfully! Status updated to APPROVED.' });
        if (inspectingAssessment?.id === assessmentId) {
          setInspectingAssessment(null);
        }
        await fetchMasterAssessments(currentPage);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reset assessment.');
      }
    } catch (err) {
      setToastNotification({ type: 'error', text: err.message });
    } finally {
      setIsResettingEntire(false);
    }
  };

  const promptResetEntireAssessment = (item) => {
    setOpenDropdownId(null);
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Reset Entire Assessment Class',
      message: `Are you sure you want to reset ${item.subject} (${item.class_arm}) for ALL students? This will PERMANENTLY ERASE all student attempts, scores, and answer submissions across the class.`,
      isDanger: true,
      onConfirm: () => executeResetEntireAssessment(item.id)
    });
  };

  const executeDeleteAssessment = async (assessmentId) => {
    setDeletingId(assessmentId);
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${assessmentId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setToastNotification({ type: 'success', text: 'Assessment deleted successfully.' });
        if (inspectingAssessment?.id === assessmentId) {
          setInspectingAssessment(null);
        }
        await fetchMasterAssessments(currentPage);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete assessment.');
      }
    } catch (err) {
      setToastNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const promptDeleteAssessment = (item) => {
    setOpenDropdownId(null);
    const hasSubmissions = item.submitted_count > 0;

    const modalTitle = hasSubmissions 
      ? '🚨 Permanent Assessment Deletion' 
      : 'Confirm Assessment Deletion';

    const modalMessage = hasSubmissions
      ? `This assessment for ${item.subject} (${item.class_arm}) has been written by ${item.submitted_count} student(s).\n\nDeleting will PERMANENTLY ERASE all question papers, answer submissions, and scores.\n\nProceed?`
      : `Delete ${item.category || 'CA1'} assessment for ${item.subject} (${item.class_arm})? This cannot be undone.`;

    setConfirmModal({
      isOpen: true,
      title: modalTitle,
      message: modalMessage,
      isDanger: true,
      onConfirm: () => executeDeleteAssessment(item.id)
    });
  };

  const handleUpdateCategorySubmit = async (e) => {
    e.preventDefault();
    if (!editingCategoryAssessment) return;

    setIsSubmittingCategory(true);
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${editingCategoryAssessment.id}/update-category`, {
        method: 'PATCH',
        body: JSON.stringify({ category: newCategoryValue })
      });

      if (res.ok) {
        setEditingCategoryAssessment(null);
        setToastNotification({ type: 'success', text: 'Category updated successfully.' });
        await fetchMasterAssessments(currentPage);
      } else {
        throw new Error('Failed to update category.');
      }
    } catch (err) {
      setToastNotification({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const scrollToStudent = (studentProfileId) => {
    if (!studentProfileId) return;
    setHighlightedStudentId(studentProfileId);
    const rowElement = studentRowRefs.current[studentProfileId];
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleSelectStudent = (profileId) => {
    setSelectedStudentIds(prev => 
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const toggleSelectAllStudents = () => {
    if (!auditDetails?.roster) return;
    if (selectedStudentIds.length === auditDetails.roster.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(auditDetails.roster.map(s => s.student_profile_id));
    }
  };

  const handleNavigateToMarkEssays = (assessment) => {
    setOpenDropdownId(null);
    if (typeof onNavigateToMarking === 'function') {
      onNavigateToMarking({
        assessmentId: assessment.id,
        adminUser: adminUser,
        isAdminViewer: true
      });
    } else {
      localStorage.setItem('saved_asm_id_context', String(assessment.id));
    }
  };

  const safeAssessmentsList = Array.isArray(assessmentsList) ? assessmentsList : [];

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between text-[#2A1A63] font-sans w-full overflow-x-hidden relative">
      
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-[70000] animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border font-mono text-xs uppercase font-bold ${
            toastNotification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            {toastNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastNotification.text}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[80000] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden font-sans text-left animate-fadeIn">
            <div className={`p-4 font-mono text-white flex items-center justify-between ${
              confirmModal.isDanger ? 'bg-gradient-to-r from-rose-600 to-rose-700' : 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]'
            }`}>
              <h3 className="text-xs font-black uppercase tracking-wider">{confirmModal.title}</h3>
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs font-medium text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer uppercase font-mono transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    if (action) action();
                  }}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl cursor-pointer uppercase font-mono shadow-md transition-all ${
                    confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={onNavigateBack} 
              className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center shrink-0">
              <Logo size={28} showText={false} />
            </div>
            <div className="text-left">
              <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                {subAdminScope.isSubAdmin ? 'Sub-Admin Assessment Audit' : 'Assessment Intelligence & Audit'}
              </h1>
              <p className="text-[10px] font-bold text-white/95 uppercase tracking-wider mt-0.5 hidden sm:block">
                {subAdminScope.isSubAdmin ? 'Authorized Class Arm Surveillance' : 'Centralized Examination Lifecycle & Analytics'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex bg-white/20 p-1 rounded-2xl border border-white/30 font-mono text-[10px] font-bold gap-1 w-full lg:w-auto justify-start sm:justify-center overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black shrink-0 ${
              activeTab === 'all' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            All Papers
          </button>
          <button 
            onClick={() => { setActiveTab('ready_to_grade'); setCurrentPage(1); }}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black shrink-0 ${
              activeTab === 'ready_to_grade' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            Awaiting Grading
          </button>
          <button 
            onClick={() => { setActiveTab('completed'); setCurrentPage(1); }}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black shrink-0 ${
              activeTab === 'completed' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            Graded & Closed
          </button>
        </div>
      </header>

      {/* Control Filter Toolbar */}
      <div className="w-full bg-white border-b border-[#E2D5F8] px-4 sm:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="relative w-full md:max-w-xs bg-white border border-[#E2D5F8] rounded-2xl shadow-2xs overflow-hidden">
          <Search className="w-4 h-4 text-[#7C6B93] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..." 
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl font-bold text-slate-900 focus:outline-none uppercase font-mono"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto font-mono text-[10px]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Arm:</span>
            <select 
              value={selectedArmFilter} 
              onChange={(e) => { setSelectedArmFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none shadow-2xs text-[10px]"
            >
              {filterOptions.arms.map(arm => <option key={arm} value={arm}>{arm}</option>)}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Subject:</span>
            <select 
              value={selectedSubjectFilter} 
              onChange={(e) => { setSelectedSubjectFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none truncate shadow-2xs text-[10px]"
            >
              {filterOptions.subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Staff:</span>
            <select 
              value={selectedStaffFilter} 
              onChange={(e) => { setSelectedStaffFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none truncate shadow-2xs text-[10px]"
            >
              {filterOptions.staff.map(stf => <option key={stf} value={stf}>{stf}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <main className="flex-1 bg-[#F7F5FC] px-4 sm:px-8 py-5 overflow-y-auto w-full flex flex-col justify-between">
        <div className="w-full space-y-4">
          
          <GlobalTermFilterBar />

          {isLoading ? (
            <div className="py-20 text-center font-mono text-xs uppercase text-[#7C6B93] font-bold flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
              Compiling assessment telemetry stream...
            </div>
          ) : safeAssessmentsList.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-[#7C6B93] p-6 text-center bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl py-16 shadow-xs max-w-md mx-auto my-auto">
              <BookOpen className="w-10 h-10 text-[#7C3AED]/40 stroke-[1.5] mb-3" />
              <p className="text-xs font-black uppercase tracking-wide font-mono">No Assessments Located</p>
              <p className="text-xs text-slate-600 font-medium normal-case mt-1.5">No exam papers match your active filter criteria.</p>
            </div>
          ) : (
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-visible shadow-xs w-full pb-12">
              <div className="overflow-x-auto w-full overflow-y-visible pb-16">
                <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
                      <th className="p-3.5 sm:p-4 pl-6">Subject & Category</th>
                      <th className="p-3.5 sm:p-4">Class Arm</th>
                      <th className="p-3.5 sm:p-4">Assigned Teacher</th>
                      <th className="p-3.5 sm:p-4 text-center">Lifecycle Status</th>
                      <th className="p-3.5 sm:p-4 text-center">Submissions</th>
                      <th className="p-3.5 sm:p-4 text-center pr-6 font-sans">Audit Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                    {safeAssessmentsList.map((item, idx) => {
                      if (!item) return null;
                      const statusLower = cleanStatus(item.status);
                      const isGraded = statusLower === 'graded' || statusLower === 'completed';
                      const isReady = statusLower === 'finished (ready to grade)' || statusLower === 'pending grading';
                      const isDropdownOpen = openDropdownId === item.id;

                      const isOngoingOrConcluded = 
                        statusLower === 'exam in progress' || 
                        statusLower === 'finished (ready to grade)' || 
                        statusLower === 'graded' || 
                        statusLower === 'completed' ||
                        statusLower === 'approved';

                      return (
                        <tr key={`asm-${item.id || idx}`} className="hover:bg-[#FAF9FA] transition-colors relative">
                          <td className="p-3.5 sm:p-4 pl-6">
                            <div className="font-black text-slate-950 text-xs font-sans">{item.subject}</div>
                            <span className="text-[9px] text-[#7C3AED] font-mono font-black bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 inline-block mt-0.5">
                              {item.category || 'CA1'}
                            </span>
                          </td>
                          <td className="p-3.5 sm:p-4 font-black text-[#7C3AED]">{item.class_arm}</td>
                          <td className="p-3.5 sm:p-4 font-medium text-slate-700">{item.teacher_name || 'General Faculty'}</td>
                          <td className="p-3.5 sm:p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border inline-block ${
                              isGraded ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              isReady ? 'bg-blue-50 border-blue-200 text-blue-800' :
                              'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                              {item.status || 'Draft'}
                            </span>
                          </td>
                          <td className="p-3.5 sm:p-4 text-center font-black text-slate-900">
                            {item.submitted_count} / {item.total_students} Written
                          </td>
                          <td className="p-3.5 sm:p-4 text-center pr-6 font-sans relative">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenInspectionModal(item)}
                                className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> Inspect
                              </button>

                              <div className="relative action-dropdown-container">
                                <button
                                  onClick={() => setOpenDropdownId(isDropdownOpen ? null : item.id)}
                                  disabled={deletingId === item.id}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-all border border-slate-200 disabled:opacity-50"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                  ) : (
                                    <MoreVertical className="w-4 h-4" />
                                  )}
                                </button>

                                {isDropdownOpen && (
                                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E2D5F8] rounded-2xl shadow-2xl z-[100] overflow-hidden font-sans text-left animate-fadeIn">
                                    
                                    {(isReady || isGraded) && (
                                      <button
                                        onClick={() => handleNavigateToMarkEssays(item)}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-100"
                                      >
                                        <FileEdit className="w-3.5 h-3.5 text-emerald-600" /> Open Grading Workspace
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        setEditingCategoryAssessment(item);
                                        setNewCategoryValue(item.category || 'CA1');
                                      }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#7C3AED] flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-100"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-[#7C3AED]" /> Edit Category
                                    </button>

                                    {isOngoingOrConcluded && (
                                      <button
                                        onClick={() => promptResetEntireAssessment(item)}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-100"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" /> Reset Entire Exam
                                      </button>
                                    )}

                                    <button
                                      onClick={() => promptDeleteAssessment(item)}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete Assessment
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalRecords > 0 && (
          <div className="w-full bg-white border border-[#E2D5F8] px-4 sm:px-6 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] shadow-2xs mt-4 shrink-0">
            <span className="text-[#7C6B93] font-bold uppercase text-center sm:text-left">
              Page <span className="text-slate-900 font-black">{currentPage}</span> of <span className="text-slate-900 font-black">{lastPage}</span> (Total Records: {totalRecords})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl font-black uppercase disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1 text-[10px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <span className="px-3.5 py-1.5 bg-purple-50 text-[#7C3AED] font-black rounded-xl border border-purple-200 text-[10px]">
                {currentPage} / {lastPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, lastPage))}
                disabled={currentPage === lastPage || isLoading}
                className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl font-black uppercase disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1 text-[10px]"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Edit Category Modal */}
      {editingCategoryAssessment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden font-sans text-left animate-fadeIn">
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 flex justify-between items-center font-mono">
              <h3 className="text-xs font-black uppercase tracking-tight text-white">Edit Category</h3>
              <button onClick={() => setEditingCategoryAssessment(null)} className="w-7 h-7 bg-white/20 hover:bg-white/35 text-white rounded-full flex items-center justify-center cursor-pointer transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategorySubmit} className="p-5 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-mono uppercase">Category</label>
                <select
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold text-slate-900 uppercase focus:outline-none font-mono shadow-2xs"
                >
                  <option value="CA1">CA 1 (Continuous Assessment 1)</option>
                  <option value="EXAM">EXAM (Formal Examination)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategoryAssessment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer uppercase font-mono transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5 uppercase font-mono shadow-md transition-all"
                >
                  {isSubmittingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {inspectingAssessment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden font-sans text-left max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Audit Inspection Console</span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">
                  {inspectingAssessment.subject} — {inspectingAssessment.class_arm} ({inspectingAssessment.category})
                </h3>
              </div>
              <button 
                onClick={() => setInspectingAssessment(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/35 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6 bg-[#F7F5FC]">
              {isAuditLoading ? (
                <div className="py-20 text-center font-mono text-xs uppercase text-[#7C6B93] font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Aggregating student metrics...
                </div>
              ) : auditDetails ? (
                <>
                  {actionMessage && (
                    <div className={`p-3 rounded-2xl font-mono text-xs font-bold uppercase shadow-2xs ${
                      actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {actionMessage.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
                    <div className="p-3 sm:p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-[#7C6B93] uppercase block tracking-wider">Class Average Score</span>
                      <p className="text-sm sm:text-base font-black text-[#7C3AED] mt-1 font-mono">{auditDetails.stats.average_score} Marks</p>
                    </div>

                    <div 
                      onClick={() => auditDetails.stats.highest_student_id && scrollToStudent(auditDetails.stats.highest_student_id)}
                      className="p-3 sm:p-4 bg-white border border-emerald-200 hover:border-emerald-500 rounded-2xl cursor-pointer transition-all group shadow-2xs relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] sm:text-[10px] font-sans font-bold text-emerald-700 uppercase tracking-wider">Highest Score</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[8px] sm:text-[9px] rounded-lg uppercase">Top</span>
                      </div>
                      <p className="text-sm sm:text-base font-black text-emerald-700 mt-1 flex items-center gap-1 font-mono">
                        <TrendingUp className="w-4 h-4 shrink-0" /> {auditDetails.stats.highest_score} Marks
                      </p>
                      <p className="text-[10px] text-slate-600 truncate mt-1 font-sans font-bold group-hover:text-emerald-700 transition-colors">
                        {auditDetails.stats.highest_student_name || 'N/A'}
                      </p>
                    </div>

                    <div 
                      onClick={() => auditDetails.stats.lowest_student_id && scrollToStudent(auditDetails.stats.lowest_student_id)}
                      className="p-3 sm:p-4 bg-white border border-rose-200 hover:border-rose-500 rounded-2xl cursor-pointer transition-all group shadow-2xs relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] sm:text-[10px] font-sans font-bold text-rose-700 uppercase tracking-wider">Lowest Score</span>
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-black text-[8px] sm:text-[9px] rounded-lg uppercase">Attention</span>
                      </div>
                      <p className="text-sm sm:text-base font-black text-rose-700 mt-1 flex items-center gap-1 font-mono">
                        <TrendingDown className="w-4 h-4 shrink-0" /> {auditDetails.stats.lowest_score} Marks
                      </p>
                      <p className="text-[10px] text-slate-600 truncate mt-1 font-sans font-bold group-hover:text-rose-700 transition-colors">
                        {auditDetails.stats.lowest_student_name || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-[#D97706] uppercase block tracking-wider">Turnout Rate</span>
                      <p className="text-sm sm:text-base font-black text-slate-900 mt-1 font-mono">{auditDetails.stats.submission_rate}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">Candidate Participation & Reset Console</h4>
                      
                      <div className="flex items-center gap-2">
                        {selectedStudentIds.length > 0 && (
                          <button
                            type="button"
                            disabled={isBatchResetting}
                            onClick={promptResetSelectedStudents}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[10px] font-mono font-black uppercase rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md animate-fadeIn"
                          >
                            {isBatchResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} 
                            Reset Selected ({selectedStudentIds.length})
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isResettingEntire}
                          onClick={() => promptResetEntireAssessment(inspectingAssessment)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-mono font-black uppercase rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          {isResettingEntire ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} 
                          Reset Entire Class
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden max-h-72 sm:max-h-80 overflow-y-auto shadow-xs">
                      <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[550px]">
                        <thead>
                          <tr className="bg-[#7C3AED] text-white font-black uppercase text-[9px] tracking-wider border-b border-[#E2D5F8] sticky top-0 z-10">
                            <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED] w-12">
                              <button 
                                type="button"
                                onClick={toggleSelectAllStudents}
                                className="cursor-pointer text-white hover:text-purple-200 transition-colors"
                              >
                                {auditDetails.roster && selectedStudentIds.length === auditDetails.roster.length && auditDetails.roster.length > 0 ? (
                                  <CheckSquare className="w-4 h-4 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 mx-auto" />
                                )}
                              </button>
                            </th>
                            <th className="p-3.5 sm:p-4 bg-[#7C3AED]">Admission No</th>
                            <th className="p-3.5 sm:p-4 font-sans bg-[#7C3AED]">Student Name</th>
                            <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">Participation</th>
                            <th className="p-3.5 sm:p-4 text-center pr-6 font-sans bg-[#7C3AED]">Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                          {Array.isArray(auditDetails.roster) && auditDetails.roster.map((student) => {
                            if (!student) return null;
                            const isSelected = selectedStudentIds.includes(student.student_profile_id);
                            const isHighlighted = highlightedStudentId === student.student_profile_id;
                            const isTop = auditDetails.stats.highest_student_id === student.student_profile_id;
                            const isLow = auditDetails.stats.lowest_student_id === student.student_profile_id;
                            const isResettingThisStudent = resettingStudentId === student.student_profile_id;

                            const assessmentStatusLower = cleanStatus(inspectingAssessment?.status);
                            const isExamActiveOrConcluded = 
                              assessmentStatusLower === 'exam in progress' || 
                              assessmentStatusLower === 'finished (ready to grade)' || 
                              assessmentStatusLower === 'graded' || 
                              assessmentStatusLower === 'completed' ||
                              assessmentStatusLower === 'approved';

                            return (
                              <tr 
                                key={`roster-${student.student_profile_id}`} 
                                ref={(el) => (studentRowRefs.current[student.student_profile_id] = el)}
                                className={`transition-all ${
                                  isSelected ? 'bg-purple-50/90' :
                                  isHighlighted ? 'bg-amber-100/80 ring-2 ring-amber-500' : 'hover:bg-[#FAF9FA]'
                                }`}
                              >
                                <td className="p-3.5 sm:p-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectStudent(student.student_profile_id)}
                                    className="cursor-pointer text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 mx-auto" />
                                    ) : (
                                      <Square className="w-4 h-4 mx-auto text-slate-300" />
                                    )}
                                  </button>
                                </td>
                                <td className="p-3.5 sm:p-4 text-[#7C6B93] font-black">{student.admission_no}</td>
                                <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs flex items-center gap-2">
                                  <span className="truncate max-w-[140px] sm:max-w-none">{student.name}</span>
                                  {isTop && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-black text-[8px] rounded-lg shrink-0">★ TOP</span>}
                                  {isLow && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-mono font-black text-[8px] rounded-lg shrink-0">▼ LOW</span>}
                                </td>
                                <td className="p-3.5 sm:p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border uppercase inline-block ${
                                    student.has_submitted ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                    student.is_in_progress ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                    'bg-rose-50 border-rose-200 text-rose-800 font-black'
                                  }`}>
                                    {student.has_submitted ? 'Submitted' : student.is_in_progress ? 'In Progress' : 'Did Not Write'}
                                  </span>
                                </td>
                                <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                                  <div className="flex items-center justify-center gap-2">
                                    {isExamActiveOrConcluded && (
                                      <button
                                        type="button"
                                        disabled={isResettingThisStudent}
                                        onClick={() => promptResetStudentSession(student)}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[10px] font-mono font-bold uppercase rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-md"
                                      >
                                        {isResettingThisStudent ? (
                                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                        ) : (
                                          <RotateCcw className="w-3 h-3 shrink-0" />
                                        )}
                                        Reset Session
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center font-mono text-xs uppercase text-[#C62927] font-bold">
                  Failed to load assessment metrics.
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-[#7C6B93]/20 flex justify-end shrink-0">
              <button 
                onClick={() => setInspectingAssessment(null)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite institutional audit telemetry matrix
      </footer>
    </div>
  );
}