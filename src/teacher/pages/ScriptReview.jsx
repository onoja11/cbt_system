import React, { useState } from 'react';
import { ArrowLeft, BookOpen, User, History, CheckCircle2 } from 'lucide-react';

export default function ScriptReview({ onNavigateBack, selectedAssessmentInfo }) {
  // Mock data representing the actual question sheets and typed answers for the chosen test slot
  const [studentSubmissions] = useState([
    {
      id: 'st_1',
      name: 'DUNG STEPHEN NYAM',
      admissionNo: 'VTS/2026/001',
      scoreText: "18 / 20 Total Marks",
      answers: [
        { qNo: 1, text: "What is the function of the ALU inside a Central Processing Unit complex?", input: "The ALU handles all arithmetic calculations like addition and multiplication, alongside logic comparisons like AND/OR gates.", marks: "5 / 5 pts", rubric: "Must mention arithmetic operations and logical comparisons." },
        { qNo: 2, text: "Differentiate briefly between primary memory and secondary storage systems.", input: "Primary memory is fast and volatile like RAM which the CPU talks to directly. Secondary storage is non-volatile like hard drives which saves files permanently.", marks: "5 / 5 pts", rubric: "Look for volatile vs non-volatile differences and processor proximity." }
      ]
    },
    {
      id: 'st_2',
      name: 'OCHIGBO GODSWILL',
      admissionNo: 'VTS/2026/002',
      scoreText: "20 / 20 Total Marks",
      answers: [
        { qNo: 1, text: "What is the function of the ALU inside a Central Processing Unit complex?", input: "It performs arithmetic computations and logical processing tasks for incoming operating instructions.", marks: "5 / 5 pts", rubric: "Must mention arithmetic operations and logical comparisons." },
        { qNo: 2, text: "Differentiate briefly between primary memory and secondary storage systems.", input: "Primary memory holds current open applications data, while secondary storage holds cold offline system operating assets permanently.", marks: "5 / 5 pts", rubric: "Look for volatile vs non-volatile differences and processor proximity." }
      ]
    }
  ]);

  const [activeStudentId, setActiveStudentId] = useState('st_1');
  const currentStudent = studentSubmissions.find(s => s.id === activeStudentId);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded text-slate-500 mr-2 cursor-pointer transition-all active:scale-[0.96]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">SR</div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Student Answer Script Auditor</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">Viewing Past Script: {selectedAssessmentInfo?.type || "CA 1"} Folder</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-600 font-mono bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-xs uppercase">SUBJECT: COMPUTER SCIENCE</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch my-auto overflow-hidden">
        
        {/* Left column: Class Register Roll for this test */}
        <section className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-2xs h-[520px]">
          <div className="w-full flex flex-col h-full overflow-hidden">
            <div className="mb-4 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Class Submission Roll</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {studentSubmissions.map((student) => {
                const isSelected = student.id === activeStudentId;
                return (
                  <div
                    key={student.id}
                    onClick={() => setActiveStudentId(student.id)}
                    className={`p-3 border rounded text-left cursor-pointer transition-all flex justify-between items-center ${
                      isSelected ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900">{student.name}</h4>
                      <p className="text-[10px] font-mono text-emerald-600 font-bold mt-0.5">{student.scoreText}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right column: The actual question-and-answer details for this student */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col h-[520px] overflow-hidden shadow-2xs">
          <div className="w-full h-full flex flex-col overflow-hidden">
            
            <div className="bg-slate-900 text-white p-4 rounded flex justify-between items-center shadow-xs mb-4 shrink-0">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Candidate Script Pack</span>
                <h3 className="text-sm font-black uppercase tracking-tight mt-0.5">{currentStudent?.name}</h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">Admission No: {currentStudent?.admissionNo}</p>
              </div>
              <div className="text-right font-mono bg-white/10 px-3 py-1.5 rounded border border-white/5">
                <span className="text-[9px] block text-slate-300 uppercase font-bold tracking-wider">Obtained Result</span>
                <p className="text-sm font-black text-white mt-0.5">{currentStudent?.scoreText}</p>
              </div>
            </div>

            {/* Questions and student answers layout stream */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 bg-slate-50/40 border border-slate-100 rounded p-3">
              {currentStudent?.answers.map((ans, idx) => (
                <div key={idx} className="p-4 bg-white border border-slate-200 rounded shadow-3xs space-y-2.5 text-left">
                  <div className="flex justify-between items-center font-mono text-[9px] font-bold text-slate-400 border-b pb-1.5 uppercase">
                    <span>Question Sheet {ans.qNo}</span>
                    <span className="bg-slate-50 px-1.5 py-0.5 border rounded text-slate-800">{ans.marks}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-relaxed">{ans.text}</p>
                  
                  <div className="p-3 bg-slate-50 border border-slate-200/60 text-slate-800 rounded text-xs italic font-medium leading-relaxed break-words">
                    <span className="font-mono font-bold text-[8px] text-slate-400 block uppercase not-italic mb-1">Student Answer Provided:</span>
                    "{ans.input}"
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

      </main>

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        Startrite Intranet Script Review Cluster Node
      </footer>

    </div>
  );
}

// Simple local fallback icon
function ChevronRight(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}