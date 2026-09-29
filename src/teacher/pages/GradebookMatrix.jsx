import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function GradebookMatrix({ activeFolderContext, onNavigateBack }) {
  const [gradebookRows, setGradebookRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
        <h3>START-RITE SCHOOLS MASTER EXAM GRADEBOOK (CA1 & EXAM)</h3>
        <p>COHORT FOLDER: ${String(activeFolderContext?.name || 'RECORDS').toUpperCase()} (${activeFolderContext?.classGroup || 'N/A'})</p>
        <table border="1">
          <thead>
            <tr>
              <th>Student Full Name</th>
              <th>Admission Number</th>
              <th>CA 1 (Max 20)</th>
              <th>Final Exam (Max 60)</th>
              <th>Grand Total Score (Max 80)</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRoster.forEach(row => {
      const ca1 = parseFloat(row.ca1_score ?? 0);
      const exam = parseFloat(row.exam_score ?? 0);
      const grandTotal = ca1 + exam;

      workbookHtml += `
        <tr>
          <td class="student-title">${String(row.student_name || row.name || 'UNKNOWN CANDIDATE').toUpperCase()}</td>
          <td class="num-format">${row.admission_no || row.admissionNo || 'N/A'}</td>
          <td>${ca1.toFixed(1)}</td>
          <td>${exam.toFixed(1)}</td>
          <td class="aggregate-cell">${grandTotal.toFixed(1)}</td>
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
      
      {/* 🏛️ HEADER BAR */}
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
            <span className="text-[10px] font-mono font-bold text-white/80 uppercase tracking-wider block">Master Ledger Matrix (CA1 / Exam)</span>
            <h2 className="text-xs font-black text-white uppercase tracking-tight mt-0.5">
              Teacher Ledger View: {activeFolderContext?.name || 'Class Core'}
            </h2>
          </div>
        </div>

        <button 
          onClick={handleExportOfficeGradebook}
          className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
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

        {/* GRADEBOOK TABLE MAP (CA1 & EXAM ONLY) */}
        <div className="w-full bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#7C3AED] text-white font-mono text-[9px] uppercase tracking-wider border-b border-[#E2D5F8]">
                  <th className="p-4 font-black">Student Full Name</th>
                  <th className="p-4 font-black">Admission Number</th>
                  <th className="p-4 font-black text-center bg-[#7C3AED]/90">CA 1 (Max 20)</th>
                  <th className="p-4 font-black text-center bg-slate-900">Final Exam (Max 60)</th>
                  <th className="p-4 font-black text-center bg-[#E11D48]">Grand Total (Max 80)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5F8] font-bold text-slate-700 bg-white">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center font-mono text-[#7C6B93] uppercase tracking-wide bg-white">
                      No matching student report entries located in this course track.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((row, idx) => {
                    const ca1 = parseFloat(row.ca1_score ?? 0);
                    const exam = parseFloat(row.exam_score ?? 0);
                    const grandTotal = ca1 + exam;

                    return (
                      <tr key={row.student_profile_id || row.id || idx} className="hover:bg-[#FAF9FA] transition-colors">
                        <td className="p-4 font-black text-slate-950 uppercase truncate max-w-xs">{row.student_name || row.name}</td>
                        <td className="p-4 font-mono text-[11px] text-[#7C6B93] uppercase">{row.admission_no || row.admissionNo}</td>
                        <td className="p-4 text-center font-mono font-black text-[#7C3AED] bg-[#F7F5FC]">{ca1.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-slate-900">{exam.toFixed(1)}</td>
                        <td className="p-4 text-center font-mono font-black text-rose-600 bg-rose-50 text-sm border-x border-[#E2D5F8]">{grandTotal.toFixed(1)}</td>
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
        Start-rite internet institutional security matrix
      </footer>

    </div>
  );
}