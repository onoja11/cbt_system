import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Check, X, HelpCircle } from 'lucide-react';
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

  // Custom Modal States for Handling Limits/Alerts smoothly
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const trim = (str) => String(str || '').trim();
  const strtolower = (str) => String(str || '').toLowerCase();

  // 🛡️ DYNAMIC IDENTIFICATION TRACKER
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

            // Map Objectives Grid Content Dynamically
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

            // Map Theory Answers Neatly
            const theoryAnswers = theoryQuestions.map(q => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;

              return {
                qId: q.id,
                prompt: q.question_text || q.questionText,
                response: match ? (match.theory_response || match.selected_text || '') : '',
                maxScore: parseFloat(q.points_weight) || 0,
                givenScore: match && match.score_awarded !== null ? parseFloat(match.score_awarded) : '',
                rubric: q.theory_rubric || q.rubric || 'Review student answer against expected keywords.'
              };
            });

            const gradingCompleted = theoryAnswers.length === 0 ? true : theoryAnswers.every(q => q.givenScore !== null && q.givenScore !== '');

            return {
              id: currentProfileId,
              name: (student.student_name || 'UNKNOWN CANDIDATE').toUpperCase(),
              admissionNo: student.admission_no || 'VT-2026',
              objScore: parseFloat(student.objective_score) || 0,
              maxObj: parseFloat(student.total_objectives_count) || 0,
              theoryScoreEarned: parseFloat(student.theory_score_earned) || 0,
              theoryMaxPossible: parseFloat(student.theory_max_possible) || 0,
              cumulativeTotal: parseFloat(student.cumulative_total) || 0,
              maxPossibleTotal: parseFloat(student.max_possible_total) || 0,
              objectiveAnswers,
              theoryAnswers,
              gradingCompleted
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
    } {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 💡 FIXED: Reference matches the function declaration on line 46 cleanly now
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
        message: `The entered mark exceeds the maximum score limits. The maximum allowed marks for this question is ${max} points.`
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
              <th>Section B (Theory)</th>
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
    return sum + (liveVal !== undefined && liveVal !== '' ? (parseFloat(liveVal) || 0) : (parseFloat(q.givenScore) || 0));
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
              <p className="text-[10px] font-bold text-[#9A87A9] mt-0.5 uppercase font-mono">Continuous Assessment & Essay Marker Hub</p>
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

      {/* CORE SPLIT INTERFACE MAPPING CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-auto">
        
        {/* Left Hand Roster Panel */}
        <section className="bg-white border border-[#9A87A9]/30 rounded-xl p-4 flex flex-col justify-between shadow-3xs h-[640px]">
          <div className="w-full flex flex-col h-full overflow-hidden">
            <div className="mb-4 pb-2 border-b border-[#FAF9FA] flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black text-[#9A87A9] uppercase tracking-wider font-mono">Answer Sheets Ingested ({studentPapers.length})</span>
              <span className="text-[9px] bg-slate-50 border border-[#9A87A9]/20 px-1.5 py-0.5 rounded font-mono text-[#9A87A9] font-bold uppercase">Linked</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {studentPapers.length === 0 ? (
                <div className="p-6 text-center font-mono text-[11px] text-[#9A87A9] uppercase leading-relaxed border border-dashed border-[#9A87A9]/30 rounded-xl bg-[#FAF9FA]/40 py-12">
                  No active student answer sheets recorded for this test ID yet.
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
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Section A: {student.objScore} / {student.maxObj}</span>
                          <span className={student.gradingCompleted ? 'text-[#2A1A63] font-black' : 'text-amber-600 animate-pulse'}>
                            {student.gradingCompleted ? `Final Mark: ${student.cumulativeTotal} / ${student.maxPossibleTotal}` : '• Awaiting Grading'}
                          </span>
                        </div>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-2 ${student.gradingCompleted ? 'bg-[#2A1A63]' : 'bg-[#C62927] animate-pulse'}`} />
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
                  <p className="text-[9px] font-bold text-[#9A87A9] mt-0.5 uppercase">Admission Identifier: {currentStudent.admissionNo}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block font-black text-[#9A87A9] uppercase tracking-wider">Accumulated Marks</span>
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
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-black text-slate-950 uppercase">Section A: Objective Answers Registry</span>
                        <span className="block text-[9px] font-black text-[#9A87A9] uppercase mt-0.5">Automated Machine Graded Score log sheet</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-md">
                        Score: {currentStudent.objScore} / {currentStudent.maxObj} Marks
                      </span>
                      {isObjDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#9A87A9]" /> : <ChevronDown className="w-4 h-4 text-[#9A87A9]" />}
                    </div>
                  </button>

                  {isObjDropdownOpen && (
                    <div className="p-4 bg-[#FAF9FA]/40 border-t border-slate-100 space-y-4 max-h-[360px] overflow-y-auto">
                      {currentStudent.objectiveAnswers?.length === 0 ? (
                        <p className="text-center font-mono text-[10px] text-[#9A87A9] py-4 font-bold uppercase">No multiple choice tasks configured inside this paper template.</p>
                      ) : (
                        currentStudent.objectiveAnswers.map((obj, oIdx) => (
                          <div key={obj.qId || oIdx} className="p-3 border border-[#9A87A9]/20 bg-white rounded-lg space-y-2 text-left shadow-3xs">
                            <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#9A87A9] border-b border-[#FAF9FA] pb-1 uppercase">
                              <span>Multiple Choice Question {obj.number}</span>
                              <span className={obj.isCorrect ? 'text-emerald-700 font-black' : 'text-[#C62927] font-black'}>
                                {obj.isCorrect ? `+${obj.maxScore} / ${obj.maxScore} Pts` : `0.00 / ${obj.maxScore} Pts`}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-950 leading-relaxed">{obj.prompt}</p>
                            
                            <div className="grid grid-cols-1 gap-1.5 pt-1 pl-1">
                              {obj.options?.map((opt, optIdx) => {
                                const isChosen = obj.studentSelectedIndex === optIdx;
                                const isCorrectAnswer = obj.correctOptionIndex === optIdx;
                                
                                let pillStyle = "border-slate-100 text-slate-600 bg-white";
                                let iconElement = null;

                                if (isCorrectAnswer) {
                                  pillStyle = "border-emerald-200 bg-emerald-50 text-emerald-800 font-bold";
                                  iconElement = <Check className="w-3 h-3 text-emerald-600 shrink-0" />;
                                } else if (isChosen && !isCorrectAnswer) {
                                  pillStyle = "border-rose-200 bg-rose-50 text-rose-800 font-bold";
                                  iconElement = <X className="w-3 h-3 text-[#C62927] shrink-0" />;
                                }

                                return (
                                  <div key={optIdx} className={`px-3 py-1.5 border rounded-lg text-[11px] flex items-center justify-between gap-2 ${pillStyle}`}>
                                    <span className="truncate font-medium">{String.fromCharCode(65 + optIdx)}) {opt}</span>
                                    <div className="flex items-center gap-1 shrink-0 font-mono text-[8px] uppercase tracking-wider font-black">
                                      {isChosen && <span className="px-1 bg-[#2A1A63] text-white rounded text-[7px]">Student Choice</span>}
                                      {iconElement}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: SECTION B (THEORY MANUAL MARKING WORKSPACE) */}
                <div className="border border-[#9A87A9]/30 rounded-xl overflow-hidden bg-white shadow-3xs">
                  <button 
                    type="button"
                    onClick={() => setIsTheoryDropdownOpen(!isTheoryDropdownOpen)}
                    className="w-full px-4 py-3 bg-[#FAF9FA] flex justify-between items-center border-b border-[#9A87A9]/20 hover:opacity-90 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#2A1A63]" />
                      <div>
                        <span className="text-xs font-black text-slate-950 uppercase">Section B: Written Essay Answer Evaluator</span>
                        <span className="block text-[9px] font-black text-[#9A87A9] uppercase mt-0.5">Manual point entry review workbench</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200 rounded-md">
                        Allocated: {currentTheoryInputSum} / {currentStudent.theoryMaxPossible} Points
                      </span>
                      {isTheoryDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#9A87A9]" /> : <ChevronDown className="w-4 h-4 text-[#9A87A9]" />}
                    </div>
                  </button>

                  {isTheoryDropdownOpen && (
                    <div className="p-4 bg-[#FAF9FA]/40 border-t border-slate-100 space-y-5">
                      {currentStudent.theoryAnswers.length === 0 ? (
                        <div className="p-8 text-center text-xs font-mono text-[#9A87A9] uppercase tracking-wide border border-dashed border-[#9A87A9]/30 bg-white rounded-xl flex flex-col items-center justify-center gap-2 py-12">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span>No structural written theory assignments configured inside this paper module.</span>
                        </div>
                      ) : (
                        currentStudent.theoryAnswers.map((question, idx) => (
                          <div key={question.qId} className="space-y-2.5 border border-[#9A87A9]/20 bg-white p-4 rounded-xl text-left shadow-3xs">
                            <div className="text-xs font-black text-[#2A1A63] font-mono border-b border-[#FAF9FA] pb-1 mb-2 uppercase text-[10px]">
                              Written Essay Task Question {idx + 1}
                            </div>
                            <div className="text-xs font-bold text-slate-800 leading-relaxed bg-[#FAF9FA] p-3 border border-[#9A87A9]/20 rounded-lg shadow-3xs">
                              <span className="text-[9px] font-black block text-[#9A87A9] uppercase font-mono mb-1">Question Prompt Content:</span>
                              {question.prompt}
                            </div>
                            <div className="text-xs font-bold text-slate-950 bg-white p-3 border border-[#9A87A9]/20 rounded-lg shadow-3xs whitespace-pre-wrap break-words min-h-[60px]">
                              <span className="text-[9px] font-black block text-[#9A87A9] uppercase font-mono mb-1">Student Answer Script:</span>
                              {question.response ? (
                                <span className="text-slate-900 font-medium">{question.response}</span>
                              ) : (
                                <span className="text-[#C62927] font-mono text-[11px] font-black uppercase tracking-tight flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> This candidate left the answer sheet area completely blank.
                                </span>
                              )}
                            </div>
                            <div className="p-3 bg-amber-50 border border-amber-200 text-slate-700 rounded-lg text-[11px] leading-relaxed font-medium">
                              <span className="font-black text-amber-800 block uppercase font-mono text-[9px] mb-0.5">Expected Rubric Guidelines:</span>
                              💡 {question.rubric}
                            </div>

                            <div className="max-w-xs pt-1">
                              <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1">Assign Score Weight Points</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  step="0.5"
                                  min="0"
                                  max={question.maxScore}
                                  value={theoryInputs[question.qId] !== undefined ? theoryInputs[question.qId] : ''}
                                  onChange={(e) => handleScoreInput(question.qId, e.target.value, question.maxScore)}
                                  disabled={isSubmitting}
                                  placeholder="0.0" 
                                  className="w-28 px-3 py-1.5 bg-[#FAF9FA] border border-[#9A87A9]/40 text-sm font-mono font-black text-[#2A1A63] rounded-lg focus:outline-none focus:border-[#2A1A63] focus:bg-white disabled:opacity-40"
                                />
                                <span className="text-[11px] text-[#9A87A9] font-mono font-black">/ Maximum {question.maxScore} Marks</span>
                              </div>
                            </div>
                          </div>
                        ))
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

      {/* CORE INFRASTRUCTURE DIALOG BOXES FOR ERROR OVERRIDES */}
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
          "Section B (Written Theory)": `${currentTheoryInputSum} Points`, 
          "Final Aggregate Score": `${dynamicCumulativeTotal} / ${currentStudent?.maxPossibleTotal} Total Marks` 
        }}
      />

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Corporate Examination Monitoring Node Cluster
      </footer>

    </div>
  );
}