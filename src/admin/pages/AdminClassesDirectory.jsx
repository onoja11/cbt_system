import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, ArrowLeft, ChevronRight, Layers, Clock, Loader2, 
  User, FileSpreadsheet, Download, BookOpen, Award, TrendingUp, X, Sparkles, BarChart2, Search
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';
import { calculateNigerianGrade, getGradeBadgeStyle } from '../../core/gradingUtils'; // 👈 Imported shared grading component logic

export default function AdminClassesDirectory({ onNavigateBack }) {
  const [currentLevel, setCurrentLevel] = useState('folders'); 
  const [activeTab, setActiveTab] = useState('subjects'); 
  const [isLoading, setIsLoading] = useState(true);

  const [classGroups, setClassGroups] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classGradebook, setClassGradebook] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  useEffect(() => {
    loadInitialDirectoryData();
  }, []);

  const loadInitialDirectoryData = async () => {
    setIsLoading(true);
    try {
      const classRes = await apiRequest('api/v1/admin/directory/class-arms', { method: 'GET' });
      if (classRes.ok) {
        const classPayload = await classRes.json();
        setClassGroups(classPayload.class_arms || []);
      }
    } catch (err) {
      console.error("❌ [DIRECTORY REGISTRY FAULT]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClassArm = async (classArm) => {
    setSelectedClass(classArm);
    setIsLoading(true);
    setSearchQuery('');
    try {
      const res = await apiRequest(`api/v1/admin/directory/class-arms/${classArm.id}/comprehensive-matrix`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        setClassSubjects(payload.subjects || []);
        setClassGradebook(payload.gradebook_matrix || []);
        setCurrentLevel('class_details');
        setActiveTab('subjects');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectStudent = async (studentId) => {
    setIsStudentLoading(true);
    try {
      const res = await apiRequest(`api/v1/admin/directory/students/${studentId}/detailed-transcript`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setSelectedStudentDetail(payload.data);
        }
      }
    } catch (err) {
      console.error("❌ [STUDENT TRANSCRIPT FAULT]:", err);
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handleStepBackwards = () => {
    if (currentLevel === 'class_details') {
      setCurrentLevel('folders');
      setSelectedClass(null);
      setClassSubjects([]);
      setClassGradebook([]);
      setSearchQuery('');
    }
  };

  const filteredClassGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classGroups;
    return classGroups.filter(group => 
      (group.name && group.name.toLowerCase().includes(q)) ||
      (group.division && group.division.toLowerCase().includes(q)) ||
      (group.track && group.track.toLowerCase().includes(q))
    );
  }, [classGroups, searchQuery]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classSubjects;
    return classSubjects.filter(sub => 
      (sub.name && sub.name.toLowerCase().includes(q)) ||
      (sub.code && sub.code.toLowerCase().includes(q)) ||
      (sub.teacher_name && sub.teacher_name.toLowerCase().includes(q))
    );
  }, [classSubjects, searchQuery]);

  const filteredGradebook = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return classGradebook;
    return classGradebook.filter(student => 
      (student.student_name && student.student_name.toLowerCase().includes(q)) ||
      (student.admission_no && student.admission_no.toLowerCase().includes(q))
    );
  }, [classGradebook, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Opening school records from central databases...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-x-hidden">

      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={currentLevel !== 'folders' ? handleStepBackwards : onNavigateBack} 
            className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center shrink-0">
            <Logo size={28} showText={false} />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
              {currentLevel === 'folders' && "START-RITE ADMIN PORTAL"}
              {currentLevel === 'class_details' && `${selectedClass?.name} • MANAGEMENT`}
            </h1>
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-0.5 truncate hidden sm:block">
              {currentLevel === 'folders' && "CLASS ARMS REGISTER & CURRICULUM MATRIX"}
              {currentLevel === 'class_details' && "INSPECT SUBJECTS, FACULTY, AND GRADEBOOK"}
            </p>
          </div>
        </div>

        {currentLevel === 'class_details' && (
          <div className="flex bg-white/20 p-1 rounded-2xl border border-white/30 font-mono text-[10px] font-bold gap-1 w-full sm:w-auto justify-center overflow-x-auto">
            <button 
              onClick={() => { setActiveTab('subjects'); setSearchQuery(''); }}
              className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 shrink-0 ${
                activeTab === 'subjects' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Subjects
            </button>
            <button 
              onClick={() => { setActiveTab('gradebook'); setSearchQuery(''); }}
              className={`px-3 sm:px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-all font-mono font-black flex items-center gap-1.5 shrink-0 ${
                activeTab === 'gradebook' ? 'bg-white text-[#7C3AED] shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Gradebook
            </button>
          </div>
        )}
      </header>

      {currentLevel === 'folders' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 my-auto flex flex-col justify-start space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="text-left w-full sm:w-auto">
              <h3 className="text-xs font-black text-[#7C6B93] uppercase tracking-wider font-mono">School Register Indices</h3>
              <p className="text-xs text-slate-600 mt-0.5 font-sans font-semibold">Select a cohort class arm folder to review comprehensive subjects, assigned teachers, and student performance records.</p>
            </div>
            
            <div className="relative w-full sm:w-72 bg-white border border-[#E2D5F8] rounded-2xl shadow-2xs overflow-hidden shrink-0">
              <Search className="w-4 h-4 text-[#7C6B93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search class folders..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl font-bold text-slate-900 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          {filteredClassGroups.length === 0 ? (
            <div className="text-center p-8 text-[#7C6B93] font-black uppercase font-mono text-xs py-20 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl shadow-2xs">
              No matching class folders found for "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClassGroups.map((group, index) => {
                const cardStyles = [
                  { bg: 'bg-[#F3EEFC]', border: 'border-[#E2D5F8]', text: 'text-[#7C3AED]', badge: 'bg-white text-[#7C3AED]' },
                  { bg: 'bg-[#FCE7EE]', border: 'border-[#F8D3DF]', text: 'text-[#E11D48]', badge: 'bg-white text-[#E11D48]' },
                  { bg: 'bg-[#EBFBF3]', border: 'border-[#C6F6D5]', text: 'text-[#059669]', badge: 'bg-white text-[#059669]' },
                  { bg: 'bg-[#FFFBEB]', border: 'border-[#FEF3C7]', text: 'text-[#D97706]', badge: 'bg-white text-[#D97706]' }
                ];
                const currentStyle = cardStyles[index % cardStyles.length];

                return (
                  <div 
                    key={group.id} 
                    onClick={() => handleSelectClassArm(group)} 
                    className={`${currentStyle.bg} border ${currentStyle.border} rounded-3xl p-5 hover:shadow-md cursor-pointer group transition-all h-40 flex flex-col justify-between text-left shadow-2xs`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 ${currentStyle.badge} border ${currentStyle.border} rounded-xl flex items-center justify-center shadow-2xs shrink-0`}>
                          <Folder className={`w-4 h-4 ${currentStyle.text}`} />
                        </div>
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 bg-white/80 rounded-md border border-slate-200 text-slate-600 truncate max-w-[120px]">
                          {group.division || 'Branch'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase truncate">{group.track || 'Start-Rite'}</h4>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5 truncate">{group.name}</h2>
                      </div>
                    </div>

                    <div className="border-t border-[#E2D5F8]/50 pt-2.5 flex justify-between items-center text-[10px] font-mono font-black text-slate-700 uppercase tracking-wider group-hover:text-[#7C3AED] transition-colors">
                      <span className="truncate">Manage Folder Contents</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {currentLevel === 'class_details' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 my-auto flex flex-col justify-start space-y-4">
          
          <div className="w-full bg-white border border-[#E2D5F8] px-4 sm:px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs shrink-0">
            <div className="relative w-full sm:max-w-md bg-white border border-[#E2D5F8] rounded-xl shadow-2xs overflow-hidden">
              <Search className="w-4 h-4 text-[#7C6B93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'subjects' ? "Search subjects or teachers..." : "Search student names or admission numbers..."}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl font-bold text-slate-900 focus:outline-none uppercase font-mono"
              />
            </div>
            <div className="font-mono text-[10px] font-black uppercase text-[#7C6B93] shrink-0">
              {activeTab === 'subjects' ? `${filteredSubjects.length} of ${classSubjects.length} subjects` : `${filteredGradebook.length} of ${classGradebook.length} students`}
            </div>
          </div>

          {activeTab === 'subjects' && (
            <div className="space-y-4 animate-fadeIn">
              {filteredSubjects.length === 0 ? (
                <div className="text-center p-8 text-[#7C6B93] font-black uppercase font-mono text-xs py-20 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl shadow-2xs">
                  No matching subjects found for "{searchQuery}".
                </div>
              ) : (
                <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[600px]">
                      <thead>
                        <tr className="bg-[#7C3AED] text-white font-black uppercase text-[10px] tracking-wider border-b border-[#E2D5F8]">
                          <th className="p-3.5 sm:p-4 pl-6 w-16">S/N</th>
                          <th className="p-3.5 sm:p-4">Subject Code</th>
                          <th className="p-3.5 sm:p-4 font-sans">Subject Title</th>
                          <th className="p-3.5 sm:p-4 pr-6 text-right font-sans">Assigned Faculty / Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                        {filteredSubjects.map((sub, sIdx) => (
                          <tr key={sub.id || sIdx} className="hover:bg-[#FAF9FA] transition-colors">
                            <td className="p-3.5 sm:p-4 pl-6 text-[#7C6B93]">0{sIdx + 1}</td>
                            <td className="p-3.5 sm:p-4 font-black text-[#7C3AED]">{sub.code || 'SUB'}</td>
                            <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" /> <span className="truncate">{sub.name}</span>
                            </td>
                            <td className="p-3.5 sm:p-4 pr-6 text-right font-sans">
                              <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase border bg-[#F3EEFC] border-[#E2D5F8] text-[#7C3AED] inline-flex items-center gap-1 shadow-2xs truncate max-w-[180px]">
                                <User className="w-3 h-3 shrink-0" /> <span className="truncate">{sub.teacher_name || 'Unassigned'}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gradebook' && (
            <div className="space-y-4 animate-fadeIn">
              {filteredGradebook.length === 0 ? (
                <div className="text-center p-8 text-[#7C6B93] font-black uppercase font-mono text-xs py-20 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl shadow-xs">
                  No matching student records found for "{searchQuery}".
                </div>
              ) : (
                <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[650px]">
                      <thead>
                        <tr className="bg-[#7C3AED] text-white font-black uppercase border-b border-[#E2D5F8] text-[10px] tracking-wider">
                          <th className="p-3.5 sm:p-4 pl-6">Admission No</th>
                          <th className="p-3.5 sm:p-4 font-sans">Student Full Name</th>
                          <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">Subjects Taken</th>
                          <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/80">Cumulative Total</th>
                          <th className="p-3.5 sm:p-4 text-center bg-[#E11D48]">Position</th>
                          <th className="p-3.5 sm:p-4 text-center pr-6 font-sans">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                        {filteredGradebook.map((student, idx) => (
                          <tr key={student.student_id || idx} className="hover:bg-[#FAF9FA] transition-colors cursor-pointer" onClick={() => handleInspectStudent(student.student_id)}>
                            <td className="p-3.5 sm:p-4 pl-6 text-[#7C6B93] font-black">{student.admission_no}</td>
                            <td className="p-3.5 sm:p-4 font-sans font-black text-slate-950 text-xs truncate max-w-[150px] sm:max-w-none">{student.student_name}</td>
                            <td className="p-3.5 sm:p-4 text-center text-[#7C6B93]">{student.subjects_count} Subs</td>
                            <td className="p-3.5 sm:p-4 text-center bg-[#F7F5FC] font-black text-[#7C3AED]">{student.cumulative_total} Pts</td>
                            <td className="p-3.5 sm:p-4 text-center">
                              <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-[#7C3AED] rounded-lg font-black text-xs inline-block">
                                {student.position || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3.5 sm:p-4 text-center pr-6 font-sans">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleInspectStudent(student.student_id); }}
                                className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1 transition-all active:scale-[0.97]"
                              >
                                View <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />
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
          )}

        </main>
      )}

      {/* 🎯 DETAILED STUDENT TRANSCRIPT MODAL USING STANDARDIZED NIGERIAN GRADING */}
      {(selectedStudentDetail || isStudentLoading) && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[50000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden font-sans text-left max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white p-4 sm:p-5 flex justify-between items-center font-mono shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider block">Student Academic Transcript & Statistics</span>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white mt-0.5 font-sans truncate">
                  {selectedStudentDetail ? `${selectedStudentDetail.student.name} (${selectedStudentDetail.student.admission_no})` : 'Loading Student Record...'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedStudentDetail(null)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-[#F7F5FC]">
              {isStudentLoading ? (
                <div className="py-20 text-center font-mono text-xs uppercase text-[#7C6B93] font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" /> Compiling student assessment breakdown...
                </div>
              ) : selectedStudentDetail ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
                    <div className="p-3 sm:p-4 bg-[#F3EEFC] border border-[#E2D5F8] rounded-2xl text-left shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-[#7C6B93] uppercase block">Class Position</span>
                      <p className="text-sm sm:text-base font-black text-[#7C3AED] mt-1 flex items-center gap-1 font-mono">
                        <Award className="w-4 h-4 text-amber-600 shrink-0" /> {selectedStudentDetail.stats.position}
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 bg-[#EBFBF3] border border-[#C6F6D5] rounded-2xl text-left shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-slate-600 uppercase block">Cumulative Total</span>
                      <p className="text-sm sm:text-base font-black text-[#059669] mt-1 font-mono">{selectedStudentDetail.stats.cumulative_total} Pts</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl text-left shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-slate-600 uppercase block">Student Average</span>
                      <p className="text-sm sm:text-base font-black text-[#D97706] mt-1 font-mono">{selectedStudentDetail.stats.student_average}%</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-[#FCE7EE] border border-[#F8D3DF] rounded-2xl text-left shadow-2xs">
                      <span className="text-[9px] sm:text-[10px] font-sans font-bold text-slate-600 uppercase block">Class Average</span>
                      <p className="text-sm sm:text-base font-black text-[#E11D48] mt-1 font-mono">{selectedStudentDetail.stats.class_average}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-[#7C3AED] shrink-0" /> Assessment Score Matrix & Assigned Teachers
                    </h4>
                    <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse font-mono text-[11px] min-w-[650px]">
                          <thead>
                            <tr className="bg-[#7C3AED] text-white font-black uppercase text-[9px] border-b border-[#E2D5F8]">
                              <th className="p-3.5 sm:p-4 pl-6 font-sans">Subject Title</th>
                              <th className="p-3.5 sm:p-4 font-mono">Assigned Teacher</th>
                              <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">CA 1</th>
                              <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">CA 2</th>
                              <th className="p-3.5 sm:p-4 text-center bg-[#7C3AED]/90">CA 3</th>
                              <th className="p-3.5 sm:p-4 text-center bg-slate-900">Exam</th>
                              <th className="p-3.5 sm:p-4 text-center bg-[#E11D48]">Total</th>
                              <th className="p-3.5 sm:p-4 text-center pr-6">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2D5F8] uppercase font-bold text-slate-700 bg-white">
                            {selectedStudentDetail.subjects.map((sub, sIdx) => {
                              const standardGrade = calculateNigerianGrade(sub.total, sub.max_score || 100);

                              return (
                                <tr key={sIdx} className="hover:bg-[#FAF9FA] transition-colors">
                                  <td className="p-3.5 sm:p-4 pl-6 font-sans font-black text-slate-950 text-xs truncate max-w-[140px] sm:max-w-none">{sub.subject_name}</td>
                                  <td className="p-3.5 sm:p-4 text-[10px] text-[#7C6B93] font-mono truncate max-w-[120px] sm:max-w-none">{sub.teacher_name}</td>
                                  <td className="p-3.5 sm:p-4 text-center text-[#7C6B93]">{sub.ca1}</td>
                                  <td className="p-3.5 sm:p-4 text-center text-[#7C6B93]">{sub.ca2}</td>
                                  <td className="p-3.5 sm:p-4 text-center text-[#7C6B93]">{sub.ca3}</td>
                                  <td className="p-3.5 sm:p-4 text-center text-[#7C6B93]">{sub.exam}</td>
                                  <td className="p-3.5 sm:p-4 text-center bg-[#F7F5FC] font-black text-slate-950 border-x border-[#E2D5F8]">{sub.total}</td>
                                  <td className="p-3.5 sm:p-4 text-center pr-6">
                                    <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border inline-block ${getGradeBadgeStyle(standardGrade)}`}>
                                      {standardGrade}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="bg-white p-4 border-t border-[#7C6B93]/20 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedStudentDetail(null)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.97]"
              >
                Close Transcript
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