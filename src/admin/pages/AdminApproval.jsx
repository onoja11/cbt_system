import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Clock, Check, Loader2, Edit3, Save, X, 
  CheckCircle2, Layers, BookOpen, AlertCircle, FileText, User, GraduationCap, Bold, Italic, Underline, List, RemoveFormatting
} from 'lucide-react';
import { apiRequest, BASE_URL } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText';

export default function AdminApproval({ onNavigateBack }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [activeSectorTab, setActiveSectorTab] = useState('objective'); 
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [toastMessage, setToastMessage] = useState(null);

  // 📝 Inline Question Editing States
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    text: '', 
    options: [], 
    correctIndex: 0, 
    imageFile: null, 
    imagePreview: null, 
    removeImage: false,
    parentNumber: '',
    subLabel: '',
    sectionTitle: '',
    sectionInstructions: '',
    passageText: ''
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // ⏱️ Edit Duration Modal State
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [newDurationMins, setNewDurationMins] = useState(30);
  const [isSavingDuration, setIsSavingDuration] = useState(false);

  // 📖 Reading Passage Modal State
  const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
  const [editingPassageSectionTitle, setEditingPassageSectionTitle] = useState('');
  const [editingPassageText, setEditingPassageText] = useState('');
  const [isSavingPassage, setIsSavingPassage] = useState(false);
  const editorRef = useRef(null);

  const cleanType = useCallback((typeStr, sectionTitleStr = '') => {
    const t = String(typeStr || '').trim().toLowerCase();
    const sec = String(sectionTitleStr || '').trim().toLowerCase();

    if (sec.includes('theory') || sec.includes('problem solving') || sec.includes('passage')) {
      return 'theory';
    }
    if (t.includes('object')) {
      return 'objective';
    }
    return t.includes('theory') ? 'theory' : 'objective';
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleBackNavigation = () => {
    if (typeof onNavigateBack === 'function') {
      onNavigateBack();
    } else {
      try {
        localStorage.setItem('active_domain_context', 'admin_dash');
        window.location.reload();
      } catch {
        window.history.back();
      }
    }
  };

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

  const fetchVettingQueue = useCallback(async () => {
    try {
      const res = await apiRequest('api/v1/admin/vetting/pending-papers', { method: 'GET' });
      const resData = await res.json();
      if (res.ok && resData.papers) {
        const normalizedPapers = resData.papers.map(paper => {
          const mapQuestion = (q) => {
            let img = q.imageUrl || q.image_url;
            if (img && !img.startsWith('http')) {
              const cleanPath = img.startsWith('/') ? img.slice(1) : img;
              img = `${BASE_URL}/${cleanPath}`;
            }
            
            const rawOpts = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
            const correctOptIdx = q.correctIndex !== undefined && q.correctIndex !== null 
              ? parseInt(q.correctIndex, 10) 
              : (q.correct_option_index !== undefined && q.correct_option_index !== null ? parseInt(q.correct_option_index, 10) : 0);
            
            const normalizedOpts = rawOpts.map((opt, idx) => {
              const optText = typeof opt === 'object' ? (opt.text || opt.text_value || '') : opt;
              const isCorrect = (idx === correctOptIdx);
              return { text: optText, isCorrect };
            });

            const resolvedSectionTitle = q.section_title || q.sectionTitle || null;
            const resolvedSectionInstructions = q.section_instructions || q.sectionInstructions || q.instructions || null;
            const resolvedPassageText = q.passage_text || q.passageText || q.passage || null;

            return { 
              ...q, 
              type: cleanType(q.type, resolvedSectionTitle),
              score: parseFloat(q.points_weight || q.pointsWeight || q.points || q.score || 2),
              imageUrl: img, 
              parentNumber: q.parent_number || q.parentNumber || null,
              subLabel: q.sub_label || q.subLabel || null,
              sectionTitle: resolvedSectionTitle,
              sectionInstructions: resolvedSectionInstructions,
              passageText: resolvedPassageText,
              options: normalizedOpts,
              correctIndex: correctOptIdx,
              correct_option_index: correctOptIdx
            };
          };

          return {
            ...paper,
            objectiveInstructions: paper.objective_instructions || paper.objectiveInstructions || 'Answer all objective questions.',
            theoryInstructions: paper.theory_instructions || paper.theoryInstructions || 'Answer all theory questions comprehensively.',
            objectivesList: (paper.objectivesList || []).map(mapQuestion),
            theoriesList: (paper.theoriesList || []).map(mapQuestion)
          };
        });

        setPendingReviews(normalizedPapers);
        setActiveReviewId(prev => {
          const found = normalizedPapers.find(p => p.id === prev);
          return found ? prev : (normalizedPapers.length > 0 ? normalizedPapers[0].id : null);
        });
      }
    } catch (err) {
      console.error("Vetting queue fetch fault:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cleanType]);

  useEffect(() => { 
    fetchVettingQueue(); 
  }, [fetchVettingQueue]);

  const currentPaper = useMemo(() => {
    return pendingReviews.find(p => p.id === activeReviewId) || null;
  }, [pendingReviews, activeReviewId]);

  const currentSectionGroups = useMemo(() => {
    if (!currentPaper) return [];

    const activeList = activeSectorTab === 'objective' 
      ? (currentPaper.objectivesList || []) 
      : (currentPaper.theoriesList || []);

    const defaultInstructions = activeSectorTab === 'objective'
      ? currentPaper.objectiveInstructions
      : currentPaper.theoryInstructions;

    const sectionMap = new Map();

    activeList.forEach(q => {
      const secTitle = q.sectionTitle ? q.sectionTitle.trim() : (activeSectorTab === 'objective' ? 'Section A: Objectives' : 'Section B: Theory & Essay');
      
      if (!sectionMap.has(secTitle)) {
        sectionMap.set(secTitle, {
          sectionTitle: secTitle,
          sectionInstructions: q.sectionInstructions || defaultInstructions,
          passageText: q.passageText || '',
          rawItems: []
        });
      }

      const secObj = sectionMap.get(secTitle);
      
      if (q.sectionInstructions && (!secObj.sectionInstructions || secObj.sectionInstructions === defaultInstructions)) {
        secObj.sectionInstructions = q.sectionInstructions;
      }
      if (q.passageText && !secObj.passageText) {
        secObj.passageText = q.passageText;
      }

      secObj.rawItems.push(q);
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
  }, [currentPaper, activeSectorTab]);

  const totalObjectivePoints = useMemo(() => {
    if (!currentPaper) return 0;
    return (currentPaper.objectivesList || []).reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [currentPaper]);

  const totalTheoryPoints = useMemo(() => {
    if (!currentPaper) return 0;
    return (currentPaper.theoriesList || []).reduce((sum, q) => sum + (parseFloat(q.score) || 0), 0);
  }, [currentPaper]);

  const handleStartEditingQuestion = (q) => {
    setEditingQuestionId(q.id);
    
    let parsedOpts = [];
    if (q.options) {
      parsedOpts = q.options.map(o => (typeof o === 'object' ? (o.text || '') : o));
    }

    const correctIdx = q.correctIndex !== undefined && q.correctIndex !== null 
      ? parseInt(q.correctIndex, 10) 
      : (q.correct_option_index !== undefined && q.correct_option_index !== null ? parseInt(q.correct_option_index, 10) : 0);

    setEditForm({
      text: q.text || q.question_text || '',
      options: parsedOpts,
      correctIndex: correctIdx,
      imageFile: null,
      imagePreview: q.imageUrl || null,
      removeImage: false,
      parentNumber: q.parentNumber || '',
      subLabel: q.subLabel || '',
      sectionTitle: q.sectionTitle || '',
      sectionInstructions: q.sectionInstructions || '',
      passageText: q.passageText || ''
    });
  };

  const handleOpenPassageModal = (secGroup) => {
    if (!secGroup) return;
    setEditingPassageSectionTitle(secGroup.sectionTitle || '');
    setEditingPassageText(secGroup.passageText || '');
    setIsPassageModalOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = secGroup.passageText || '';
      }
    }, 50);
  };

  // 🚀 Fast Batch Passage Persistence via Parallel Promise Execution
  const handleSavePassageModal = async () => {
    if (!currentPaper) return;
    setIsSavingPassage(true);

    try {
      const activeList = activeSectorTab === 'objective' ? (currentPaper.objectivesList || []) : (currentPaper.theoriesList || []);
      const sectionQuestions = activeList.filter(q => {
        const qSec = q.sectionTitle ? q.sectionTitle.trim() : (activeSectorTab === 'objective' ? 'Section A: Objectives' : 'Section B: Theory & Essay');
        return qSec === editingPassageSectionTitle.trim();
      });

      const token = localStorage.getItem('intranet_bearer_token');

      const updatePromises = sectionQuestions.map(q => {
        const formData = new FormData();
        formData.append('type', activeSectorTab === 'objective' ? 'Objective' : 'Theory');
        formData.append('question_text', q.text || q.question_text || '');
        formData.append('points_weight', String(q.score || 2));
        formData.append('section_title', q.sectionTitle || '');
        formData.append('section_instructions', q.sectionInstructions || '');
        formData.append('passage_text', editingPassageText);
        formData.append('parent_number', q.parentNumber || '');
        formData.append('sub_label', q.subLabel || '');
        formData.append('remove_existing_image', 'false');

        if (q.options && q.options.length > 0) {
          formData.append('options', JSON.stringify(q.options.map(o => (typeof o === 'object' ? o.text : o))));
          formData.append('correct_option_index', String(q.correctIndex !== undefined ? q.correctIndex : 0));
        }

        return fetch(`${BASE_URL}/api/v1/teacher/assessments/${currentPaper.id}/questions/${q.id}`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json'
          },
          body: formData
        });
      });

      await Promise.all(updatePromises);

      showToast(`Reading passage updated for "${editingPassageSectionTitle}".`);
      setIsPassageModalOpen(false);
      await fetchVettingQueue();
    } catch (err) {
      console.error("Passage update fault:", err);
      setErrorModal({ isOpen: true, title: 'Passage Update Fault', message: 'Could not update reading passage.' });
    } finally {
      setIsSavingPassage(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditForm(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
        removeImage: false
      }));
    }
  };

  const handleRemoveExistingImage = () => {
    setEditForm(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
      removeImage: true
    }));
  };

  const handleSaveEditedQuestion = async (qId) => {
    if (!currentPaper) return;
    setIsSavingQuestion(true);

    try {
      const payloadType = activeSectorTab === 'objective' ? 'Objective' : 'Theory';

      const formData = new FormData();
      formData.append('type', payloadType);
      formData.append('question_text', String(editForm.text || ''));
      formData.append('points_weight', '2');
      formData.append('options', JSON.stringify(editForm.options));
      formData.append('correct_option_index', String(editForm.correctIndex));
      formData.append('remove_existing_image', editForm.removeImage ? 'true' : 'false');
      formData.append('parent_number', editForm.parentNumber || '');
      formData.append('sub_label', editForm.subLabel || '');
      formData.append('section_title', editForm.sectionTitle || '');
      formData.append('section_instructions', editForm.sectionInstructions || '');
      formData.append('passage_text', editForm.passageText || '');

      if (editForm.imageFile) {
        formData.append('manual_image', editForm.imageFile);
      }

      const token = localStorage.getItem('intranet_bearer_token');
      const response = await fetch(`${BASE_URL}/api/v1/teacher/assessments/${currentPaper.id}/questions/${qId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        await fetchVettingQueue();
        setEditingQuestionId(null);
        showToast("Question prompt, passage, and answer details updated.");
      } else {
        throw new Error(data.message || "Failed to update question record.");
      }
    } catch (err) {
      console.error("❌ [UPDATE FAULT]:", err);
      setErrorModal({ isOpen: true, title: 'Update Fault', message: err.message || 'Could not save question modifications.' });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleSaveDurationUpdate = async () => {
    if (!currentPaper) return;
    setIsSavingDuration(true);

    try {
      const res = await apiRequest(`api/v1/admin/scheduler/assessments/${currentPaper.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ duration_minutes: parseInt(newDurationMins, 10) })
      });
      const data = await res.json();

      if (res.ok && (data.status === 'SUCCESS' || data.status === 'OK')) {
        setPendingReviews(prev => prev.map(p => p.id === currentPaper.id ? { ...p, duration_minutes: parseInt(newDurationMins, 10), duration: parseInt(newDurationMins, 10) } : p));
        setIsDurationModalOpen(false);
        showToast("Assessment duration window updated successfully.");
      } else {
        throw new Error(data.message || "Failed to update duration.");
      }
    } catch (err) {
      setErrorModal({ isOpen: true, title: 'Duration Update Fault', message: err.message || 'Could not update paper duration.' });
    } finally {
      setIsSavingDuration(false);
    }
  };

  const handleExecuteApproval = async () => {
    if (!currentPaper) return;
    try {
      const res = await apiRequest(`api/v1/admin/vetting/assessments/${currentPaper.id}/approve`, { method: 'POST' });
      if (res.ok) {
        const structuralRemaining = pendingReviews.filter(p => p.id !== currentPaper.id);
        setPendingReviews(structuralRemaining);
        setModalConfig({ isOpen: false, type: null });
        setActiveReviewId(structuralRemaining.length > 0 ? structuralRemaining[0].id : null);
        showToast(`Approved ${currentPaper.subject} paper.`);
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const handleExecuteRejection = async () => {
    if (!currentPaper) return;
    
    if (!rejectionFeedback.trim()) {
      setErrorModal({ 
        isOpen: true, 
        title: 'Feedback Notes Required', 
        message: 'Please provide clear moderation feedback notes for the subject teacher before requesting adjustments.' 
      });
      setModalConfig({ isOpen: false, type: null });
      return;
    }

    try {
      const res = await apiRequest(`api/v1/admin/vetting/assessments/${currentPaper.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ feedback_comment: rejectionFeedback })
      });
      if (res.ok) {
        const structuralRemaining = pendingReviews.filter(p => p.id !== currentPaper.id);
        setPendingReviews(structuralRemaining);
        setModalConfig({ isOpen: false, type: null });
        setRejectionFeedback('');
        setActiveReviewId(structuralRemaining.length > 0 ? structuralRemaining[0].id : null);
        showToast(`Returned ${currentPaper.subject} to teacher with correction notes.`);
      }
    } catch (err) {
      console.error("Rejection error:", err);
    }
  };

  const formatDisplayDuration = (rawMinutes) => {
    const mins = parseInt(rawMinutes, 10) || 30;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? 's' : ''}`;
    }
    return `${mins} Mins`;
  };

  const renderQuestionCard = (q, unitDisplayNumber, isSubItem = false) => {
    const isEditing = editingQuestionId === q.id;

    return (
      <div 
        key={q.id} 
        className={`p-4 rounded-2xl border transition-all relative text-left space-y-3 ${
          isEditing 
            ? 'bg-purple-50/40 border-[#7C3AED] ring-2 ring-[#7C3AED]/20 shadow-md' 
            : 'bg-[#FAF9FA] border-[#E2D5F8] shadow-2xs hover:border-[#7C3AED]/50'
        }`}
      >
        <div className="flex justify-between items-center border-b border-[#E2D5F8]/70 pb-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-black text-[#7C3AED] uppercase">
              {isSubItem ? `Sub-item (${q.subLabel || 'a'})` : `Question ${unitDisplayNumber}`}
            </span>
            <span className="text-[10px] font-bold bg-white border border-[#E2D5F8] text-slate-800 px-2.5 py-0.5 rounded-lg shadow-2xs">
              {q.score} Marks
            </span>
          </div>

          {!isEditing ? (
            <button 
              onClick={() => handleStartEditingQuestion(q)}
              className="px-3 py-1 bg-white hover:bg-purple-50 text-[#7C3AED] border border-[#E2D5F8] hover:border-[#7C3AED] rounded-xl text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            >
              <Edit3 className="w-3 h-3" /> Edit Question & Passage
            </button>
          ) : (
            <div className="flex items-center gap-1.5 font-mono">
              <button 
                disabled={isSavingQuestion}
                onClick={() => handleSaveEditedQuestion(q.id)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                {isSavingQuestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
              </button>
              <button 
                onClick={() => setEditingQuestionId(null)}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1 cursor-pointer transition-all"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-[#E2D5F8] rounded-xl font-mono text-[10px]">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Parent No. (e.g. 3)</label>
                <input 
                  type="text" 
                  value={editForm.parentNumber} 
                  onChange={(e) => setEditForm({ ...editForm, parentNumber: e.target.value })} 
                  placeholder="Main number..." 
                  className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED]" 
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Sub-label (e.g. a)</label>
                <input 
                  type="text" 
                  value={editForm.subLabel} 
                  onChange={(e) => setEditForm({ ...editForm, subLabel: e.target.value.toLowerCase() })} 
                  placeholder="Sub label..." 
                  className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED]" 
                />
              </div>
            </div>

            {/* Inline Passage Edit Box */}
            <div className="p-3 bg-white border border-[#E2D5F8] rounded-xl space-y-1 font-mono">
              <label className="text-[9px] font-black uppercase text-[#7C3AED] block">Edit Associated Reading Passage Text</label>
              <textarea 
                value={editForm.passageText}
                onChange={(e) => setEditForm({ ...editForm, passageText: e.target.value })}
                placeholder="Type or paste reading passage context here..."
                className="w-full p-2.5 border border-[#E2D5F8] rounded-xl text-xs font-sans text-slate-900 bg-slate-50 focus:outline-none focus:border-[#7C3AED] whitespace-pre-wrap leading-relaxed"
                rows={3}
              />
            </div>
          </div>
        )}

        {!isEditing ? (
          q.imageUrl && (
            <div className="mt-2 border border-[#E2D5F8] rounded-xl overflow-hidden bg-white max-w-sm h-40 flex items-center justify-center shadow-2xs">
              <img 
                src={q.imageUrl} 
                alt="Question Reference Diagram" 
                className="w-full h-full object-contain p-2"
                onError={(e) => { e.target.parentElement.style.display = 'none'; }} 
              />
            </div>
          )
        ) : (
          <div className="p-3 bg-white border border-[#E2D5F8] rounded-xl space-y-2 font-mono">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black uppercase text-[#7C6B93] block">Attach or Replace Diagram Image</label>
              {editForm.imagePreview && (
                <button onClick={handleRemoveExistingImage} className="text-[9px] text-rose-600 font-bold uppercase hover:underline cursor-pointer">Remove Image</button>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageFileChange}
              className="text-xs text-slate-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#7C3AED] file:text-white hover:file:bg-[#6D28D9] cursor-pointer"
            />
            {editForm.imagePreview && !editForm.removeImage && (
              <div className="mt-2 h-32 w-48 border border-[#E2D5F8] rounded-lg overflow-hidden bg-white relative">
                <img src={editForm.imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
              </div>
            )}
          </div>
        )}

        {!isEditing ? (
          <div className="text-xs font-bold text-slate-900 leading-relaxed font-sans flex items-start gap-2 pt-1">
            <span className="text-[#7C3AED] font-mono font-black shrink-0">
              {isSubItem ? `Q${unitDisplayNumber}(${q.subLabel || 'a'})` : `Q${unitDisplayNumber}.`}
            </span>
            <div className="w-full">{renderFormattedText(q.text || q.question_text)}</div>
          </div>
        ) : (
          <div className="space-y-1 font-mono">
            <label className="text-[9px] font-black uppercase text-[#7C6B93] block">Edit Question Prompt Text</label>
            <textarea 
              value={editForm.text}
              onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
              className="w-full p-3 border border-[#7C3AED] rounded-xl text-xs font-sans font-bold text-slate-900 bg-white focus:outline-none whitespace-pre-wrap leading-relaxed shadow-2xs"
              rows={3}
            />
          </div>
        )}

        {activeSectorTab === 'objective' && (
          <div className="grid grid-cols-1 gap-2 pt-1 font-mono">
            {q.options?.map((o, oIdx) => {
              const label = typeof o === 'object' ? (o.text || '') : o;
              const isCorrectKey = !isEditing ? o.isCorrect : (editForm.correctIndex === oIdx);

              return !isEditing ? (
                <div 
                  key={oIdx} 
                  className={`text-[11px] p-2.5 rounded-xl border font-bold flex justify-between items-center ${
                    isCorrectKey ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-black' : 'bg-white border-[#E2D5F8] text-slate-700'
                  }`}
                >
                  <span className="flex items-start gap-1.5 w-full">
                    <span className="shrink-0">{String.fromCharCode(65 + oIdx)})</span>
                    <span className="w-full">{renderFormattedText(label)}</span>
                  </span>
                  {isCorrectKey && (
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded shadow-2xs shrink-0 ml-2">
                      ✓ Correct Answer Key
                    </span>
                  )}
                </div>
              ) : (
                <div 
                  key={oIdx} 
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    editForm.correctIndex === oIdx ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' : 'bg-white border-[#E2D5F8]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase text-[#7C6B93]">Option Choice {String.fromCharCode(65 + oIdx)}</label>
                    <label className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`correct_key_${q.id}`} 
                        checked={editForm.correctIndex === oIdx}
                        onChange={() => setEditForm({ ...editForm, correctIndex: oIdx })}
                        className="accent-emerald-600 cursor-pointer"
                      /> Mark as Correct Answer Key
                    </label>
                  </div>
                  <textarea 
                    rows={1}
                    value={editForm.options[oIdx] || ''}
                    onChange={(e) => {
                      const newOpts = [...editForm.options];
                      newOpts[oIdx] = e.target.value;
                      setEditForm({ ...editForm, options: newOpts });
                    }}
                    className="w-full p-2 border border-[#E2D5F8] rounded-lg text-xs font-sans text-slate-900 bg-white focus:outline-none focus:border-[#7C3AED] whitespace-pre-wrap resize-none"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col font-sans text-[#2A1A63] relative overflow-x-hidden">
      
      {/* 📖 PASSAGE EDITOR MODAL */}
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
                onClick={() => setIsPassageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono font-black text-[#7C6B93] uppercase">
                Reading Passage Content & Formatting (Preserves paragraphs, bolding, and spacing):
              </label>

              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 border border-[#E2D5F8] rounded-t-2xl shadow-2xs">
                <button type="button" onClick={() => applyFormatting('bold')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('italic')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('underline')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                <span className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={() => applyFormatting('insertUnorderedList')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Bullet List"><List className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => applyFormatting('removeFormat')} className="p-2 bg-white hover:bg-purple-50 border border-[#E2D5F8] rounded-xl text-slate-800 cursor-pointer shadow-2xs" title="Clear Formatting"><RemoveFormatting className="w-3.5 h-3.5" /></button>
              </div>

              <div 
                ref={editorRef}
                contentEditable={true}
                onInput={(e) => setEditingPassageText(e.currentTarget.innerHTML)}
                className="w-full h-64 p-4 bg-slate-50 border border-t-0 border-[#E2D5F8] rounded-b-2xl text-xs sm:text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 overflow-y-auto leading-relaxed whitespace-pre-wrap"
                style={{ minHeight: '220px' }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2D5F8]">
              <button 
                onClick={() => setIsPassageModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-black uppercase rounded-xl cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePassageModal}
                disabled={isSavingPassage}
                className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPassage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save & Persist Passage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BANNER */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-3.5 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleBackNavigation} 
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1" 
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">MODERATION & VETTING DESK</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Principal Oversight & Quality Terminal</p>
          </div>
        </div>
        <span className="px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-black rounded-xl uppercase tracking-widest font-mono shadow-2xs">
          {pendingReviews.length} Papers Pending Vetting
        </span>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-6 h-[calc(100vh-85px)]">
        
        {/* SIDEBAR NAVIGATION QUEUE LIST */}
        <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto space-y-3 pr-1">
          <div className="px-1 pb-1 flex justify-between items-center font-mono">
            <span className="text-[10px] font-black text-[#7C6B93] uppercase tracking-wider">Pending Papers Queue</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="p-6 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans">Moderation Queue Clear</p>
              <p className="text-[10px] text-[#7C6B93] font-mono uppercase">All submitted assessment papers have been vetted.</p>
            </div>
          ) : (
            pendingReviews.map((paper) => {
              const isActive = paper.id === activeReviewId;
              return (
                <div
                  key={paper.id}
                  onClick={() => { setActiveReviewId(paper.id); setRejectionFeedback(''); setEditingQuestionId(null); }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs text-left space-y-2 ${
                    isActive ? 'bg-white border-[#7C3AED] ring-2 ring-[#7C3AED]/20 shadow-md' : 'bg-[#F3EEFC] border-[#E2D5F8] hover:border-[#7C3AED]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black uppercase text-slate-900 truncate font-sans">{paper.subject}</h4>
                    <span className="text-[9px] font-mono font-black bg-purple-50 border border-purple-200 text-[#7C3AED] px-2 py-0.5 rounded-lg shrink-0">
                      {formatDisplayDuration(paper.duration_minutes || paper.duration)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[10px] text-[#7C6B93] font-mono font-bold uppercase border-t border-[#E2D5F8]/50 pt-2">
                    <div className="flex items-center gap-1 text-slate-700">
                      <GraduationCap className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Cohort: <strong className="text-slate-950 font-sans">{paper.classGroup}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700">
                      <User className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Teacher: <strong className="text-slate-950 font-sans">{paper.teacher || 'Subject Teacher'}</strong></span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <span className="text-[8px] font-mono font-black bg-white text-[#7C3AED] border border-[#E2D5F8] px-2 py-0.5 rounded uppercase">
                      {paper.category || paper.type || 'EXAM ASSESSMENT'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MAIN VETTING CANVAS */}
        <div className="col-span-12 lg:col-span-9 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 shadow-xs flex flex-col h-full overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
              Opening examination paper vetting repository files...
            </div>
          ) : currentPaper ? (
            <>
              {/* TOP SUMMARY HEADER & TAB NAVIGATION */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b border-[#E2D5F8]/60 gap-3">
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm md:text-base font-black uppercase text-slate-900 font-sans">{currentPaper.subject}</h2>
                    
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 border border-purple-300 text-[#7C3AED] text-[10px] font-mono font-black rounded-lg uppercase">
                      <Layers className="w-3 h-3" /> {currentPaper.category || currentPaper.type || 'EXAM ASSESSMENT'}
                    </span>

                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-[#E2D5F8] text-[#7C3AED] text-[10px] font-mono font-black rounded-lg shadow-2xs">
                      <Clock className="w-3 h-3" /> 
                      <span>Duration: {formatDisplayDuration(currentPaper.duration_minutes || currentPaper.duration)}</span>
                      <button 
                        onClick={() => {
                          setNewDurationMins(currentPaper.duration_minutes || currentPaper.duration || 30);
                          setIsDurationModalOpen(true);
                        }}
                        className="ml-1 w-4 h-4 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded flex items-center justify-center cursor-pointer transition-all"
                        title="Edit Examination Duration"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] font-medium text-[#7C6B93] font-mono uppercase">
                    Subject Teacher: <span className="text-slate-950 font-bold font-sans">{currentPaper.teacher || 'Assigned Instructor'}</span> &bull; Student Cohort: <span className="text-slate-950 font-bold font-sans">{currentPaper.classGroup}</span>
                  </p>
                </div>

                <div className="flex bg-white border border-[#E2D5F8] p-1 rounded-xl shadow-2xs font-mono shrink-0">
                  <button 
                    onClick={() => { setActiveSectorTab('objective'); setEditingQuestionId(null); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                      activeSectorTab === 'objective' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'
                    }`}
                  >
                    Section A: Objectives ({totalObjectivePoints} Marks)
                  </button>
                  <button 
                    onClick={() => { setActiveSectorTab('theory'); setEditingQuestionId(null); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                      activeSectorTab === 'theory' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'
                    }`}
                  >
                    Section B: Theory & Essay ({totalTheoryPoints} Marks)
                  </button>
                </div>
              </div>

              {/* OVERALL PAPER GENERAL INSTRUCTIONS BANNER */}
              <div className="p-3.5 bg-purple-100/70 border border-purple-200 rounded-2xl mb-4 text-left font-sans shadow-2xs">
                <span className="font-mono text-[9px] font-black text-[#7C3AED] uppercase tracking-wider block mb-1">
                  {activeSectorTab === 'objective' ? 'Section A General Instructions:' : 'Section B General Instructions:'}
                </span>
                <div className="text-xs font-bold text-slate-900 leading-relaxed">
                  {renderFormattedText(
                    activeSectorTab === 'objective'
                      ? (currentPaper.objectiveInstructions || currentPaper.objective_instructions)
                      : (currentPaper.theoryInstructions || currentPaper.theory_instructions)
                  )}
                </div>
              </div>

              {/* QUESTIONS CANVAS — GROUPED BY SECTIONS, PASSAGES & SUB-ITEMS */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 text-left">
                {currentSectionGroups.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[#7C6B93] font-bold uppercase bg-white border border-dashed border-[#E2D5F8] rounded-3xl py-20 shadow-2xs">
                    No test questions compiled in this section.
                  </div>
                ) : (
                  currentSectionGroups.map((secGroup, gIdx) => (
                    <div key={gIdx} className="bg-white border border-[#E2D5F8] rounded-2xl p-5 shadow-2xs space-y-4">
                      
                      {/* Section Title Header & Directions */}
                      <div className="border-b border-[#E2D5F8] pb-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-[#7C3AED] text-white rounded-xl text-[10px] font-mono font-black uppercase tracking-wider">
                            {secGroup.sectionTitle}
                          </span>
                          <button
                            onClick={() => handleOpenPassageModal(secGroup)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-[#E2D5F8] text-[#7C3AED] rounded-lg text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <BookOpen className="w-3 h-3" /> {secGroup.passageText ? 'Edit Passage Context' : '+ Attach Passage Context'}
                          </button>
                        </div>

                        {/* SECTION INSTRUCTIONS BOX */}
                        {secGroup.sectionInstructions && (
                          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1">
                            <span className="font-mono text-[9px] font-black text-[#7C3AED] uppercase block tracking-wider">Section Instructions:</span>
                            <div className="text-xs font-bold text-slate-800 font-sans leading-relaxed">{renderFormattedText(secGroup.sectionInstructions)}</div>
                          </div>
                        )}

                        {/* SHARED READING PASSAGE CONTEXT BOX */}
                        {secGroup.passageText && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-sans shadow-2xs relative space-y-1.5">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5 font-mono text-[9px] font-black text-[#7C3AED] uppercase tracking-wider">
                                <BookOpen className="w-3.5 h-3.5" /> Shared Reading Passage Context
                              </div>
                              <button 
                                onClick={() => handleOpenPassageModal(secGroup)} 
                                className="text-[9px] font-mono font-bold text-[#7C3AED] hover:underline uppercase flex items-center gap-0.5"
                              >
                                <Edit3 className="w-2.5 h-2.5" /> Edit Passage
                              </button>
                            </div>
                            <div className="leading-relaxed border-t border-slate-200/60 pt-2">
                              {renderFormattedText(secGroup.passageText)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section Question Units */}
                      <div className="space-y-4">
                        {secGroup.units.map((unit, uIdx) => {
                          if (unit.isGroup) {
                            return (
                              <div key={uIdx} className="p-4 bg-[#FAF9FA] border border-[#D8B4FE] rounded-2xl space-y-3 shadow-2xs">
                                <div className="flex justify-between items-center font-mono text-[10px] font-black text-[#7C3AED] uppercase border-b border-purple-100 pb-2">
                                  <span>Q{unit.displayNumber}. Grouped Sub-Questions</span>
                                  <span className="bg-purple-100 text-[#7C3AED] px-2.5 py-0.5 rounded-lg font-black">{unit.totalScore} Marks Total</span>
                                </div>
                                <div className="space-y-3 pl-1">
                                  {unit.subItems.map((subQ) => renderQuestionCard(subQ, unit.displayNumber, true))}
                                </div>
                              </div>
                            );
                          }

                          return renderQuestionCard(unit.item, unit.displayNumber, false);
                        })}
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* MODERATION REASON / CORRECTION NOTES & ACTION BUTTONS */}
              <div className="pt-4 border-t border-[#E2D5F8]/60 text-left font-mono shrink-0">
                <label className="text-[10px] font-black uppercase text-[#7C6B93] mb-1.5 block">
                  Moderation Correction Notes {modalConfig.type === 'reject' && <span className="text-rose-600 font-bold">*Required for Return</span>}
                </label>
                <textarea 
                  value={rejectionFeedback} 
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  placeholder="Need corrections or adjustments? Type detailed feedback notes here for the teacher..." 
                  className={`w-full h-20 p-3 bg-white rounded-2xl text-xs mb-3 border font-sans text-slate-900 font-bold focus:outline-none shadow-2xs resize-none ${
                    !rejectionFeedback.trim() && modalConfig.type === 'reject' ? 'border-rose-400 ring-1 ring-rose-200' : 'border-[#E2D5F8]'
                  }`}
                />
                <div className="flex justify-end gap-2.5">
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'reject' })} 
                    className="px-4 py-2.5 text-[10px] font-black uppercase text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer shadow-2xs transition-all active:scale-[0.97]"
                  >
                    Request Adjustments
                  </button>
                  <button 
                    onClick={() => setModalConfig({ isOpen: true, type: 'approve' })} 
                    className="px-5 py-2.5 text-[10px] font-black uppercase text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.97]"
                  >
                    Approve Examination Paper
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center font-mono py-20 bg-white/60 rounded-3xl my-auto">
              <FileText className="w-10 h-10 text-[#7C6B93] mb-2" />
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans">NO PENDING VETTING PAPERS CURRENTLY IN MODERATION QUEUE.</p>
            </div>
          )}
        </div>
      </main>

      {/* EDIT DURATION MODAL */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[60000] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden font-sans text-left p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2D5F8] pb-3 font-mono">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-900">Edit Examination Time Window</h3>
              <button onClick={() => setIsDurationModalOpen(false)} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 font-mono">
              <label className="text-[10px] font-black uppercase text-[#7C6B93] block">Duration (Minutes)</label>
              <input 
                type="number"
                min="5"
                max="360"
                value={newDurationMins}
                onChange={(e) => setNewDurationMins(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2D5F8] text-slate-900 font-bold rounded-xl focus:outline-none shadow-2xs text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button onClick={() => setIsDurationModalOpen(false)} className="px-4 py-2 bg-white border border-[#E2D5F8] text-xs font-black uppercase rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button disabled={isSavingDuration} onClick={handleSaveDurationUpdate} className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all">
                {isSavingDuration && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Time Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[60000] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-mono text-xs uppercase border border-slate-800 animate-slideUp">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="font-bold tracking-wider">{toastMessage}</span>
        </div>
      )}

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'approve' ? "Approve Examination Paper" : "Request Paper Adjustments"}
        message={
          modalConfig.type === 'approve' 
            ? `Are you sure you want to approve "${currentPaper?.subject}"? Approved papers can be published to students for exams.` 
            : `Are you sure you want to return "${currentPaper?.subject}" to the teacher for revisions?`
        }
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
      />

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[70000] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-2xl max-w-xs text-left font-mono space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="text-xs font-black uppercase font-sans">{errorModal.title}</h4>
            </div>
            <p className="text-[11px] text-slate-600 font-bold uppercase">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ isOpen: false })} className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-black uppercase rounded-xl cursor-pointer shadow-md transition-all">Dismiss</button>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-[#7C6B93]/20 bg-white py-2.5 text-center text-[10px] font-black text-[#7C6B93] tracking-wider font-mono uppercase px-4 shrink-0">
        Start-rite internet institutional security matrix
      </footer>

    </div>
  );
}