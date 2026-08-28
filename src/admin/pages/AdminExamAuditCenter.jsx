import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Search, Clock, CheckCircle2, XCircle, Edit3, 
  Layers, BookOpen, ChevronRight, Users, Award, AlertTriangle, 
  RotateCcw, FileSpreadsheet, BarChart3, TrendingUp, TrendingDown, 
  UserCheck, UserX, CheckCheck, Loader2, ShieldCheck, X, Filter, Sparkles, ChevronLeft
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';
import GlobalTermFilterBar from '../components/GlobalTermFilterBar'; // 👈 Global Term Filter

export default function AdminExamAuditCenter({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter States
  const [selectedArmFilter, setSelectedArmFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');

  // Pagination States
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

  // 🎯 Edit Status Modal State
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // 🎯 Highlight & Scroll State References
  const [highlightedStudentId, setHighlightedStudentId] = useState(null);
  const studentRowRefs = useRef({});

  const fetchMasterAssessments = async (page = 1) => {
    try {
      const activeSession = localStorage.getItem('admin_filter_session');
      const activeTerm = localStorage.getItem('admin_filter_term');
      let queryParams = `?page=${page}&per_page=${itemsPerPage}`;
      if (activeSession && activeTerm) {
        queryParams += `&session=${encodeURIComponent(activeSession)}&term=${encodeURIComponent(activeTerm)}`;
      }

      const res = await apiRequest(`api/v1/admin/audit/assessments-comprehensive${queryParams}`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setAssessmentsList(payload.assessments || []);
          if (payload.last_page) setLastPage(payload.last_page);
          if (payload.total !== undefined) setTotalRecords(payload.total);
        }
      }
    } catch (err) {
      console.error("❌ [AUDIT REGISTRY FAULT]:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      await fetchMasterAssessments(currentPage);
      if (isMounted) setIsLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [currentPage]);

  const filterOptions = useMemo(() => {
    const arms = new Set();
    const subjects = new Set();
    const staff = new Set();

    assessmentsList.forEach(item => {
      if (item.class_arm) arms.add(item.class_arm);
      if (item.subject) subjects.add(item.subject);
      if (item.teacher_name) staff.add(item.teacher_name);
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
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${assessment.id}/deep-metrics`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setAuditDetails(payload.data);
        }
      }
    } catch (err) {
      console.error("❌ [DEEP METRICS FAULT]:", err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleReopenStudentSession = async (studentProfileId) => {
    if (!inspectingAssessment) return;
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${inspectingAssessment.id}/reopen-student`, {
        method: 'POST',
        body: JSON.stringify({ student_profile_id: studentProfileId })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Student session successfully reopened with timer parity!' });
        handleOpenInspectionModal(inspectingAssessment);
      } else {
        throw new Error('Failed to reopen session');
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to reopen student session.' });
    }
  };

  const handleUpdateAssessmentStatus = async () => {
    if (!editingAssessment) return;
    setIsUpdatingStatus(true);
    try {
      const res = await apiRequest(`api/v1/admin/audit/assessments/${editingAssessment.id}/update-status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatusValue })
      });
      if (res.ok) {
        setEditingAssessment(null);
        await fetchMasterAssessments(currentPage);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      console.error("❌ [STATUS UPDATE FAULT]:", err);
      alert("Failed to update assessment status.");
    } finally {
      setIsUpdatingStatus(false);
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

  const filteredAssessments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assessmentsList.filter(item => {
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'ready_to_grade' ? (item.status === 'Finished (Ready to Grade)' || item.status === 'Pending Grading') :
        activeTab === 'completed' ? (item.status === 'Graded' || item.status === 'Completed') : true;

      const matchesQuery = !q || 
        (item.subject && item.subject.toLowerCase().includes(q)) ||
        (item.class_arm && item.class_arm.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.teacher_name && item.teacher_name.toLowerCase().includes(q));

      const matchesArm = selectedArmFilter === 'ALL' || item.class_arm === selectedArmFilter;
      const matchesSub = selectedSubjectFilter === 'ALL' || item.subject === selectedSubjectFilter;
      const matchesStaff = selectedStaffFilter === 'ALL' || item.teacher_name === selectedStaffFilter;

      return matchesTab && matchesQuery && matchesArm && matchesSub && matchesStaff;
    });
  }, [assessmentsList, activeTab, searchQuery, selectedArmFilter, selectedSubjectFilter, selectedStaffFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Compiling assessment telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-x-hidden">
      
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
              <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">Assessment Intelligence & Audit</h1>
              <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-0.5 hidden sm:block">Centralized Examination Lifecycle & Analytics</p>
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

      {/* Advanced Control Filter Toolbar */}
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
              onChange={(e) => setSelectedArmFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none shadow-2xs text-[10px]"
            >
              {filterOptions.arms.map(arm => <option key={arm} value={arm}>{arm}</option>)}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Subject:</span>
            <select 
              value={selectedSubjectFilter} 
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none truncate shadow-2xs text-[10px]"
            >
              {filterOptions.subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Staff:</span>
            <select 
              value={selectedStaffFilter} 
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none truncate shadow-2xs text-[10px]"
            >
              {filterOptions.staff.map(stf => <option key={stf} value={stf}>{stf}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Ledger */}
      <main className="flex-1 bg-[#F7F5FC] px-4 sm:px-8 py-5 overflow-y-auto w-full flex flex-col justify-between">
        <div className="w-full space-y-4">
          
          {/* 🌍 GLOBAL TERM FILTER BAR */}
          <GlobalTermFilterBar />

          {filteredAssessments.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-[#7C6B93] p-6 text-center bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl py-16 shadow-xs max-w-md mx-auto my-auto">
              <BookOpen className="w-10 h-10 text-[#7C3AED]/40 stroke-[1.5] mb-3" />
              <p className="text-xs font-black uppercase tracking-wide font-mono">No Assessments Located</p>
              <p className="text-xs text-slate-600 font-medium normal-case mt-1.5">No examination folders match your active filter criteria.</p>
            </div>
          ) : (
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
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
                    {filteredAssessments.map((item, idx) => {
                      const isGraded = item.status === 'Graded' || item.status === 'Completed';
                      const isReady = item.status === 'Finished (Ready to Grade)' || item.status === 'Pending Grading';

                      return (
                        <tr key={`asm-${item.id || idx}`} className="hover:bg-[#FAF9FA] transition-colors">
                          <td className="p-3.5 sm:p-4 pl-6">
                            <div className="font-black text-slate-950 text-xs font-sans">{item.subject}</div>
                            <span className="text-[9px] text-[#7C6B93] font-mono">{item.category || 'EXAM'}</span>
                          </td>
                          <td className="p-3.5 sm:p-4 font-black text-[#7C3AED]">{item.class_arm}</td>
                          <td className="p-3.5 sm:p-4 font-medium text-slate-700">{item.teacher_name || 'General Staff'}</td>
                          <td className="p-3.5 sm:p-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border inline-block ${
                                isGraded ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                isReady ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                'bg-amber-50 border-amber-200 text-amber-800'
                              }`}>
                                {item.status || 'Draft'}
                              </span>
                              <button
                                onClick={() => { setEditingAssessment(item); setNewStatusValue(item.status || 'Draft'); }}
                                className="w-6 h-6 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-lg border border-purple-200 flex items-center justify-center cursor-pointer transition-all shrink-0"
                                title="Edit Status"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 sm:p-4 text-center font-black text-slate-900">
                            {item.submitted_count} / {item.total_students} Written
                          </td>
                          <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                            <button
                              onClick={() => handleOpenInspectionModal(item)}
                              className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                            >
                              <BarChart3 className="w-3.5 h-3.5" /> Inspect
                            </button>
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

        {totalRecords > 0 && (
          <div className="w-full bg-white border border-[#E2D5F8] px-4 sm:px-6 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] shadow-2xs mt-4 shrink-0">
            <span className="text-[#7C6B93] font-bold uppercase text-center sm:text-left">
              Page <span className="text-slate-900 font-black">{currentPage}</span> of <span className="text-slate-900 font-black">{lastPage}</span> (Total Records: {totalRecords})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl font-black uppercase disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1 text-[10px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <span className="px-3 py-1.5 bg-purple-50 text-[#7C3AED] font-black rounded-xl border border-purple-200 text-[10px]">
                {currentPage} / {lastPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, lastPage))}
                disabled={currentPage === lastPage}
                className="px-3 py-1.5 bg-[#F7F5FC] border border-[#E2D5F8] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-xl font-black uppercase disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all flex items-center gap-1 text-[10px]"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* EDIT STATUS MODAL */}
      {editingAssessment && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[60000] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden font-sans text-left animate-fadeIn p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2D5F8] pb-3 font-mono">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-900">Edit Assessment Status</h3>
              <button onClick={() => setEditingAssessment(null)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 font-mono">
              <label className="text-[10px] font-black uppercase text-[#7C6B93] block">Select Lifecycle State</label>
              <select 
                value={newStatusValue}
                onChange={(e) => setNewStatusValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none shadow-2xs text-xs"
              >
                <option value="Draft">Draft</option>
                <option value="Exam in Progress">Exam in Progress</option>
                <option value="Finished (Ready to Grade)">Finished (Ready to Grade)</option>
                <option value="Pending Grading">Pending Grading</option>
                <option value="Graded">Graded</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingAssessment(null)} className="px-4 py-2 bg-white border border-[#E2D5F8] text-xs font-black uppercase rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button disabled={isUpdatingStatus} onClick={handleUpdateAssessmentStatus} className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all">
                {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER DEEP INSPECTION & AUDIT MODAL */}
      {inspectingAssessment && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden font-sans text-left max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Assessment Intelligence Audit Panel</span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">
                  {inspectingAssessment.subject} — {inspectingAssessment.class_arm} ({inspectingAssessment.category})
                </h3>
              </div>
              <button 
                onClick={() => setInspectingAssessment(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6 bg-[#F7F5FC]">
              {isAuditLoading ? (
                <div className="py-20 text-center font-mono text-xs uppercase text-[#7C6B93] font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Aggregating student telemetry & statistics...
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
                      title="Click to locate top scoring student"
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
                      title="Click to locate student with lowest score"
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

                  {/* Candidate Roster */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">Candidate Participation & Reopen Console</h4>
                    
                    <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden max-h-72 sm:max-h-80 overflow-y-auto shadow-xs">
                      <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[700px]">
                        <thead>
                          <tr className="bg-[#7C3AED] text-white font-black uppercase text-[9px] tracking-wider border-b border-[#E2D5F8] sticky top-0 z-10">
                            <th className="p-3.5 sm:p-4 pl-6 bg-[#7C3AED]">Admission No</th>
                            <th className="p-3.5 sm:p-4 font-sans bg-[#7C3AED]">Student Name</th>
                            <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">Participation Status</th>
                            <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/80">Score Awarded</th>
                            <th className="p-3.5 sm:p-4 text-center pr-6 font-sans bg-[#7C3AED]">Supervisor Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                          {auditDetails.roster.map((student) => {
                            const isHighlighted = highlightedStudentId === student.student_profile_id;
                            const isTop = auditDetails.stats.highest_student_id === student.student_profile_id;
                            const isLow = auditDetails.stats.lowest_student_id === student.student_profile_id;
                            const isExamInProgress = inspectingAssessment.status === 'Exam in Progress';

                            return (
                              <tr 
                                key={`roster-${student.student_profile_id}`} 
                                ref={(el) => (studentRowRefs.current[student.student_profile_id] = el)}
                                className={`transition-all ${
                                  isHighlighted ? 'bg-amber-100/80 ring-2 ring-amber-500' : 'hover:bg-[#FAF9FA]'
                                }`}
                              >
                                <td className="p-3.5 sm:p-4 pl-6 text-[#7C6B93] font-black">{student.admission_no}</td>
                                <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs flex items-center gap-2">
                                  <span className="truncate max-w-[140px] sm:max-w-none">{student.name}</span>
                                  {isTop && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-black text-[8px] rounded-lg shrink-0">★ TOP</span>}
                                  {isLow && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-mono font-black text-[8px] rounded-lg shrink-0">▼ LOW</span>}
                                </td>
                                <td className="p-3.5 sm:p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border uppercase inline-block ${
                                    student.has_submitted ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                    student.is_in_progress ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                    'bg-rose-50 border-rose-200 text-rose-800 font-black'
                                  }`}>
                                    {student.has_submitted ? 'Submitted' : student.is_in_progress ? 'In Progress' : 'Did Not Write'}
                                  </span>
                                </td>
                                <td className="p-3.5 sm:p-4 text-center font-black text-[#7C3AED]">
                                  {inspectingAssessment.status === 'Graded' ? `${student.score} / ${auditDetails.stats.max_possible_score}` : 'Pending Grade'}
                                </td>
                                <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                                  <div className="flex items-center justify-center gap-2">
                                    {!student.has_submitted && !isExamInProgress && (
                                      <button
                                        type="button"
                                        onClick={() => handleReopenStudentSession(student.student_profile_id)}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-mono font-bold uppercase rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-md"
                                      >
                                        <RotateCcw className="w-3 h-3 shrink-0" /> Reopen
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
                  Failed to load assessment telemetry metrics.
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-[#7C6B93]/20 flex justify-end shrink-0">
              <button 
                onClick={() => setInspectingAssessment(null)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]"
              >
                Close Audit Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>
    </div>
  );
}