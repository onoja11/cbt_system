import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ArrowLeft, FileSpreadsheet, ImageIcon, Upload, X, RotateCcw, Lock, Edit3, 
  MessageSquare, Loader2, CheckCircle2, FileText, Save, Trash2, Download, 
  BookOpen, Bold, Italic, Underline, List, Eye, ChevronDown, ChevronRight, ArrowRight,
  Clock, Check, Send, Info, AlertTriangle, Copy
} from 'lucide-react';
import { apiRequest, BASE_URL } from '../../core/api';

import QuestionLedger from '../components/QuestionLedger';
import ManualForm from '../components/ManualForm';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText'; 

export default function QuestionBuilder({ assessmentId, onNavigateBack }) {
  const [ingestionMode, setIngestionMode] = useState('manual'); 
  const [activeSectionTab, setActiveSectionTab] = useState('objective'); 

  const [subjectInfo, setSubjectInfo] = useState('');
  const [categoryInfo, setCategoryInfo] = useState('');
  const [assessmentStatus, setAssessmentStatus] = useState('draft');
  const [feedbackComment, setFeedbackComment] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [isSavingPassage, setIsSavingPassage] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Sibling Class Arm Sync States
  const [siblingArms, setSiblingArms] = useState([]);
  const [selectedSiblingArmIds, setSelectedSiblingArmIds] = useState([]);
  const [isSyncingArms, setIsSyncingArms] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // General Instructions & Expected Theory Score States
  const [objInstructions, setObjInstructions] = useState('Answer all multiple-choice questions in this section.');
  const [theoryInstructions, setTheoryInstructions] = useState('Answer all questions in this section comprehensively.');
  const [expectedTheoryScore, setExpectedTheoryScore] = useState(0);

  const [questionBank, setQuestionBank] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const [questionText, setQuestionText] = useState('');
  const [questionScore, setQuestionScore] = useState(2);
  const [manualImageFile, setManualImageFile] = useState(null);
  const [manualImagePreview, setManualImagePreview] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: true }, { text: '', isCorrect: false }]);
  const [parentNumber, setParentNumber] = useState('');
  const [subLabel, setSubLabel] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionInstructions, setSectionInstructions] = useState('');
  const [passageText, setPassageText] = useState('');
  const [didCancelExistingImage, setDidCancelExistingImage] = useState(false);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFileType, setBulkFileType] = useState(''); 
  const [bulkImages, setBulkImages] = useState([]);
  const [stagedPreviewQuestions, setStagedPreviewQuestions] = useState([]); 
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  // Student Preview Modal Workspace States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewActiveSection, setPreviewActiveSection] = useState('objective');
  const [previewActiveGroupIdx, setPreviewActiveGroupIdx] = useState({ objective: 0, theory: 0 });
  const [previewExpandedSections, setPreviewExpandedSections] = useState({});
  const [selectedStudentAnswers, setSelectedStudentAnswers] = useState({});
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(5400);

  // Passage Modal State
  const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
  const [editingPassageSectionTitle, setEditingPassageSectionTitle] = useState('');
  const [editingPassageText, setEditingPassageText] = useState('');

  const [modalType, setModalType] = useState(null); 
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const previewCardRefs = useRef({});
  const previewWorkspaceCardRef = useRef(null);
  const editorRef = useRef(null);

  const cleanString = useCallback((str) => String(str || '').trim().toLowerCase(), []);
  
  const cleanType = useCallback((typeStr, sectionTitleStr = '') => {
    const t = String(typeStr || '').trim().toLowerCase();
    const sec = String(sectionTitleStr || '').trim().toLowerCase();

    if (sec.includes('theory') || sec.includes('problem solving') || sec.includes('passage') || sec.includes('comprehension')) {
      return 'theory';
    }
    if (t.includes('object')) {
      return 'objective';
    }
    return t.includes('theory') ? 'theory' : 'objective';
  }, []);

  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditingPassageText(editorRef.current.innerHTML);
    }
  };

  const renderFormattedText = useCallback((rawText) => {
    if (!rawText) return null;

    if (rawText.includes('<') && rawText.includes('>')) {
      return (
        <div 
          className="text-xs sm:text-sm text-slate-800 leading-relaxed prose prose-purple max-w-none space-y-2 whitespace-pre-wrap font-sans" 
          dangerouslySetInnerHTML={{ __html: rawText }} 
        />
      );
    }

    const cleaned = String(rawText).trim();
    const paragraphs = cleaned.split(/\r?\n/);

    return (
      <div className="space-y-1.5 whitespace-pre-wrap font-sans">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="leading-relaxed text-slate-800 text-xs sm:text-sm font-sans">
            <SafeMathText text={para} />
          </p>
        ))}
      </div>
    );
  }, []);

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(secs)}s`;
    return `${pad(minutes)}:${pad(secs)}`;
  };

  const resolvedStatus = useMemo(() => cleanString(assessmentStatus), [assessmentStatus, cleanString]);
  
  const isLocked = useMemo(() => {
    return [
      'pending_admin', 'pending admin', 'approved', 
      'exam in progress', 'finished (ready to grade)', 'graded'
    ].includes(resolvedStatus);
  }, [resolvedStatus]);

  const availableSections = useMemo(() => {
    const list = new Set(['Section A']);
    questionBank.forEach(q => {
      if (q.sectionTitle) list.add(q.sectionTitle.trim());
    });
    return Array.from(list);
  }, [questionBank]);

  const targetAssessmentId = useMemo(() => {
    if (!assessmentId) return localStorage.getItem('saved_asm_id_context');
    if (typeof assessmentId === 'object') return assessmentId.id || assessmentId.assessmentId;
    return assessmentId;
  }, [assessmentId]);

  const totalObjectivePoints = useMemo(() => {
    return questionBank
      .filter(q => cleanType(q.type, q.sectionTitle) === 'objective')
      .reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [questionBank, cleanType]);

  const totalTheoryPoints = useMemo(() => {
    return questionBank
      .filter(q => cleanType(q.type, q.sectionTitle) === 'theory')
      .reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [questionBank, cleanType]);

  const triggerNotificationAlert = useCallback((msg) => {
    setSuccessMessage(msg);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 4000);
  }, []);

  const fetchSiblingArms = useCallback(async () => {
    if (!targetAssessmentId) return;
    try {
      const res = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/sibling-arms`, { method: 'GET' });
      const data = await res.json();
      if (res.ok && data.sibling_arms) {
        setSiblingArms(data.sibling_arms);
      }
    } catch (err) {
      console.error("❌ [SIBLING ARMS FETCH FAULT]:", err);
    }
  }, [targetAssessmentId]);

  const refreshQuestionBlueprint = useCallback(async () => {
    if (!targetAssessmentId) return;

    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/questions`, { method: 'GET' });
      const data = await response.json();

      if (response.ok) {
        setSubjectInfo(data.subject || 'Core Module Paper');
        setCategoryInfo(data.category || 'Assessment Layer');
        setAssessmentStatus(data.assessment_status || data.status_label || data.assessment?.status || 'draft');
        setFeedbackComment(data.feedback_comment || data.feedback || data.assessment?.feedback_comment || '');
        setExpectedTheoryScore(parseFloat(data.expected_theory_score || data.assessment?.expected_theory_score || 0));
        
        if (data.assessment?.objective_instructions || data.objective_instructions) {
          setObjInstructions(data.assessment?.objective_instructions || data.objective_instructions);
        }
        if (data.assessment?.theory_instructions || data.theory_instructions) {
          setTheoryInstructions(data.assessment?.theory_instructions || data.theory_instructions);
        }

        if (data.questions && data.questions.length > 0) {
          const remapped = data.questions.map(q => {
            const rawOpts = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
            const correctOptIdx = q.correct_option_index !== undefined && q.correct_option_index !== null ? parseInt(q.correct_option_index, 10) : null;

            const mappedOpts = rawOpts.map((opt, idx) => {
              const optText = typeof opt === 'object' ? (opt.text || opt.text_value || '') : opt;
              const isCorrect = (idx === correctOptIdx);
              return { text: optText, isCorrect };
            });

            const resolvedSectionTitle = q.section_title || q.sectionTitle || null;

            return {
              id: q.id,
              type: cleanType(q.type, resolvedSectionTitle),
              text: q.question_text || q.questionText,
              score: parseFloat(q.points_weight || q.pointsWeight || 2),
              imageUrl: q.image_url || q.imageUrl || null, 
              parentNumber: q.parent_number || q.parentNumber || null,
              subLabel: q.sub_label || q.subLabel || null,
              sectionTitle: resolvedSectionTitle,
              sectionInstructions: q.section_instructions || q.sectionInstructions || null,
              passageText: q.passage_text || q.passageText || null,
              options: mappedOpts,
              correctOptionIndex: correctOptIdx
            };
          });
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
  }, [targetAssessmentId, cleanType]);

  useEffect(() => {
    refreshQuestionBlueprint();
    fetchSiblingArms();
  }, [refreshQuestionBlueprint, fetchSiblingArms]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const interval = setInterval(() => {
      setPreviewSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPreviewOpen]);

  const handleSyncQuestionsToArms = async () => {
    if (selectedSiblingArmIds.length === 0 || !targetAssessmentId || isSyncingArms) return;
    setIsSyncingArms(true);
    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/sync-to-arms`, {
        method: 'POST',
        body: JSON.stringify({
          target_class_arm_ids: selectedSiblingArmIds,
          overwrite: true
        })
      });
      if (response.ok) {
        triggerNotificationAlert("Successfully replicated question paper across selected class arms!");
        setShowSyncModal(false);
        fetchSiblingArms();
      }
    } catch (err) {
      console.error("❌ [SYNC TO ARMS FAULT]:", err);
      triggerNotificationAlert("Failed to replicate questions across target class arms.");
    } finally {
      setIsSyncingArms(false);
    }
  };

  const previewGroupedQuestions = useMemo(() => {
    const processObjectives = (list) => {
      return list.map((q, idx) => ({
        groupKey: `obj_single_${q.id}`,
        displayNumber: `${idx + 1}`,
        parentNumber: idx + 1,
        sectionTitle: q.sectionTitle || 'Section A: Objectives',
        sectionInstructions: q.sectionInstructions || null,
        passageText: q.passageText || null,
        subQuestions: [q]
      }));
    };

    const processTheory = (list) => {
      const groups = [];
      const map = new Map();

      list.forEach((q) => {
        const key = q.parentNumber 
          ? `parent_${q.parentNumber}` 
          : q.passageText 
          ? `passage_${q.passageText.substring(0, 30)}` 
          : `single_${q.id}`;

        if (!map.has(key)) {
          const groupObj = {
            groupKey: key,
            displayNumber: q.parentNumber ? `${q.parentNumber}` : `${groups.length + 1}`,
            parentNumber: q.parentNumber || groups.length + 1,
            sectionTitle: q.sectionTitle || 'Section B: Theory',
            sectionInstructions: q.sectionInstructions || null,
            passageText: q.passageText || null,
            subQuestions: []
          };
          map.set(key, groupObj);
          groups.push(groupObj);
        }

        map.get(key).subQuestions.push(q);
      });

      return groups;
    };

    const objs = questionBank.filter(q => cleanType(q.type, q.sectionTitle) === 'objective');
    const ths = questionBank.filter(q => cleanType(q.type, q.sectionTitle) === 'theory');

    return {
      objective: processObjectives(objs),
      theory: processTheory(ths)
    };
  }, [questionBank, cleanType]);

  const previewSectionNavigator = useMemo(() => {
    const list = previewGroupedQuestions[previewActiveSection] || [];
    const sections = [];
    const map = new Map();

    list.forEach((grp, gIdx) => {
      const title = grp.sectionTitle || (previewActiveSection === 'objective' ? 'Section A: Objectives' : 'Section B: Theory');

      if (!map.has(title)) {
        const secObj = { sectionTitle: title, questionGroups: [] };
        map.set(title, secObj);
        sections.push(secObj);
      }

      map.get(title).questionGroups.push({ ...grp, globalGroupIdx: gIdx });
    });

    return sections;
  }, [previewGroupedQuestions, previewActiveSection]);

  useEffect(() => {
    const currentGroupList = previewGroupedQuestions[previewActiveSection] || [];
    const currentIdx = previewActiveGroupIdx[previewActiveSection] || 0;
    const currentActiveGroup = currentGroupList[currentIdx];

    if (currentActiveGroup) {
      const title = currentActiveGroup.sectionTitle || (previewActiveSection === 'objective' ? 'Section A: Objectives' : 'Section B: Theory');
      setPreviewExpandedSections(prev => ({ ...prev, [title]: true }));
    }
  }, [previewActiveSection, previewActiveGroupIdx, previewGroupedQuestions]);

  const handleOpenStudentPreview = () => {
    setPreviewActiveSection('objective');
    setPreviewActiveGroupIdx({ objective: 0, theory: 0 });
    setIsPreviewOpen(true);
  };

  const handleSelectObjectiveOptionInPreview = (qId, optIdx) => {
    setSelectedStudentAnswers(prev => ({
      ...prev,
      [qId]: optIdx
    }));
  };

  const handleNextPreviewGroup = () => {
    const list = previewGroupedQuestions[previewActiveSection] || [];
    const currentIdx = previewActiveGroupIdx[previewActiveSection] || 0;
    if (currentIdx < list.length - 1) {
      setPreviewActiveGroupIdx(prev => ({ ...prev, [previewActiveSection]: currentIdx + 1 }));
      if (previewWorkspaceCardRef.current) previewWorkspaceCardRef.current.scrollTop = 0;
    }
  };

  const handlePrevPreviewGroup = () => {
    const currentIdx = previewActiveGroupIdx[previewActiveSection] || 0;
    if (currentIdx > 0) {
      setPreviewActiveGroupIdx(prev => ({ ...prev, [previewActiveSection]: currentIdx - 1 }));
      if (previewWorkspaceCardRef.current) previewWorkspaceCardRef.current.scrollTop = 0;
    }
  };

  const handleSelectPreviewGroup = (gIdx) => {
    setPreviewActiveGroupIdx(prev => ({ ...prev, [previewActiveSection]: gIdx }));
    if (previewWorkspaceCardRef.current) previewWorkspaceCardRef.current.scrollTop = 0;
  };

  const handleUpdateSectionInstructions = async () => {
    if (isLocked || !targetAssessmentId || isSavingInstructions) return;
    
    const parsedExpectedScore = parseFloat(expectedTheoryScore) || 0;
    if (totalTheoryPoints > 0 && (parsedExpectedScore <= 0 || parsedExpectedScore > totalTheoryPoints)) {
      setValidationError(`Expected theory max score must be greater than 0 and cannot exceed total pool score (${totalTheoryPoints} Marks).`);
      return;
    }

    setValidationError('');
    setIsSavingInstructions(true);
    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/instructions`, {
        method: 'PATCH',
        body: JSON.stringify({
          objective_instructions: objInstructions,
          theory_instructions: theoryInstructions,
          expected_theory_score: parsedExpectedScore
        })
      });
      if (response.ok) {
        triggerNotificationAlert("General directions and expected theory score saved successfully!");
      }
    } catch (err) {
      console.error("Instructions Sync Fault:", err);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleBulkFileChange = async (e) => {
    if (isLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.name.endsWith('.csv');
    const isDOCX = file.name.endsWith('.docx');

    if (!isCSV && !isDOCX) return;

    setBulkFile(file);
    setBulkFileType(isCSV ? 'csv' : 'docx');

    const reader = new FileReader();

    if (isCSV) {
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n');
        const previewRows = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const columns = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (columns.length < 2) continue;

          const rawType = columns[0]?.replace(/"/g, '').trim() || '';
          const qText = columns[1]?.replace(/"/g, '').trim() || '';
          const score = columns[2] ? parseFloat(columns[2]) : 2;
          const rawOptions = columns[3]?.replace(/"/g, '').trim() || '';
          const correctIdx = columns[4] && columns[4] !== '' ? parseInt(columns[4], 10) : 0;
          const imageHandle = columns[5]?.replace(/"/g, '').trim() || null;
          const parentNumber = columns[6]?.replace(/"/g, '').trim() || null;
          const subLabel = columns[7]?.replace(/"/g, '').trim() || null;
          const sectionTitle = columns[8]?.replace(/"/g, '').trim() || null;
          const sectionInstructions = columns[9]?.replace(/"/g, '').trim() || null;
          const passageText = columns[10]?.replace(/"/g, '').replace(/\r/g, '').trim() || null;

          const type = cleanType(rawType, sectionTitle);

          previewRows.push({
            type,
            text: qText,
            score,
            options: rawOptions ? rawOptions.split('|').map((opt, idx) => ({ text: opt, isCorrect: idx === correctIdx })) : [],
            imageHandle,
            parentNumber,
            subLabel,
            sectionTitle,
            sectionInstructions,
            passageText
          });
        }
        setStagedPreviewQuestions(previewRows);
      };
      reader.readAsText(file);
    } else if (isDOCX) {
      setStagedPreviewQuestions([
        {
          type: 'docx',
          text: `"${file.name}" loaded cleanly with hierarchical sections, section instructions, and grouped sub-questions. Click ingest below to commit.`,
          score: 'Auto',
          options: [],
          imageHandle: null,
          parentNumber: null,
          subLabel: null,
          sectionTitle: 'Structured Section',
          sectionInstructions: 'Sample section instruction loaded.',
          passageText: 'Staged reading comprehension passage context.'
        }
      ]);
    }
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
    setBulkFile(null);
    setBulkFileType('');
    setBulkImages([]);
    setStagedPreviewQuestions([]);
    triggerNotificationAlert("Bulk staging workspace cleared.");
  };

  const handleBulkSubmissionExecution = async () => {
    if (!bulkFile || isLocked || !targetAssessmentId) return;
    setIsUploadingBulk(true);

    const formData = new FormData();
    formData.append('document_file', bulkFile);
    formData.append('file_type', bulkFileType);
    
    bulkImages.forEach((image) => {
      formData.append('images[]', image, image.name);
    });

    try {
      const token = localStorage.getItem('intranet_bearer_token');
      const response = await fetch(`${BASE_URL}/api/v1/teacher/assessments/${targetAssessmentId}/questions/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setBulkFile(null);
        setBulkFileType('');
        setBulkImages([]);
        setStagedPreviewQuestions([]);
        setIngestionMode('manual');
        await refreshQuestionBlueprint();
        triggerNotificationAlert(data.message || 'Successfully parsed document records.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const initializeEmptyFormState = useCallback(() => {
    setActiveQuestionId(null);
    setQuestionText('');
    setQuestionScore(2);
    if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview('');
    setDidCancelExistingImage(false);
    setParentNumber('');
    setSubLabel('');
    setSectionTitle('');
    setSectionInstructions('');
    setPassageText('');
    if (activeSectionTab === 'objective') {
      setOptions([{ text: 'Option A', isCorrect: true }, { text: 'Option B', isCorrect: false }]);
    }
  }, [manualImagePreview, activeSectionTab]);

  const handleManualFormExecution = async () => {
    if (isLocked || !targetAssessmentId) return;
    const formData = new FormData();

    formData.append('type', activeSectionTab === 'theory' ? 'Theory' : 'Objective');
    formData.append('question_text', questionText);
    formData.append('points_weight', Number(questionScore));
    formData.append('remove_existing_image', didCancelExistingImage ? 'true' : 'false');
    formData.append('parent_number', parentNumber || '');
    formData.append('sub_label', subLabel || '');
    formData.append('section_title', sectionTitle || '');
    formData.append('section_instructions', sectionInstructions || '');
    formData.append('passage_text', passageText || '');

    if (activeSectionTab === 'objective') {
      formData.append('options', JSON.stringify(options.map(o => o.text)));
      formData.append('correct_option_index', options.findIndex(o => o.isCorrect));
    } else {
      formData.append('options', JSON.stringify([]));
      formData.append('correct_option_index', -1);
    }

    if (manualImageFile) {
      formData.append('manual_image', manualImageFile);
    }

    try {
      const isEditSequence = activeQuestionId && !String(activeQuestionId).startsWith('temp_');
      const endpointUrl = isEditSequence 
        ? `${BASE_URL}/api/v1/teacher/assessments/${targetAssessmentId}/questions/${activeQuestionId}`
        : `${BASE_URL}/api/v1/teacher/assessments/${targetAssessmentId}/questions`;

      const token = localStorage.getItem('intranet_bearer_token');
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
        triggerNotificationAlert(isEditSequence ? "Question changes updated!" : "Question saved successfully!");
        initializeEmptyFormState();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const executeDeletePipeline = async () => {
    if (!deleteTargetId || isLocked || !targetAssessmentId) return;

    if (String(deleteTargetId).startsWith('temp_')) {
      const remaining = questionBank.filter(q => q.id !== deleteTargetId);
      setQuestionBank(remaining);
      initializeEmptyFormState();
      setDeleteTargetId(null);
      return;
    }
    
    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/questions/${deleteTargetId}`, { method: 'DELETE' });
      if (response.ok) {
        const remaining = questionBank.filter(q => q.id !== deleteTargetId);
        setQuestionBank(remaining);
        initializeEmptyFormState();
        triggerNotificationAlert("Question dropped from template ledger.");
      }
    } catch (error) { 
      console.error(error); 
    } finally {
      setDeleteTargetId(null);
    }
  };

  const executeDeleteAllPipeline = async () => {
    if (isLocked || !targetAssessmentId) return;

    try {
      const response = await apiRequest(`api/v1/teacher/assessments/${targetAssessmentId}/questions/delete-all`, { method: 'DELETE' });
      if (response.ok) {
        setQuestionBank([]);
        initializeEmptyFormState();
        triggerNotificationAlert("All questions cleared from the assessment.");
      }
    } catch (error) {
      console.error("Delete all failed:", error);
    }
  };

  const handleConfirmActionDispatch = async () => {
    if (isLocked || isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      if (modalType === 'bulk_submit') {
        await handleBulkSubmissionExecution();
      } else if (modalType === 'manual_commit') {
        await handleManualFormExecution();
      } else if (modalType === 'delete_confirm') {
        await executeDeletePipeline();
      } else if (modalType === 'delete_all_confirm') {
        await executeDeleteAllPipeline();
      }
    } catch (err) {
      console.error("Modal Action Error:", err);
    } finally {
      setIsSubmittingAction(false);
      setModalType(null);
    }
  };

  const loadQuestionIntoEditor = useCallback((q) => {
    if (!q) return;
    setActiveQuestionId(q.id);
    setQuestionText(q.text);
    setQuestionScore(q.score);
    setParentNumber(q.parentNumber || '');
    setSubLabel(q.subLabel || '');
    setSectionTitle(q.sectionTitle || '');
    setSectionInstructions(q.sectionInstructions || '');
    setPassageText(q.passageText || '');

    if (manualImagePreview && manualImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(manualImagePreview);
    }
    setManualImageFile(null);
    setManualImagePreview(q.imageUrl ? `${BASE_URL}/${q.imageUrl.startsWith('/') ? q.imageUrl.slice(1) : q.imageUrl}` : ''); 
    
    if (cleanType(q.type, q.sectionTitle) === 'objective') {
      const loadedOpts = (q.options || []).map((opt, idx) => ({
        text: opt.text || opt,
        isCorrect: opt.isCorrect !== undefined ? opt.isCorrect : (idx === q.correctOptionIndex)
      }));
      setOptions(loadedOpts.length > 0 ? loadedOpts : [{ text: '', isCorrect: true }]);
    }

    const targetCard = previewCardRefs.current[q.id];
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [cleanType, manualImagePreview]);

  const handleOpenPassageModal = (secGroup) => {
    if (!secGroup || isLocked) return;
    setEditingPassageSectionTitle(secGroup.sectionTitle || '');
    setEditingPassageText(secGroup.passageText || '');
    setIsPassageModalOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = secGroup.passageText || '';
      }
    }, 50);
  };

  const handleSavePassageModal = async () => {
    if (isLocked || !targetAssessmentId || isSavingPassage) return;
    setIsSavingPassage(true);

    try {
      const updatedBank = questionBank.map(q => {
        const qSec = q.sectionTitle ? q.sectionTitle.trim() : 'General Assessment Section';
        if (qSec === editingPassageSectionTitle.trim()) {
          return { ...q, passageText: editingPassageText };
        }
        return q;
      });
      setQuestionBank(updatedBank);

      const sectionQuestions = updatedBank.filter(q => {
        const qSec = q.sectionTitle ? q.sectionTitle.trim() : 'General Assessment Section';
        return qSec === editingPassageSectionTitle.trim();
      });

      for (const q of sectionQuestions) {
        if (!q.id || String(q.id).startsWith('temp_')) continue;
        
        const formData = new FormData();
        formData.append('type', q.type === 'theory' ? 'Theory' : 'Objective');
        formData.append('question_text', q.text);
        formData.append('points_weight', Number(q.score));
        formData.append('section_title', q.sectionTitle || '');
        formData.append('section_instructions', q.sectionInstructions || '');
        formData.append('passage_text', editingPassageText);
        formData.append('parent_number', q.parentNumber || '');
        formData.append('sub_label', q.subLabel || '');
        formData.append('remove_existing_image', 'false');

        if (q.options && q.options.length > 0) {
          formData.append('options', JSON.stringify(q.options.map(o => o.text)));
          formData.append('correct_option_index', q.options.findIndex(o => o.isCorrect));
        } else {
          formData.append('options', JSON.stringify([]));
          formData.append('correct_option_index', -1);
        }

        const token = localStorage.getItem('intranet_bearer_token');
        await fetch(`${BASE_URL}/api/v1/teacher/assessments/${targetAssessmentId}/questions/${q.id}`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json'
          },
          body: formData
        });
      }

      triggerNotificationAlert(`Passage updated & saved permanently for "${editingPassageSectionTitle}"!`);
      setIsPassageModalOpen(false);
      await refreshQuestionBlueprint();
    } catch (error) {
      console.error("Passage Save Fault:", error);
      triggerNotificationAlert("Failed to save passage to server.");
    } finally {
      setIsSavingPassage(false);
    }
  };

  const handleAddNewQuestionShell = useCallback(() => {
    if (isLocked) return;
    initializeEmptyFormState();
    setActiveQuestionId(`temp_${Date.now()}`);
  }, [isLocked, initializeEmptyFormState]);

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

  const handleDeleteQuestionClick = useCallback((id, e) => {
    e.stopPropagation();
    if (isLocked) return;
    setDeleteTargetId(id);
    setModalType('delete_confirm');
  }, [isLocked]);

  const filteredBankList = useMemo(() => {
    return questionBank.filter(q => cleanType(q.type, q.sectionTitle) === activeSectionTab);
  }, [questionBank, activeSectionTab, cleanType]);

  const groupedSectionList = useMemo(() => {
    const sectionMap = new Map();

    filteredBankList.forEach(q => {
      const secTitle = q.sectionTitle ? q.sectionTitle.trim() : 'General Assessment Section';
      if (!sectionMap.has(secTitle)) {
        sectionMap.set(secTitle, {
          sectionTitle: secTitle,
          sectionInstructions: q.sectionInstructions || '',
          passageText: q.passageText || '',
          rawItems: []
        });
      }
      if (q.passageText && !sectionMap.get(secTitle).passageText) {
        sectionMap.get(secTitle).passageText = q.passageText;
      }
      sectionMap.get(secTitle).rawItems.push(q);
    });

    let globalCounter = 1;

    return Array.from(sectionMap.values()).map(sec => {
      const structuralUnits = [];
      const parentMap = new Map();

      sec.rawItems.forEach(q => {
        if (q.parentNumber) {
          const pNum = String(q.parentNumber).trim();
          if (!parentMap.has(pNum)) {
            const groupUnit = {
              isGroup: true,
              displayNumber: globalCounter++,
              parentNumber: pNum,
              totalScore: 0,
              subItems: []
            };
            parentMap.set(pNum, groupUnit);
            structuralUnits.push(groupUnit);
          }
          const group = parentMap.get(pNum);
          group.subItems.push(q);
          group.totalScore += (parseFloat(q.score) || 0);
        } else {
          structuralUnits.push({
            isGroup: false,
            displayNumber: globalCounter++,
            item: q
          });
        }
      });

      return {
        ...sec,
        units: structuralUnits
      };
    });
  }, [filteredBankList]);

  const stagedGroupedPreview = useMemo(() => {
    const map = new Map();
    stagedPreviewQuestions.forEach((q) => {
      const sec = q.sectionTitle ? q.sectionTitle.trim() : 'Default Section';
      if (!map.has(sec)) {
        map.set(sec, {
          sectionTitle: sec,
          sectionInstructions: q.sectionInstructions,
          passageText: q.passageText,
          rawRows: []
        });
      }
      if (q.passageText && !map.get(sec).passageText) {
        map.get(sec).passageText = q.passageText;
      }
      map.get(sec).rawRows.push(q);
    });

    let globalCounter = 1;

    return Array.from(map.values()).map(sec => {
      const units = [];
      const parentMap = new Map();

      sec.rawRows.forEach(q => {
        if (q.parentNumber) {
          const pNum = String(q.parentNumber).trim();
          if (!parentMap.has(pNum)) {
            const groupUnit = {
              isGroup: true,
              displayNumber: globalCounter++,
              parentNumber: pNum,
              subItems: []
            };
            parentMap.set(pNum, groupUnit);
            units.push(groupUnit);
          }
          parentMap.get(pNum).subItems.push(q);
        } else {
          units.push({
            isGroup: false,
            displayNumber: globalCounter++,
            item: q
          });
        }
      });

      return {
        ...sec,
        units
      };
    });
  }, [stagedPreviewQuestions]);

  const handleDownloadTemplate = (type) => {
    const fileName = type === 'csv' 
      ? 'question_import_template.csv' 
      : 'question_import_template.docx';
    
    const fileUrl = `/templates/${fileName}`;

    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const previewCurrentGroupList = previewGroupedQuestions[previewActiveSection] || [];
  const previewCurrentGroupIndex = previewActiveGroupIdx[previewActiveSection] || 0;
  const previewCurrentGroup = previewCurrentGroupList[previewCurrentGroupIndex];

  const previewMainExamSectionInstructions = useMemo(() => {
    if (previewActiveSection === 'objective') {
      return objInstructions || 'Choose the single best answer for each question below.';
    }
    if (previewActiveSection === 'theory') {
      return theoryInstructions || 'Write your clear answers in your paper script booklet.';
    }
    return '';
  }, [previewActiveSection, objInstructions, theoryInstructions]);

  const previewSpecificQuestionGroupInstructions = useMemo(() => {
    if (previewCurrentGroup?.sectionInstructions && String(previewCurrentGroup.sectionInstructions).trim() !== '') {
      return previewCurrentGroup.sectionInstructions;
    }
    return null;
  }, [previewCurrentGroup]);

  const previewAnsweredObjectiveCount = useMemo(() => {
    const objs = questionBank.filter(q => cleanType(q.type, q.sectionTitle) === 'objective');
    return objs.filter(q => selectedStudentAnswers[q.id] !== undefined && selectedStudentAnswers[q.id] !== null).length;
  }, [questionBank, selectedStudentAnswers, cleanType]);

  const totalObjectiveQuestionsCount = useMemo(() => {
    return questionBank.filter(q => cleanType(q.type, q.sectionTitle) === 'objective').length;
  }, [questionBank, cleanType]);

  const totalTheoryQuestionsCount = useMemo(() => {
    return questionBank.filter(q => cleanType(q.type, q.sectionTitle) === 'theory').length;
  }, [questionBank, cleanType]);

  const getDynamicModalConfirmLabel = () => {
    if (isSubmittingAction) {
      return (
        <span className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Processing...</span>
        </span>
      );
    }
    if (modalType === 'bulk_submit') return "Ingest Document List";
    if (modalType === 'manual_commit') return "Save Entry";
    if (modalType === 'delete_all_confirm') return "Yes, Delete All";
    return "Yes, Delete Item";
  };

  return (
    <div className="fixed inset-0 h-screen w-screen z-[1000] bg-[#F7F5FC] flex flex-col justify-between text-[#2A1A63] font-sans selection:bg-[#7C3AED]/20 overflow-hidden">
      
      {showSuccessNotification && (
        <div className="fixed top-6 right-6 z-[60000] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-mono text-xs uppercase tracking-wider animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isUploadingBulk && (
        <div className="fixed inset-0 bg-[#2A1A63]/40 backdrop-blur-xs z-[50000] flex flex-col justify-center items-center text-center font-mono">
          <div className="bg-white border border-[#E2D5F8] p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="relative w-12 h-12 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED]" />
              <FileText className="w-4 h-4 text-[#7C3AED] absolute animate-pulse" />
            </div>
            <div className="text-center">
              <h4 className="text-xs font-black uppercase text-[#2A1A63] tracking-wider">Parsing Document...</h4>
              <p className="text-[10px] text-[#7C6B93] font-bold uppercase mt-1">Reading sections, instructions & hierarchies</p>
            </div>
          </div>
        </div>
      )}

      {/* SIBLING CLASS ARM REPLICATION MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[70000] flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-[#E2D5F8] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2D5F8] pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-950">
                  Sync Question Blueprint to Sibling Arms
                </h3>
              </div>
              <button 
                onClick={() => !isSyncingArms && setShowSyncModal(false)}
                disabled={isSyncingArms}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Select target parallel class arms to overwrite with the current <strong>{subjectInfo}</strong> question blueprint ({questionBank.length} questions):
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {siblingArms.map((arm) => {
                const isSelected = selectedSiblingArmIds.includes(arm.class_arm_id);
                const isDisabled = arm.assessment_status === 'approved' || isSyncingArms;

                return (
                  <label
                    key={arm.class_arm_id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected ? 'bg-purple-50 border-[#7C3AED]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSiblingArmIds(prev => [...prev, arm.class_arm_id]);
                          } else {
                            setSelectedSiblingArmIds(prev => prev.filter(id => id !== arm.class_arm_id));
                          }
                        }}
                        className="w-4 h-4 text-[#7C3AED] rounded focus:ring-[#7C3AED]"
                      />
                      <span className="text-xs font-bold font-mono text-slate-900">{arm.class_arm_name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white border text-slate-600">
                      {arm.assessment_status || 'NOT CREATED'}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2D5F8]">
              <button 
                onClick={() => setShowSyncModal(false)}
                disabled={isSyncingArms}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-mono font-black uppercase rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSyncQuestionsToArms}
                disabled={isSyncingArms || selectedSiblingArmIds.length === 0}
                className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
              >
                {isSyncingArms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isSyncingArms ? 'Replicating...' : `Replicate To ${selectedSiblingArmIds.length} Arm(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT EXAM WORKSPACE PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen z-[999999] bg-[#F7F5FC] flex flex-col justify-between overflow-hidden font-sans select-none animate-in fade-in duration-200">
          
          <header className="w-full bg-[#7C3AED] px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-40 shrink-0 text-white">
            <div className="w-full flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-2xl flex items-center justify-center shadow-2xs">
                  <Logo size={28} showText={false} />
                </div>
                <div className="text-left">
                  <h2 className="text-xs sm:text-sm font-black tracking-wide text-white">{subjectInfo || "Exam Paper"}</h2>
                  <p className="text-[10px] font-semibold text-purple-200 mt-0.5">
                    CANDIDATE: SAMPLE STUDENT &bull; JSS 3 ORCHID
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-sans">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#8B5CF6] text-white shadow-2xs font-mono uppercase">
                  Candidate Simulation Mode
                </div>

                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/15 border border-white/20 text-white shadow-2xs ${
                  previewSecondsLeft <= 300 ? 'bg-rose-500/90 text-white animate-pulse' : ''
                }`}>
                  <Clock className="w-4 h-4 text-white shrink-0" />
                  <span>{formatTime(previewSecondsLeft)}</span>
                </div>

                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all shadow-xs ml-2"
                  title="Close Student Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="w-full px-6 sm:px-8 py-2.5 mt-1 flex gap-3 shrink-0 font-sans">
            {previewGroupedQuestions.objective.length > 0 && (
              <button 
                onClick={() => setPreviewActiveSection('objective')} 
                className={`px-5 py-2 text-xs font-bold rounded-2xl tracking-wide cursor-pointer transition-all flex items-center gap-2 shadow-2xs ${
                  previewActiveSection === 'objective' 
                    ? 'bg-[#7C3AED] text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-[#E2D5F8] hover:bg-purple-50/50'
                }`}
              >
                <span>Section A: Objectives</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  previewActiveSection === 'objective' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#7C3AED]'
                }`}>
                  {previewAnsweredObjectiveCount}/{totalObjectiveQuestionsCount}
                </span>
              </button>
            )}

            {previewGroupedQuestions.theory.length > 0 && (
              <button 
                onClick={() => setPreviewActiveSection('theory')} 
                className={`px-5 py-2 text-xs font-bold rounded-2xl tracking-wide cursor-pointer transition-all flex items-center gap-2 shadow-2xs ${
                  previewActiveSection === 'theory' 
                    ? 'bg-[#7C3AED] text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-[#E2D5F8] hover:bg-purple-50/50'
                }`}
              >
                <span>Section B: Theory</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  previewActiveSection === 'theory' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#7C3AED]'
                }`}>
                  {totalTheoryQuestionsCount} Qs
                </span>
              </button>
            )}
          </div>

          <div className="w-full px-6 sm:px-8 py-1.5 shrink-0 font-sans">
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] px-5 py-3 rounded-2xl text-xs font-semibold text-slate-800 flex items-start gap-3 shadow-2xs">
              <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold text-[#7C3AED] uppercase block tracking-wider">
                  {previewActiveSection === 'objective' ? 'Objective Instructions:' : 'Theory Instructions:'}
                </span>
                {renderFormattedText(previewMainExamSectionInstructions)}
              </div>
            </div>
          </div>

          <main className="flex-1 w-full px-6 sm:px-8 py-2 grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch overflow-hidden min-h-0">
            <section 
              ref={previewWorkspaceCardRef}
              className="md:col-span-3 bg-white border border-[#E2D5F8] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs text-left overflow-y-auto max-h-full"
            >
              {previewCurrentGroup ? (
                <div>
                  {previewCurrentGroup.sectionTitle && (
                    <div className="mb-3">
                      <span className="px-3.5 py-1 bg-purple-100 border border-purple-200 text-[#7C3AED] rounded-xl text-xs font-bold inline-block">
                        {previewCurrentGroup.sectionTitle}
                      </span>
                    </div>
                  )}

                  {previewSpecificQuestionGroupInstructions && (
                    <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-xs font-semibold text-amber-900 leading-relaxed mb-5 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-800 font-bold mb-1 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Section Note:</span>
                      </div>
                      {renderFormattedText(previewSpecificQuestionGroupInstructions)}
                    </div>
                  )}

                  {previewCurrentGroup.passageText && (
                    <div className="mb-6 p-5 bg-[#FAF8FF] border border-purple-200 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#7C3AED] border-b border-purple-100 pb-2">
                        <BookOpen className="w-4 h-4 text-[#7C3AED]" /> Read the passage carefully:
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pt-1 font-sans">
                        {renderFormattedText(previewCurrentGroup.passageText)}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pb-3 mb-6 border-b border-slate-100 text-xs font-bold text-slate-500">
                    <span className="text-base font-black text-slate-900">
                      Question {previewCurrentGroup.displayNumber}
                    </span>
                    {previewActiveSection === 'theory' && (
                      <span className="text-xs font-semibold text-[#7C3AED] bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                        {previewCurrentGroup.subQuestions?.length || 1} Sub-item(s)
                      </span>
                    )}
                  </div>

                  <div className="space-y-6 transition-all duration-300 ease-out animate-fadeIn">
                    {previewCurrentGroup.subQuestions?.map((subQ, subIdx) => {
                      const subQId = subQ.id;

                      return (
                        <div key={subQId || subIdx} className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFE] border border-[#E2D5F8]/80 space-y-4">

                          {previewActiveSection === 'theory' && (
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 bg-[#7C3AED] text-white rounded-xl text-xs font-black flex items-center justify-center">
                                  {subQ.subLabel || `${subIdx + 1}`}
                                </span>
                                <span className="text-xs font-bold text-slate-700">Sub-Question</span>
                              </div>
                              <span className="bg-white text-[#7C3AED] px-2.5 py-1 rounded-lg border border-purple-100 text-[11px] font-bold">
                                {subQ.score || 2} Marks
                              </span>
                            </div>
                          )}

                          {subQ.imageUrl && (
                            <div className="mb-4 border border-[#E2D5F8] rounded-2xl overflow-hidden bg-white max-w-md h-48 flex items-center justify-center shadow-2xs mx-auto">
                              <img src={String(subQ.imageUrl).startsWith('http') || String(subQ.imageUrl).startsWith('blob:') ? subQ.imageUrl : `${BASE_URL}/${subQ.imageUrl.startsWith('/') ? subQ.imageUrl.slice(1) : subQ.imageUrl}`} alt="Question Reference" className="w-full h-full object-contain p-2" />
                            </div>
                          )}

                          <h4 className="text-sm font-bold text-slate-900 leading-relaxed font-sans">
                            <SafeMathText text={subQ.text} />
                          </h4>

                          {previewActiveSection === 'objective' ? (
                            <div className="space-y-2.5 pt-1">
                              {subQ.options?.map((option, optIdx) => {
                                const isSelected = selectedStudentAnswers[subQId] === optIdx;
                                const optionText = typeof option === 'object' ? option.text : option;

                                return (
                                  <button
                                    key={optIdx} 
                                    onClick={() => handleSelectObjectiveOptionInPreview(subQId, optIdx)}
                                    className={`w-full px-4 py-3 border-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-between text-left cursor-pointer shadow-2xs ${
                                      isSelected 
                                        ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED] ring-2 ring-[#7C3AED]/20 font-bold' 
                                        : 'bg-white border-[#E2D5F8] hover:border-[#7C3AED]/50 text-slate-700 hover:bg-purple-50/30'
                                    }`}
                                  >
                                    <span className="flex items-start gap-2">
                                      <span className="font-bold text-[#7C3AED] min-w-[20px]">{String.fromCharCode(65 + optIdx)}.</span>
                                      <SafeMathText text={optionText} />
                                    </span>
                                    {isSelected && (
                                      <span className="w-5 h-5 bg-[#7C3AED] rounded-full flex items-center justify-center shrink-0 ml-3 shadow-2xs">
                                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center gap-3">
                              <BookOpen className="w-4 h-4 text-[#7C3AED] shrink-0" />
                              <p className="text-xs text-slate-600 font-semibold">
                                Answer this question in your written answer booklet.
                              </p>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs font-bold uppercase font-mono">
                  No question entries loaded in this section.
                </div>
              )}

              <div className="flex justify-between items-center pt-5 mt-6 border-t border-slate-100 shrink-0">
                <button 
                  disabled={previewCurrentGroupIndex === 0} 
                  onClick={handlePrevPreviewGroup} 
                  className="px-5 py-2.5 border border-[#E2D5F8] rounded-xl text-xs font-bold text-slate-700 disabled:opacity-30 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous Question
                </button>
                <button 
                  disabled={previewCurrentGroupIndex === previewCurrentGroupList.length - 1} 
                  onClick={handleNextPreviewGroup} 
                  className="px-5 py-2.5 bg-[#7C3AED] text-white text-xs font-bold rounded-xl disabled:opacity-30 hover:bg-[#6D28D9] cursor-pointer flex items-center gap-2 transition-all shadow-2xs"
                >
                  Next Question <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            <section className="bg-white border border-[#E2D5F8] rounded-3xl p-5 flex flex-col justify-between shadow-xs text-left h-full overflow-hidden">
              <div className="space-y-3 flex flex-col h-full overflow-hidden">
                <div className="border-b border-slate-100 pb-2 shrink-0">
                  <h4 className="text-xs font-black text-slate-900 tracking-wide uppercase">Question Navigator</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Click section to expand or collapse</p>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 bg-purple-50/50 p-2 rounded-xl border border-purple-100/60 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Complete
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED] inline-block"></span> Active
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 py-1">
                  {previewSectionNavigator.map((sec) => {
                    const isExpanded = previewExpandedSections[sec.sectionTitle] ?? true;

                    return (
                      <div key={sec.sectionTitle} className="border border-[#E2D5F8] rounded-2xl overflow-hidden bg-[#FAFAFE] transition-all">

                        <button
                          onClick={() => setPreviewExpandedSections(prev => ({ ...prev, [sec.sectionTitle]: !isExpanded }))}
                          className="w-full px-3.5 py-2.5 bg-[#F3EEFC] hover:bg-purple-100/80 text-left flex items-center justify-between text-xs font-black text-[#2A1A63] cursor-pointer transition-colors"
                        >
                          <span className="truncate pr-2">{sec.sectionTitle}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-extrabold text-[#7C3AED] bg-white px-2 py-0.5 rounded-full border border-purple-200">
                              {sec.questionGroups.length} Qs
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#7C3AED]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#7C3AED]" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3 grid grid-cols-4 gap-2 bg-white transition-all duration-200 animate-fadeIn">
                            {sec.questionGroups.map((grp) => {
                              const gIdx = grp.globalGroupIdx;
                              const isAllSubAnswered = grp.subQuestions.every(sq => {
                                const val = selectedStudentAnswers[sq.id];
                                return val !== undefined && val !== null && String(val).trim() !== '';
                              });

                              const isActive = gIdx === previewCurrentGroupIndex;

                              return (
                                <button
                                  key={grp.groupKey || gIdx}
                                  onClick={() => handleSelectPreviewGroup(gIdx)}
                                  className={`h-10 text-xs font-black rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-2xs relative ${
                                    isActive
                                      ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm font-black'
                                      : isAllSubAnswered
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                      : 'bg-white text-slate-700 border-[#E2D5F8] hover:bg-purple-50'
                                  }`}
                                >
                                  <span>{grp.displayNumber}</span>
                                  {isAllSubAnswered && !isActive && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 shrink-0 mt-2">
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer text-center transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Exit Preview Workspace
                </button>
              </div>
            </section>
          </main>

          <footer className="w-full border-t border-[#7C6B93]/15 bg-white py-2 text-center text-[10px] font-bold text-[#7C6B93] tracking-wider uppercase px-4 shrink-0">
            Start-rite Institutional Exam System
          </footer>
        </div>
      )}

      {/* PASSAGE EDITOR MODAL */}
      {isPassageModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[70000] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2D5F8] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2D5F8] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-950">
                  Passage Editor — {editingPassageSectionTitle}
                </h3>
              </div>
              <button 
                onClick={() => !isSavingPassage && setIsPassageModalOpen(false)}
                disabled={isSavingPassage}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono font-black text-[#7C6B93] uppercase">
                Passage Content & Formatting (Supports rich text spacing, bolding, and math symbols):
              </label>

              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 border border-[#E2D5F8] rounded-t-2xl shadow-2xs">
                <button type="button" onClick={() => applyFormatting('bold')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('italic')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('underline')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                <span className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={() => applyFormatting('insertUnorderedList')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('formatBlock', '<h3>')} className="px-2.5 py-1.5 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-xs font-mono font-black text-slate-800 cursor-pointer shadow-2xs" title="Heading">H3</button>
              </div>

              <div 
                ref={editorRef}
                contentEditable={!isSavingPassage}
                onInput={(e) => setEditingPassageText(e.currentTarget.innerHTML)}
                className="w-full h-64 p-4 bg-slate-50 border border-t-0 border-[#E2D5F8] rounded-b-2xl text-xs sm:text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans"
                style={{ minHeight: '220px' }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2D5F8]">
              <button 
                onClick={() => setIsPassageModalOpen(false)}
                disabled={isSavingPassage}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-black uppercase rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePassageModal}
                disabled={isSavingPassage}
                className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPassage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSavingPassage ? 'Persisting...' : 'Save & Persist Passage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-3 flex flex-wrap justify-between items-center gap-4 shadow-sm shrink-0 font-mono">
        
        {/* ZONE 1: Navigation & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onNavigateBack} 
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs" 
            title="Return to Assessments Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1 rounded-xl shadow-2xs flex items-center justify-center">
            <Logo size={28} showText={false} />
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-xs font-black uppercase tracking-wider text-white truncate">
              {subjectInfo || 'Core Module Paper'}
            </h2>
            <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <span>{categoryInfo || 'Assessment Paper'}</span> &bull; 
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                resolvedStatus === 'rejected' ? 'bg-rose-500/20 text-rose-100 border border-rose-300/30' : 
                isLocked ? 'bg-indigo-900/40 text-indigo-100 border border-indigo-300/30' : 
                'bg-emerald-500/20 text-emerald-100 border border-emerald-300/30'
              }`}>
                {assessmentStatus.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* ZONE 2: Ingestion Mode Segmented Toggle */}
        {!isLocked && (
          <div className="bg-[#6D28D9]/40 p-1 rounded-2xl border border-white/20 flex items-center gap-1 shadow-inner text-xs">
            <button
              onClick={() => { setIngestionMode('manual'); initializeEmptyFormState(); }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                ingestionMode === 'manual' 
                  ? 'bg-white text-[#7C3AED] shadow-sm' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Single Entry
            </button>
            <button
              onClick={() => setIngestionMode('bulk')}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                ingestionMode === 'bulk' 
                  ? 'bg-white text-[#7C3AED] shadow-sm' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk Import
            </button>
          </div>
        )}

        {/* ZONE 3: Student View, Sibling Sync & Read-Only Status */}
        <div className="flex items-center gap-3">
          {!isLocked && siblingArms.length > 0 && (
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-900/80 text-purple-100 border border-white/30 font-mono font-bold text-xs uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Replicate assessment questions to parallel class arms"
            >
              <Copy className="w-3.5 h-3.5" /> Sync to Other Arms ({siblingArms.length})
            </button>
          )}

          <button 
            onClick={handleOpenStudentPreview}
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm font-mono cursor-pointer flex items-center gap-1.5 border border-amber-300 active:scale-95"
            title="Launch Student Examination Preview"
          >
            <Eye className="w-4 h-4 text-amber-950" /> Test-Run Exam
          </button>

          {isLocked && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 border border-white/20 text-amber-200 font-mono font-bold text-[10px] uppercase rounded-xl">
              <Lock className="w-3.5 h-3.5 text-amber-300" /> Read-Only
            </div>
          )}
        </div>
      </header>

      {resolvedStatus === 'rejected' && feedbackComment && (
        <div className="w-full bg-rose-50 border-b border-rose-200 py-3.5 px-6 shadow-inner text-left shrink-0">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <div className="w-8 h-8 bg-white border border-rose-200 rounded-xl flex items-center justify-center text-[#C62927] shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-black text-[#C62927] uppercase tracking-wider block">Moderation Revision Feedback Comments:</span>
              <p className="text-xs font-bold text-slate-950 mt-0.5 leading-relaxed uppercase select-text">{feedbackComment}</p>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE CONTENT AREA */}
      <div className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto">
        
        {/* INLINE GENERAL INSTRUCTIONS CARD */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4 shrink-0 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] p-4 rounded-2xl shadow-2xs flex justify-between items-center">
              <span className="text-[10px] font-black text-[#7C6B93] uppercase">Section A (Obj) Total Score:</span>
              <span className="text-xs font-black text-slate-900 bg-white border border-[#E2D5F8] px-3 py-1 rounded-xl shadow-2xs">{totalObjectivePoints} Marks</span>
            </div>
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] p-4 rounded-2xl shadow-2xs flex justify-between items-center">
              <span className="text-[10px] font-black text-[#7C6B93] uppercase">Section B (Theory) Pool Score:</span>
              <span className="text-xs font-black text-slate-900 bg-white border border-[#E2D5F8] px-3 py-1 rounded-xl shadow-2xs">{totalTheoryPoints} Marks</span>
            </div>
            <div className="bg-[#F3EEFC] border border-[#E2D5F8] p-4 rounded-2xl shadow-2xs flex justify-between items-center">
              <span className="text-[10px] font-black text-[#7C6B93] uppercase">Theory Expected Max Score:</span>
              <span className="text-xs font-black text-[#7C3AED] bg-white border border-purple-200 px-3 py-1 rounded-xl shadow-2xs">{expectedTheoryScore} Marks</span>
            </div>
          </div>

          {validationError && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-mono font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-[#E2D5F8] pb-2">
              <span className="text-[11px] font-mono font-black text-[#7C3AED] uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4" /> Assessment General Directions & Student Rubric
              </span>
              {!isLocked && (
                <button 
                  onClick={handleUpdateSectionInstructions}
                  disabled={isSavingInstructions}
                  className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-mono font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  {isSavingInstructions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSavingInstructions ? 'Saving...' : 'Update Directions'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-[#7C6B93] uppercase">Section A General Instructions (Student View):</label>
                <textarea 
                  rows="2"
                  value={objInstructions}
                  onChange={(e) => setObjInstructions(e.target.value)}
                  disabled={isLocked}
                  placeholder="Enter general instructions for Section A..."
                  className="w-full p-2.5 bg-white border border-[#E2D5F8] rounded-2xl text-xs font-sans text-slate-900 focus:outline-none focus:border-[#7C3AED] resize-none shadow-2xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-[#7C6B93] uppercase">Section B General Instructions (Student View):</label>
                <textarea 
                  rows="2"
                  value={theoryInstructions}
                  onChange={(e) => setTheoryInstructions(e.target.value)}
                  disabled={isLocked}
                  placeholder="Enter general instructions for Section B..."
                  className="w-full p-2.5 bg-white border border-[#E2D5F8] rounded-2xl text-xs font-sans text-slate-900 focus:outline-none focus:border-[#7C3AED] resize-none shadow-2xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-[#7C3AED] uppercase">Theory Expected Highest Score (Required):</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  max={totalTheoryPoints}
                  value={expectedTheoryScore}
                  onChange={(e) => setExpectedTheoryScore(e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 30 (Optional questions limit)"
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-2xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#7C3AED] shadow-2xs"
                />
                <span className="text-[9px] font-mono text-slate-500 block">Maximum score achievable by student when choice questions exist.</span>
              </div>
            </div>
          </div>
        </div>

        {ingestionMode === 'manual' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 flex gap-3 shrink-0">
            <button onClick={() => { setActiveSectionTab('objective'); initializeEmptyFormState(); }} className={`px-4 py-2.5 text-xs font-black uppercase rounded-xl tracking-wider cursor-pointer font-mono transition-all shadow-2xs ${activeSectionTab === 'objective' ? 'bg-[#7C3AED] text-white' : 'bg-white border border-[#E2D5F8] text-[#7C6B93] hover:bg-slate-50'}`}>Section A: Objectives</button>
            <button onClick={() => { setActiveSectionTab('theory'); initializeEmptyFormState(); }} className={`px-4 py-2.5 text-xs font-black uppercase rounded-xl tracking-wider cursor-pointer font-mono transition-all shadow-2xs ${activeSectionTab === 'theory' ? 'bg-[#7C3AED] text-white' : 'bg-white border border-[#E2D5F8] text-[#7C6B93] hover:bg-slate-50'}`}>Section B: Theory & Passages</button>
          </div>
        )}

        {isLoading ? (
          <main className="flex-1 flex items-center justify-center bg-[#F7F5FC] w-full py-24">
            <div className="text-xs font-mono text-[#7C6B93] font-black uppercase tracking-widest flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
              Synchronizing assessment files...
            </div>
          </main>
        ) : (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-start">
            
            {ingestionMode === 'bulk' && !isLocked ? (
              <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="space-y-4 flex flex-col">
                  
                  <div className="bg-[#FAF5FF] border border-[#D8B4FE] rounded-3xl p-6 shadow-xs space-y-3 text-left">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#D8B4FE]/60">
                      <Download className="w-4 h-4 text-[#7C3AED]" />
                      <h4 className="text-xs font-black uppercase tracking-wide text-[#581C87]">Question Import Templates</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                      Download official pre-formatted templates supporting decimal marks, section instructions, hierarchical parent-sub questions (3a, 3b), and shared reading passages.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => handleDownloadTemplate('csv')}
                        className="py-2.5 px-3 bg-white hover:bg-purple-50 border border-[#D8B4FE] text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer font-mono transition-all"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> CSV Template
                      </button>
                      <button 
                        onClick={() => handleDownloadTemplate('docx')}
                        className="py-2.5 px-3 bg-white hover:bg-purple-50 border border-[#D8B4FE] text-[#7C3AED] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer font-mono transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" /> Word Template
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 shadow-xs flex-1 flex flex-col justify-between min-h-[220px] text-left">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-3 border-b border-[#E2D5F8]/60">
                        <ImageIcon className="w-4 h-4 text-[#7C3AED]" />
                        <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">Reference Media Bin ({bulkImages.length})</h4>
                      </div>
                      
                      <div className="p-4 border border-dashed border-[#E2D5F8] rounded-2xl bg-white text-center relative flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#7C3AED] shadow-2xs transition-all">
                        <Upload className="w-5 h-5 text-[#7C3AED]" />
                        <span className="text-[10px] font-black text-[#7C6B93] uppercase font-mono">Upload Attachments Bundle</span>
                        <input type="file" multiple accept="image/*" onChange={handleBulkImagesChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[140px] pt-1">
                        {bulkImages.map((img, idx) => (
                          <div key={idx} className="relative border border-[#E2D5F8] rounded-xl p-1.5 bg-white text-center flex flex-col justify-between items-center h-16 shadow-2xs">
                            <img src={URL.createObjectURL(img)} alt="attached-thumbnail" className="w-full h-8 object-contain rounded" />
                            <span className="text-[7px] font-mono font-black truncate w-full uppercase mt-1 block text-slate-500">{img.name}</span>
                            <button onClick={() => removeBulkImage(idx)} className="absolute -top-1 -right-1 p-0.5 bg-[#C62927] text-white rounded-full hover:opacity-90 shadow-xs cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {bulkFile && (
                      <div className="flex gap-2 mt-4 w-full">
                        <button onClick={handleCancelBulkUploadDeck} className="px-3 border border-[#E2D5F8] bg-white hover:bg-slate-50 rounded-xl flex items-center justify-center text-[#7C6B93] cursor-pointer shadow-2xs"><RotateCcw className="w-4 h-4" /></button>
                        <button 
                          onClick={() => setModalType('bulk_submit')}
                          disabled={isUploadingBulk}
                          className="flex-1 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 font-mono transition-all"
                        >
                          {isUploadingBulk && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Save Import Document
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 shadow-xs text-center flex flex-col items-center justify-center h-44 relative hover:border-[#7C3AED] transition-colors">
                    {bulkFileType === 'docx' ? (
                      <FileText className="w-8 h-8 text-[#7C3AED] mb-2" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-2" />
                    )}
                    <input type="file" accept=".csv, .docx" onChange={handleBulkFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="text-xs font-black text-slate-900 uppercase font-mono">
                      {bulkFile ? `Staged File: ${bulkFile.name} (${bulkFileType.toUpperCase()})` : 'Click or drag your structured question sheets (.csv or .docx)'}
                    </span>
                    <p className="text-[10px] text-[#7C6B93] uppercase font-mono mt-1">Maximum allowed size: 24MB</p>
                  </div>

                  <div className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 flex-1 h-[380px] overflow-y-auto shadow-xs text-left">
                    <span className="text-[10px] font-mono font-black text-[#7C3AED] uppercase tracking-wider block mb-3">Live Document Pre-Submission Preview Sheet</span>
                    
                    <div className="space-y-6">
                      {stagedPreviewQuestions.length === 0 ? (
                        <div className="p-12 border border-dashed border-[#E2D5F8] rounded-2xl text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white py-24 shadow-2xs">Staging workspace empty. Download a template above and attach your file to preview.</div>
                      ) : (
                        stagedGroupedPreview.map((secGroup, gIdx) => (
                          <div key={gIdx} className="bg-white border border-[#E2D5F8] rounded-2xl p-5 shadow-2xs space-y-4">
                            <div className="border-b border-[#E2D5F8] pb-3 flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-[#7C3AED] text-white rounded-lg text-[10px] font-mono font-black uppercase">
                                  {secGroup.sectionTitle}
                                </span>
                              </div>
                              {secGroup.sectionInstructions && (
                                <p className="text-[11px] font-bold text-slate-700 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 mt-1">
                                  <span className="font-mono text-[9px] font-black text-[#7C3AED] uppercase block">Section Instructions:</span>
                                  {secGroup.sectionInstructions}
                                </p>
                              )}
                              {secGroup.passageText && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-sans mt-2 shadow-2xs relative group/passage">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="font-mono text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Shared Reading Passage Context:</span>
                                    {!isLocked && (
                                      <button
                                        onClick={() => handleOpenPassageModal(secGroup)}
                                        className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-[#E2D5F8] text-[#7C3AED] rounded-lg text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                      >
                                        <Edit3 className="w-3 h-3" /> Edit Passage
                                      </button>
                                    )}
                                  </div>
                                  <div className="leading-relaxed">
                                    {renderFormattedText(secGroup.passageText)}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              {secGroup.units.map((unit, uIdx) => {
                                if (unit.isGroup) {
                                  return (
                                    <div key={uIdx} className="p-4 bg-[#FAF9FA] border border-[#D8B4FE] rounded-xl space-y-3 shadow-2xs">
                                      <div className="flex justify-between items-center font-mono text-[10px] font-black text-[#7C3AED] uppercase border-b border-purple-100 pb-2">
                                        <span>Q{unit.displayNumber}. Grouped Sub-Questions</span>
                                      </div>
                                      <div className="space-y-3 pl-1">
                                        {unit.subItems.map((subQ, sIdx) => {
                                          const matchingMediaFile = subQ.imageHandle ? bulkImages.find(img => img.name === subQ.imageHandle) : null;
                                          return (
                                            <div key={sIdx} className="p-3 bg-white border border-[#E2D5F8] rounded-xl space-y-2">
                                              <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#7C6B93] uppercase">
                                                <span>Sub-item ({subQ.subLabel})</span>
                                                <span className="text-slate-900 bg-purple-50 border border-[#E2D5F8] px-2 py-0.5 rounded-lg font-black">{subQ.score} Marks</span>
                                              </div>
                                              <div className="text-xs font-bold text-slate-900 leading-relaxed flex items-start gap-2">
                                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-[#7C3AED] rounded font-mono text-[10px] shrink-0 font-black">
                                                  Q{unit.displayNumber}({subQ.subLabel})
                                                </span>
                                                <div className="w-full">{renderFormattedText(subQ.text)}</div>
                                              </div>
                                              {subQ.imageHandle && (
                                                <div className="mt-2 p-2 bg-slate-50 border border-[#E2D5F8] rounded-xl max-w-xs flex items-center gap-2">
                                                  <ImageIcon className="w-4 h-4 text-[#7C3AED]" />
                                                  <span className="font-mono text-[9px] text-slate-700 font-bold truncate">{subQ.imageHandle}</span>
                                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ml-auto ${matchingMediaFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                    {matchingMediaFile ? 'Verified' : 'Missing'}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }

                                const q = unit.item;
                                const matchingMediaFile = q.imageHandle ? bulkImages.find(img => img.name === q.imageHandle) : null;
                                return (
                                  <div key={uIdx} className="p-3.5 bg-[#FAF9FA] border border-[#E2D5F8] rounded-xl space-y-2 text-left">
                                    <div className="flex justify-between items-center font-mono text-[9px] font-black text-[#7C6B93] uppercase">
                                      <span>Q{unit.displayNumber} — {q.type}</span>
                                      <span className="text-slate-900 bg-white border border-[#E2D5F8] px-2 py-0.5 rounded-lg font-black">{q.score} Marks</span>
                                    </div>

                                    <div className="text-xs font-bold text-slate-900 leading-relaxed flex items-start gap-2">
                                      <span className="text-[#7C3AED] font-mono font-black">Q{unit.displayNumber}.</span>
                                      <div className="w-full">{renderFormattedText(q.text)}</div>
                                    </div>

                                    {q.imageHandle && (
                                      <div className="mt-2 p-2 bg-white border border-[#E2D5F8] rounded-xl max-w-xs flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-[#7C3AED]" />
                                        <span className="font-mono text-[9px] text-slate-700 font-bold truncate">{q.imageHandle}</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ml-auto ${matchingMediaFile ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                          {matchingMediaFile ? 'Verified' : 'Missing'}
                                        </span>
                                      </div>
                                    )}

                                    {q.type.toLowerCase() === 'objective' && q.options && q.options.length > 0 && (
                                      <div className="mt-2 grid grid-cols-1 gap-1 pl-2 font-mono text-[10px] text-slate-600 font-bold">
                                        {q.options.map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                                            <div className="w-full">{renderFormattedText(opt.text)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch w-full">
                {/* QUESTION LEDGER */}
                <div className="flex flex-col h-full justify-between">
                  <QuestionLedger 
                    questionBank={questionBank} 
                    activeQuestionId={activeQuestionId} 
                    activeSectionTab={activeSectionTab} 
                    onSelectQuestion={loadQuestionIntoEditor} 
                    onAddQuestion={isLocked ? () => {} : handleAddNewQuestionShell} 
                    onDeleteQuestion={handleDeleteQuestionClick} 
                    disableAdding={isLocked} 
                  />

                  {!isLocked && questionBank.length > 0 && (
                    <div className="pt-3 font-mono">
                      <button 
                        onClick={() => setModalType('delete_all_confirm')} 
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#C62927] hover:text-rose-800 font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        title="Clear Assessment Blueprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear Assessment Blueprint ({questionBank.length})
                      </button>
                    </div>
                  )}
                </div>

                <div className={`lg:col-span-3 grid grid-cols-1 ${isLocked ? '' : 'md:grid-cols-5'} gap-6 items-stretch w-full`}>
                  {!isLocked && (
                    <div className="md:col-span-2 relative">
                      <ManualForm 
                        activeSectionTab={activeSectionTab} 
                        questionScore={questionScore} 
                        setQuestionScore={setQuestionScore} 
                        manualImageFile={manualImageFile} 
                        onImageDrop={handleManualImageDrop} 
                        questionText={questionText} 
                        setQuestionText={setQuestionText} 
                        options={options} 
                        setOptions={setOptions} 
                        parentNumber={parentNumber}
                        setParentNumber={setParentNumber}
                        subLabel={subLabel}
                        setSubLabel={setSubLabel}
                        sectionTitle={sectionTitle}
                        setSectionTitle={setSectionTitle}
                        sectionInstructions={sectionInstructions}
                        setSectionInstructions={setSectionInstructions}
                        passageText={passageText}
                        setPassageText={setPassageText}
                        availableSections={availableSections}
                        onAddOption={() => setOptions([...options, { text: 'New Option', isCorrect: false }])} 
                        onRemoveOption={(idx) => setOptions(options.filter((_, i) => i !== idx))} 
                        onCommitChanges={() => setModalType('manual_commit')} 
                        onOpenPassageModal={() => handleOpenPassageModal({ sectionTitle: sectionTitle || 'Section A', passageText })}
                      />
                      
                      {manualImagePreview && (
                        <div className="absolute top-[370px] right-4 bg-white border border-[#E2D5F8] p-2.5 rounded-2xl flex items-center gap-2.5 max-w-[190px] shadow-md z-50 text-left">
                          <img src={manualImagePreview} className="w-9 h-9 object-contain bg-[#FAF9FA] border border-[#E2D5F8] rounded-xl shadow-2xs" alt="thumb" />
                          <span className="text-[9px] font-mono text-[#7C6B93] uppercase font-black truncate block flex-1">Image Attached</span>
                          <button onClick={handleCancelManualImage} className="p-1 bg-[#FAF9FA] hover:bg-rose-100 text-[#7C6B93] hover:text-[#C62927] rounded-full cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={isLocked ? "w-full" : "md:col-span-3"}>
                    <section className="bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 h-[620px] overflow-y-auto shadow-xs w-full text-left">
                      <div className="w-full space-y-4">

                        <div className="flex justify-between items-center px-1 border-b border-[#E2D5F8] pb-3">
                          <p className="text-[10px] font-black text-[#7C6B93] font-mono uppercase tracking-wider">Draft Question Sheet Portfolio Scroll</p>
                          {activeQuestionId && !String(activeQuestionId).startsWith('temp_') && !isLocked && (
                            <button onClick={initializeEmptyFormState} className="text-[9px] bg-white border border-[#E2D5F8] hover:border-[#7C3AED] font-mono font-black text-slate-700 uppercase px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer">Reset Entry Fields</button>
                          )}
                        </div>
                        
                        <div className="space-y-6 w-full text-left">
                          {groupedSectionList.length === 0 ? (
                            <div className="p-8 text-center text-xs font-mono text-[#7C6B93] font-black uppercase bg-white border border-dashed border-[#E2D5F8] rounded-2xl py-16 shadow-2xs">No test entries compiled within this section folder yet.</div>
                          ) : (
                            groupedSectionList.map((secGroup, sIdx) => (
                              <div key={sIdx} className="bg-white border border-[#E2D5F8] rounded-2xl p-5 shadow-2xs space-y-4">
                                <div className="border-b border-[#E2D5F8] pb-3 flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 bg-[#7C3AED] text-white rounded-lg text-[10px] font-mono font-black uppercase">
                                      {secGroup.sectionTitle}
                                    </span>
                                    {!isLocked && (
                                      <button
                                        onClick={() => handleOpenPassageModal(secGroup)}
                                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-[#E2D5F8] text-[#7C3AED] rounded-lg text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                      >
                                        <BookOpen className="w-3 h-3" /> {secGroup.passageText ? 'Edit Reading Passage' : '+ Attach Reading Passage'}
                                      </button>
                                    )}
                                  </div>
                                  {secGroup.sectionInstructions && (
                                    <p className="text-[11px] font-bold text-slate-700 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 mt-1">
                                      <span className="font-mono text-[9px] font-black text-[#7C3AED] uppercase block">Section Instructions:</span>
                                      {secGroup.sectionInstructions}
                                    </p>
                                  )}
                                  {secGroup.passageText && (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-sans mt-2 shadow-2xs flex flex-col gap-2 relative group/passage">
                                      <div className="leading-relaxed">
                                        {renderFormattedText(secGroup.passageText)}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {secGroup.units.map((unit, uIdx) => {
                                    if (unit.isGroup) {
                                      return (
                                        <div key={uIdx} className="p-4 bg-[#FAF9FA] border border-[#D8B4FE] rounded-xl space-y-3 shadow-2xs">
                                          <div className="flex justify-between items-center font-mono text-[10px] font-black text-[#7C3AED] uppercase border-b border-purple-100 pb-2">
                                            <span>Q{unit.displayNumber}. Hierarchical Sub-Questions</span>
                                            <span className="bg-purple-100 text-[#7C3AED] px-2.5 py-0.5 rounded font-black">{unit.totalScore} Marks Total</span>
                                          </div>
                                          <div className="space-y-3 pl-1">
                                            {unit.subItems.map((subQ, sIdx) => (
                                              <div 
                                                key={subQ.id || sIdx} 
                                                ref={(el) => (previewCardRefs.current[subQ.id] = el)}
                                                className={`p-3.5 bg-white border rounded-xl shadow-2xs transition-all relative group/row text-left space-y-2 ${subQ.id === activeQuestionId ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/30 bg-purple-50/30' : 'border-[#E2D5F8]'}`}
                                              >
                                                {!isLocked && (
                                                  <button 
                                                    onClick={() => loadQuestionIntoEditor(subQ)}
                                                    className="absolute top-3 right-3 p-1.5 border border-[#E2D5F8] bg-white hover:border-[#7C3AED] text-[#7C6B93] hover:text-[#7C3AED] rounded-xl opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shadow-2xs flex items-center gap-1 text-[9px] font-mono font-black uppercase"
                                                  >
                                                    <Edit3 className="w-3 h-3" /> Edit Sub-item
                                                  </button>
                                                )}

                                                <div className="flex justify-between items-center border-b border-[#E2D5F8]/60 pb-1.5 font-mono text-[9px] font-black text-[#7C6B93] uppercase">
                                                  <span>Sub-label ({subQ.subLabel})</span>
                                                  <span className="bg-white px-2 py-0.5 rounded-lg border border-[#E2D5F8] text-slate-900 font-black pr-10">{subQ.score} Marks</span>
                                                </div>

                                                <div className="text-xs font-bold text-slate-900 leading-relaxed font-sans flex items-start gap-2 pt-1">
                                                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-[#7C3AED] rounded font-mono text-[10px] shrink-0 font-black">
                                                    Q{unit.displayNumber}({subQ.subLabel})
                                                  </span>
                                                  <div className="w-full">{renderFormattedText(subQ.text)}</div>
                                                </div>

                                                {subQ.imageUrl && (
                                                  <div className="mt-2 border border-[#E2D5F8] rounded-xl overflow-hidden bg-white max-w-sm h-36 flex items-center justify-center shadow-2xs">
                                                    <img 
                                                      src={String(subQ.imageUrl).startsWith('blob:') ? subQ.imageUrl : `${BASE_URL}/${subQ.imageUrl.startsWith('/') ? subQ.imageUrl.slice(1) : subQ.imageUrl}`} 
                                                      alt="Context Attachment" 
                                                      className="w-full h-full object-contain p-2"
                                                      onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }

                                    const q = unit.item;
                                    return (
                                      <div 
                                        key={q.id || uIdx} 
                                        ref={(el) => (previewCardRefs.current[q.id] = el)}
                                        className={`p-4 bg-[#FAF9FA] border rounded-xl shadow-2xs transition-all relative group/row text-left space-y-2 ${q.id === activeQuestionId ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/30 bg-white' : 'border-[#E2D5F8]'}`}
                                      >
                                        {!isLocked && (
                                          <button 
                                            onClick={() => loadQuestionIntoEditor(q)}
                                            className="absolute top-3 right-[#2.5rem] p-1.5 border border-[#E2D5F8] bg-white hover:border-[#7C3AED] text-[#7C6B93] hover:text-[#7C3AED] rounded-xl opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shadow-2xs flex items-center gap-1 text-[9px] font-mono font-black uppercase"
                                          >
                                            <Edit3 className="w-3 h-3" /> Edit Card
                                          </button>
                                        )}

                                        <div className="flex justify-between items-center border-b border-[#E2D5F8]/60 pb-1.5 font-mono text-[9px] font-black text-[#7C6B93] uppercase">
                                          <span>Q{unit.displayNumber}</span>
                                          <span className="bg-white px-2 py-0.5 rounded-lg border border-[#E2D5F8] text-slate-900 font-black pr-10">{q.score} Marks</span>
                                        </div>

                                        <div className="text-xs font-bold text-slate-900 leading-relaxed font-sans flex items-start gap-2 pt-1">
                                          <span className="text-[#7C3AED] font-mono font-black">Q{unit.displayNumber}.</span>
                                          <div className="w-full">{renderFormattedText(q.text)}</div>
                                        </div>

                                        {q.imageUrl && (
                                          <div className="mt-2 border border-[#E2D5F8] rounded-xl overflow-hidden bg-white max-w-sm h-36 flex items-center justify-center shadow-2xs">
                                            <img 
                                              src={String(q.imageUrl).startsWith('blob:') ? q.imageUrl : `${BASE_URL}/${q.imageUrl.startsWith('/') ? q.imageUrl.slice(1) : q.imageUrl}`} 
                                              alt="Context Attachment" 
                                              className="w-full h-full object-contain p-2"
                                              onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                          </div>
                                        )}

                                        {cleanType(q.type, q.sectionTitle) === 'objective' && q.options && (
                                          <div className="mt-2 grid grid-cols-1 gap-1.5 pl-2 font-mono">
                                            {q.options.map((opt, oIdx) => (
                                              <div key={oIdx} className={`text-[11px] p-2.5 rounded-xl border font-bold flex justify-between items-center ${opt.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-black' : 'bg-white border-[#E2D5F8] text-slate-700'}`}>
                                                <span className="flex items-start gap-1.5"><span className="shrink-0">{String.fromCharCode(65 + oIdx)})</span> <span className="w-full">{renderFormattedText(opt.text)}</span></span>
                                                {opt.isCorrect && <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded shadow-2xs shrink-0">✓ Correct Key</span>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
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
      </div>

      <ConfirmationModal 
        isOpen={modalType !== null}
        isConfirming={isSubmittingAction}
        isLoading={isSubmittingAction}
        loading={isSubmittingAction}
        title={
          modalType === 'bulk_submit' ? "Confirm Document Bulk Import" : 
          modalType === 'manual_commit' ? "Confirm Question Entry Save" : 
          modalType === 'delete_all_confirm' ? "⚠️ Confirm Wiping All Questions" : 
          "Drop Question Entry"
        }
        message={
          modalType === 'bulk_submit' ? `Are you ready to import this full ${bulkFileType.toUpperCase()} bulk question packet with section instructions and passages?` : 
          modalType === 'manual_commit' ? "Are you sure you want to save changes?" : 
          modalType === 'delete_all_confirm' ? "Are you completely sure you want to delete ALL questions from this assessment? This action cannot be undone." : 
          "Are you sure you want to delete this question?"
        }
        confirmLabel={getDynamicModalConfirmLabel()}
        cancelLabel="Abort Action"
        onConfirm={handleConfirmActionDispatch}
        onCancel={() => { if (!isSubmittingAction) { setModalType(null); setDeleteTargetId(null); } }}
        summaryData={
          modalType === 'bulk_submit' ? { "Source File": bulkFile?.name, "Staged Extracted Count": `${stagedPreviewQuestions.length} Rows Map` } : 
          modalType === 'delete_all_confirm' ? { "Total Questions to Wipe": `${questionBank.length} Items` } : 
          { "Category": activeSectionTab }
        }
      />

      <footer className="w-full border-t border-[#7C6B93]/20 bg-[#FFFFFF] py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-rite internet institutional security matrix
      </footer>

    </div>
  );
}