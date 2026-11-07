import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ArrowLeft, FileSpreadsheet, Loader2, AlertTriangle, 
  CheckCircle, ShieldCheck, BarChart2, Layers, Search, Filter, Eye, Check, UserX, UserCheck,
  Lock, Unlock, ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText';

export default function MarkEssays({ assessmentId, onNavigateBack, adminUser, isAdminViewer = false }) {
  const [studentPapers, setStudentPapers] = useState([]);
  const [allQuestionsList, setAllQuestionsList] = useState([]); 
  const [studentTheoryInputs, setStudentTheoryInputs] = useState({});
  
  // Admin Read-Only Guard & Manual Editing Toggle
  const [isAdminEditingUnlocked, setIsAdminEditingUnlocked] = useState(false);

  // Track auto-save states per student: { [studentId]: 'idle' | 'saving' | 'saved' | 'error' }
  const [saveStatuses, setSaveStatuses] = useState({});
  const debounceTimers = useRef({});

  // UI & Objective Inspector Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SUBMITTED'); // Default to SUBMITTED
  const [inspectorStudent, setInspectorStudent] = useState(null);

  const [isDoneGradingModalOpen, setIsDoneGradingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Metadata
  const [assessmentTypeLabel, setAssessmentTypeLabel] = useState("EXAM");
  const [subjectNameLabel, setSubjectNameLabel] = useState("SUBJECT");
  const [assessmentStatus, setAssessmentStatus] = useState("Pending Grading");
  const [expectedTheoryScore, setExpectedTheoryScore] = useState(0);

  // Analytics Toggle
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const trim = (str) => String(str || '').trim();
  const strtolower = (str) => String(str || '').toLowerCase();

  const isAdminUser = useMemo(() => {
    if (isAdminViewer) return true;
    if (!adminUser) return false;
    const role = strtolower(adminUser.role || adminUser.staff_role || '');
    return role === 'admin' || role === 'sub_admin' || role === 'super_admin';
  }, [adminUser, isAdminViewer]);

  const targetScaleMax = useMemo(() => {
    const typeStr = strtolower(assessmentTypeLabel);
    if (typeStr.includes('ca1') || typeStr.includes('ca 1') || typeStr.includes('ca')) {
      return 20;
    }
    return 60;
  }, [assessmentTypeLabel]);

  const extractValidId = useCallback(() => {
    let rawId = assessmentId;
    if (rawId && rawId.target !== undefined && typeof rawId.preventDefault === 'function') rawId = null;
    if (rawId && typeof rawId === 'object') rawId = rawId.id || rawId.assessmentId || rawId.assessment_id;

    let strId = trim(String(rawId || ''));
    if (!strId || strId === 'undefined' || strId === 'null' || strId.includes('Object') || strId === 'NaN') {
      strId = trim(String(localStorage.getItem('saved_asm_id_context') || ''));
    }

    if (strId && /\d+/.test(strId)) {
      const match = strId.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return parseInt(strId, 10);
  }, [assessmentId]);

  const fetchAssessmentScriptsMatrix = useCallback(async () => {
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
        
        const asmExpectedTheory = parseFloat(data.expected_theory_score || 0);
        setExpectedTheoryScore(asmExpectedTheory);
        setAssessmentStatus(data.assessment_status || data.status || "Pending Grading");

        const questionsResponse = await apiRequest(`api/v1/teacher/assessments/${finalId}/questions`, { method: 'GET' });
        const questionsData = await questionsResponse.json();

        if (questionsResponse.ok && questionsData.questions) {
          const allQuestions = questionsData.questions || [];
          setAllQuestionsList(allQuestions);

          const objectiveQuestions = allQuestions.filter(q => trim(strtolower(q.type)) !== 'theory');
          const theoryQuestions = allQuestions.filter(q => trim(strtolower(q.type)) === 'theory');

          const computedTheoryMax = asmExpectedTheory > 0 
            ? asmExpectedTheory 
            : theoryQuestions.reduce((sum, q) => sum + parseFloat(q.points_weight || q.pointsWeight || 5), 0);

          const initialTheoryInputs = {};
          const initialStatuses = {};

          const compiledPapers = data.students.map((student) => {
            const currentProfileId = student.student_profile_id;
            const studentSpecificAnswers = student.answers || [];
            const isSubmitted = student.is_submitted === true || student.is_submitted === 1;
            const statusLabel = student.status_label || (isSubmitted ? 'Submitted' : 'Did Not Write');

            const objectiveAnswers = objectiveQuestions.map((q, idx) => {
              const match = Array.isArray(studentSpecificAnswers) 
                ? studentSpecificAnswers.find(a => parseInt(a.question_id, 10) === parseInt(q.id, 10)) 
                : null;

              const chosenIdx = match && match.selected_index !== undefined && match.selected_index !== null 
                ? parseInt(match.selected_index, 10) 
                : (match && match.selected_option_index !== undefined && match.selected_option_index !== null ? parseInt(match.selected_option_index, 10) : null);
              
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

            const calculatedObjScore = objectiveAnswers.reduce((sum, item) => sum + item.scoreAwarded, 0);
            const maxObjPossible = objectiveAnswers.reduce((sum, item) => sum + item.maxScore, 0);
            const finalMaxPossible = maxObjPossible + computedTheoryMax;

            const theoryScoreEarned = student.theory_score_earned !== undefined && student.theory_score_earned !== null 
              ? parseFloat(student.theory_score_earned) 
              : '';

            initialTheoryInputs[currentProfileId] = theoryScoreEarned !== '' ? String(theoryScoreEarned) : '';
            initialStatuses[currentProfileId] = theoryScoreEarned !== '' ? 'saved' : 'idle';

            return {
              id: currentProfileId,
              name: (student.student_name || 'UNKNOWN CANDIDATE').toUpperCase(),
              admissionNo: student.admission_no || 'VT-2026',
              isSubmitted,
              statusLabel,
              objScore: calculatedObjScore,
              maxObj: maxObjPossible,
              theoryMaxPossible: computedTheoryMax,
              finalMaxPossible,
              savedTheoryScore: theoryScoreEarned,
              objectiveAnswers
            };
          });

          setStudentPapers(compiledPapers);
          setStudentTheoryInputs(initialTheoryInputs);
          setSaveStatuses(initialStatuses);
        }
      }
    } catch (error) {
      console.error("Error fetching scripts matrix:", error);
    } finally {
      setIsLoading(false);
    }
  }, [extractValidId]);

  useEffect(() => {
    fetchAssessmentScriptsMatrix();
  }, [fetchAssessmentScriptsMatrix]);

  const isGraded = assessmentStatus.trim().toLowerCase() === 'graded';

  const executeAutoSave = useCallback(async (studentId, rawValue) => {
    const numericId = extractValidId();
    const scoreVal = rawValue !== '' && rawValue !== null ? parseFloat(rawValue) : 0;

    setSaveStatuses(prev => ({ ...prev, [studentId]: 'saving' }));

    try {
      const response = await apiRequest('api/v1/teacher/grading/mark-theory', {
        method: 'POST',
        body: JSON.stringify({
          student_profile_id: studentId,
          assessment_id: numericId,
          score_given: scoreVal
        })
      });

      if (response.ok) {
        setSaveStatuses(prev => ({ ...prev, [studentId]: 'saved' }));
      } else {
        setSaveStatuses(prev => ({ ...prev, [studentId]: 'error' }));
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
      setSaveStatuses(prev => ({ ...prev, [studentId]: 'error' }));
    }
  }, [extractValidId]);

  const handleTheoryInputChange = (studentId, val, maxTheory, isSubmitted) => {
    // ADMIN PROTECTION: Prevent editing if user is an admin and hasn't explicitly clicked the Edit toggle
    if (isAdminUser && !isAdminEditingUnlocked) return;
    if (isGraded || !isSubmitted) return;

    if (val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > maxTheory) {
        setErrorModal({
          isOpen: true,
          title: 'Exceeds Maximum Score',
          message: `The entered mark (${num}) exceeds the expected theory limit of ${maxTheory} points.`
        });
        return;
      }
    }

    setStudentTheoryInputs(prev => ({ ...prev, [studentId]: val }));
    setSaveStatuses(prev => ({ ...prev, [studentId]: 'saving' }));

    if (debounceTimers.current[studentId]) {
      clearTimeout(debounceTimers.current[studentId]);
    }

    debounceTimers.current[studentId] = setTimeout(() => {
      executeAutoSave(studentId, val);
    }, 750);
  };

  const filteredStudents = useMemo(() => {
    return studentPapers.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'SUBMITTED') return matchesSearch && student.isSubmitted;
      if (statusFilter === 'UNSUBMITTED') return matchesSearch && !student.isSubmitted;
      return matchesSearch;
    });
  }, [studentPapers, searchQuery, statusFilter]);

  const examAnalytics = useMemo(() => {
    const submittedStudents = studentPapers.filter(s => s.isSubmitted);
    const totalSubmittedCount = submittedStudents.length;

    if (totalSubmittedCount === 0 || allQuestionsList.length === 0) {
      return { classAverage: 0, passRate: 0, totalSubmitted: 0 };
    }

    let totalScoreSum = 0;
    let passingCount = 0;

    submittedStudents.forEach(s => {
      const liveTheory = studentTheoryInputs[s.id];
      const theoryEarned = liveTheory !== undefined && liveTheory !== '' ? parseFloat(liveTheory) : (parseFloat(s.savedTheoryScore) || 0);
      const rawSum = s.objScore + theoryEarned;
      const scaleDiv = s.finalMaxPossible > 0 ? s.finalMaxPossible : 1;
      const scaled = (rawSum / scaleDiv) * targetScaleMax;

      totalScoreSum += scaled;
      if ((scaled / targetScaleMax) >= 0.5) passingCount++;
    });

    const classAveragePts = totalScoreSum / totalSubmittedCount;
    const classAveragePct = Math.round((classAveragePts / targetScaleMax) * 100);
    const passRatePct = Math.round((passingCount / totalSubmittedCount) * 100);

    return { classAverage: classAveragePct, passRate: passRatePct, totalSubmitted: totalSubmittedCount };
  }, [studentPapers, allQuestionsList, studentTheoryInputs, targetScaleMax]);

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
          message: `Assessment status changed to Graded. Standardized scores (/${targetScaleMax}) are now published.`
        });
      } else {
        setIsDoneGradingModalOpen(false);
        setErrorModal({ isOpen: true, title: 'Action Failed', message: data.message || 'Failed to lock assessment status.' });
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
              <th>Section B (Theory Entered)</th>
              <th>Raw Cumulative Score</th>
              <th>Standardized Grade (/${targetScaleMax})</th>
            </tr>
          </thead>
          <tbody>
    `;

    studentPapers.forEach(p => {
      const liveTheory = studentTheoryInputs[p.id];
      const theoryEarned = liveTheory !== undefined && liveTheory !== '' ? parseFloat(liveTheory) : (parseFloat(p.savedTheoryScore) || 0);
      const rawTotal = p.objScore + theoryEarned;
      const scaleDivisor = p.finalMaxPossible > 0 ? p.finalMaxPossible : 1;
      const scaledScore = Math.round(((rawTotal / scaleDivisor) * targetScaleMax) * 10) / 10;

      tableHtml += `
        <tr>
          <td>${p.name}</td>
          <td class="number-cell">${p.admissionNo}</td>
          <td>${p.statusLabel}</td>
          <td class="score-title">${p.objScore} / ${p.maxObj}</td>
          <td class="score-title">${theoryEarned} / ${p.theoryMaxPossible}</td>
          <td class="score-title">${rawTotal} / ${p.finalMaxPossible}</td>
          <td class="score-title" style="background-color: #faf9fa; font-weight: 900;">${scaledScore} / ${targetScaleMax}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table></body></html>`;

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

  if (isLoading && studentPapers.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
        Loading class examination ledger...
      </div>
    );
  }

  const submittedCount = studentPapers.filter(s => s.isSubmitted).length;
  const unsubmittedCount = studentPapers.filter(s => !s.isSubmitted).length;

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col justify-between select-none font-sans text-[#2A1A63] w-full overflow-x-hidden">

      {/* HEADER BAR */}
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
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-white">START-RITE WORKSPACE</h2>
              {isAdminUser && (
                <span className="px-2 py-0.5 bg-amber-400 text-amber-950 font-mono font-black text-[9px] rounded-md uppercase tracking-wider">
                  Admin Inspection Mode
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">{subjectNameLabel} ({assessmentTypeLabel}) MARKING MATRIX</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Safeguard Toggle */}
          {isAdminUser && (
            <button
              onClick={() => setIsAdminEditingUnlocked(!isAdminEditingUnlocked)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.97] ${
                isAdminEditingUnlocked 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
              }`}
            >
              {isAdminEditingUnlocked ? (
                <>
                  <Unlock className="w-4 h-4 text-slate-950" /> Lock Admin Editing
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" /> Unlock Editing Mode
                </>
              )}
            </button>
          )}

          <span className="px-3 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-mono font-black rounded-xl uppercase tracking-wider shadow-2xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Target Scale: /{targetScaleMax} Marks
          </span>

          {isGraded && (
            <button 
              onClick={handleOfficeWorkbookExport}
              className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" /> EXPORT REPORT (.XLS)
            </button>
          )}

          {!isGraded ? (
            <button 
              onClick={() => setIsDoneGradingModalOpen(true)}
              className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.97] cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" /> LOCK GRADING
            </button>
          ) : (
            <span className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-black rounded-xl uppercase flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> LOCKED & SEALED
            </span>
          )}
        </div>
      </header>

      {/* Admin Notice Bar */}
      {isAdminUser && !isAdminEditingUnlocked && (
        <div className="w-full bg-amber-500/15 border-b border-amber-300 px-6 py-2 flex items-center justify-between font-mono text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Admin View Mode: All marks are currently locked for viewing safety. Click "Unlock Editing Mode" in the top bar if you need to alter scores.</span>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">

        {/* ANALYTICS RIBBON */}
        <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">Class Level Overview & Item Intelligence</h3>
            </div>
            <button 
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className="text-[10px] font-mono font-black text-[#7C3AED] hover:underline cursor-pointer uppercase"
            >
              {isAnalyticsOpen ? 'Collapse Insights ▴' : 'Expand Insights ▾'}
            </button>
          </div>

          {isAnalyticsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="p-4 bg-white border border-[#E2D5F8] rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-[#7C6B93] uppercase block tracking-wider">Class Mean Average</span>
                <p className="text-base font-black text-[#7C3AED] mt-1">{examAnalytics.classAverage}%</p>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5 block font-semibold">Calculated from {examAnalytics.totalSubmitted} active submissions</span>
              </div>

              <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-2xs">
                <span className="text-[9px] font-sans font-bold text-emerald-700 uppercase block tracking-wider">Mastery Benchmark (≥50%)</span>
                <p className="text-base font-black text-emerald-700 mt-1">{examAnalytics.passRate}%</p>
                <span className="text-[9px] text-slate-500 font-sans mt-0.5 block font-semibold">Pass Rate Percentage</span>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS BAR: SEARCH & FILTER TABS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-[#E2D5F8] p-4 rounded-2xl shadow-2xs">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#7C6B93] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter by candidate name or admission/reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2D5F8] rounded-xl focus:outline-none focus:border-[#7C3AED] font-sans bg-[#FAF9FA]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto font-mono text-xs overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold text-[#7C6B93] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> View:
            </span>
            <button 
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                statusFilter === 'SUBMITTED' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Ready to Grade ({submittedCount})
            </button>

            <button 
              onClick={() => setStatusFilter('UNSUBMITTED')}
              className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                statusFilter === 'UNSUBMITTED' ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserX className="w-3.5 h-3.5" /> Did Not Write ({unsubmittedCount})
            </button>

            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-[#7C3AED] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Roster ({studentPapers.length})
            </button>
          </div>
        </div>

        {/* PRIMARY SPREADSHEET TABLE LEDGER */}
        <div className="bg-white border border-[#E2D5F8] rounded-3xl shadow-xs overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#2A1A63] text-white font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-black">Candidate Name & Reg No</th>
                  <th className="py-3.5 px-3 font-black text-center">Status</th>
                  <th className="py-3.5 px-4 font-black text-center">Sec A: Obj Score (Auto)</th>
                  <th className="py-3.5 px-4 font-black text-center">Sec B: Theory Mark Input</th>
                  <th className="py-3.5 px-4 font-black text-center">Auto-Save Status</th>
                  <th className="py-3.5 px-4 font-black text-center">Raw Cumulative</th>
                  <th className="py-3.5 px-4 font-black text-center">Standardized Total (/{targetScaleMax})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5F8]/60 text-xs font-sans">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-mono text-xs text-[#7C6B93] uppercase">
                      No candidate records found matching current query/filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const liveTheoryVal = studentTheoryInputs[student.id] !== undefined 
                      ? studentTheoryInputs[student.id] 
                      : '';

                    const currentTheoryInput = liveTheoryVal !== '' 
                      ? parseFloat(liveTheoryVal) || 0 
                      : (parseFloat(student.savedTheoryScore) || 0);

                    const dynamicRawTotal = student.objScore + currentTheoryInput;
                    const dynamicScaleDivisor = student.finalMaxPossible > 0 ? student.finalMaxPossible : 1;
                    const dynamicScaledScore = Math.round(((dynamicRawTotal / dynamicScaleDivisor) * targetScaleMax) * 10) / 10;

                    const currentStatus = saveStatuses[student.id] || 'idle';
                    
                    // Input enable rule: Teacher can edit if submitted and not graded; Admin can edit ONLY when explicitly unlocked
                    const canEdit = student.isSubmitted && !isGraded && (!isAdminUser || isAdminEditingUnlocked);

                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-all ${
                          !student.isSubmitted ? 'bg-slate-50/70 opacity-75' : 'hover:bg-[#FAF9FA]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className={`font-black uppercase truncate max-w-[220px] ${!student.isSubmitted ? 'text-slate-500' : 'text-slate-900'}`}>
                            {student.name}
                          </div>
                          <div className="font-mono text-[10px] text-[#7C6B93] font-bold mt-0.5">{student.admissionNo}</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
                            student.isSubmitted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-[#C62927] border-rose-200'
                          }`}>
                            {student.statusLabel}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <button 
                            onClick={() => setInspectorStudent(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F3EEFC] hover:bg-[#E2D5F8] text-[#7C3AED] rounded-lg border border-[#E2D5F8] font-black text-xs transition-all cursor-pointer shadow-2xs"
                            title="Inspect Objective Breakdown"
                          >
                            <span>{student.objScore} / {student.maxObj} Pts</span>
                            <Eye className="w-3.5 h-3.5 text-[#7C3AED]" />
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <div className="flex items-center justify-center gap-1.5">
                            {student.isSubmitted ? (
                              <>
                                <input 
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={student.theoryMaxPossible}
                                  value={liveTheoryVal}
                                  onChange={(e) => handleTheoryInputChange(student.id, e.target.value, student.theoryMaxPossible, student.isSubmitted)}
                                  onBlur={() => executeAutoSave(student.id, studentTheoryInputs[student.id])}
                                  placeholder="0.0"
                                  disabled={!canEdit}
                                  className="w-20 px-2 py-1 text-center font-mono font-black text-slate-950 rounded-lg bg-white border border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] text-xs shadow-2xs disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
                                />
                                <span className="text-[10px] text-[#7C6B93] font-bold">/ {student.theoryMaxPossible}</span>
                              </>
                            ) : (
                              <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                DID NOT WRITE
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          {canEdit && currentStatus === 'saving' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#7C3AED] bg-[#F3EEFC] border border-[#E2D5F8] px-2 py-0.5 rounded-lg animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin text-[#7C3AED]" /> Saving...
                            </span>
                          )}

                          {canEdit && currentStatus === 'saved' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                              <Check className="w-3 h-3 text-emerald-600" /> Saved ✓
                            </span>
                          )}

                          {canEdit && currentStatus === 'error' && (
                            <button 
                              onClick={() => executeAutoSave(student.id, liveTheoryVal)}
                              className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-rose-100"
                              title="Click to retry saving"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Retry ✗
                            </button>
                          )}

                          {(!canEdit || currentStatus === 'idle') && (
                            <span className="text-[10px] font-bold text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-black text-slate-700">
                          {dynamicRawTotal} / {student.finalMaxPossible}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className={`text-sm font-black px-2.5 py-1 rounded-lg border inline-block ${
                            student.isSubmitted ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-100 border-slate-200'
                          }`}>
                            {dynamicScaledScore} / {targetScaleMax}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* OBJECTIVE BREAKDOWN INSPECTOR MODAL */}
      {inspectorStudent && (
        <div className="fixed inset-0 bg-slate-950/50 z-[20000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-[#E2D5F8] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-[#2A1A63] text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-[#A78BFA] tracking-wider">SECTION A: OBJECTIVE ITEM REGISTRY</span>
                <h3 className="text-sm font-black uppercase tracking-tight text-white mt-0.5">{inspectorStudent.name} ({inspectorStudent.admissionNo})</h3>
              </div>

              <button 
                onClick={() => setInspectorStudent(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              {inspectorStudent.objectiveAnswers.length === 0 ? (
                <p className="text-center font-mono text-xs text-[#7C6B93] py-8 uppercase font-bold">No objective items present in this examination paper.</p>
              ) : (
                inspectorStudent.objectiveAnswers.map((obj, idx) => {
                  const promptText = typeof obj.prompt === 'object' ? (obj.prompt.text || JSON.stringify(obj.prompt)) : obj.prompt;

                  return (
                    <div key={obj.qId || idx} className="p-4 border border-[#E2D5F8] bg-white rounded-2xl space-y-2">
                      <div className="flex justify-between items-center font-mono text-[10px] font-black text-[#7C6B93]">
                        <span>Item {obj.number}</span>
                        <span className={obj.isCorrect ? 'text-emerald-700 font-black' : 'text-[#C62927] font-black'}>
                          {obj.isCorrect ? `+${obj.maxScore} / ${obj.maxScore} Pts` : `0.00 / ${obj.maxScore} Pts`}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 leading-relaxed font-sans">
                        <SafeMathText text={promptText} />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {obj.options?.map((opt, optIdx) => {
                          const isSelected = obj.studentSelectedIndex === optIdx;
                          const isCorrectOpt = obj.correctOptionIndex === optIdx;

                          const optionText = typeof opt === 'object' && opt !== null 
                            ? (opt.text || opt.option_text || opt.label || JSON.stringify(opt)) 
                            : String(opt || '');

                          let style = 'bg-slate-50 border-slate-200 text-slate-700';
                          if (isCorrectOpt && isSelected) style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                          else if (isCorrectOpt) style = 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-bold';
                          else if (isSelected) style = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';

                          return (
                            <div key={optIdx} className={`px-3 py-1.5 border rounded-xl text-xs flex justify-between items-center ${style}`}>
                              <span className="font-sans">
                                <strong className="font-mono mr-1.5">{String.fromCharCode(65 + optIdx)})</strong> 
                                <SafeMathText text={optionText} />
                              </span>
                              {isCorrectOpt && isSelected && <span className="text-[9px] font-mono bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-black uppercase">Candidate Choice ✓</span>}
                              {!isCorrectOpt && isSelected && <span className="text-[9px] font-mono bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-black uppercase">Candidate Choice ✗</span>}
                              {isCorrectOpt && !isSelected && <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">Correct Key</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-[#FAF9FA] px-6 py-3 border-t border-[#E2D5F8] flex justify-end shrink-0">
              <button 
                onClick={() => setInspectorStudent(null)}
                className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer transition-all"
              >
                Close Breakdown
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Error Alert Modal */}
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
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isDoneGradingModalOpen} 
        title="Lock Assessment Grading"
        message={`Are you sure you want to mark this assessment as fully Graded? Marks will be locked and published.`}
        confirmLabel="Lock & Publish" 
        cancelLabel="Keep Open" 
        onConfirm={handleMarkAsDoneGrading} 
        onCancel={() => setIsDoneGradingModalOpen(false)}
      />

    </div>
  );
}