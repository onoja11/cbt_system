import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, BookOpen, FileSpreadsheet, Loader2, AlertTriangle, 
  CheckCircle, ChevronDown, ChevronUp, HelpCircle, CheckCheck, Lock, ShieldCheck, BarChart2, TrendingUp, TrendingDown, Award 
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText';

export default function MarkEssays({ assessmentId, onNavigateBack }) {
  const [studentPapers, setStudentPapers] = useState([]);
  const [allQuestionsList, setAllQuestionsList] = useState([]); // 🎯 Store raw questions for analytics
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [theoryInputs, setTheoryInputs] = useState({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDoneGradingModalOpen, setIsDoneGradingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assessment Title & Type States
  const [assessmentTypeLabel, setAssessmentTypeLabel] = useState("ASSESSMENT");
  const [subjectNameLabel, setSubjectNameLabel] = useState("SUBJECT");
  const [assessmentStatus, setAssessmentStatus] = useState("Pending Grading");

  // Accordion Toggle States
  const [isObjDropdownOpen, setIsObjDropdownOpen] = useState(false);
  const [isTheoryDropdownOpen, setIsTheoryDropdownOpen] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true); // 🎯 Analytics Toggle State

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
        if (data.subject) setSubjectNameLabel(data.subject.toUpperCase());
        if (data.type) setAssessmentTypeLabel(data.type.toUpperCase());

        const incomingStatus = data.assessment_status || data.status || "Pending Grading";
        setAssessmentStatus(incomingStatus);

        const questionsResponse = await apiRequest(`api/v1/teacher/assessments/${finalId}/questions`, { method: 'GET' });
        const questionsData = await questionsResponse.json();

        if (questionsResponse.ok && questionsData.questions) {
          const allQuestions = questionsData.questions || [];
          setAllQuestionsList(allQuestions); // 👈 Save for analytics calculations

          const objectiveQuestions = allQuestions.filter(q => trim(strtolower(q.type)) !== 'theory');
          const theoryQuestions = allQuestions.filter(q => trim(strtolower(q.type)) === 'theory');

          const compiledPapers = data.students.map((student) => {
            const currentProfileId = student.student_profile_id;
            const studentSpecificAnswers = student.answers || [];
            const isSubmitted = student.is_submitted === true || student.is_submitted === 1;
            const statusLabel = student.status_label || (isSubmitted ? 'Submitted' : 'Did Not Write');

            const objectiveAnswers = objectiveQuestions.map((q, idx) => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;

              const chosenIdx = match && match.selected_index !== null ? parseInt(match.selected_index, 10) : null;
              const correctIdx = q.correct_option_index !== null ? parseInt(q.correct_option_index, 10) : null;
              const qOptions = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
              const pointWeight = parseFloat(q.points_weight || q.pointsWeight || 2);

              const isCorrect = chosenIdx !== null && correctIdx !== null && chosenIdx === correctIdx;

              return {
                qId: q.id,
                number: idx + 1,
                prompt: q.question_text || q.questionText,
                options: qOptions,
                studentSelectedIndex: chosenIdx,
                correctOptionIndex: correctIdx,
                isCorrect: isCorrect,
                scoreAwarded: isCorrect ? pointWeight : 0,
                maxScore: pointWeight
              };
            });

            const theoryAnswers = theoryQuestions.map((q, idx) => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;

              const pointWeight = parseFloat(q.points_weight || q.pointsWeight || 5);

              return {
                qId: q.id,
                number: idx + 1,
                prompt: q.question_text || q.questionText,
                maxScore: pointWeight,
                givenScore: match && match.score_awarded !== null && match.score_awarded !== undefined ? parseFloat(match.score_awarded) : '',
                rubric: q.theory_rubric || q.rubric || 'Review score allocations'
              };
            });

            const calculatedObjScore = objectiveAnswers.reduce((sum, item) => sum + item.scoreAwarded, 0);
            const maxObjPossible = objectiveAnswers.reduce((sum, item) => sum + item.maxScore, 0);

            const theoryScoreEarned = theoryAnswers.reduce((sum, q) => sum + (parseFloat(q.givenScore) || 0), 0);
            const theoryMaxPossible = theoryAnswers.reduce((sum, q) => sum + (parseFloat(q.maxScore) || 0), 0);

            const finalCumulative = calculatedObjScore + theoryScoreEarned;
            const finalMaxPossible = maxObjPossible + theoryMaxPossible;

            return {
              id: currentProfileId,
              name: (student.student_name || 'UNKNOWN CANDIDATE').toUpperCase(),
              admissionNo: student.admission_no || 'VT-2026',
              isSubmitted,
              statusLabel,
              objScore: calculatedObjScore,
              maxObj: maxObjPossible,
              theoryScoreEarned: theoryScoreEarned,
              theoryMaxPossible: theoryMaxPossible,
              cumulativeTotal: finalCumulative,
              maxPossibleTotal: finalMaxPossible,
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

  // 🎯 POST-EXAM ANALYTICS COMPUTATION
  const examAnalytics = useMemo(() => {
    const submittedStudents = studentPapers.filter(s => s.isSubmitted);
    const totalSubmittedCount = submittedStudents.length;

    if (totalSubmittedCount === 0 || allQuestionsList.length === 0) {
      return {
        mostFailed: null,
        mostGotten: null,
        classAverage: 0,
        passRate: 0,
        totalSubmitted: 0
      };
    }

    // Calculate class average score percentage
    let totalScoreSum = 0;
    let maxPossibleSum = submittedStudents[0].maxPossibleTotal || 1;
    
    submittedStudents.forEach(s => {
      const liveTheorySum = s.theoryAnswers.reduce((sum, q) => {
        const liveVal = (s.id === activeStudentId) ? theoryInputs[q.qId] : null;
        return sum + (liveVal !== undefined && liveVal !== '' && liveVal !== null ? parseFloat(liveVal) : (parseFloat(q.givenScore) || 0));
      }, 0);
      totalScoreSum += (s.objScore + liveTheorySum);
    });

    const classAveragePts = totalScoreSum / totalSubmittedCount;
    const classAveragePct = Math.round((classAveragePts / maxPossibleSum) * 100);

    // Calculate pass rate (students scoring >= 50%)
    let passingCount = 0;
    submittedStudents.forEach(s => {
      const liveTheorySum = s.theoryAnswers.reduce((sum, q) => {
        const liveVal = (s.id === activeStudentId) ? theoryInputs[q.qId] : null;
        return sum + (liveVal !== undefined && liveVal !== '' && liveVal !== null ? parseFloat(liveVal) : (parseFloat(q.givenScore) || 0));
      }, 0);
      const studentTotal = s.objScore + liveTheorySum;
      if ((studentTotal / maxPossibleSum) >= 0.5) {
        passingCount++;
      }
    });
    const passRatePct = Math.round((passingCount / totalSubmittedCount) * 100);

    // Track question-by-question success rates for objective items
    const questionStats = {};
    allQuestionsList.filter(q => trim(strtolower(q.type)) !== 'theory').forEach(q => {
      questionStats[q.id] = { prompt: q.question_text, correctCount: 0, totalAnswered: 0 };
    });

    submittedStudents.forEach(s => {
      s.objectiveAnswers.forEach(obj => {
        if (questionStats[obj.qId]) {
          questionStats[obj.qId].totalAnswered++;
          if (obj.isCorrect) {
            questionStats[obj.qId].correctCount++;
          }
        }
      });
    });

    let mostFailedQ = null;
    let mostGottenQ = null;
    let lowestRatio = 2; // > 1
    let highestRatio = -1; // < 0

    Object.values(questionStats).forEach(stat => {
      if (stat.totalAnswered > 0) {
        const ratio = stat.correctCount / stat.totalAnswered;
        if (ratio < lowestRatio) {
          lowestRatio = ratio;
          mostFailedQ = { ...stat, percentage: Math.round(ratio * 100) };
        }
        if (ratio > highestRatio) {
          highestRatio = ratio;
          mostGottenQ = { ...stat, percentage: Math.round(ratio * 100) };
        }
      }
    });

    return {
      mostFailed: mostFailedQ,
      mostGotten: mostGottenQ,
      classAverage: classAveragePct,
      passRate: passRatePct,
      totalSubmitted: totalSubmittedCount
    };
  }, [studentPapers, allQuestionsList, theoryInputs, activeStudentId]);

  const handleSelectStudent = (student) => {
    setActiveStudentId(student.id);
    const initialInputs = {};
    student.theoryAnswers.forEach(q => {
      initialInputs[q.qId] = q.givenScore !== '' ? q.givenScore : '';
    });
    setTheoryInputs(initialInputs);
  };

  const isGraded = assessmentStatus.trim().toLowerCase() === 'graded';

  const handleScoreInput = (qId, val, max) => {
    if (isGraded) return;

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
    if (!currentStudent || isGraded) return;
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

  const handleMarkAsDoneGrading = async () => {
    const numericId = extractValidId();
    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${numericId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Graded' })
      });
      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setAssessmentStatus('Graded');
        setIsDoneGradingModalOpen(false);
        setErrorModal({
          isOpen: true,
          title: 'Grading Finalized',
          message: 'This assessment has been officially marked as Graded. Score records are now permanently locked, and the export spreadsheet is now active.'
        });
      } else {
        setIsDoneGradingModalOpen(false);
        setErrorModal({ isOpen: true, title: 'Action Failed', message: data.message || 'Failed to finalize grading status.' });
      }
    } catch (err) {
      console.error(err);
      setIsDoneGradingModalOpen(false);
      setErrorModal({ isOpen: true, title: 'Network Error', message: 'Failed to communicate with school servers.' });
    }
  };

  const handleOfficeWorkbookExport = () => {
    if (!isGraded) return;
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
              <th>Status</th>
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
          <td>${p.statusLabel}</td>
          <td class="score-title">${p.objScore} / ${p.maxObj}</td>
          <td class="score-title">${p.theoryScoreEarned} / ${p.theoryMaxPossible}</td>
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
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        Retrieving student class roster and exam scripts...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">

      {/* 🏛️ HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-3.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateBack}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white">START-RITE WORKSPACE</h2>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">{subjectNameLabel} ({assessmentTypeLabel}) MARKING DESK</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGraded && (
            <button 
              onClick={handleOfficeWorkbookExport}
              className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" /> EXPORT REPORT SHEET (.XLS)
            </button>
          )}

          {!isGraded ? (
            <button 
              onClick={() => setIsDoneGradingModalOpen(true)}
              className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" /> DONE GRADING
            </button>
          ) : (
            <span className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-black rounded-xl uppercase flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> LOCKED & SEALED
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">

        {/* 📊 TEACHER POST-EXAM ANALYTICS RIBBON */}
        <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">Post-Exam Pedagogical Analytics & Item Intelligence</h3>
            </div>
            <button 
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className="text-[10px] font-mono font-black text-[#7C3AED] hover:underline cursor-pointer uppercase"
            >
              {isAnalyticsOpen ? 'Collapse Insights ▴' : 'Expand Insights ▾'}
            </button>
          </div>

          {isAnalyticsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="p-4 bg-white border border-[#E2D5F8] rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-[#7C6B93] uppercase block tracking-wider">Class Average Score</span>
                <p className="text-base font-black text-[#7C3AED] mt-1">{examAnalytics.classAverage}%</p>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5 block font-semibold">Based on {examAnalytics.totalSubmitted} submitted scripts</span>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-emerald-700 uppercase block tracking-wider">Class Pass Rate (≥50%)</span>
                <p className="text-base font-black text-emerald-700 mt-1">{examAnalytics.passRate}%</p>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5 block font-semibold">Mastery Benchmark Indicator</span>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-emerald-700 uppercase block tracking-wider">Most Gotten Question</span>
                <p className="text-xs font-black text-slate-900 mt-1 truncate max-w-[200px]" title={examAnalytics.mostGotten?.prompt || 'N/A'}>
                  {examAnalytics.mostGotten ? examAnalytics.mostGotten.prompt : 'No objective data'}
                </p>
                <span className="text-[10px] text-emerald-700 font-black mt-1 block">
                  {examAnalytics.mostGotten ? `${examAnalytics.mostGotten.percentage}% class accuracy` : 'N/A'}
                </span>
              </div>

              <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-rose-700 uppercase block tracking-wider">Most Failed Question</span>
                <p className="text-xs font-black text-slate-900 mt-1 truncate max-w-[200px]" title={examAnalytics.mostFailed?.prompt || 'N/A'}>
                  {examAnalytics.mostFailed ? examAnalytics.mostFailed.prompt : 'No objective data'}
                </p>
                <span className="text-[10px] text-rose-700 font-black mt-1 block">
                  {examAnalytics.mostFailed ? `${examAnalytics.mostFailed.percentage}% class accuracy` : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left Hand Roster Panel */}
          <section className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col justify-between shadow-xs h-[600px] text-left">
            <div className="w-full flex flex-col h-full overflow-hidden">
              <div className="mb-4 pb-3 border-b border-[#E2D5F8]/60 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider font-mono">CLASS ROSTER LEDGER ({studentPapers.length})</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mt-0.5">ENROLLED CANDIDATES</h3>
                </div>
                <span className="text-[9px] bg-white border border-[#E2D5F8] px-2 py-0.5 rounded-lg font-mono text-[#7C6B93] font-bold uppercase shadow-2xs">All Students</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {studentPapers.length === 0 ? (
                  <div className="p-6 text-center font-mono text-[11px] text-[#7C6B93] uppercase leading-relaxed border border-dashed border-[#E2D5F8] rounded-2xl bg-white/60 py-16">
                    No students registered for this class arm partition yet.
                  </div>
                ) : (
                  studentPapers.map((student) => {
                    const isSelected = student.id === activeStudentId;

                    const rosterTheorySum = student.theoryAnswers.reduce((sum, q) => {
                      const liveVal = (student.id === activeStudentId) ? theoryInputs[q.qId] : null;
                      const scoreVal = (liveVal !== undefined && liveVal !== '' && liveVal !== null) 
                        ? parseFloat(liveVal) 
                        : (parseFloat(q.givenScore) || 0);
                      return sum + scoreVal;
                    }, 0);

                    const rosterTotalMark = student.objScore + rosterTheorySum;

                    return (
                      <div
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className={`p-3.5 border rounded-2xl text-left cursor-pointer transition-all flex justify-between items-center shadow-2xs ${
                          isSelected ? 'border-[#7C3AED] bg-white text-[#2A1A63] shadow-xs ring-1 ring-[#7C3AED]/30' : 'border-[#E2D5F8] bg-white/80 text-slate-700 hover:border-[#7C3AED]/50'
                        }`}
                      >
                        <div className="truncate min-w-0 flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">{student.name}</h4>
                            <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border shrink-0 ml-1 ${
                              student.isSubmitted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#C62927] border-rose-200'
                            }`}>
                              {student.statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] flex-wrap font-bold">
                            <span className="text-[#7C6B93]">Obj: {student.objScore}</span>
                            <span className="text-[#7C3AED]">Theory: {rosterTheorySum}/{student.theoryMaxPossible}</span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-black">Total: {rosterTotalMark} Pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Right Workspace Presentation Container */}
          <section className="lg:col-span-2 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex flex-col justify-between shadow-xs h-[600px] overflow-hidden text-left">
            {currentStudent ? (
              <div className="w-full h-full flex flex-col overflow-hidden">

                <div className="bg-white border border-[#E2D5F8] text-[#2A1A63] p-4 rounded-2xl flex justify-between items-center shadow-2xs mb-4 shrink-0 font-mono">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[#7C3AED] tracking-wider font-mono">EVALUATION PROFILE</span>
                      <span className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded-lg border ${currentStudent.isSubmitted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#C62927] border-rose-200'}`}>
                        {currentStudent.statusLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-tight mt-0.5 truncate max-w-xs font-sans text-slate-900">{currentStudent.name}</h3>
                    <p className="text-[10px] font-bold text-[#7C6B93] mt-0.5 uppercase font-mono">Reg Code: {currentStudent.admissionNo}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block font-black text-[#7C3AED] uppercase tracking-wider font-mono">COMBINED MARKSHEET SUM</span>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {dynamicCumulativeTotal} <span className="text-xs text-[#7C6B93] font-black font-sans">/ {currentStudent.maxPossibleTotal} Marks</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-2">

                 {/* ACCORDION 1: SECTION A (OBJECTIVES AUDITOR) */}
<div className="border border-[#E2D5F8] rounded-2xl overflow-hidden bg-white shadow-2xs">
  <button 
    type="button"
    onClick={() => setIsObjDropdownOpen(!isObjDropdownOpen)}
    className="w-full px-4 py-3 bg-white flex justify-between items-center border-b border-[#E2D5F8]/60 hover:bg-[#FAF9FA] transition-all text-left cursor-pointer"
  >
    <div className="flex items-center gap-2">
      <HelpCircle className="w-4 h-4 text-[#7C3AED]" />
      <div>
        <span className="text-xs font-black text-slate-900 uppercase">Section A: Objective Answers Registry</span>
        <span className="block text-[9px] font-black text-[#7C6B93] uppercase mt-0.5 font-mono">Automated Machine Graded Score log sheet</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono font-black text-slate-800 bg-[#FAF9FA] border border-[#E2D5F8] px-2 py-0.5 rounded-xl">
        {currentStudent.objScore} / {currentStudent.maxObj} Pts
      </span>
      {isObjDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#7C6B93]" /> : <ChevronDown className="w-4 h-4 text-[#7C3AED]" />}
    </div>
  </button>

  {isObjDropdownOpen && (
    <div className="p-4 bg-[#FAF9FA]/40 border-t border-[#E2D5F8]/60 space-y-4 max-h-[350px] overflow-y-auto">
      {!currentStudent.isSubmitted && currentStudent.objectiveAnswers.length === 0 ? (
        <p className="text-center font-mono text-[10px] text-[#C62927] py-4 font-bold uppercase">Candidate did not write or submit objective exam paper.</p>
      ) : (
        currentStudent.objectiveAnswers?.map((obj, oIdx) => {
          const studentChoice = obj.studentSelectedIndex;
          const correctChoice = obj.correctOptionIndex;

          return (
            <div key={obj.qId || oIdx} className="p-3.5 border border-[#E2D5F8] bg-white rounded-2xl space-y-2.5 text-left shadow-2xs">
              <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#7C6B93] border-b border-[#E2D5F8]/60 pb-1.5 uppercase">
                <span>Objective Item {obj.number}</span>
                <span className={obj.isCorrect ? 'text-emerald-700 font-black' : 'text-[#C62927] font-black'}>
                  {obj.isCorrect ? `+${obj.maxScore} / ${obj.maxScore} Pts` : `0.00 / ${obj.maxScore} Pts`}
                </span>
              </div>

              <p className="text-xs font-bold text-slate-900 leading-relaxed">
                <SafeMathText text={obj.prompt} />
              </p>

              {/* Options List Display */}
              <div className="space-y-1.5 pt-1">
                {obj.options && obj.options.length > 0 ? (
                  obj.options.map((optText, optIdx) => {
                    const isSelectedByStudent = studentChoice === optIdx;
                    const isTheCorrectOption = correctChoice === optIdx;

                    let optionStyling = 'bg-slate-50 border-slate-200 text-slate-700';
                    let badgeLabel = null;

                    if (isTheCorrectOption && isSelectedByStudent) {
                      optionStyling = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                      badgeLabel = <span className="text-[9px] font-mono bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg font-black uppercase">Candidate Correct Choice ✓</span>;
                    } else if (isTheCorrectOption) {
                      optionStyling = 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-bold';
                      badgeLabel = <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-black uppercase">Correct Answer</span>;
                    } else if (isSelectedByStudent) {
                      optionStyling = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                      badgeLabel = <span className="text-[9px] font-mono bg-rose-200 text-rose-800 px-2 py-0.5 rounded-lg font-black uppercase">Candidate Choice ✗</span>;
                    }

                    return (
                      <div 
                        key={optIdx} 
                        className={`px-3 py-2 border rounded-xl text-xs flex items-center justify-between transition-all ${optionStyling}`}
                      >
                        <span className="font-sans">
                          <strong className="font-mono mr-1.5">{String.fromCharCode(65 + optIdx)})</strong> 
                          <SafeMathText text={typeof optText === 'object' ? optText.text : optText} />
                        </span>
                        {badgeLabel}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] font-mono text-slate-500 italic">No option variations registered for this objective item.</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  )}
</div>

                  {/* ACCORDION 2: SECTION B (MANUAL INPUT GRADING MATRIX) */}
                  <div className="border border-[#E2D5F8] rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <button 
                      type="button"
                      onClick={() => setIsTheoryDropdownOpen(!isTheoryDropdownOpen)}
                      className="w-full px-4 py-3 bg-white flex justify-between items-center border-b border-[#E2D5F8]/60 hover:bg-[#FAF9FA] transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#7C3AED]" />
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase">Section B: Theory Grading Matrix</span>
                          <span className="block text-[9px] font-black text-[#7C6B93] uppercase mt-0.5 font-mono">
                            {isGraded ? 'Score Sheet Locked (Finalized Marks)' : 'Slick manual score sheet input deck'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-black text-[#7C3AED] bg-[#F3EEFC] px-2.5 py-0.5 border border-[#E2D5F8] rounded-xl">
                          Theory Sum: {currentTheoryInputSum} / {currentStudent.theoryMaxPossible} Pts
                        </span>
                        {isTheoryDropdownOpen ? <ChevronUp className="w-4 h-4 text-[#7C6B93]" /> : <ChevronDown className="w-4 h-4 text-[#7C3AED]" />}
                      </div>
                    </button>

                    {isTheoryDropdownOpen && (
                      <div className="p-4 bg-white border-t border-[#E2D5F8]/60 overflow-x-auto max-h-[300px] overflow-y-auto">
                        {currentStudent.theoryAnswers.length === 0 ? (
                          <p className="text-center font-mono text-[10px] text-[#7C6B93] py-4 font-bold uppercase">No theory items configured for this paper.</p>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#FAF9FA] border-b border-[#E2D5F8] font-mono font-black text-[9px] text-[#7C6B93] uppercase">
                                <th className="p-3 w-16">Item No.</th>
                                <th className="p-3 w-3/5">Theory Question Prompt Context</th>
                                <th className="p-3 text-right px-4">Award Score Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-sans font-bold text-slate-800">
                              {currentStudent.theoryAnswers.map((question) => {
                                const liveVal = theoryInputs[question.qId] !== undefined ? theoryInputs[question.qId] : '';

                                return (
                                  <tr key={question.qId} className="hover:bg-[#FAF9FA]/40 transition-all text-xs">
                                    <td className="p-3 font-mono text-[11px] text-slate-900">Q{question.number}</td>
                                    <td className="p-3 font-medium leading-relaxed" title={question.prompt}>
                                      <SafeMathText text={question.prompt} />
                                    </td>
                                    <td className="p-3 text-right px-4 font-mono">
                                      <div className="flex items-center justify-end gap-2">
                                        <input 
                                          type="number" 
                                          step="0.5"
                                          min="0"
                                          max={question.maxScore}
                                          value={liveVal}
                                          onChange={(e) => handleScoreInput(question.qId, e.target.value, question.maxScore)}
                                          disabled={isSubmitting || isGraded}
                                          readOnly={isGraded}
                                          placeholder="0.0" 
                                          className={`w-24 px-3 py-2 border text-center font-mono font-black text-slate-950 rounded-xl transition-all shadow-2xs ${
                                            isGraded 
                                              ? 'bg-slate-100 border-slate-200 opacity-80 cursor-not-allowed text-slate-600' 
                                              : 'bg-white border-[#E2D5F8] focus:outline-none focus:border-[#7C3AED]'
                                          }`}
                                        />
                                        <span className="text-[11px] text-[#7C6B93] font-normal font-sans">/ {question.maxScore} Marks</span>
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

                <div className="pt-3 border-t border-[#E2D5F8]/60 flex justify-between items-center shrink-0 mt-2">
                  {isGraded ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono font-bold">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Grading is closed and committed for this evaluation session.</span>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {!isGraded && (
                    <button 
                      type="button"
                      onClick={() => setIsConfirmModalOpen(true)} 
                      disabled={isSubmitting || currentStudent.theoryAnswers.length === 0}
                      className="px-5 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Syncing Score...' : 'COMMIT MARKS SHEET'}
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="my-auto text-center font-mono text-xs text-[#7C6B93] uppercase p-8 border border-dashed border-[#E2D5F8] rounded-2xl bg-white/60 max-w-md mx-auto shadow-2xs py-16">
                📂 Assessment Folder Empty
                <p className="text-[10px] text-[#7C6B93] font-sans font-bold uppercase tracking-tight mt-1.5 leading-relaxed">
                  The evaluation pathway opened safely for ID {extractValidId()}, but no completed candidate submissions have hit the network ledger for grading yet.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[30000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#E2D5F8] p-6 rounded-3xl shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-2 text-[#C62927] font-sans font-black text-xs uppercase tracking-tight border-b border-[#FAF9FA] pb-2">
              <AlertTriangle className="w-4 h-4" /> {errorModal.title}
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{errorModal.message}</p>
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR COMMITTING MARKS */}
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

      {/* CONFIRMATION MODAL FOR "DONE GRADING" */}
      <ConfirmationModal 
        isOpen={isDoneGradingModalOpen} 
        title="Finalize & Lock Assessment Grading"
        message="Are you sure you want to mark this entire assessment as fully Graded? This will seal the score entries and release the marks into official student report cards and transcripts."
        confirmLabel="Finalize & Lock" 
        cancelLabel="Continue Editing" 
        onConfirm={handleMarkAsDoneGrading} 
        onCancel={() => setIsDoneGradingModalOpen(false)}
        summaryData={{ 
          "Assessment Subject": subjectNameLabel, 
          "Assessment Type": assessmentTypeLabel, 
          "Action Level": "OFFICIAL_TRANSCRIPT_SYNC"
        }}
      />

    </div>
  );
}