import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, Search, Users, GraduationCap, BookOpen, User, Layers, Loader2, X, Eye, EyeOff,
  RefreshCw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { apiRequest, BASE_URL } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminUsersDirectory({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFilterArm, setSelectedFilterArm] = useState('ALL');
  const [selectedFilterSubject, setSelectedFilterSubject] = useState('ALL');
  
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 15;

  const [studentsData, setStudentsData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [curriculumData, setCurriculumData] = useState([]);
  const [classArmsList, setClassArmsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState(null);

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedClassArmSubjects, setSelectedClassArmSubjects] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDirectoryRegistry = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiRequest(`api/v1/admin/directory/users-comprehensive?page=${page}&per_page=${itemsPerPage}${searchParam}`, { method: 'GET' });

      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'SUCCESS') {
          const rawStudents = payload.students?.data || payload.students || [];
          setStudentsData(rawStudents);
          
          if (activeTab === 'students' && payload.students?.last_page) {
            setLastPage(payload.students.last_page);
            setTotalRecords(payload.students.total || rawStudents.length);
          }

          const rawStaff = payload.staff?.data || payload.staff || [];
          setStaffData(rawStaff);
          
          if (activeTab === 'staff' && payload.staff?.last_page) {
            setLastPage(payload.staff.last_page);
            setTotalRecords(payload.staff.total || rawStaff.length);
          }

          setCurriculumData(payload.curriculum_matrix || []);
          if (activeTab === 'subjects') {
            setTotalRecords((payload.curriculum_matrix || []).length);
            setLastPage(1);
          }

          setClassArmsList(payload.class_arms || []);
          setSubjectsList(payload.subjects || []);
        }
      }
    } catch (err) {
      console.error("Directory Ingestion Fault:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, itemsPerPage]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchDirectoryRegistry(currentPage, debouncedSearch);
    }
    return () => { isMounted = false; };
  }, [currentPage, debouncedSearch, activeTab, fetchDirectoryRegistry]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setNotification(null);
    try {
      const token = localStorage.getItem('intranet_bearer_token');

      const response = await fetch(`${BASE_URL}/api/v1/admin/sync-legacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const payload = await response.json();
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: payload.message || 'Institutional sync completed successfully! All legacy records updated.'
        });
        await fetchDirectoryRegistry(currentPage, debouncedSearch);
      } else {
        throw new Error(payload.message || 'Sync operation returned an exception.');
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to communicate with Start-Rite legacy portal server.'
      });
    } finally {
      setIsSyncing(false);
      // Auto-dismiss timer removed here so notification stays until user clicks 'X'
    }
  };

  const togglePasswordVisibility = (studentId) => {
    setVisiblePasswords(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const filteredCollection = useMemo(() => {
    if (activeTab === 'students') {
      return studentsData.filter(student => selectedFilterArm === 'ALL' || student.class_arm === selectedFilterArm);
    } else if (activeTab === 'staff') {
      return staffData.filter(staff => {
        return selectedFilterSubject === 'ALL' || 
          (staff.assignments && staff.assignments.some(a => a.subject.toLowerCase().includes(selectedFilterSubject.toLowerCase())));
      });
    } else {
      const q = searchQuery.toLowerCase().trim();
      return curriculumData.map(arm => {
        const filteredSubjects = arm.subjects.filter(sub => 
          !q || 
          sub.subject_name.toLowerCase().includes(q) || 
          sub.teacher_name.toLowerCase().includes(q)
        );
        return { ...arm, subjects: filteredSubjects };
      }).filter(arm => arm.subjects.length > 0 || !q);
    }
  }, [activeTab, studentsData, staffData, curriculumData, selectedFilterArm, selectedFilterSubject, searchQuery]);

  if (isLoading && studentsData.length === 0 && staffData.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Synchronizing institutional registry...
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F7F5FC] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-hidden text-left">
      
      {/* HEADER BANNER */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={onNavigateBack} 
            className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center shrink-0">
            <Logo size={28} showText={false} />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
              Institutional Management Directory
            </h1>
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-0.5 truncate hidden sm:block">
              Students, Staff & Curriculum Records Ledger
            </p>
          </div>
        </div>

        <div className="flex bg-white/20 p-1 rounded-2xl border border-white/30 font-mono text-[10px] font-bold gap-1 w-full sm:w-auto justify-center overflow-x-auto">
          <button 
            onClick={() => handleTabSwitch('students')}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 shrink-0 ${
              activeTab === 'students' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Students
          </button>
          <button 
            onClick={() => handleTabSwitch('staff')}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 shrink-0 ${
              activeTab === 'staff' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Staff
          </button>
          <button 
            onClick={() => handleTabSwitch('subjects')}
            className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 shrink-0 ${
              activeTab === 'subjects' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Subjects Matrix
          </button>
        </div>
      </header>

      {/* FILTER CONTROL STRIP */}
      <div className="w-full bg-white border-b border-[#E2D5F8] px-4 sm:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="relative w-full md:max-w-md bg-white border border-[#E2D5F8] rounded-2xl shadow-2xs overflow-hidden">
          <Search className="w-4 h-4 text-[#7C6B93] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'students' ? "Search student names or codes..." :
              activeTab === 'staff' ? "Search staff names or emails..." :
              "Search subjects or teachers..."
            } 
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl font-bold text-slate-900 focus:outline-none uppercase font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end font-mono text-[10px]">
          {activeTab === 'students' && (
            <div className="flex items-center gap-2">
              <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Class Arm:</span>
              <select 
                value={selectedFilterArm} 
                onChange={(e) => setSelectedFilterArm(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none shadow-2xs text-[10px]"
              >
                <option value="ALL">ALL CLASS ARMS</option>
                {classArmsList.map(arm => <option key={arm} value={arm}>{arm}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'staff' && (
            <div className="flex items-center gap-2">
              <span className="text-[#7C6B93] font-black uppercase text-[9px] sm:text-[10px]">Subject:</span>
              <select 
                value={selectedFilterSubject} 
                onChange={(e) => setSelectedFilterSubject(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl uppercase cursor-pointer focus:outline-none shadow-2xs text-[10px]"
              >
                <option value="ALL">ALL SUBJECTS</option>
                {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          )}

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-50 text-[10px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Legacy Portal'}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`mx-4 sm:mx-8 mt-3 p-3.5 rounded-2xl flex items-center justify-between font-mono text-xs shadow-md border animate-fadeIn shrink-0 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5 font-bold truncate pr-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="truncate">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="w-6 h-6 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer transition-all shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN DATA VIEW */}
      <main className="flex-1 bg-[#F7F5FC] px-4 sm:px-8 py-5 overflow-y-auto h-full space-y-5 flex flex-col justify-between">
        <div className="w-full">
          {filteredCollection.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-[#7C6B93] p-6 text-center bg-[#F3EEFC] border border-dashed border-[#E2D5F8] rounded-3xl py-16 shadow-xs max-w-md mx-auto my-auto">
              <Users className="w-10 h-10 text-[#7C3AED]/40 stroke-[1.5] mb-3" />
              <p className="text-xs font-black uppercase tracking-wide font-mono">No Matching Records Found</p>
              <p className="text-xs text-slate-600 font-medium normal-case mt-1.5">No profiles match your active search filters.</p>
            </div>
          ) : activeTab === 'students' ? (
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[750px]">
                  <thead>
                    <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
                      <th className="p-3.5 sm:p-4 pl-6">Admission No</th>
                      <th className="p-3.5 sm:p-4 font-sans">Full Name</th>
                      <th className="p-3.5 sm:p-4">Class Arm</th>
                      <th className="p-3.5 sm:p-4">Email Address</th>
                      <th className="p-3.5 sm:p-4 text-center">Password</th>
                      <th className="p-3.5 sm:p-4 text-center pr-6 font-sans">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                    {filteredCollection.map((item, idx) => {
                      const studentId = item.id || item.student_profile_id || idx;
                      const rawPassword = item.password || item.plain_password || item.raw_password || item.access_code || null;
                      const isRevealed = Boolean(visiblePasswords[studentId]);

                      return (
                        <tr key={`student-${studentId}`} className="hover:bg-[#FAF9FA] transition-colors">
                          <td className="p-3.5 sm:p-4 pl-6 text-[#7C6B93] font-black">{item.admission_no}</td>
                          <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs truncate max-w-[150px] sm:max-w-none">{item.name}</td>
                          <td className="p-3.5 sm:p-4 font-black text-[#7C3AED]">{item.class_arm || 'Unassigned'}</td>
                          <td className="p-3.5 sm:p-4 text-slate-500 lowercase font-medium truncate max-w-[150px] sm:max-w-none">{item.email || 'N/A'}</td>
                          
                          <td className="p-3.5 sm:p-4 text-center font-mono text-xs">
                            {rawPassword ? (
                              <div className="inline-flex items-center gap-2 bg-[#F7F5FC] border border-[#E2D5F8] px-2.5 py-1 rounded-xl">
                                <span className={`font-mono font-black ${isRevealed ? 'text-purple-700 tracking-normal' : 'text-slate-400 tracking-widest text-[10px]'}`}>
                                  {isRevealed ? rawPassword : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(studentId)}
                                  className="text-[#7C6B93] hover:text-[#7C3AED] p-0.5 rounded-md transition-colors cursor-pointer"
                                  title={isRevealed ? "Hide Password" : "View Password"}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 normal-case font-normal text-[10px]">N/A</span>
                            )}
                          </td>

                          <td className="p-3.5 sm:p-4 text-center pr-6 font-sans text-[10px]">
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-black border border-emerald-200 inline-block">Active</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'staff' ? (
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[650px]">
                  <thead>
                    <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
                      <th className="p-3.5 sm:p-4 pl-6">Staff ID</th>
                      <th className="p-3.5 sm:p-4 font-sans">Full Name</th>
                      <th className="p-3.5 sm:p-4">Teaching Allocations Summary</th>
                      <th className="p-3.5 sm:p-4 text-center pr-6 font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                    {filteredCollection.map((item, idx) => (
                      <tr key={`staff-${item.id || idx}`} className="hover:bg-[#FAF9FA] transition-colors">
                        <td className="p-3.5 sm:p-4 pl-6 text-[#7C6B93] font-black">STF-{item.id}</td>
                        <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs truncate max-w-[150px] sm:max-w-none">{item.name}</td>
                        <td className="p-3.5 sm:p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.assignments && item.assignments.length > 0 ? (
                              <>
                                <span className="px-2 py-1 bg-purple-50 border border-purple-200 text-[#7C3AED] rounded-lg font-black text-[10px] truncate max-w-[160px]">
                                  {item.assignments[0].formatted}
                                </span>
                                {item.assignments.length > 1 && (
                                  <span className="text-[10px] font-mono text-[#7C6B93] bg-[#F7F5FC] border border-[#E2D5F8] px-2 py-1 rounded-lg font-bold">
                                    +{item.assignments.length - 1} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[#7C6B93] normal-case font-normal text-[10px]">No active teaching allocations</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                          <button
                            onClick={() => setSelectedStaff(item)}
                            className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" /> View ({item.assignments ? item.assignments.length : 0})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[650px]">
                  <thead>
                    <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
                      <th className="p-3.5 sm:p-4 pl-6">Class Arm</th>
                      <th className="p-3.5 sm:p-4">Total Subjects Allocated</th>
                      <th className="p-3.5 sm:p-4">Subjects Preview</th>
                      <th className="p-3.5 sm:p-4 text-center pr-6 font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                    {filteredCollection.map((armGroup, idx) => (
                      <tr key={`arm-${armGroup.class_arm_id || idx}`} className="hover:bg-[#FAF9FA] transition-colors">
                        <td className="p-3.5 sm:p-4 pl-6 font-black text-[#7C3AED]">{armGroup.class_arm_name}</td>
                        <td className="p-3.5 sm:p-4 font-black text-slate-950">{armGroup.subjects.length} Subjects</td>
                        <td className="p-3.5 sm:p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {armGroup.subjects.length > 0 ? (
                              <>
                                <span className="px-2 py-1 bg-[#F7F5FC] border border-[#E2D5F8] text-slate-800 rounded-lg font-black text-[10px] truncate max-w-[180px]">
                                  {armGroup.subjects[0].subject_name} ({armGroup.subjects[0].teacher_name})
                                </span>
                                {armGroup.subjects.length > 1 && (
                                  <span className="text-[10px] font-mono text-[#7C6B93] bg-[#F7F5FC] border border-[#E2D5F8] px-2 py-1 rounded-lg font-bold">
                                    +{armGroup.subjects.length - 1} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[#7C6B93] normal-case font-normal text-[10px]">No subjects registered</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                          <button
                            onClick={() => setSelectedClassArmSubjects(armGroup)}
                            className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-all active:scale-[0.97]"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" /> Curriculum ({armGroup.subjects.length})
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

        {/* PAGINATION FOOTER */}
        {totalRecords > 0 && activeTab !== 'subjects' && (
          <div className="w-full bg-white border border-[#E2D5F8] px-4 sm:px-6 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] shadow-2xs mt-4 shrink-0">
            <span className="text-[#7C6B93] font-bold uppercase text-center sm:text-left">
              Page <span className="text-slate-900 font-black">{currentPage}</span> of <span className="text-slate-900 font-black">{lastPage}</span> (Total: {totalRecords})
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

      {/* STAFF DETAILS MODAL */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden font-sans text-left">
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Staff Personnel Profile</span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">{selectedStaff.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedStaff(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 bg-[#F7F5FC]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-mono text-[11px] border-b border-[#E2D5F8] pb-4">
                <div>
                  <span className="text-[#7C6B93] block font-bold text-[9px] uppercase">Staff Identifier Code</span>
                  <span className="text-slate-950 font-black">STF-{selectedStaff.id}</span>
                </div>
                <div>
                  <span className="text-[#7C6B93] block font-bold text-[9px] uppercase">Official Email</span>
                  <span className="text-slate-950 font-black lowercase truncate block">{selectedStaff.email || 'N/A'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 font-mono mb-2.5 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#7C3AED] shrink-0" /> Complete Teaching Allocations Breakdown
                </h4>
                
                {selectedStaff.assignments && selectedStaff.assignments.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedStaff.assignments.map((asn, i) => (
                      <div key={i} className="p-3 bg-white border border-[#E2D5F8] rounded-2xl flex justify-between items-center font-mono text-xs shadow-2xs gap-2">
                        <span className="font-black text-[#7C3AED] uppercase truncate">{asn.subject}</span>
                        <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-[#7C3AED] font-bold rounded-lg text-[10px] uppercase shrink-0">
                          Arm: {asn.class_arm}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white border border-dashed border-[#E2D5F8] rounded-2xl font-mono text-[10px] text-[#7C6B93] uppercase font-bold shadow-2xs">
                    No active teaching modules assigned to this staff member.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 border-t border-[#7C6B93]/20 flex justify-end">
              <button 
                onClick={() => setSelectedStaff(null)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CURRICULUM MODAL */}
      {selectedClassArmSubjects && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden font-sans text-left">
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Curriculum Partition Matrix</span>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">{selectedClassArmSubjects.class_arm_name} Curriculum</h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClassArmSubjects(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 bg-[#F7F5FC]">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedClassArmSubjects.subjects && selectedClassArmSubjects.subjects.length > 0 ? (
                  selectedClassArmSubjects.subjects.map((sub, sIdx) => (
                    <div key={sIdx} className="p-3.5 bg-white border border-[#E2D5F8] rounded-2xl flex justify-between items-center font-mono text-xs shadow-2xs gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[#7C6B93] font-bold shrink-0">0{sIdx + 1}.</span>
                        <span className="font-black text-slate-900 uppercase truncate">{sub.subject_name}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase border inline-flex items-center gap-1 shrink-0 ${
                        sub.teacher_name !== 'Unassigned Staff' 
                          ? 'bg-purple-50 border-purple-200 text-[#7C3AED]' 
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <User className="w-3 h-3 shrink-0" /> <span className="truncate max-w-[120px]">{sub.teacher_name}</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white border border-dashed border-[#E2D5F8] rounded-2xl font-mono text-[10px] text-[#7C6B93] uppercase font-bold shadow-2xs">
                    No subjects allocated to this class arm.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 border-t border-[#7C6B93]/20 flex justify-end">
              <button 
                onClick={() => setSelectedClassArmSubjects(null)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]"
              >
                Close Curriculum View
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