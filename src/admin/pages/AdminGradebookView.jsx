import React, { useState } from 'react';
import { ArrowLeft, Search, ShieldCheck, Users, BarChart3, BookOpen, ChevronRight, LayoutGrid } from 'lucide-react';

export default function AdminGradebookView({ onNavigateBack, selectedClassContext }) {
  // Mocking the subjects available within the selected class group container
  const [availableSubjects] = useState([
    { code: 'CMP 301', name: 'COMPUTER SCIENCE', teacher: 'Mr. Ochigbo Godswill', meanScore: 71.4 },
    { code: 'DTP 302', name: 'DATA PROCESSING', teacher: 'Mr. Dung Stephen Nyam', meanScore: 68.2 },
    { code: 'BDL 101', name: 'BASIC DIGITAL LITERACY', teacher: 'Mrs. Faith Oche', meanScore: 74.5 }
  ]);

  const [activeSubject, setActiveSubject] = useState(null); // State tracks chosen subject context
  const [searchQuery, setSearchQuery] = useState('');

  // Score records mock dataset matrix
  const [studentScores] = useState({
    'COMPUTER SCIENCE': [
      { admissionNo: 'VTS/2026/001', name: 'DUNG STEPHEN NYAM', ca1: 18, ca2: 15, ca3: 16, examObj: 18, examTheory: 32 },
      { admissionNo: 'VTS/2026/002', name: 'OCHIGBO GODSWILL', ca1: 19, ca2: 18, ca3: 17, examObj: 20, examTheory: 35 },
      { admissionNo: 'VTS/2026/003', name: 'EMMANUEL AMEH', ca1: 12, ca2: 11, ca3: 10, examObj: 14, examTheory: 15 }
    ],
    'DATA PROCESSING': [
      { admissionNo: 'VTS/2026/001', name: 'DUNG STEPHEN NYAM', ca1: 15, ca2: 14, ca3: 15, examObj: 16, examTheory: 28 },
      { admissionNo: 'VTS/2026/002', name: 'OCHIGBO GODSWILL', ca1: 17, ca2: 16, ca3: 18, examObj: 19, examTheory: 30 },
      { admissionNo: 'VTS/2026/003', name: 'EMMANUEL AMEH', ca1: 14, ca2: 13, ca3: 12, examObj: 15, examTheory: 22 }
    ],
    'BASIC DIGITAL LITERACY': [
      { admissionNo: 'VTS/2026/001', name: 'DUNG STEPHEN NYAM', ca1: 19, ca2: 17, ca3: 18, examObj: 20, examTheory: 34 },
      { admissionNo: 'VTS/2026/002', name: 'OCHIGBO GODSWILL', ca1: 18, ca2: 19, ca3: 19, examObj: 19, examTheory: 36 },
      { admissionNo: 'VTS/2026/003', name: 'EMMANUEL AMEH', ca1: 15, ca2: 14, ca3: 15, examObj: 16, examTheory: 26 }
    ]
  });

  const calculateTotals = (student) => {
    const caSum = student.ca1 + student.ca2 + student.ca3;
    const examSum = student.examObj + student.examTheory;
    const grandTotal = Math.min(100, Math.round(((caSum + examSum) / 120) * 100));
    
    let grade = 'C';
    let textStyle = 'text-amber-600 bg-amber-50 border-amber-100';
    if (grandTotal >= 75) { grade = 'A'; textStyle = 'text-emerald-600 bg-emerald-50 border-emerald-100'; }
    else if (grandTotal >= 65) { grade = 'B'; textStyle = 'text-blue-600 bg-blue-50 border-blue-100'; }
    return { caSum, examSum, grandTotal, grade, textStyle };
  };

  const handleExitSubjectView = () => {
    setActiveSubject(null);
    setSearchQuery('');
  };

  const currentRegistry = activeSubject ? (studentScores[activeSubject.name] || []) : [];
  const filteredRegistry = currentRegistry.filter(st =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      {/* Upper Tracker Header */}
      <header className="w-full bg-slate-950 text-white px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={activeSubject ? handleExitSubjectView : onNavigateBack} 
              className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white mr-2 cursor-pointer transition-all active:scale-[0.96]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-white text-slate-950 font-black text-xs flex items-center justify-center rounded-sm">ADM</div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Institutional Performance Records Vault</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-tight">
                Class Directory: {selectedClassContext?.name || "Grade 9 / JSS 3"} {activeSubject && `// ${activeSubject.name}`}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2.5 py-1 rounded uppercase">
            READ-ONLY EXECUTIVE AUDIT
          </span>
        </div>
      </header>

      {/* VIEW CELL 1: Render Subject Directories Menu Grid if no subject is active */}
      {!activeSubject ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
          <div className="mb-5 pb-2 border-b">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Available Subject Ledgers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select a specific course ledger to analyze cumulative continuous assessment structures and final scaled totals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableSubjects.map((sub) => (
              <div 
                key={sub.code}
                onClick={() => setActiveSubject(sub)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-950 cursor-pointer group transition-all flex flex-col justify-between h-36 shadow-2xs"
              >
                <div className="space-y-1">
                  <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-slate-950 transition-all" />
                  <span className="text-[9px] font-mono font-bold text-slate-400 block pt-1">{sub.code} • {sub.teacher}</span>
                  <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight mt-0.5">{sub.name}</h4>
                </div>
                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 uppercase">
                  <span>Class Mean: <strong className="text-blue-600">{sub.meanScore}%</strong></span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-950 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        
        /* VIEW CELL 2: Render Score Sheet Matrix Row Table once a subject is selected */
        <>
          <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
              <Users className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Audited Unit Registry</span>
                <p className="text-xs font-black text-slate-900 font-mono">{currentRegistry.length} Candidates Logged</p>
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Course Lecturer</span>
                <p className="text-xs font-black text-emerald-600 uppercase font-sans truncate">{activeSubject.teacher}</p>
              </div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <span className="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Subject Mean Score</span>
                <p className="text-xs font-black text-blue-600 font-mono">{activeSubject.meanScore}% Aggregate</p>
              </div>
            </div>
          </div>

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col h-[380px] overflow-hidden shadow-2xs">
              
              <div className="flex justify-between items-center mb-4">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder="Search candidate registry..." 
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none focus:bg-white transition-all" 
                  />
                </div>
                <button onClick={handleExitSubjectView} className="px-3 py-1.5 border text-[10px] font-mono font-bold uppercase tracking-wider rounded flex items-center gap-1 hover:bg-slate-50 cursor-pointer">
                  <LayoutGrid className="w-3.5 h-3.5" /> All Subjects
                </button>
              </div>

              <div className="flex-1 overflow-auto border border-slate-100 rounded">
                <table className="w-full border-collapse text-left text-xs font-medium text-slate-600">
                  <thead className="bg-slate-50 border-b font-mono font-bold uppercase text-[9px] text-slate-400 sticky top-0 z-10 text-center">
                    <tr className="border-b">
                      <th colSpan={2} className="p-2 border-r text-left px-4 bg-slate-100/30">Credentials</th>
                      <th colSpan={4} className="p-2 border-r bg-blue-50/20 text-blue-700">CA Records Weight (40%)</th>
                      <th colSpan={3} className="p-2 border-r bg-emerald-50/20 text-emerald-700">Exam Sheet (60%)</th>
                      <th colSpan={2} className="p-2 bg-slate-900 text-white font-black">Final Yields</th>
                    </tr>
                    <tr className="text-left bg-slate-50/50">
                      <th className="p-2 px-4">Admission No.</th>
                      <th className="p-2 border-r">Full Student Name</th>
                      <th className="p-2 text-center">CA 1</th>
                      <th className="p-2 text-center">CA 2</th>
                      <th className="p-2 text-center">CA 3</th>
                      <th className="p-2 text-center font-bold border-r bg-blue-50/5 text-blue-900">CA Sum</th>
                      <th className="p-2 text-center">Obj</th>
                      <th className="p-2 text-center">Theory</th>
                      <th className="p-2 text-center font-bold border-r bg-emerald-50/5 text-emerald-900">Exam Sum</th>
                      <th className="p-2 text-center font-black bg-slate-100 text-slate-900">Total %</th>
                      <th className="p-2 text-center px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                    {filteredRegistry.map((student) => {
                      const { caSum, examSum, grandTotal, grade, textStyle } = calculateTotals(student);
                      return (
                        <tr key={student.admissionNo} className="hover:bg-slate-50/30 transition-all">
                          <td className="p-3 px-4 font-mono text-[11px] text-slate-400">{student.admissionNo}</td>
                          <td className="p-3 text-slate-900 shortcut uppercase font-bold text-xs border-r">{student.name}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{student.ca1}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{student.ca2}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{student.ca3}</td>
                          <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/5 border-r">{caSum}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{student.examObj}</td>
                          <td className="p-3 text-center font-mono text-slate-400">{student.examTheory}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/5 border-r">{examSum}</td>
                          <td className="p-3 font-mono font-black text-slate-900 text-center bg-slate-100/50 text-sm">{grandTotal}</td>
                          <td className="p-3 text-center px-4">
                            <span className={`px-2 py-0.5 font-mono font-bold text-[10px] rounded-xs border uppercase tracking-wider ${textStyle}`}>
                              Grade {grade}
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
        </>
      )}

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Executive Record Ledger Interface Core
      </footer>

    </div>
  );
}