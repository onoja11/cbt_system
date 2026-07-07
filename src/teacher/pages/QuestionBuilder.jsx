import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, FileSpreadsheet, ImageIcon, Upload, X, RotateCcw, Lock, Edit3, AlertTriangle, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../core/api';

// Decoupled Module Components
import QuestionLedger from '../components/QuestionLedger';
import ManualForm from '../components/ManualForm';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';

export default function QuestionBuilder({ assessmentId, onNavigateBack }) {
  // 🛰️ MASTER INFRASTRUCTURE SYSTEM STATES
  const [ingestionMode, setIngestionMode] = useState('manual'); 
  const [activeSectionTab, setActiveSectionTab] = useState('objective'); 

  // 📝 LOCAL METADATA STRUCTURAL STATES
  const [subjectInfo, setSubjectInfo] = useState('');
  const [categoryInfo, setCategoryInfo] = useState('');
  const [assessmentStatus, setAssessmentStatus] = useState('draft');
  const [feedbackComment, setFeedbackComment] = useState(''); // 💡 ADDED: State tracking for moderator adjustments notes
  const [isLoading, setIsLoading] = useState(true);

  const [sectionRules] = useState({
    objective: { instructions: 'Answer all multiple-choice questions in this section.', maxToAnswer: 'all' },
    theory: { instructions: 'Answer all questions out of this section comprehensively.', maxToAnswer: 'all' }
  });

  // 📁 LIVE DATABASE CONTAINER DATA STORES
  const [questionBank, setQuestionBank] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  // ⚙️ INITIALIZE MODAL LOCAL FORMS MEMORY PIPES
  const [questionText, setQuestionText] = useState('');
  const [questionScore, setQuestionScore] = useState(2);
  const [manualImageFile, setManualImageFile] = useState(null);
  const [manualImagePreview, setManualImagePreview] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: true }, { text: '', isCorrect: false }]);
  const [theoryRubric, setTheoryRubric] = useState('');
  const [didCancelExistingImage, setDidCancelExistingImage] = useState(false);

  // 📊 BULK INGESTION EXTENDED STATES
  const [csvFile, setCsvFile] = useState(null);
  const [bulkImages, setBulkImages] = useState([]);
  const [csvPreviewQuestions, setCsvPreviewQuestions] = useState([]); 
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  // Custom Modal States
  const [modalType, setModalType] = useState(null); 
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Helper string processors safely isolated
  const cleanString = useCallback((str) => String(str || '').trim().toLowerCase(), []);

  // 🛡️ SYSTEM UNLOCK GUARD
  const resolvedStatus = useMemo(() => cleanString(assessmentStatus), [assessmentStatus, cleanString]);
  
  // 💡 Note: Assessments with 'Rejected' status remain UNLOCKED so teachers can apply updates
  const isLocked = useMemo(() => {
    return [
      'pending_admin', 'pending admin', 'approved', 
      'exam in progress', 'finished (ready to grade)', 'graded'
    ].includes(resolvedStatus);
  }, [resolvedStatus]);

  // Unified Server Domain Selection Guard
  // const baseServerDomain = window.API_BASE_URL || (window.location.hostname.includes('localhost') || window.location.hostname.includes('vercel.app') ? 'http://startrite_cbt_api.test' : 'https://startrite-api.onrender.com');

  const baseServerDomain = window.API_BASE_URL || 'https://startrite-api.onrender.com';

  // ⚡ FIXED: Moved targetAssessmentId calculation ABOVE the hooks that depend on it!
  const targetAssessmentId = useMemo(() => {
    if (!assessmentId) return localStorage.getItem('saved_asm_id_context');
    if (typeof assessmentId === 'object') return assessmentId.id || assessmentId.assessmentId;
    return assessmentId;
  }, [assessmentId]);

  // 📊 LIVE SCORE COMPUTATION LOGIC PIPELINES - PERFORMANCE OPTIMIZED
  const totalObjectivePoints = useMemo(() => {
    return questionBank
      .filter(q => cleanString(q.type) === 'objective')
      .reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [questionBank, cleanString]);

  const totalTheoryPoints = useMemo(() => {
    return questionBank
      .filter(q => cleanString(q.type) === 'theory')
      .reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [questionBank, cleanString]);

  const refreshQuestionBlueprint = useCallback(async () => {
    if (!targetAssessmentId) return;

    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/questions`, { method: 'GET' });
      const data = await response.json();

      if (response.ok) {
        setSubjectInfo(data.subject || 'Core Module Paper');
        setCategoryInfo(data.category || 'Assessment Layer');
        
        const targetModelStatus = data.assessment_status || data.status_label || data.assessment?.status || 'draft';
        setAssessmentStatus(targetModelStatus);
        
        // 💡 ADDED: Capture moderator feedback values out of the response payload array map records
        const feedback = data.feedback_comment || data.feedback || data.assessment?.feedback_comment || '';
        setFeedbackComment(feedback);
        
        if (data.questions && data.questions.length > 0) {
          const remapped = data.questions.map(q => ({
            id: q.id,
            type: cleanString(q.type) === 'theory' ? 'theory' : 'objective',
            text: q.question_text || q.questionText,
            score: parseFloat(q.points_weight || q.pointsWeight || 2),
            imageUrl: q.image_url || q.imageUrl || null, 
            rubric: q.theory_rubric || q.rubric || '',
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt, idx) => ({
              text: opt.text || opt,
              isCorrect: opt.is_correct !== undefined ? opt.is_correct : (idx === q.correct_option_index || idx === q.correctOptionIndex)
            })) : []
          }));
          
          setQuestionBank(remapped);
        } else {
          setQuestionBank([]);
        }
      }
    } catch (error) {
      console.error("❌ [QUESTION BLUEPRINT SYNC FAULT]:", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetAssessmentId, cleanString]);

  useEffect(() => {
    refreshQuestionBlueprint();
  }, [refreshQuestionBlueprint]);

  const handleCSVFileChange = (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrorModal({
        isOpen: true,
        title: 'Invalid File Format',
        message: 'Please attach a valid spreadsheet document ending with the .csv file extension.'
      });
      return;
    }

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const previewRows = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (columns.length < 2) continue;

        const type = columns[0]?.replace(/"/g, '').trim() || 'Objective';
        const qText = columns[1]?.replace(/"/g, '').trim() || '';
        const score = columns[2] ? parseFloat(columns[2]) : 2;
        const rawOptions = columns[3]?.replace(/"/g, '').trim() || '';
        const correctIdx = columns[4] ? parseInt(columns[4], 10) : 0;
        const imageHandle = columns[5]?.replace(/"/g, '').replace(/\r/g, '').replace(/\n/g, '').trim() || null;

        previewRows.push({
          type: cleanString(type) === 'theory' ? 'theory' : 'objective',
          text: qText,
          score,
          options: rawOptions ? rawOptions.split('|').map((opt, idx) => ({ text: opt, isCorrect: idx === correctIdx })) : [],
          imageHandle
        });
      }
      setCsvPreviewQuestions(previewRows);
    };
    reader.readAsText(file);
  };

  const handleBulkImagesChange = (e) => {
    if (isLocked) return;
    const files = Array.from(e.target.files);
    const validImages = files.filter(file => file.type.startsWith('image/'));
    setBulkImages(prev => [...prev, ...validImages]);
  };

  const removeBulkImage = (index) => {
    if (isLocked) return;
    setBulkImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelBulkUploadDeck = () => {
    setCsvFile(null);
    setBulkImages([]);
    setCsvPreviewQuestions([]);
    triggerNotificationAlert("Bulk spreadsheet workspace cleared successfully.");
  };

  const triggerNotificationAlert = (msg) => {
    setSuccessMessage(msg);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 3500);
  };

  const handleBulkCSVExecution = async () => {
    if (!csvFile || isLocked || !targetAssessmentId) return;
    setIsUploadingBulk(true);
    setModalType(null); 

    const formData = new FormData();
    formData.append('csv_file', csvFile);
    bulkImages.forEach((image) => {
      formData.append('images[]', image, image.name);
    });

    try {
      // 🎯 FIXED: Direct native request pipeline with automated header allocation to bypass any core apiRequest JSON mutation breaks locally!
      const authToken = localStorage.getItem('intranet_access_token');
      const response = await fetch(`${baseServerDomain}/api/v1/teacher/assessments/${targetAssessmentId}/questions/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setCsvFile(null);
        setBulkImages([]);
        setCsvPreviewQuestions([]);
        setIngestionMode('manual');
        await refreshQuestionBlueprint();
        triggerNotificationAlert(data.message || "Bulk spreadsheets dataset synchronized successfully!");
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Bulk Upload Failure',
          message: data.message || 'Could not process the uploaded bulk question spreadsheet stream.'
        });
      }
    } catch (error) {
      console.error(error);
      triggerNotificationAlert("Transaction execution drop. Check network connectivity thresholds.");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const handleManualFormExecution = async () => {
    if (isLocked || !targetAssessmentId) return;
    const token = localStorage.getItem('intranet_access_token');
    const formData = new FormData();

    formData.append('type', activeSectionTab === 'theory' ? 'Theory' : 'Objective');
    formData.append('question_text', questionText);
    formData.append('points_weight', Number(questionScore));
    formData.append('remove_existing_image', didCancelExistingImage ? 'true' : 'false');

    if (activeSectionTab === 'objective') {
      formData.append('options', JSON.stringify(options.map(o => o.text)));
      formData.append('correct_option_index', options.findIndex(o => o.isCorrect));
    } else {
      formData.append('theory_rubric', theoryRubric);
      formData.append('options', JSON.stringify([]));
      formData.append('correct_option_index', -1);
    }

    if (manualImageFile) {
      formData.append('manual_image', manualImageFile);
    }

    try {
      const isEditSequence = activeQuestionId && !String(activeQuestionId).startsWith('temp_');
      const endpointUrl = isEditSequence 
        ? `${baseServerDomain}/api/v1/teacher/assessments/${targetAssessmentId}/questions/${activeQuestionId}`
        : `${baseServerDomain}/api/v1/teacher/assessments/${targetAssessmentId}/questions`;

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        await refreshQuestionBlueprint();
        triggerNotificationAlert(isEditSequence ? "Question changes updated successfully!" : "Question saved successfully!");
        initializeEmptyFormState();
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Saving Failed',
          message: data.message || 'Could not commit the individual question changes onto the server registry.'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setModalType(null);
    }
  };

  const executeDeletePipeline = async () => {
    if (!deleteTargetId || isLocked || !targetAssessmentId) return;

    if (String(deleteTargetId).startsWith('temp_')) {
      const remaining = questionBank.filter(q => q.id !== deleteTargetId);
      setQuestionBank(remaining);
      initializeEmptyFormState();
      setModalType(null);
      setDeleteTargetId(null);
      return;
    }
    
    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/questions/${deleteTargetId}`, { method: 'DELETE' });
      if (response.ok) {
        const remaining = questionBank.filter(q => q.id !== deleteTargetId);
        setQuestionBank(remaining);
        initializeEmptyFormState();
        triggerNotificationAlert("Question entry dropped from paper template ledger.");
      }
    } catch (error) { 
      console.error(error); 
    } {
      setModalType(null);
      setDeleteTargetId(null);
    }
  };

  const handleConfirmActionDispatch = () => {
    if (isLocked) return;
    if (modalType === 'bulk_submit') {
      handleBulkCSVExecution();
    } else if (modalType === 'manual_commit') {
      handleManualFormExecution();
    } else if (modalType === 'delete_confirm') {
      executeDeletePipeline();
    }
  };

  const initializeEmptyFormState = () => {
    setActiveQuestionId(null);
    setQuestionText('');
    setQuestionScore(2);
    if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview('');
    setDidCancelExistingImage(false);
    if (activeSectionTab === 'objective') {
      setOptions([{ text: 'Option A', isCorrect: true }, { text: 'Option B', isCorrect: false }]);
    } else {
      setTheoryRubric('');
    }
  };

  const loadQuestionIntoEditor = (q) => {
    if (!q) return;
    setActiveQuestionId(q.id);
    setQuestionText(q.text);
    setQuestionScore(q.score);
    if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview(q.imageUrl ? `${baseServerDomain}${q.imageUrl}` : ''); 
    if (cleanString(q.type) === 'objective') {
      setOptions(q.options || [{ text: '', isCorrect: true }]);
    } else {
      setTheoryRubric(q.rubric || '');
    }
  };

  const handleAddNewQuestionShell = () => {
    if (isLocked) return;
    initializeEmptyFormState();
    setActiveQuestionId(`temp_${Date.now()}`);
  };

  const handleManualImageDrop = (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (file) { 
      if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(manualImagePreview);
      }
      setManualImageFile(file); 
      setManualImagePreview(URL.createObjectURL(file)); 
      setDidCancelExistingImage(false);
    }
  };

  const handleCancelManualImage = () => {
    if (isLocked) return;
    if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview('');
    setDidCancelExistingImage(true);
  };

  const handleDeleteQuestionClick = (id, e) => {
    e.stopPropagation();
    if (isLocked) return;
    setDeleteTargetId(id);
    setModalType('delete_confirm');
  };

  const filteredBankList = useMemo(() => {
    return questionBank.filter(q => cleanString(q.type) === activeSectionTab);
  }, [questionBank, activeSectionTab, cleanString]);

  const activeQuestionIndex = useMemo(() => {
    return filteredBankList.findIndex(q => q.id === activeQuestionId);
  }, [filteredBankList, activeQuestionId]);

  const displayLabelString = useMemo(() => {
    const num = activeQuestionIndex !== -1 ? activeQuestionIndex + 1 : filteredBankList.length + 1;
    return activeSectionTab === 'objective' ? `Objective Q${num}` : `Theory Q${num}`;
  }, [activeSectionTab, activeQuestionIndex, filteredBankList]);

  return (
    <div className="min-h-screen bg-[#FAF9FA] flex flex-col justify-between text-[#2A1A63] font-sans selection:bg-[#9A87A9]/30 w-full overflow-x-hidden relative">
      
      {/* 🎯 STATE OVERLAY LOADING ANIMATION */}
      {isUploadingBulk && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[50000] flex flex-col justify-center items-center text-center font-mono">
          <div className="bg-white border border-[#9A87A9]/40 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="relative w-12 h-12 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-[#2A1A63]" />
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 absolute" />
            </div>
            <div className="text-center">
              <h4 className="text-xs font-black uppercase text-slate-950 tracking-wider">Uploading Bulk Data...</h4>
              <p className="text-[10px] text-[#9A87A9] font-bold uppercase mt-1">Parsing spreadsheet row layers safely</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS VAULT */}
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onNavigateBack} className="p-1.5 border border-[#9A87A9]/30 rounded-lg text-[#9A87A9] hover:text-[#2A1A63] mr-2 cursor-pointer transition-all active:scale-[0.97] shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="mr-1">
              <Logo size={45} showText={false} />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Question Setup Terminal</h2>
              <p className="text-[10px] font-bold text-[#9A87A9] font-mono uppercase tracking-wider mt-0.5 truncate">
                {subjectInfo || 'Startrite Core Module'} • Status: <span className={resolvedStatus === 'rejected' ? 'text-[#C62927] font-black animate-pulse' : isLocked ? 'text-indigo-600 font-black' : 'text-emerald-600 font-black'}>{assessmentStatus.toUpperCase()}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!isLocked && (
              <button onClick={() => setIngestionMode(ingestionMode === 'manual' ? 'bulk' : 'manual')} className="px-4 py-2 bg-[#2A1A63] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md font-mono cursor-pointer">
                {ingestionMode === 'manual' ? 'Switch to Bulk CSV' : 'Switch to Manual Form'}
              </button>
            )}
            {isLocked && (
              <div className="flex items-center gap-1 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 font-mono font-black text-[10px] uppercase rounded-lg shadow-3xs">
                <Lock className="w-3.5 h-3.5 text-[#C62927]" /> View-Only Mode Active
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DYNAMIC MODERATOR ADJUSTMENT NOTIFICATIONS FEED BANNER */}
      {resolvedStatus === 'rejected' && feedbackComment && (
        <div className="w-full bg-rose-50 border-b border-rose-200 py-3.5 px-4 md:px-6 shadow-inner animate-fadeIn text-left shrink-0">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <div className="w-8 h-8 bg-white border border-rose-200 rounded-lg flex items-center justify-center text-[#C62927] shrink-0 shadow-3xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-black text-[#C62927] uppercase tracking-wider block">Moderation Revision Logs Comments:</span>
              <p className="text-xs font-bold text-slate-950 mt-0.5 leading-relaxed uppercase select-text">{feedbackComment}</p>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME LIVE SCORE ACCUMULATION MONITOR BAR */}
      <div className="w-full max-w-7xl mx-auto px-4 mt-4 grid grid-cols-2 gap-4 shrink-0 text-left">
        <div className="bg-white border border-[#9A87A9]/20 p-3 rounded-xl shadow-3xs flex justify-between items-center font-mono">
          <span className="text-[10px] font-black text-[#9A87A9] uppercase">Part A (Obj) Total Score:</span>
          <span className="text-xs font-black text-slate-950 bg-[#FAF9FA] border border-[#9A87A9]/20 px-2.5 py-0.5 rounded-md">{totalObjectivePoints} Marks</span>
        </div>
        <div className="bg-white border border-[#9A87A9]/20 p-3 rounded-xl shadow-3xs flex justify-between items-center font-mono">
          <span className="text-[10px] font-black text-[#9A87A9] uppercase">Part B (Theory) Total Score:</span>
          <span className="text-xs font-black text-slate-950 bg-[#FAF9FA] border border-[#9A87A9]/20 px-2.5 py-0.5 rounded-md">{totalTheoryPoints} Marks</span>
        </div>
      </div>

      {ingestionMode === 'manual' && (
        <div className="w-full max-w-7xl mx-auto px-4 py-2 mt-2 flex gap-2 shrink-0">
          <button onClick={() => { setActiveSectionTab('objective'); initializeEmptyFormState(); }} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider cursor-pointer font-mono transition-all duration-150 ${activeSectionTab === 'objective' ? 'bg-[#2A1A63] text-white shadow-sm border-[#2A1A63]' : 'bg-white border border-[#9A87A9]/30 text-[#9A87A9] hover:bg-slate-50'}`}>Section A: Objectives</button>
          <button onClick={() => { setActiveSectionTab('theory'); initializeEmptyFormState(); }} className={`px-4 py-2 text-xs font-black uppercase rounded-lg tracking-wider cursor-pointer font-mono transition-all duration-150 ${activeSectionTab === 'theory' ? 'bg-[#2A1A63] text-white shadow-sm border-[#2A1A63]' : 'bg-white border border-[#9A87A9]/30 text-[#9A87A9] hover:bg-slate-50'}`}>Section B: Theory</button>
        </div>
      )}

      {isLoading ? (
        <main className="flex-1 flex items-center justify-center bg-[#FAF9FA] w-full py-24">
          <div className="text-xs font-mono text-[#9A87A9] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#2A1A63]" />
            Synchronizing assessment files from backend matrix...
          </div>
        </main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start">
          
          {ingestionMode === 'bulk' && !isLocked ? (
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="space-y-4 flex flex-col">
                <div className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 shadow-3xs space-y-3 text-left">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#FAF9FA]">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-950">CSV Spreadsheet Structure Rules</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-mono bg-[#FAF9FA] p-3 border border-[#9A87A9]/20 rounded-lg">
                    <strong>Mandatory Column Alignment Map:</strong><br />
                    0: Type (Objective/Theory)<br />
                    1: Question_Text<br />
                    2: Points_Weight<br />
                    3: Options (Split parameters with |)<br />
                    4: Correct_Option_Index (0 for A)<br />
                    5: Image_Handle (e.g., cell.png)
                  </p>
                </div>

                <div className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 shadow-3xs flex-1 flex flex-col justify-between min-h-[260px] text-left">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#FAF9FA]">
                      <ImageIcon className="w-4 h-4 text-[#2A1A63]" />
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-950">Reference Media Pool ({bulkImages.length})</h4>
                    </div>
                    
                    <div className="p-4 border border-dashed border-[#9A87A9]/40 rounded-xl bg-[#FAF9FA]/50 text-center relative flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-5 h-5 text-[#9A87A9]" />
                      <span className="text-[10px] font-black text-[#9A87A9] uppercase font-mono">Upload Attachments Bundle</span>
                      <input type="file" multiple accept="image/*" onChange={handleBulkImagesChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[160px] pt-1">
                      {bulkImages.map((img, idx) => (
                        <div key={idx} className="relative border border-[#9A87A9]/20 rounded-lg p-1 bg-white text-center flex flex-col justify-between items-center h-16 shadow-3xs group">
                          <img src={URL.createObjectURL(img)} alt="attached-thumbnail" className="w-full h-8 object-contain rounded" />
                          <span className="text-[7px] font-mono font-black truncate w-full uppercase mt-1 block text-slate-500">{img.name}</span>
                          <button onClick={() => removeBulkImage(idx)} className="absolute -top-1 -right-1 p-0.5 bg-[#C62927] text-white rounded-full hover:opacity-90 shadow-sm cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {csvFile && (
                    <div className="flex gap-2 mt-4 w-full">
                      <button onClick={handleCancelBulkUploadDeck} className="px-3 border border-[#9A87A9]/30 hover:bg-slate-50 rounded-lg flex items-center justify-center text-[#9A87A9] cursor-pointer transition-all"><RotateCcw className="w-4 h-4" /></button>
                      <button 
                        onClick={() => setModalType('bulk_submit')}
                        disabled={isUploadingBulk}
                        className="flex-1 py-3 bg-[#2A1A63] text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 font-mono"
                      >
                        Save Upload Sheet
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-white border border-[#9A87A9]/30 rounded-xl p-5 shadow-3xs text-center flex flex-col items-center justify-center h-32 relative hover:border-[#9A87A9]/60 transition-colors">
                  <Upload className="w-6 h-6 text-[#9A87A9] mb-1" />
                  <input type="file" accept=".csv" onChange={handleCSVFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="text-xs font-black text-slate-700 uppercase font-mono">{csvFile ? `Attached: ${csvFile.name}` : 'Select or drop your formatted school template .csv question list'}</span>
                </div>

                <div className="bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-xl p-4 flex-1 h-[360px] overflow-y-auto shadow-inner text-left">
                  <span className="text-[10px] font-mono font-black text-[#9A87A9] uppercase tracking-wider block mb-3">Spreadsheet Question Data Row Preview</span>
                  
                  <div className="space-y-2.5">
                    {csvPreviewQuestions.length === 0 ? (
                      <div className="p-12 border border-dashed border-[#9A87A9]/30 rounded-xl text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white py-24">Staging workspace empty. Load a file to preview list.</div>
                    ) : (
                      csvPreviewQuestions.map((q, idx) => {
                        const matchingStagingFile = q.imageHandle ? bulkImages.find(img => img.name === q.imageHandle) : null;
                        return (
                          <div key={idx} className="p-4 bg-white border border-[#9A87A9]/20 rounded-xl shadow-3xs font-sans text-left">
                            <div className="flex justify-between items-center border-b border-[#FAF9FA] pb-1.5 mb-2 font-mono text-[9px] font-black text-[#9A87A9] uppercase">
                              <span>Spreadsheet Item Row {idx + 1} — {q.type}</span>
                              <span className="text-slate-950 bg-white border px-1.5 py-0.5 rounded-md font-black">{q.score} Marks</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.text}</p>
                            
                            {q.imageHandle && (
                              <div className="mt-2 mb-1 p-2 bg-[#FAF9FA] border border-[#9A87A9]/10 rounded-xl max-w-sm flex items-center gap-3">
                                <div className="w-16 h-16 bg-white border rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                                  {matchingStagingFile ? (
                                    <img src={URL.createObjectURL(matchingStagingFile)} alt="staging-preview" className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-[#9A87A9] animate-pulse" />
                                  )}
                                </div>
                                <div className="font-mono text-[9px] min-w-0 flex-1">
                                  <span className="font-black text-slate-950 block uppercase">Linked Handle:</span>
                                  <span className="text-slate-500 block truncate">{q.imageHandle}</span>
                                  <span className={`inline-block font-sans px-1.5 py-0.2 rounded text-[8px] uppercase font-black mt-1 border ${matchingStagingFile ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {matchingStagingFile ? '✓ Match Verified' : '⚠ Missing from media bin'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {q.type === 'objective' && q.options.length > 0 && (
                              <div className="mt-2.5 grid grid-cols-1 gap-1 pl-2 font-mono text-[11px]">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-1.5">
                                    <span className={`w-1 h-1 rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                    <span className={opt.isCorrect ? 'text-emerald-700 font-black' : 'text-slate-500'}>{String.fromCharCode(65 + oIdx)}) {opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch w-full">
              <QuestionLedger questionBank={questionBank} activeQuestionId={activeQuestionId} activeSectionTab={activeSectionTab} onSelectQuestion={loadQuestionIntoEditor} onAddQuestion={isLocked ? () => {} : handleAddNewQuestionShell} onDeleteQuestion={handleDeleteQuestionClick} disableAdding={isLocked} />

              <div className={`lg:col-span-3 grid grid-cols-1 ${isLocked ? '' : 'md:grid-cols-5'} gap-6 items-stretch w-full`}>
                {!isLocked && (
                  <div className="md:col-span-2 relative">
                    <ManualForm activeSectionTab={activeSectionTab} questionScore={questionScore} setQuestionScore={setQuestionScore} manualImageFile={manualImageFile} onImageDrop={handleManualImageDrop} questionText={questionText} setQuestionText={setQuestionText} options={options} setOptions={setOptions} theoryRubric={theoryRubric} setTheoryRubric={setTheoryRubric} onAddOption={() => setOptions([...options, { text: 'New Option', isCorrect: false }])} onRemoveOption={(idx) => setOptions(options.filter((_, i) => i !== idx))} onCommitChanges={() => setModalType('manual_commit')} />
                    
                    {manualImagePreview && (
                      <div className="absolute top-[310px] right-4 bg-white border border-[#9A87A9]/30 p-2 rounded-xl flex items-center gap-2 max-w-[190px] shadow-md z-50 text-left">
                        <img src={manualImagePreview} className="w-8 h-8 object-contain bg-[#FAF9FA] border rounded shadow-3xs" alt="thumb" />
                        <span className="text-[8px] font-mono text-[#9A87A9] uppercase font-black truncate block flex-1">Image Attached</span>
                        <button onClick={handleCancelManualImage} className="p-1 bg-[#FAF9FA] hover:bg-rose-100 text-[#9A87A9] hover:text-[#C62927] rounded-full cursor-pointer transition-all"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={isLocked ? "w-full" : "md:col-span-3"}>
                  <section className="bg-[#FAF9FA] border border-[#9A87A9]/30 rounded-xl p-5 h-[530px] overflow-y-auto shadow-inner w-full">
                    <div className="w-full space-y-4">
                      <div className="bg-white border border-[#9A87A9]/20 p-4 rounded-xl shadow-3xs text-left">
                        <div className="bg-[#FAF9FA] border border-[#9A87A9]/10 p-2.5 rounded-lg text-[10px] font-bold text-slate-700 mb-0.5 uppercase font-mono leading-relaxed">
                          <span className="font-black text-slate-950 block mb-0.5">Section Directions:</span>
                          {sectionRules[activeSectionTab].instructions}
                        </div>
                      </div>

                      <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-[#9A87A9] font-mono uppercase tracking-wider">Draft Question Sheet Portfolio Scroll</p>
                        {activeQuestionId && !String(activeQuestionId).startsWith('temp_') && !isLocked && (
                          <button onClick={initializeEmptyFormState} className="text-[9px] bg-white border border-[#9A87A9]/30 hover:border-[#2A1A63] font-mono font-black text-slate-700 uppercase px-2 py-0.5 rounded-md cursor-pointer shadow-3xs">Reset Entry Fields</button>
                        )}
                      </div>
                      
                      <div className="space-y-2.5 w-full text-left">
                        {filteredBankList.length === 0 ? (
                          <div className="p-8 text-center text-xs font-mono text-[#9A87A9] font-bold uppercase bg-white border border-dashed border-[#9A87A9]/30 rounded-xl py-12">No test entries compiled within this section blueprint folder yet.</div>
                        ) : (
                          filteredBankList.map((q, idx) => (
                            <div key={q.id || idx} className={`p-4 bg-white border rounded-xl shadow-3xs transition-all relative group/row text-left ${q.id === activeQuestionId ? 'border-[#2A1A63] ring-1 ring-[#2A1A63]/10 bg-[#FAF9FA]/40' : 'border-[#9A87A9]/20'}`}>
                              
                              {!isLocked && (
                                <button 
                                  onClick={() => handleLoadQuestionForEditing(q)}
                                  className="absolute top-3 right-3 p-1.5 border border-[#9A87A9]/30 bg-white hover:border-[#2A1A63] text-[#9A87A9] hover:text-[#2A1A63] rounded-lg opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shadow-3xs flex items-center gap-1 text-[9px] font-mono font-black uppercase"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Card
                                </button>
                              )}

                              <div className="flex justify-between items-center border-b border-[#FAF9FA] pb-1.5 mb-2 font-mono text-[9px] font-black text-[#9A87A9] uppercase">
                                <span>Question Paper Slot {idx + 1}</span>
                                <span className="bg-[#FAF9FA] px-1.5 py-0.5 rounded border border-[#9A87A9]/10 text-slate-950 font-black pr-12">{q.score} Marks Weight</span>
                              </div>
                              <p className="text-xs font-bold text-slate-950 leading-relaxed font-sans">{q.text}</p>
                              
                              {q.imageUrl && (
                                <div className="mt-3 mb-2 border border-[#9A87A9]/20 rounded-xl overflow-hidden bg-[#FAF9FA] max-w-sm h-48 flex items-center justify-center shadow-3xs">
                                  <img 
                                    src={String(q.imageUrl).startsWith('blob:') ? q.imageUrl : `${baseServerDomain}${q.imageUrl}`} 
                                    alt="Context Attachment" 
                                    className="w-full h-full object-contain p-2"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              )}

                              {q.type === 'objective' && q.options && (
                                <div className="mt-3 grid grid-cols-1 gap-1.5 pl-2 font-mono">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="text-[11px] text-slate-600 font-bold flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                      <span className={opt.isCorrect ? 'text-emerald-700 font-black' : ''}>{String.fromCharCode(65 + oIdx)}) {opt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {q.type === 'theory' && q.rubric && (
                                <div className="mt-3 p-3 bg-[#2A1A63] rounded-xl text-white font-mono text-[11px] leading-relaxed shadow-3xs border">
                                  <span className="text-[9px] text-[#9A87A9] font-black block uppercase tracking-wide mb-0.5">💡 Grading Key Rubric:</span>
                                  {q.rubric}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECURE HIGH-FIDELITY OVERLAY DIALOGS */}
      <ConfirmationModal 
        isOpen={modalType !== null}
        title={
          modalType === 'bulk_submit' ? "Confirm Spreadsheet Bulk Import" : 
          modalType === 'manual_commit' ? "Confirm Question Entry Save" : "Drop Question Entry"
        }
        message={
          modalType === 'bulk_submit' ? "Are you ready to import this full spreadsheet bulk question ledger packet into the active assessment?" :
          modalType === 'manual_commit' ? "Are you sure you want to write and lock the changes for this question item entry card?" :
          "Are you entirely sure you want to permanently delete this question item entry from the assessment ledger? This action cannot be reversed."
        }
        confirmLabel={
          modalType === 'bulk_submit' ? "Ingest Excel List" : 
          modalType === 'manual_commit' ? "Save Question Entry" : "Yes, Delete Item"
        }
        cancelLabel="Abort Action"
        onConfirm={handleConfirmActionDispatch}
        onCancel={() => { setModalType(null); setDeleteTargetId(null); }}
        summaryData={
          modalType === 'bulk_submit' ? { "Source Spreadsheet": csvFile?.name, "Total Staged Rows": `${csvPreviewQuestions.length} Items Map` } :
          modalType === 'manual_commit' ? { "Syllabus Category": activeSectionTab, "Question Seating ID": displayLabelString } :
          { "Target Drop Index": "PERMANENT_REMOVE_ID_NODE" }
        }
      />

      {/* CORE FRAME NOTIFICATION MESSAGES TOAST LAYER */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 z-[30000] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#9A87A9]/40 p-6 rounded-xl shadow-2xl space-y-4 text-left font-mono">
            <div className="flex items-center gap-2 text-[#C62927] font-sans font-black text-xs uppercase tracking-tight border-b border-[#FAF9FA] pb-2">
              <AlertTriangle className="w-4 h-4" /> {errorModal.title}
            </div>
            <p className="text-xs text-slate-500 font-bold font-sans leading-relaxed">{errorModal.message}</p>
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2 bg-[#2A1A63] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md font-sans"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-950/90 border border-emerald-500 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs uppercase tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="font-sans font-bold">
            {successMessage}
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0">
        Start-Rite Schools Corporate Question Compiler Registry Layer
      </footer>

    </div>
  );
}