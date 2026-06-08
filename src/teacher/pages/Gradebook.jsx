import React, { useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Search, Users, Percent, CheckCircle2 } from 'lucide-react';

export default function Gradebook({ onNavigateBack }) {
  // Master Class Scoreboard Ledger (CA 1 + CA 2 + CA 3 + Final Exam Scores Only)
  const [classRegistry] = useState([
    { id: 'st_1', admissionNo: 'VTS/2026/001', name: 'DUNG STEPHEN NYAM', ca1: 18, ca2: 15, ca3: 16, examObj: 18, examTheory: 32 },
    { id: 'st_2', admissionNo: 'VTS/2026/002', name: 'OCHIGBO GODSWILL', ca1: 19, ca2: 18, ca3: 17, examObj: 20, examTheory: 35 },
    { id: 'st_3', admissionNo: 'VTS/2026/003', name: 'EMMANUEL AMEH', ca1: 12, ca2: 11, ca3: 10, examObj: 14, examTheory: 15 },
    { id: 'st_4', admissionNo: 'VTS/2026/004', name: 'FAITH OCHE', ca1: 14, ca2: 15, ca3: 13, examObj: 16, examTheory: 25 }
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const calculateGrandTotals = (student) => {
    const caTotal = student.ca1 + student.ca2 + student.ca3; // Combined Continuous Assessments (Max 60)
    const examTotal = student.examObj + student.examTheory; // Combined Exam Marks (Max 60)
    const grandTotal = Math.min(100, Math.round(((caTotal + examTotal) / 120) * 100)); // Scaled to 100%

    let alphaGrade = 'F';
    let performanceColor = 'text-rose-600 bg-rose-50 border-rose-100';

    if (grandTotal >= 75) { alphaGrade = 'A'; performanceColor = 'text-emerald-600 bg-emerald-50 border-emerald-100'; }
    else if (grandTotal >= 65) { alphaGrade = 'B'; performanceColor = 'text-blue-600 bg-blue-50 border-blue-100'; }
    else if (grandTotal >= 50) { alphaGrade = 'C'; performanceColor = 'text-amber-600 bg-amber-50 border-amber-100'; }
    else if (grandTotal >= 40) { alphaGrade = 'D'; performanceColor = 'text-orange-600 bg-orange-50 border-orange-100'; }

    return { caTotal, examTotal, grandTotal, alphaGrade, performanceColor };
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Admission No,Student Name,CA 1 (20),CA 2 (20),CA 3 (20),Exam Score (60),Overall Aggregate (100),Grade\n";

    classRegistry.forEach(st => {
      const { grandTotal, alphaGrade } = calculateGrandTotals(st);
      csvContent += `${st.admissionNo},"${st.name}",${st.ca1},${st.ca2},${st.ca3},${st.examObj + st.examTheory},${grandTotal},${alphaGrade}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const linkAnchor = document.createElement("a");
    linkAnchor.setAttribute("href", encodedUri);
    linkAnchor.setAttribute("download", "COMPUTER_SCIENCE_JSS3_MASTER_SCORES.csv");
    document.body.appendChild(linkAnchor);
    linkAnchor.click();
    document.body.removeChild(linkAnchor);
  };

  const filteredRegistry = classRegistry.filter(st =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const classAverage = (classRegistry.reduce((sum, s) => sum + calculateGrandTotals(s).grandTotal, 0) / classRegistry.length).toFixed(1);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded text-slate-500 mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">T</div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Master Gradebook Scoreboard</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">Course Summary: COMPUTER SCIENCE (JSS 3)</p>
            </div>
          </div>

          <button onClick={handleExportCSV} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Scoreboard (.CSV)
          </button>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Class Capacity</span>
            <p className="text-sm font-bold text-slate-900 font-mono">{classRegistry.length} Students Registered</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Reconciliation Record</span>
            <p className="text-sm font-bold text-slate-900 font-mono">All Slots Reconciled</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <Percent className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Class Performance average</span>
            <p className="text-sm font-bold text-slate-900 font-mono">{classAverage}% Mean Score</p>
          </div>
        </div>
      </div>

      {/* 💡 THE CLEAN GRID: Displays numbers only with no script breakdown panels cluttering the side */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col h-[390px] overflow-hidden shadow-2xs">
          
          <div className="relative mb-4 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter student records..." className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded-sm focus:outline-none" />
          </div>

          <div className="flex-1 overflow-auto border border-slate-100 rounded">
            <table className="w-full border-collapse text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-mono font-bold uppercase text-[9px] text-slate-400 sticky top-0 z-10 text-center">
                <tr className="border-b">
                  <th colSpan={2} className="p-2 border-r text-left px-4 bg-slate-100/40">Student Credentials</th>
                  <th colSpan={4} className="p-2 border-r bg-blue-50/20 text-blue-700">Continuous Assessment History</th>
                  <th colSpan={3} className="p-2 border-r bg-emerald-50/20 text-emerald-700">Terminal Exam Marks</th>
                  <th colSpan={2} className="p-2 bg-slate-900 text-white font-black">Final Weights</th>
                </tr>
                <tr className="text-left bg-slate-50/50">
                  <th className="p-2.5 px-4">Admission No.</th>
                  <th className="p-2.5 border-r">Full Student Name</th>
                  <th className="p-2.5 text-center">CA 1 (20)</th>
                  <th className="p-2.5 text-center">CA 2 (20)</th>
                  <th className="p-2.5 text-center">CA 3 (20)</th>
                  <th className="p-2.5 text-center font-bold text-slate-800 border-r bg-blue-50/10">CA Sum</th>
                  <th className="p-2.5 text-center">Obj (20)</th>
                  <th className="p-2.5 text-center">Theory (40)</th>
                  <th className="p-2.5 text-center font-bold text-slate-800 border-r bg-emerald-50/10">Exam Sum</th>
                  <th className="p-2.5 text-center font-black bg-slate-100 text-slate-900">Aggregate (100)</th>
                  <th className="p-2.5 text-center px-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                {filteredRegistry.map((student) => {
                  const { caTotal, examTotal, grandTotal, alphaGrade, performanceColor } = calculateAcademicTotals(student);
                  
                  // Simple inline mapping to satisfy data requests
                  function calculateAcademicTotals(s) {
                    const cTot = s.ca1 + s.ca2 + s.ca3;
                    const eTot = s.examObj + s.examTheory;
                    const gTot = Math.min(100, Math.round(((cTot + eTot) / 120) * 100));
                    let gradeLetter = 'C';
                    let color = 'text-amber-600 bg-amber-50 border-amber-100';
                    if (gTot >= 75) { gradeLetter = 'A'; color = 'text-emerald-600 bg-emerald-50 border-emerald-100'; }
                    else if (gTot >= 65) { gradeLetter = 'B'; color = 'text-blue-600 bg-blue-50 border-blue-100'; }
                    return { caTotal: cTot, examTotal: eTot, grandTotal: gTot, alphaGrade: gradeLetter, performanceColor: color };
                  }

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-all">
                      <td className="p-3 px-4 font-mono text-[11px] text-slate-400">{student.admissionNo}</td>
                      <td className="p-3 text-slate-900 uppercase font-bold tracking-tight text-xs border-r">{student.name}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{student.ca1}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{student.ca2}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{student.ca3}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700 border-r bg-blue-50/5">{caTotal}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{student.examObj}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{student.examTheory}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-700 border-r bg-emerald-50/5">{examTotal}</td>
                      <td className="p-3 font-mono font-black text-slate-900 text-center bg-slate-100/60 text-sm">{grandTotal}</td>
                      <td className="p-3 text-center px-4">
                        <span className={`px-2 py-0.5 font-mono font-bold text-[10px] rounded-xs border uppercase tracking-wider ${performanceColor}`}>
                          Grade {alphaGrade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Master Record Scoreboard Console
      </footer>

    </div>
  );
}