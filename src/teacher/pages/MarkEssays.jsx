import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function MarkEssays({ assessmentId, onNavigateBack }) {
  const [studentPapers, setStudentPapers] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [theoryInputs, setTheoryInputs] = useState({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accordion Toggle States
  const [isObjDropdownOpen, setIsObjDropdownOpen] = useState(false);
  const [isTheoryDropdownOpen, setIsTheoryDropdownOpen] = useState(true);

  // Custom Modal States
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const trim = (str) => String(str || '').trim();
  const strtolower = (str) => String(str || '').toLowerCase();

  const extractValidId = () => {
    let rawId = assessmentId;
    if (rawId && rawId.target !== undefined && typeof rawId.preventDefault === 'function') {
      rawId = null;
    }
    if (rawId && typeof rawId === 'object') {
      rawId = rawId.id || rawId.assessmentId || rawId.assessment_id;
    }
    
    let strId = trim(String(rawId || ''));
    if (!strId || strId === 'undefined' || strId === 'null' || strId.includes('Object') || strId === 'NaN') {
      strId = trim(String(localStorage.getItem('saved_asm_id_context') || ''));
    }
    
    if (strId && /\d+/.test(strId)) {
      const match = strId.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return parseInt(strId, 10);
  };

  const fetchAssessmentScriptsMatrix = async () => {
    setIsLoading(true);
    const finalId = extractValidId();

    if (isNaN(finalId) || finalId <= 0) {
      setIsLoading(false);
      return;
    }

    localStorage.setItem('saved_asm_id_context', String(finalId));

    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${finalId}/student-answers`, { method: 'GET' });
      const data = await response.json();

      if (response.ok && data.students) {
        const questionsResponse = await apiRequest(`api/v1/teacher/assessments/${finalId}/questions`, { method: 'GET' });
        const questionsData = await questionsResponse.json();

        if (questionsResponse.ok && questionsData.questions) {
          const allQuestions = questionsData.questions || [];
          const objectiveQuestions = allQuestions.filter(q => trim(strtolower(q.type)) !== 'theory');
          const theoryQuestions = allQuestions.filter(q => trim(strtolower(q.type)) === 'theory');

          const compiledPapers = data.students.map((student) => {
            const currentProfileId = student.student_profile_id;
            const studentSpecificAnswers = student.answers || [];

            // Map Objectives Grid Content
            const objectiveAnswers = objectiveQuestions.map((q, idx) => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;
              
              const chosenIdx = match && match.selected_index !== null ? parseInt(match.selected_index, 10) : null;
              const correctIdx = q.correct_option_index !== null ? parseInt(q.correct_option_index, 10) : null;
              const qOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);

              return {
                qId: q.id,
                number: idx + 1,
                prompt: q.question_text || q.questionText,
                options: qOptions,
                studentSelectedIndex: chosenIdx,
                correctOptionIndex: correctIdx,
                isCorrect: chosenIdx !== null && correctIdx !== null && chosenIdx === correctIdx,
                scoreAwarded: chosenIdx !== null && correctIdx !== null && chosenIdx === correctIdx ? (parseFloat(q.points_weight) || 2) : 0,
                maxScore: parseFloat(q.points_weight) || 2
              };
            });

            // Map Theory Answers
            const theoryAnswers = theoryQuestions.map((q, idx) => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;

              return {
                qId: q.id,
                number: idx + 1,
                prompt: q.question_text || q.questionText,
                maxScore: parseFloat(q.points_weight) || 5,
                givenScore: match && match.score_awarded !== null ? parseFloat(match.score_awarded) : '',
                rubric: q.theory_rubric || q.rubric || 'Review score allocations'
              };
            });

            return {
              id: currentProfileId,
              name: (student.student_name || 'UNKNOWN CANDIDATE').toUpperCase(),
              admissionNo: student.admission_no || 'VT-2026',
              objScore: parseFloat(student.objective_score) || 0,
              maxObj: parseFloat(student.total_objectives_count) || 0,
              theoryScoreEarned: theoryAnswers.reduce((sum, q) => sum + (parseFloat(q.givenScore) || 0), 0),
              theoryMaxPossible: theoryAnswers.reduce((sum, q) => sum + (parseFloat(q.maxScore) || 0), 0),
              cumulativeTotal: parseFloat(student.cumulative_total) || 0,
              maxPossibleTotal: parseFloat(student.max_possible_total) || 0,
              objectiveAnswers,
              theoryAnswers,
              gradingCompleted: true
            };
          });

          setStudentPapers(compiledPapers);
          
          if (compiledPapers.length > 0) {
            const targetStudent = compiledPapers.find(s => s.id === activeStudentId) || compiledPapers[0];
            setActiveStudentId(targetStudent.id);
            
            const initialInputs = {};
            targetStudent.theoryAnswers.forEach(q => {
              initialInputs[q.qId] = q.givenScore !== null && q.givenScore !== '' ? q.givenScore : '';
            });
            setTheoryInputs(initialInputs);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessmentScriptsMatrix();
  }, [assessmentId]);

  const handleSelectStudent = (student) => {
    setActiveStudentId(student.id);
    const initialInputs = {};
    student.theoryAnswers.forEach(q => {
      initialInputs[q.qId] = q.givenScore !== '' ? q.givenScore : '';
    });
    setTheoryInputs(initialInputs);
  };

  // 🎯 INLINE VALIDATED MANUAL INPUT ENTRY OVERRIDE
  const handleScoreInput = (qId, val, max) => {
    if (val === '') {
      setTheoryInputs(prev => ({ ...prev, [qId]: '' }));
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > max) {
      setErrorModal({
        isOpen: true,
        title: 'Score Limit Exceeded',
        message: `The entered mark exceeds the maximum score boundaries. The maximum allowed marks for this question is ${max} points.`
      });
      return;
    }
    setTheoryInputs(prev => ({ ...prev, [qId]: val }));
  };

  const handleSaveStudentGrades = async () => {
    if (!currentStudent) return;
    setIsSubmitting(true);
    const numericId = extractValidId();

    try {
      for (const question of currentStudent.theoryAnswers) {
        const scoreGiven = theoryInputs[question.qId];
        if (scoreGiven === '' || scoreGiven === null) continue;

        await apiRequest('api/v1/teacher/grading/mark-theory', {
          method: 'POST',
          body: JSON.stringify({
            student_profile_id: currentStudent.id,
            question_id: question.qId,
            assessment_id: numericId,
            score_given: parseFloat(scoreGiven)
          })
        });
      }

      setIsConfirmModalOpen(false);
      await fetchAssessmentScriptsMatrix(); 
    } catch (error) {
      console.error(error);
      setErrorModal({
        isOpen: true,
        title: 'Connection Dropped',
        message: 'The school network connection was interrupted. Please double check your local server link.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOfficeWorkbookExport = () => {
    const numericId = extractValidId();
    
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          th { background-color: #2a1a63; color: #ffffff; font-weight: bold; font-family: sans-serif; text-transform: uppercase; font-size: 11px; height: 30px; }
          td { font-family: sans-serif; font-size: 12px; height: 24px; text-align: left; }
          .number-cell { mso-number-format:"\\@"; }
          .score-title { font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Admission No</th>
              <th>Section A (Objectives)</th>
              <th>Section B (Theory Marks)</th>
              <th>Total Term Mark</th>
              <th>Maximum Obtainable</th>
            </tr>
          </thead>
          <tbody>
    `;

    studentPapers.forEach(p => {
      tableHtml += `
        <tr>
          <td>${p.name}</td>
          <td class="number-cell">${p.admissionNo}</td>
          <td class="score-title">${p.objScore}</td>
          <td class="score-title">${p.theoryScoreEarned}</td>
          <td class="score-title" style="background-color: #faf9fa; font-weight: 900;">${p.cumulativeTotal}</td>
          <td class="score-title" style="color: #9a87a9;">${p.maxPossibleTotal}</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blobStream = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const dynamicDownloadUrl = URL.createObjectURL(blobStream);
    
    const linkAnchor = document.createElement("a");
    linkAnchor.setAttribute("href", dynamicDownloadUrl);
    linkAnchor.setAttribute("download", `STARTRITE_EXAM_MARKS_ID_${numericId}.xls`);
    document.body.appendChild(linkAnchor);
    linkAnchor.click();
    
    document.body.removeChild(linkAnchor);
    URL.revokeObjectURL(dynamicDownloadUrl);
  };

  const currentStudent = studentPapers.find(s => s.id === activeStudentId);

  const currentTheoryInputSum = currentStudent?.theoryAnswers.reduce((sum, q) => {
    const liveVal = theoryInputs[q.qId];
    return sum + (liveVal !== undefined && liveVal !== '' ? parseFloat(liveVal) : 0);
  }, 0) || 0;

  const dynamicCumulativeTotal = (currentStudent?.objScore || 0) + currentTheoryInputSum;

  if (isLoading && studentPapers.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono text-xs uppercase text-[#9A87A9] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" />
        Retrieving student exam scripts from the network files...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">
      
      {/* BRAND HEADER CONTROL */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <button onClick={onNavigateBack} className="p-1.5 hover:bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.96] shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider">Teacher's Marking Desk</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] mt-0.5 uppercase font-mono">Continuous Assessment & Manual Point Matrix</p>
            </div>
          </div>

          <button 
            onClick={handleOfficeWorkbookExport}
            className="w-full sm:w-auto px-4 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 font-mono"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report Sheet (.XLS)
          </button>
        </div>
      </header>

      {/* CORE SPLIT INTERFACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-auto">
        
        {/* Left Hand Roster Panel */}
        <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-4 flex flex-col justify-between shadow-3xs h-[640px]">
          <div className="w-full flex flex-col h-full overflow-hidden">
            <div className="mb-4 pb-2 border-b border-[#FAF9FA] flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Ingested Answer Scripts ({studentPapers.length})</span>
              <span className="text-[9px] bg-slate-50 border border-[#9A87A9]/20 px-1.5 py-0.5 rounded font-mono text-[#9A87A9] font-bold uppercase">Audited</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {studentPapers.length === 0 ? (
                <div className="p-6 text-center font-mono text-[11px] text-[#9A87A9] uppercase leading-relaxed border border-dashed border-[#9A87A9]/30 rounded-xl bg-[#FAF9FA]/40 py-12">
                  No active student answer sheets recorded for this session yet.
                </div>
              ) : (
                studentPapers.map((student) => {
                  const isSelected = student.id === activeStudentId;
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className={`p-3 border rounded-xl text-left cursor-pointer transition-all flex justify-between items-center ${
                        isSelected ? 'border-[#2A1A63] bg-[#FAF9FA] text-[#2A1A63] shadow-3xs' : 'border-[#9A87A9]/20 bg-white text-slate-700 hover:border-[#9A87A9]/50'
                      }`}
                    >
                      <div className="truncate min-w-0 flex-1">
                        <h4 className="text-xs font-black uppercase tracking-tight text-[#2A1A63] truncate">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[10px] flex-wrap font-bold">
                          <span className="text-slate-500">Obj: {student.objScore}/{student.maxObj}</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Total: {student.theoryScoreEarned + student.objScore} Pts</span>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 ml-2 bg-emerald-500" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Workspace Presentation Container */}
        <section className="lg:col-span-2 bg-white border border-[#9A87A9]/30 rounded-xl p-5 flex flex-col justify-between shadow-3xs min-h-[640px] overflow-hidden">
          {currentStudent ? (
            <div className="w-full h-full flex flex-col">
              
              {/* Active Workspace Mini Banner */}
              <div className="bg-[#2A1A63] text-white p-4 rounded-xl flex justify-between items-center shadow-sm mb-4 shrink-0 font-mono">
                <div>
                  <span className="text-[9px] font-black uppercase text-[#9A87A9] tracking-wider">Evaluation Profile</span>
                  <h3 className="text-sm font-black uppercase tracking-tight mt-0.5 truncate max-w-xs font-sans text-white">{currentStudent.name}</h3>
                  <p className="text-[9px] font-bold text-[#9A87A9] mt-0.5 uppercase">Reg Code: {currentStudent.admissionNo}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block font-black text-[#9A87A9] uppercase tracking-wider">Combined Marksheet Sum</span>
                  <p className="text-xl font-black text-white">
                    {dynamicCumulativeTotal} <span className="text-xs text-[#9A87A9] font-black font-sans">/ {currentStudent.maxPossibleTotal} Marks</span>
                  </p>
                </div>
              </div>

              {/* CORE WORKSPACE ACCORDIONS CONTAINER */}
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[460px] pr-1 pb-2">
                
                {/* ACCORDION 1: SECTION A (OBJECTIVES AUDITOR) */}
                <div className="border border-[#9A87A9]/30 rounded-xl overflow-hidden bg-white shadow-3xs">
                  <button 
                    type="button"
                    onClick={() => setIsObjDropdownOpen(!isObjDropdownOpen)}
                    className="w-full px-4 py-3 bg-[#FAF9FA] flex justify-between items-center border-b border-[#9A87A9]/20 hover:opacity-90 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-black text-slate-950 uppercase">Section A: Objective Answers Registry</span>
                        <span className="block text-[9px] font-black text-[#9A87A9] uppercase mt-0.5">Automated Machine Graded Score log sheet</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {currentStudent.objScore} / {currentStudent.maxObj} Pts
                      </span>
                      {isObjDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#9A87A9]" /> : <ChevronDown className="w-4 h-4 text-[#9A87A9]" />}
                    </div>
                  </button>

                  {isObjDropdownOpen && (
                    <div className="p-4 bg-[#FAF9FA]/40 border-t border-slate-100 space-y-4 max-h-[360px] overflow-y-auto">
                      {currentStudent.objectiveAnswers?.map((obj, oIdx) => (
                        <div key={obj.qId || oIdx} className="p-3 border border-[#9A87A9]/20 bg-white rounded-lg space-y-2 text-left shadow-3xs">
                          <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#9A87A9] border-b border-[#FAF9FA] pb-1 uppercase">
                            <span>Objective Item {obj.number}</span>
                            <span className={obj.isCorrect ? 'text-emerald-700 font-black' : 'text-[#C62927] font-black'}>
                              {obj.isCorrect ? `+${obj.maxScore} / ${obj.maxScore} Pts` : `0.00 / ${obj.maxScore} Pts`}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-950 leading-relaxed">{obj.prompt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 🎯 ACCORDION 2: SECTION B (MANUAL INPUT GRADING MATRIX) */}
                <div className="border border-[#9A87A9]/30 rounded-xl overflow-hidden bg-white shadow-3xs">
                  <button 
                    type="button"
                    onClick={() => setIsTheoryDropdownOpen(!isTheoryDropdownOpen)}
                    className="w-full px-4 py-3 bg-[#FAF9FA] flex justify-between items-center border-b border-[#9A87A9]/20 hover:opacity-90 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#2A1A63]" />
                      <div>
                        <span className="text-xs font-black text-slate-950 uppercase">Section B: Theory Grading Matrix</span>
                        <span className="block text-[9px] font-black text-[#9A87A9] uppercase mt-0.5">Slick manual score sheet input deck</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200 rounded-md">
                        Theory Sum: {currentTheoryInputSum} / {currentStudent.theoryMaxPossible} Pts
                      </span>
                      {isTheoryDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#9A87A9]" /> : <ChevronDown className="w-4 h-4 text-[#9A87A9]" />}
                    </div>
                  </button>

                  {isTheoryDropdownOpen && (
                    <div className="p-4 bg-white border-t border-slate-100 overflow-x-auto">
                      {currentStudent.theoryAnswers.length === 0 ? (
                        <p className="text-center font-mono text-[10px] text-[#9A87A9] py-4 font-bold uppercase">No theory items configured for this paper.</p>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#FAF9FA] border-b border-[#9A87A9]/20 font-mono font-black text-[9px] text-[#9A87A9] uppercase">
                              <th className="p-3 w-16">Item No.</th>
                              <th className="p-3 w-3/5">Theory Question Prompt Context</th>
                              <th className="p-3 text-right px-4">Award Score Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans font-bold text-slate-800">
                            {currentStudent.theoryAnswers.map((question) => {
                              const liveVal = theoryInputs[question.qId] !== undefined ? theoryInputs[question.qId] : '';

                              return (
                                <tr key={question.qId} className="hover:bg-[#FAF9FA]/30 transition-all text-xs">
                                  <td className="p-3 font-mono text-[11px] text-slate-950">Q{question.number}</td>
                                  <td className="p-3 font-medium leading-relaxed" title={question.prompt}>{question.prompt}</td>
                                  <td className="p-3 text-right px-4 font-mono">
                                    <div className="flex items-center justify-end gap-2">
                                      <input 
                                        type="number" 
                                        step="0.5"
                                        min="0"
                                        max={question.maxScore}
                                        value={liveVal}
                                        onChange={(e) => handleScoreInput(question.qId, e.target.value, question.maxScore)}
                                        disabled={isSubmitting}
                                        placeholder="0.0" 
                                        className="w-24 px-3 py-1.5 bg-[#FAF9FA] border border-[#9A87A9]/40 text-center font-mono font-black text-[#2A1A63] rounded-lg focus:outline-none focus:border-[#2A1A63] focus:bg-white disabled:opacity-40"
                                      />
                                      <span className="text-[11px] text-[#9A87A9] font-normal font-sans">/ {question.maxScore} Marks</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* SAVE REPORT TRIGGER TRAY */}
              <div className="pt-4 border-t border-[#FAF9FA] flex justify-end shrink-0 mt-auto">
                <button 
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)} 
                  disabled={isSubmitting || currentStudent.theoryAnswers.length === 0}
                  className="px-5 py-2.5 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Syncing Score...' : 'Commit Marks Sheet'}
                </button>
              </div>

            </div>
          ) : (
            <div className="my-auto text-center font-mono text-xs text-[#9A87A9] uppercase p-8 border border-dashed border-[#9A87A9]/40 rounded-xl bg-white max-w-md mx-auto shadow-3xs py-16">
              📂 Assessment Folder Empty
              <p className="text-[10px] text-[#9A87A9] font-sans font-bold uppercase tracking-tight mt-1.5 leading-relaxed">
                The evaluation pathway opened safely for ID {extractValidId()}, but no completed candidate submissions have hit the network ledger for grading yet.
              </p>
            </div>
          )}
        </section>

      </main>

      {/* ERROR FEEDBACK MODAL OVERLAYS */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[30000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/40 p-6 rounded-xl shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2 text-[#C62927] font-sans font-black text-xs uppercase tracking-tight border-b border-[#FAF9FA] pb-2">
              <AlertTriangle className="w-4 h-4" /> {errorModal.title}
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{errorModal.message}</p>
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2 bg-[#2A1A63] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL LEDGER GRADES COMMITMENT MODAL */}
      <ConfirmationModal 
        isOpen={isConfirmModalOpen} 
        title="Commit Marks to Class Ledger"
        message={`Are you completely finished evaluating the answers for ${currentStudent?.name}? Confirming will permanently update the school evaluation servers and lock the score entries.`}
        confirmLabel={isSubmitting ? "Syncing..." : "Lock & Save Scores"} 
        cancelLabel="Keep Reviewing" 
        onConfirm={handleSaveStudentGrades} 
        onCancel={() => setIsConfirmModalOpen(false)}
        summaryData={{ 
          "Student Candidate": currentStudent?.name, 
          "Section A (Objectives)": `${currentStudent?.objScore} Marks`, 
          "Section B (Theory Marks)": `${currentTheoryInputSum} Points`, 
          "Final Aggregate Score": `${dynamicCumulativeTotal} / ${currentStudent?.maxPossibleTotal} Total Marks` 
        }}
      />

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Corporate Examination Monitoring Node Cluster Matrix © 2026
      </footer>

    </div>
  );
}