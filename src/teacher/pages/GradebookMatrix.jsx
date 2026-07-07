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
              <th>CA 3 Obj</th>
              <th>CA 3 Theory</th>
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
      const ca3Obj = parseFloat(row.ca3_obj_score ?? 0);
      const ca3Thy = parseFloat(row.ca3_theory_score ?? 0);
      const totalCA = ca1 + ca2 + ca3Obj + ca3Thy;
      const exam = parseFloat(row.exam_score ?? 0);
      const grandTotal = totalCA + exam;
      const metrics = computeSchoolGradeMetrics(grandTotal);

      workbookHtml += `
        <tr>
          <td class="student-title">${String(row.student_name || row.name || 'UNKNOWN CANDIDATE').toUpperCase()}</td>
          <td class="num-format">${row.admission_no || row.admissionNo || 'N/A'}</td>
          <td>${ca1.toFixed(1)}</td>
          <td>${ca2.toFixed(1)}</td>
          <td>${ca3Obj.toFixed(1)}</td>
          <td>${ca3Thy.toFixed(1)}</td>
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
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Compiling class performance evaluation sheets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      {/* BRAND SUB-LAYER CONTROL HEADER */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div>
              <span className="text-[9px] font-mono font-black text-[#9A87A9] uppercase tracking-widest block">Continuous Assessment Folder Matrix</span>
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-tight mt-0.5">
                Teacher Ledger View: {activeFolderContext?.name || 'Class Core'}
              </h2>
            </div>
          </div>

          <button 
            onClick={handleExportOfficeGradebook}
            className="w-full sm:w-auto px-4 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report Sheet (.XLS)
          </button>
        </div>
      </header>

      {/* SEARCH CORE MODULE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col justify-start gap-4">
        <div className="w-full flex items-center relative max-w-md bg-white">
          <Search className="w-4 h-4 text-[#9A87A9] absolute left-3" />
          <input 
            type="text"
            placeholder="Search student name or admission identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#9A87A9]/40 text-xs rounded-lg font-bold text-slate-950 focus:outline-none focus:border-[#2A1A63]"
          />
        </div>

        {/* COMPREHENSIVE EVALUATION REGISTRY TABLE MAP */}
        <div className="w-full bg-white border border-[#9A87A9]/30 rounded-xl overflow-hidden shadow-3xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#2A1A63] text-white font-mono text-[9px] uppercase tracking-wider border-b border-[#2A1A63]">
                  <th className="p-4 font-black">Student Full Name</th>
                  <th className="p-4 font-black">Admission Number</th>
                  <th className="p-4 font-black text-center bg-[#2A1A63]/90">CA 1</th>
                  <th className="p-4 font-black text-center bg-[#2A1A63]/90">CA 2</th>
                  <th className="p-4 font-black text-center bg-[#2A1A63]/90">CA 3 Obj</th>
                  <th className="p-4 font-black text-center bg-[#2A1A63]/90">CA 3 Thy</th>
                  <th className="p-4 font-black text-center bg-[#2A1A63]/80">Total CA</th>
                  <th className="p-4 font-black text-center bg-slate-900">Final Exam</th>
                  <th className="p-4 font-black text-center bg-[#C62927]">Grand Total</th>
                  <th className="p-4 font-black text-center">Final Grade</th>
                  <th className="p-4 font-black text-center">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center font-mono text-[#9A87A9] uppercase tracking-wide bg-white">
                      No matching student report entries located in this course track.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((row, idx) => {
                    const ca1 = parseFloat(row.ca1_score ?? 0);
                    const ca2 = parseFloat(row.ca2_score ?? 0);
                    const ca3Obj = parseFloat(row.ca3_obj_score ?? 0);
                    const ca3Thy = parseFloat(row.ca3_theory_score ?? 0);
                    const totalCA = ca1 + ca2 + ca3Obj + ca3Thy;
                    const exam = parseFloat(row.exam_score ?? 0);
                    const grandTotal = totalCA + exam;
                    const metrics = computeSchoolGradeMetrics(grandTotal);

                    return (
                      <tr key={row.student_profile_id || row.id || idx} className="hover:bg-[#FAF9FA]/40 transition-colors">
                        <td className="p-4 font-black text-slate-950 uppercase truncate max-w-xs">{row.student_name || row.name}</td>
                        <td className="p-4 font-mono text-[11px] text-[#9A87A9] uppercase">{row.admission_no || row.admissionNo}</td>
                        <td className="p-4 text-center font-mono text-[#9A87A9]">{ca1.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#9A87A9]">{ca2.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#9A87A9]">{ca3Obj.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#9A87A9]">{ca3Thy.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-[#2A1A63] border-r border-[#FAF9FA] bg-[#FAF9FA]/50">{totalCA.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono text-[#9A87A9]">{exam.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-slate-950 bg-[#FAF9FA] text-sm border-x border-[#9A87A9]/10">{grandTotal.toFixed(1)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded font-bold text-xs border ${metrics.color}`}>
                            {metrics.grade}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-[10px] font-black text-[#9A87A9] uppercase">{metrics.remarks}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Core Grading Matrices Systems Infrastructure Layer
      </footer>

    </div>
  );
}