import React, { useState, useEffect } from 'react';
import { Folder, ArrowLeft, ChevronRight, Layers, Clock, Loader2, User, FileSpreadsheet, Download } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminClassesDirectory({ onNavigateBack }) {
  const [currentLevel, setCurrentLevel] = useState('folders'); 
  const [isLoading, setIsLoading] = useState(true);

  const [classGroups, setClassGroups] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [gradebookMatrix, setGradebookMatrix] = useState([]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

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

  useEffect(() => {
    loadInitialDirectoryData();
  }, []);

  const handleSelectClassArm = async (classArm) => {
    setSelectedClass(classArm);
    setIsLoading(true);
    try {
      const res = await apiRequest(`api/v1/admin/directory/class-arms/${classArm.id}/subjects`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        setSubjectList(payload.subjects || []);
        setCurrentLevel('subjects');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject);
    setIsLoading(true);
    try {
      const res = await apiRequest(`api/v1/admin/directory/grades/${selectedClass.id}/${subject.id}`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        setGradebookMatrix(payload.matrix || []);
        setCurrentLevel('gradebook');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 📥 LIVE EXCEL GENERATOR ROUTINE (.xls via Data URI Application Matrix)
   */
  const handleDownloadExcelSheet = () => {
    if (gradebookMatrix.length === 0) return;

    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <tr style="background-color: #2a1a63; color: #ffffff; font-weight: bold; text-align: center;">
            <th>Admission No</th>
            <th>Student Full Name</th>
            <th>CA 1</th>
            <th>CA 2</th>
            <th>CA 3</th>
            <th>Terminal Exam</th>
            <th>Total Score</th>
            <th>Grade</th>
            <th>Remark</th>
          </tr>
    `;

    gradebookMatrix.forEach(row => {
      excelTemplate += `
        <tr>
          <td style="mso-number-format:'\\@'; font-weight: bold;">${row.admission_number}</td>
          <td>${row.student_name}</td>
          <td style="text-align: center;">${row.ca1}</td>
          <td style="text-align: center;">${row.ca2}</td>
          <td style="text-align: center;">${row.ca3}</td>
          <td style="text-align: center;">${row.exam}</td>
          <td style="text-align: center; font-weight: bold; background-color: #faf9fa;">${row.total}</td>
          <td style="text-align: center; font-weight: bold;">${row.grade}</td>
          <td>${row.remark}</td>
        </tr>
      `;
    });

    excelTemplate += `</table></body></html>`;

    const blobFile = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const downloadUrl = URL.createObjectURL(blobFile);
    const hiddenAnchor = document.createElement('a');
    
    const formattedFileName = `${String(selectedClass?.name || 'CLASS').replace(/\s+/g, '_')}_${String(selectedSubject?.code || 'SUB')}_GRADEBOOK.xls`;
    
    hiddenAnchor.href = downloadUrl;
    hiddenAnchor.download = formattedFileName;
    document.body.appendChild(hiddenAnchor);
    hiddenAnchor.click();
    hiddenAnchor.remove();
  };

  const handleStepBackwards = () => {
    if (currentLevel === 'gradebook') {
      setCurrentLevel('subjects');
      setGradebookMatrix([]);
    } else if (currentLevel === 'subjects') {
      setCurrentLevel('folders');
      setSelectedClass(null);
      setSubjectList([]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Opening school records from the central databases...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-x-hidden">
      
      {/* BRAND HEADER CONTROL */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-3xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={currentLevel !== 'folders' ? handleStepBackwards : onNavigateBack} 
            className="p-1.5 border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] hover:bg-[#FAF9FA] cursor-pointer transition-all active:scale-[0.95]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="mr-1">
            <Logo size={45} showText={false} />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">
              {currentLevel === 'folders' && "Class Arms Register"}
              {currentLevel === 'subjects' && `${selectedClass?.name} • Subject Registry`}
              {currentLevel === 'gradebook' && `${selectedClass?.name} • ${selectedSubject?.name}`}
            </h2>
            <p className="text-[10px] text-[#9A87A9] font-bold uppercase font-mono tracking-tight mt-0.5">
              {currentLevel === 'folders' && "Official Performance Cohort Directory"}
              {currentLevel === 'subjects' && "Select a subject course to inspect grade reports"}
              {currentLevel === 'gradebook' && "Official Performance Score-Sheet Report Card"}
            </p>
          </div>
        </div>

        {currentLevel === 'gradebook' && (
          <button 
            onClick={handleDownloadExcelSheet}
            className="px-4 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.96]"
          >
            <Download className="w-3.5 h-3.5" /> Export Spreadsheet (.XLS)
          </button>
        )}
      </header>

      {/* VIEW SUB-LAYER 1: CLASS ARMS FOLDERS GRID */}
      {currentLevel === 'folders' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 my-auto flex flex-col justify-start">
          <div className="mb-5 pb-1 border-b border-[#FAF9FA] text-left">
            <h3 className="text-xs font-black text-[#9A87A9] uppercase tracking-wider font-mono">School Register Indices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a cohort class arm folder to review comprehensive continuous assessment sheets and records portfolios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classGroups.map((group) => (
              <div key={group.id} onClick={() => handleSelectClassArm(group)} className="bg-white border border-[#9A87A9]/20 rounded-xl p-5 hover:border-[#2A1A63] cursor-pointer group transition-all h-36 flex flex-col justify-between shadow-3xs">
                <div className="space-y-1 text-left">
                  <Folder className="w-5 h-5 text-[#9A87A9] group-hover:text-[#2A1A63] transition-all" />
                  <h4 className="text-sm font-black text-slate-950 mt-2 uppercase">{group.name}</h4>
                  <p className="text-[10px] text-[#9A87A9] font-mono font-black uppercase tracking-wide">{group.track || 'Start-Rite'} • {group.division || 'Cohort Branch'}</p>
                </div>
                <div className="border-t border-[#FAF9FA] pt-2.5 flex justify-between items-center text-[10px] font-mono font-black text-[#9A87A9] uppercase tracking-wider">
                  <span>Access {group.subjects_count} Subject Matrices</span>
                  <ChevronRight className="w-4 h-4 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-[#2A1A63] transition-all" />
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW SUB-LAYER 2: SUBJECTS LIST MATRIX */}
      {currentLevel === 'subjects' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 my-auto flex flex-col justify-start">
          <div className="mb-5 pb-1 border-b border-[#FAF9FA] text-left">
            <h3 className="text-xs font-black text-[#9A87A9] uppercase tracking-wider font-mono">Subjects Registry Allocation</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select an internal syllabus curriculum layer to generate the complete structural term summary metrics.</p>
          </div>

          {subjectList.length === 0 ? (
            <div className="text-center p-12 text-[#9A87A9] font-black uppercase font-mono text-xs py-24 bg-white border border-[#9A87A9]/20 rounded-xl">No active courses currently assigned to {selectedClass?.name}.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectList.map((subject) => (
                <div key={subject.id} onClick={() => handleSelectSubject(subject)} className="bg-white border border-[#9A87A9]/20 hover:border-[#2A1A63] p-5 rounded-xl cursor-pointer group shadow-3xs transition-all flex justify-between items-center h-24">
                  <div className="space-y-1 truncate text-left">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#FAF9FA] text-slate-700 border border-[#9A87A9]/20 rounded-md font-mono text-[9px] font-black uppercase shrink-0">{subject.code}</span>
                      <h4 className="text-xs md:text-sm font-black tracking-tight text-slate-950 uppercase truncate">{subject.name}</h4>
                    </div>
                    <p className="text-[11px] text-[#9A87A9] uppercase font-mono tracking-wide flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#9A87A9]/60" /> Assigned Teacher: <span className="text-slate-950 font-sans font-black">{subject.teacher}</span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9A87A9] group-hover:translate-x-0.5 group-hover:text-[#2A1A63] transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* VIEW SUB-LAYER 3: REPORT CARDS VAULT TABLE DISPLAY */}
      {currentLevel === 'gradebook' && (
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 my-auto flex flex-col justify-start overflow-hidden">
          <div className="mb-4 pb-2 border-b border-[#FAF9FA] flex justify-between items-center flex-wrap gap-2">
            <div className="text-left">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider font-mono flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4 text-[#9A87A9]" /> Consolidated Term Summary Sheet
              </h3>
              <p className="text-[11px] text-[#9A87A9] font-mono uppercase mt-0.5">Start-Rite Schools Automated Evaluation Records Registry System</p>
            </div>
            <div className="bg-[#2A1A63] text-white font-mono font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wider">
              {selectedSubject?.code} Matrix Grid
            </div>
          </div>

          {gradebookMatrix.length === 0 ? (
            <div className="text-center p-12 text-[#9A87A9] font-black uppercase font-mono text-xs py-24 bg-white border border-[#9A87A9]/20 rounded-xl shadow-3xs">No student performance records compiled within this test track ledger yet.</div>
          ) : (
            <div className="bg-white border border-[#9A87A9]/20 rounded-xl overflow-hidden shadow-3xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="bg-[#2A1A63] text-white font-black uppercase border-b border-[#2A1A63] text-[10px] tracking-wider">
                      <th className="p-3 pl-4">Admission No</th>
                      <th className="p-3 font-sans">Full Name</th>
                      <th className="p-3 text-center">CA 1</th>
                      <th className="p-3 text-center">CA 2</th>
                      <th className="p-3 text-center">CA 3</th>
                      <th className="p-3 text-center">Terminal Exam</th>
                      <th className="p-3 text-center bg-slate-900">Grand Total</th>
                      <th className="p-3 text-center">Final Grade</th>
                      <th className="p-3 text-center pr-4 font-sans">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 uppercase font-bold text-slate-700">
                    {gradebookMatrix.map((student, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF9FA]/40 transition-colors">
                        <td className="p-3 pl-4 text-[#9A87A9] font-black tracking-wide">{student.admission_number}</td>
                        <td className="p-3 font-sans font-black text-slate-950 text-xs tracking-tight text-left">{student.student_name}</td>
                        <td className="p-3 text-center text-[#9A87A9]">{student.ca1}</td>
                        <td className="p-3 text-center text-[#9A87A9]">{student.ca2}</td>
                        <td className="p-3 text-center text-[#9A87A9]">{student.ca3}</td>
                        <td className="p-3 text-center text-[#9A87A9]">{student.exam}</td>
                        <td className="p-3 text-center bg-[#FAF9FA] font-black text-[#2A1A63] border-x border-[#9A87A9]/10 text-xs">{student.total}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] border uppercase ${
                            student.grade === 'A' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            student.grade === 'B' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                            student.grade === 'C' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-[#C62927]'
                          }`}>
                            Grade {student.grade}
                          </span>
                        </td>
                        <td className="p-3 text-center pr-4 font-sans text-[11px] font-black text-[#9A87A9] text-left">{student.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}

      {/* FOOTER LAYER */}
      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Records Directory Systems Layer © 2026
      </footer>

    </div>
  );
}