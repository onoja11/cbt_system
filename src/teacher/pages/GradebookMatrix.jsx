import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function GradebookMatrix({ activeFolderContext, onNavigateBack }) {
  const [gradebookRows, setGradebookRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🏛️ STARTRITE SCHOOLS COMPREHENSIVE ASSESSMENT BOUNDARIES
  const computeSchoolGradeMetrics = (totalScore) => {
    const score = parseFloat(totalScore || 0);
    if (score >= 75.00) return { grade: 'A', remarks: 'EXCELLENT', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 65.00) return { grade: 'B', remarks: 'VERY GOOD', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 50.00) return { grade: 'C', remarks: 'GOOD', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (score >= 40.00) return { grade: 'D', remarks: 'PASS', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { grade: 'F', remarks: 'FAIL', color: 'text-[#C62927] bg-rose-50 border-rose-200 font-black' };
  };

  useEffect(() => {
    const fetchClassGradebookMatrix = async () => {
      setIsLoading(true);
      try {
        const classArmId = activeFolderContext?.id || localStorage.getItem('saved_folder_id_context');
        const subjectId = activeFolderContext?.subject_id || 
                          activeFolderContext?.subjectId || 
                          activeFolderContext?.course_id || 
                          localStorage.getItem('saved_subject_id_context') || '';

        if (subjectId) {
          localStorage.setItem('saved_subject_id_context', subjectId);
        }

        const response = await apiRequest(`api/v1/teacher/folders/${classArmId}/gradebook-matrix?subject_id=${subjectId}`, { 
          method: 'GET' 
        });
        const data = await response.json();

        if (response.ok && data.matrix) {
          setGradebookRows(data.matrix);
        }
      } catch (error) {
        console.error("❌ GRADEBOOK_INGESTION_FAULT:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeFolderContext?.id) {
      localStorage.setItem('saved_folder_id_context', activeFolderContext.id);
    }
    fetchClassGradebookMatrix();
  }, [activeFolderContext]);

  const filteredRoster = gradebookRows.filter(student => {
    const name = String(student.student_name || student.name || '').toLowerCase();
    const admissionNo = String(student.admission_no || student.admissionNo || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || admissionNo.includes(searchTerm.toLowerCase());
  });

  const handleExportOfficeGradebook = () => {
    let workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          th { background-color: #2a1a63; color: #ffffff; font-weight: bold; font-family: sans-serif; text-transform: uppercase; font-size: 10px; height: 30px; text-align: center; }
          td { font-family: sans-serif; font-size: 11px; height: 26px; text-align: center; }
          .student-title { text-align: left; font-weight: bold; }
          .num-format { mso-number-format:"\\@"; }
          .aggregate-cell { font-weight: 900; background-color: #faf9fa; }
        </style>
      </head>
      <body>
        <h3>START-RITE SCHOOLS MASTER EXAM GRADEBOOK</h3>
        <p>COHORT FOLDER: ${String(activeFolderContext?.name || 'RECORDS').toUpperCase()} (${activeFolderContext?.classGroup || 'N/A'})</p>
        <table border="1">
          <thead>
            <tr>
              <th>Student Full Name</th>
              <th>Admission Number</th>
              <th>CA 1</th>
              <th>CA 2</th>
              <th>CA 3</th>
              <th>Total CA Mark</th>
              <th>Final Exam</th>
              <th>Grand Total Score</th>
              <th>Final Grade</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRoster.forEach(row => {
      const ca1 = parseFloat(row.ca1_score ?? 0);
      const ca2 = parseFloat(row.ca2_score ?? 0);
      const ca3 = parseFloat(row.ca3_score ?? row.ca3_obj_score ?? 0) + parseFloat(row.ca3_theory_score ?? 0);
      const totalCA = ca1 + ca2 + ca3;
      const exam = parseFloat(row.exam_score ?? 0);
      const grandTotal = totalCA + exam;
      const metrics = computeSchoolGradeMetrics(grandTotal);

      workbookHtml += `
        <tr>
          <td class="student-title">${String(row.student_name || row.name || 'UNKNOWN CANDIDATE').toUpperCase()}</td>
          <td class="num-format">${row.admission_no || row.admissionNo || 'N/A'}</td>
          <td>${ca1.toFixed(1)}</td>
          <td>${ca2.toFixed(1)}</td>
          <td>${ca3.toFixed(1)}</td>
          <td style="background-color: #faf9fa; font-weight: bold;">${totalCA.toFixed(1)}</td>
          <td>${exam.toFixed(1)}</td>
          <td class="aggregate-cell">${grandTotal.toFixed(1)}</td>
          <td style="font-weight: bold;">${metrics.grade}</td>
          <td>${metrics.remarks}</td>
        </tr>
      `;
    });

    workbookHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blobStream = new Blob([workbookHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blobStream);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", blobUrl);
    downloadAnchor.setAttribute("download", `OFFICIAL_GRADEBOOK_MATRIX_CLASS_${activeFolderContext?.id || 'LEAN'}.xls`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Compiling class performance evaluation sheets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      {/* 🏛️ EXACT REFERENCE GRADIENT HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-3.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateBack} 
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-white/80 uppercase tracking-wider block">Continuous Assessment Folder Matrix</span>
            <h2 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
              Teacher Ledger View: {activeFolderContext?.name || 'Class Core'}
            </h2>
          </div>
        </div>

        {/* 🎯 UNIFORM VIBRANT GREEN BUTTON STYLE */}
        <button 
          onClick={handleExportOfficeGradebook}
          className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer !bg-[#22C55E] !text-white"
        >
          <FileSpreadsheet className="w-4 h-4 text-white" /> EXPORT REPORT SHEET (.XLS)
        </button>
      </header>

      {/* SEARCH CORE MODULE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col justify-start gap-6">
        <div className="w-full flex items-center relative max-w-md bg-white border border-[#E2D5F8] rounded-2xl shadow-2xl overflow-hidden">
          <Search className="w-4 h-4 text-[#7C6B93] absolute left-4" />
          <input 
            type="text"
            placeholder="Search student name or admission identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-xs rounded-2xl font-bold text-slate-900 focus:outline-none"
          />
        </div>

        {/* COMPREHENSIVE EVALUATION REGISTRY TABLE MAP */}
        <div className="w-full bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#7C3AED] text-white font-mono text-[9px] uppercase tracking-wider border-b border-[#E2D5F8]">
                  <th className="p-4 font-black">Student Full Name</th>
                  <th className="p-4 font-black">Admission Number</th>
                  <th className="p-4 font-black text-center bg-[#7C3AED]/90">CA 1</th>
                  <th className="p-4 font-black text-center bg-[#7C3AED]/90">CA 2</th>
                  <th className="p-4 font-black text-center bg-[#7C3AED]/90">CA 3</th>
                  <th className="p-4 font-black text-center bg-[#7C3AED]/80">Total CA</th>
                  <th className="p-4 font-black text-center bg-slate-900">Final Exam</th>
                  <th className="p-4 font-black text-center bg-[#E11D48]">Grand Total</th>
                  <th className="p-4 font-black text-center">Final Grade</th>
                  <th className="p-4 font-black text-center">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5F8] font-bold text-slate-700 bg-white">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center font-mono text-[#7C6B93] uppercase tracking-wide bg-white">
                      No matching student report entries located in this course track.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((row, idx) => {
                    const ca1 = parseFloat(row.ca1_score ?? 0);
                    const ca2 = parseFloat(row.ca2_score ?? 0);
                    const ca3 = parseFloat(row.ca3_score ?? row.ca3_obj_score ?? 0) + parseFloat(row.ca3_theory_score ?? 0);
                    const totalCA = ca1 + ca2 + ca3;
                    const exam = parseFloat(row.exam_score ?? 0);
                    const grandTotal = totalCA + exam;
                    const metrics = computeSchoolGradeMetrics(grandTotal);

                    return (
                      <tr key={row.student_profile_id || row.id || idx} className="hover:bg-[#FAF9FA] transition-colors">
                        <td className="p-4 font-black text-slate-950 uppercase truncate max-w-xs">{row.student_name || row.name}</td>
                        <td className="p-4 font-mono text-[11px] text-[#7C6B93] uppercase">{row.admission_no || row.admissionNo}</td>
                        <td className="p-4 text-center font-mono text-[#7C6B93]">{ca1.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#7C6B93]">{ca2.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#7C6B93]">{ca3.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-[#7C3AED] border-r border-[#E2D5F8] bg-[#F7F5FC]">{totalCA.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#7C6B93]">{exam.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-slate-950 bg-[#FAF9FA] text-sm border-x border-[#E2D5F8]">{grandTotal.toFixed(1)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs border ${metrics.color}`}>
                            {metrics.grade}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-[10px] font-black text-[#7C6B93] uppercase">{metrics.remarks}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-rite intrnet institutional security matrix
      </footer>

    </div>
  );
}