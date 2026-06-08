    import React, { useState } from 'react';
    import { ArrowLeft, Award, BookOpen, Save, FileSpreadsheet } from 'lucide-react';
    import ConfirmationModal from '../../shared/ConfirmationModal';

    export default function TheoryMarking({ onNavigateBack }) {
    // Rich multi-question mock database tracking objective performance & complex theory scripts
    const [studentPapers, setStudentPapers] = useState([
        {
        id: 'st_1',
        name: 'DUNG STEPHEN NYAM',
        objScore: 18, 
        maxObj: 20,
        theoryAnswers: [
            { qId: 'th_1', prompt: 'Detail the operational flow of how a background write-through caching engine syncs frontend browser IndexedDB logs safely.', response: 'The frontend cache intercepts data locally, writes to IndexedDB instantly to maintain offline availability, then uses background web workers to dispatch batch synchronization frames to the server backend.', maxScore: 10, givenScore: '', rubric: 'Must mention IndexedDB local writes, background synchronization web workers, and backend state handling.' },
            { qId: 'th_2', prompt: 'Explain how database normalization models (up to 3NF) eliminate redundant rows and dependency anomalies inside a student registration layout.', response: '1NF eliminates repeating groups by making attributes atomic. 2NF removes partial key dependencies. 3NF completely strips transitive functional dependencies so non-prime attributes rely strictly on the primary key cell.', maxScore: 10, givenScore: '', rubric: 'Look for atomic attributes (1NF), zero partial dependency (2NF), and zero transitive dependency (3NF).' }
        ],
        gradingCompleted: false
        },
        {
        id: 'st_2',
        name: 'OCHIGBO GODSWILL',
        objScore: 20, 
        maxObj: 20,
        theoryAnswers: [
            { qId: 'th_1', prompt: 'Detail the operational flow of how a background write-through caching engine syncs frontend browser IndexedDB logs safely.', response: 'It writes directly to the local storage interface then runs an asynchronous request loop whenever the intranet LAN connection is available.', maxScore: 10, givenScore: '8', rubric: 'Must mention IndexedDB local writes, background synchronization web workers, and backend state handling.' },
            { qId: 'th_2', prompt: 'Explain how database normalization models (up to 3NF) eliminate redundant rows and dependency anomalies inside a student registration layout.', response: 'It rearranges the database tables into columns and keys to stop duplicate entries across registration spreadsheets.', maxScore: 10, givenScore: '5', rubric: 'Look for atomic attributes (1NF), zero partial dependency (2NF), and zero transitive dependency (3NF).' }
        ],
        gradingCompleted: true
        }
    ]);

    const [activeStudentId, setActiveStudentId] = useState('st_1');
    const [theoryInputs, setTheoryInputs] = useState({ th_1: '', th_2: '' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const currentStudent = studentPapers.find(s => s.id === activeStudentId);

    const handleScoreInput = (qId, val, max) => {
        const num = Number(val);
        if (num > max) return alert(`Maximum score weight constraint is ${max} points.`);
        setTheoryInputs({ ...theoryInputs, [qId]: val });
    };

    const handleSaveStudentGrades = () => {
        setStudentPapers(studentPapers.map(paper => {
        if (paper.id === activeStudentId) {
            const updatedAnswers = paper.theoryAnswers.map(q => ({
            ...q,
            givenScore: theoryInputs[q.qId] !== undefined ? theoryInputs[q.qId] : q.givenScore
            }));
            return { ...paper, theoryAnswers: updatedAnswers, gradingCompleted: true };
        }
        return paper;
        }));
        setIsConfirmModalOpen(false);
    };

    const handleOfflineExportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student Name,Objective Score,Theory Total,Aggregate Total,Status\n";

        studentPapers.forEach(p => {
        const theoryTotal = p.theoryAnswers.reduce((sum, q) => sum + (Number(q.givenScore) || 0), 0);
        const totalScore = p.objScore + theoryTotal;
        const statusString = p.gradingCompleted ? "Graded" : "Incomplete";
        csvContent += `"${p.name}",${p.objScore},${theoryTotal},${totalScore},"${statusString}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const linkAnchor = document.createElement("a");
        linkAnchor.setAttribute("href", encodedUri);
        linkAnchor.setAttribute("download", "COMPUTER_SCIENCE_JSS3_GRADES_REPORT.csv");
        document.body.appendChild(linkAnchor);
        linkAnchor.click();
        document.body.removeChild(linkAnchor);
    };

    // 💡 RESOLVED BOTH NAMING CELLS: Re-bound variable cleanly to handle operations calculations
    const computedTheoryTotal = currentStudent?.theoryAnswers.reduce((sum, q) => {
        const liveVal = theoryInputs[q.qId];
        return sum + (liveVal !== undefined ? (Number(liveVal) || 0) : (Number(q.givenScore) || 0));
    }, 0) || 0;

    const finalTotalScore = (currentStudent?.objScore || 0) + computedTheoryTotal;

    return (
        <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
        
        <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button onClick={onNavigateBack} className="p-1.5 hover:bg-slate-50 border rounded text-slate-500 mr-2 transition-all active:scale-[0.96] cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
                <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Grading & Evaluation Desk</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">Course: Computer Science (JSS 3)</p>
                </div>
            </div>

            <button 
                onClick={handleOfflineExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            >
                <FileSpreadsheet className="w-4 h-4" /> Download Offline Spreadsheet Report
            </button>
            </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch my-auto">
            
            {/* Left Section: Class Roster */}
            <section className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-2xs h-[540px]">
            <div className="w-full flex flex-col h-full overflow-hidden">
                <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Class Scripts Roll</span>
                <span className="text-[9px] bg-slate-50 border px-1.5 py-0.5 rounded-sm font-mono text-slate-400 font-bold uppercase">Local Cache</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {studentPapers.map((student) => {
                    const totalTheory = student.theoryAnswers.reduce((sum, q) => sum + (Number(q.givenScore) || 0), 0);
                    const isSelected = student.id === activeStudentId;
                    
                    return (
                    <div
                        key={student.id}
                        onClick={() => {
                        setActiveStudentId(student.id);
                        const inputs = {};
                        student.theoryAnswers.forEach(q => inputs[q.qId] = q.givenScore);
                        setTheoryInputs(inputs);
                        }}
                        className={`p-3 border rounded text-left cursor-pointer transition-all flex justify-between items-center ${
                        isSelected ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                        }`}
                    >
                        <div>
                        <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[10px]">
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-xs">Objective: {student.objScore}/{student.maxObj}</span>
                            <span className={student.gradingCompleted ? 'text-slate-900 font-black' : 'text-amber-500 animate-pulse font-bold'}>
                            {student.gradingCompleted ? `Total: ${student.objScore + totalTheory} Marks` : '• Awaiting Grading'}
                            </span>
                        </div>
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${student.gradingCompleted ? 'bg-slate-900' : 'bg-amber-400 animate-pulse'}`} />
                    </div>
                    );
                })}
                </div>
            </div>
            </section>

            {/* Right Section: Evaluation Dashboard Panel */}
            <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[540px] overflow-y-auto">
            <div className="space-y-5 flex-1 overflow-y-auto pb-4">
                
                <div className="bg-slate-900 text-white p-4 rounded flex justify-between items-center shadow-xs">
                <div>
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Reviewing Workspace</span>
                    <h3 className="text-sm font-bold uppercase tracking-tight mt-0.5">{currentStudent?.name}</h3>
                </div>
                <div className="text-right font-mono">
                    <span className="text-[9px] block text-slate-400 uppercase tracking-wider">Live Aggregation Counter</span>
                    <p className="text-xl font-black text-white">{finalTotalScore} <span className="text-xs text-slate-400">Total Marks</span></p>
                </div>
                </div>

                <div className="space-y-5">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">Written Theory Evaluation Scripts Block</span>
                </div>

                {currentStudent?.theoryAnswers.map((question, idx) => (
                    <div key={question.qId} className="space-y-2.5 border border-slate-100 bg-slate-50/20 p-4 rounded-md">
                    <div className="text-xs font-bold text-slate-900 font-mono border-b pb-1 mb-2 uppercase text-[10px]">
                        Theory Task Question {idx + 1}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 leading-relaxed bg-white p-3 border rounded border-slate-200/60 shadow-2xs">
                        <span className="text-[9px] font-bold block text-slate-400 uppercase font-mono mb-1">Question Prompt:</span>
                        {question.prompt}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 leading-relaxed bg-white p-3 border rounded border-slate-200/60 shadow-2xs">
                        <span className="text-[9px] font-bold block text-slate-400 uppercase font-mono mb-1">Student Answer Response text lines:</span>
                        "{question.response}"
                    </div>
                    <div className="p-3 bg-amber-50/60 border border-amber-100 text-slate-600 rounded text-[11px] leading-relaxed">
                        <span className="font-bold text-amber-800 block uppercase font-mono text-[9px] mb-0.5">Evaluation Metric Guidelines:</span>
                        💡 {question.rubric}
                    </div>

                    <div className="max-w-xs pt-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Allocate Task Points Score</label>
                        <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={theoryInputs[question.qId] !== undefined ? theoryInputs[question.qId] : question.givenScore}
                            onChange={(e) => handleScoreInput(question.qId, e.target.value, question.maxScore)}
                            disabled={currentStudent.gradingCompleted}
                            placeholder="Type score..." 
                            className="w-28 px-3 py-1.5 bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 rounded focus:outline-none focus:border-slate-900 transition-all disabled:opacity-40"
                        />
                        <span className="text-[11px] text-slate-400 font-mono font-bold">/ Maximum {question.maxScore} pts</span>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {!currentStudent?.gradingCompleted && (
                <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
                <button onClick={() => setIsConfirmModalOpen(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow-2xs transition-all active:scale-[0.99]">
                    Save Evaluation Report
                </button>
                </div>
            )}
            </section>

        </main>

        {/* 💡 CORRECTION HERE: Universal modal correctly captures the renamed computedTheoryTotal variable */}
        <ConfirmationModal 
            isOpen={isConfirmModalOpen} title="Lock & Commit Evaluation Scores"
            message={`Are you completely sure you want to lock the grades report matrix for ${currentStudent?.name}?`}
            confirmLabel="Lock Marks Ledger" cancelLabel="Keep Reviewing" onConfirm={handleSaveStudentGrades} onCancel={() => setIsConfirmModalOpen(false)}
            summaryData={{ "Target Candidate": currentStudent?.name, "Objective Total": `${currentStudent?.objScore} pts`, "Written Total Score": `${computedTheoryTotal} pts`, "Final Aggregate Score": `${finalTotalScore} / 40 Total Marks` }}
        />

        <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
            StartriteIntranet Automated Grading Interface Core
        </footer>

        </div>
    );
    }