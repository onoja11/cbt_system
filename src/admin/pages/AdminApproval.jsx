import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Clock, ClipboardList, Check, Loader2, Edit3, Save, X, Image as ImageIcon, CheckCircle2, Layers } from 'lucide-react';
import { apiRequest, BASE_URL } from '../../core/api';
import ConfirmationModal from '../../shared/ConfirmationModal';
import Logo from '../../shared/Logo';
import SafeMathText from '../../shared/SafeMathText';

export default function AdminApproval({ onNavigateBack }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [activeSectorTab, setActiveSectorTab] = useState('obj'); 
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [toastMessage, setToastMessage] = useState(null);

  // 📝 Inline Question Editing States
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', options: [], rubric: '', correctIndex: 0, imageFile: null, imagePreview: null, removeImage: false });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // ⏱️ Edit Duration Modal State
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [newDurationMins, setNewDurationMins] = useState(30);
  const [isSavingDuration, setIsSavingDuration] = useState(false);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  const fetchVettingQueue = useCallback(async () => {
    try {
      const res = await apiRequest('api/v1/admin/vetting/pending-papers', { method: 'GET' });
      const resData = await res.json();
      if (res.ok && resData.papers) {
        const normalizedPapers = resData.papers.map(paper => ({
          ...paper,
          objectivesList: (paper.objectivesList || []).map(q => {
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

            return { 
              ...q, 
              imageUrl: img, 
              options: normalizedOpts,
              correctIndex: correctOptIdx,
              correct_option_index: correctOptIdx
            };
          }),
          theoriesList: (paper.theoriesList || []).map(q => {
            let img = q.imageUrl || q.image_url;
            if (img && !img.startsWith('http')) {
              const cleanPath = img.startsWith('/') ? img.slice(1) : img;
              img = `${BASE_URL}/${cleanPath}`;
            }
            return { ...q, imageUrl: img };
          })
        }));

        setPendingReviews(normalizedPapers);
        setActiveReviewId(prev => {
          const found = normalizedPapers.find(p => p.id === prev);
          return found ? prev : (normalizedPapers.length > 0 ? normalizedPapers[0].id : null);
        });
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchVettingQueue(); 
  }, [fetchVettingQueue]);

  const currentPaper = useMemo(() => {
    return pendingReviews.find(p => p.id === activeReviewId) || null;
  }, [pendingReviews, activeReviewId]);

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
      rubric: q.rubricSchema || q.rubric || q.theory_rubric || '',
      correctIndex: correctIdx,
      imageFile: null,
      imagePreview: q.imageUrl || null,
      removeImage: false
    });
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
      const payloadType = activeSectorTab === 'obj' ? 'Objective' : 'Theory';

      const formData = new FormData();
      formData.append('type', payloadType);
      formData.append('question_text', String(editForm.text || ''));
      formData.append('points_weight', '2');
      formData.append('options', JSON.stringify(editForm.options));
      formData.append('correct_option_index', String(editForm.correctIndex));
      formData.append('theory_rubric', String(editForm.rubric || ''));
      formData.append('remove_existing_image', editForm.removeImage ? 'true' : 'false');

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
        showToast("Question and answers updated successfully.");
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
        showToast(`Successfully approved ${currentPaper.subject} assessment paper.`);
      }
    } catch {
      // Handled silently
    }
  };

  const handleExecuteRejection = async () => {
    if (!currentPaper) return;
    
    if (!rejectionFeedback.trim()) {
      setErrorModal({ 
        isOpen: true, 
        title: 'Feedback Required', 
        message: 'You must provide a reason/note for the teacher before rejecting this paper.' 
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
        showToast(`Successfully requested adjustments for ${currentPaper.subject}.`);
      }
    } catch {
      // Handled silently
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

  return (
    <div className="min-h-screen bg-[#F7F5FC] flex flex-col font-sans text-[#2A1A63] relative">
      
      {/* Header Banner */}
      <header className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-white p-1.5 rounded-full shadow-xs flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-wider text-white">Moderation Desk</h1>
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-0.5">Principal Oversight Panel</p>
          </div>
        </div>
        <span className="px-3.5 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-black rounded-xl uppercase tracking-widest font-mono shadow-2xs">
          {pendingReviews.length} Papers Pending
        </span>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 grid grid-cols-12 gap-6 h-[calc(100vh-85px)]">
        
        {/* SIDEBAR NAVIGATION LIST */}
        <div className="col-span-3 h-full overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="p-6 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl text-center space-y-2 shadow-xs">
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans">Queue Clear</p>
              <p className="text-[11px] text-[#7C6B93] font-mono uppercase">All submissions have been successfully moderated.</p>
            </div>
          ) : (
            pendingReviews.map((paper) => (
              <div
                key={paper.id}
                onClick={() => { setActiveReviewId(paper.id); setRejectionFeedback(''); setEditingQuestionId(null); }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs text-left ${
                  paper.id === activeReviewId ? 'bg-white border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'bg-[#F3EEFC] border-[#E2D5F8] hover:border-[#7C3AED]'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="text-xs font-black uppercase text-slate-900 truncate font-sans">{paper.subject}</h4>
                  <span className="text-[9px] font-mono font-black bg-white border border-[#E2D5F8] text-[#7C3AED] px-2 py-0.5 rounded-lg shadow-2xs">
                    {formatDisplayDuration(paper.duration_minutes || paper.duration)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-[#7C6B93] font-mono uppercase font-bold">{paper.classGroup}</p>
                  <span className="text-[9px] font-mono font-black bg-purple-50 text-[#7C3AED] border border-purple-200 px-2 py-0.5 rounded-md uppercase">
                    {paper.category || paper.type || 'EXAM'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MAIN VETTING CANVAS */}
        <div className="col-span-9 bg-[#F3EEFC] border border-[#E2D5F8] rounded-3xl p-6 shadow-xs flex flex-col h-full overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex flex-col justify-center items-center font-mono text-xs uppercase text-[#7C6B93] tracking-widest gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
              Opening question paper vetting repository files...
            </div>
          ) : currentPaper ? (
            <>
              {/* HEADER WITH TIME DURATION & CATEGORY BADGE */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#E2D5F8]/60">
                <div className="text-left">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-sm md:text-base font-black uppercase text-slate-900 font-sans">{currentPaper.subject}</h2>
                    
                    {/* CATEGORY BADGE */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-300 text-[#7C3AED] text-[11px] font-mono font-black rounded-xl shadow-2xs uppercase">
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      Category: {currentPaper.category || currentPaper.type || 'EXAM'}
                    </span>

                    {/* DURATION BADGE WITH EDIT BUTTON */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E2D5F8] text-[#7C3AED] text-[11px] font-mono font-black rounded-xl shadow-2xs">
                      <Clock className="w-3.5 h-3.5" /> 
                      <span>Duration: {formatDisplayDuration(currentPaper.duration_minutes || currentPaper.duration)}</span>
                      <button 
                        onClick={() => {
                          setNewDurationMins(currentPaper.duration_minutes || currentPaper.duration || 30);
                          setIsDurationModalOpen(true);
                        }}
                        className="ml-1.5 w-5 h-5 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-md flex items-center justify-center cursor-pointer transition-all"
                        title="Edit Duration"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-[#7C6B93] font-mono uppercase mt-1">
                    Instructor: <span className="text-slate-900 font-bold font-sans">{currentPaper.teacher}</span> • Cohort: <span className="text-slate-900 font-bold font-sans">{currentPaper.classGroup}</span>
                  </p>
                </div>
                <div className="flex bg-white border border-[#E2D5F8] p-1 rounded-xl shadow-2xs font-mono shrink-0">
                  <button onClick={() => { setActiveSectorTab('obj'); setEditingQuestionId(null); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${activeSectorTab === 'obj' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'}`}>Objectives</button>
                  <button onClick={() => { setActiveSectorTab('theory'); setEditingQuestionId(null); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${activeSectorTab === 'theory' ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#7C6B93] hover:text-slate-900'}`}>Theory</button>
                </div>
              </div>

              {/* SECTION INSTRUCTIONS BANNER */}
              <div className="mb-4 p-4 bg-white border border-[#E2D5F8] rounded-2xl text-left flex items-start gap-3 shadow-2xs">
                <ClipboardList className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                <div className="space-y-0.5 font-mono">
                  <span className="text-[9px] font-black text-[#7C6B93] uppercase tracking-wider block">
                    {activeSectorTab === 'obj' ? 'Section A Instructions (Objectives):' : 'Section B Instructions (Theory):'}
                  </span>
                  <p className="text-xs font-sans font-bold text-slate-900 uppercase">
                    {activeSectorTab === 'obj' 
                      ? (currentPaper.objective_instructions || 'Answer all multiple-choice questions in this section.') 
                      : (currentPaper.theory_instructions || 'Answer all questions out of this section comprehensively.')}
                  </p>
                </div>
              </div>

              {/* QUESTIONS VIEWER & EDITOR */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 text-left">
                {(activeSectorTab === 'obj' ? (currentPaper.objectivesList || []) : (currentPaper.theoriesList || [])).map((q, i) => {
                  const isEditing = editingQuestionId === q.id;

                  return (
                    <div key={q.id || i} className="border border-[#E2D5F8] p-4 rounded-2xl bg-white shadow-2xs relative group">
                      
                      {/* Action Header */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono font-black text-[#7C3AED]">Question Slot {i + 1}</span>
                        {!isEditing ? (
                          <button 
                            onClick={() => handleStartEditingQuestion(q)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-200 rounded-lg text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Edit3 className="w-3 h-3" /> Edit Question & Correct Key
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono">
                            <button 
                              disabled={isSavingQuestion}
                              onClick={() => handleSaveEditedQuestion(q.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            >
                              {isSavingQuestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                            </button>
                            <button 
                              onClick={() => setEditingQuestionId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Question Image Attachment Preview or File Uploader */}
                      {!isEditing ? (
                        q.imageUrl && (
                          <div className="mb-3 border border-[#E2D5F8] rounded-xl overflow-hidden bg-white max-w-sm h-48 flex items-center justify-center shadow-2xs">
                            <img 
                              src={q.imageUrl} 
                              alt="Question Reference Attachment" 
                              className="w-full h-full object-contain p-1.5"
                              onError={(e) => { e.target.parentElement.style.display = 'none'; }} 
                            />
                          </div>
                        )
                      ) : (
                        <div className="mb-3 p-3 bg-purple-50/40 border border-[#E2D5F8] rounded-xl space-y-2 font-mono">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black uppercase text-[#7C6B93] block">Attach or Replace Question Image</label>
                            {editForm.imagePreview && (
                              <button onClick={handleRemoveExistingImage} className="text-[9px] text-rose-600 font-bold uppercase hover:underline cursor-pointer">Remove Image</button>
                            )}
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#7C3AED] file:text-white hover:file:bg-[#6D28D9] cursor-pointer"
                          />
                          {editForm.imagePreview && !editForm.removeImage && (
                            <div className="mt-2 h-32 w-48 border rounded-lg overflow-hidden bg-white relative">
                              <img src={editForm.imagePreview} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Question Text Display or Editor */}
                      {!isEditing ? (
                        <p className="text-xs font-bold text-slate-900 mb-3 font-sans"><SafeMathText text={q.text || q.question_text} /></p>
                      ) : (
                        <div className="mb-3 space-y-1 font-mono">
                          <label className="text-[9px] font-black uppercase text-[#7C6B93] block">Edit Question Prompt</label>
                          <textarea 
                            value={editForm.text}
                            onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                            className="w-full p-2.5 border border-[#7C3AED] rounded-xl text-xs font-sans font-bold text-slate-900 bg-purple-50/30 focus:outline-none"
                            rows={2}
                          />
                        </div>
                      )}

                      {activeSectorTab === 'obj' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                          {q.options?.map((o, oIdx) => {
                            const label = typeof o === 'object' ? (o.text || '') : o;
                            const isCorrectKey = !isEditing ? o.isCorrect : (editForm.correctIndex === oIdx);

                            return !isEditing ? (
                              <div key={oIdx} className={`text-[10px] p-2.5 rounded-xl border font-bold flex justify-between items-center ${isCorrectKey ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-black' : 'bg-[#FAF9FA] border-[#E2D5F8] text-slate-700'}`}>
                                <span>{String.fromCharCode(65 + oIdx)}) <SafeMathText text={label} /></span>
                                {isCorrectKey && <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shadow-2xs">✓ Correct Option Key</span>}
                              </div>
                            ) : (
                              <div key={oIdx} className={`p-2.5 rounded-xl border space-y-1.5 ${editForm.correctIndex === oIdx ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' : 'bg-white border-[#E2D5F8]'}`}>
                                <div className="flex justify-between items-center">
                                  <label className="text-[8px] font-black uppercase text-[#7C6B93]">Option {String.fromCharCode(65 + oIdx)}</label>
                                  <label className="text-[9px] font-black uppercase text-emerald-700 flex items-center gap-1 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`correct_key_${q.id}`} 
                                      checked={editForm.correctIndex === oIdx}
                                      onChange={() => setEditForm({ ...editForm, correctIndex: oIdx })}
                                      className="accent-emerald-600 cursor-pointer"
                                    /> Mark as Correct
                                  </label>
                                </div>
                                <input 
                                  type="text"
                                  value={editForm.options[oIdx] || ''}
                                  onChange={(e) => {
                                    const newOpts = [...editForm.options];
                                    newOpts[oIdx] = e.target.value;
                                    setEditForm({ ...editForm, options: newOpts });
                                  }}
                                  className="w-full p-2 border border-[#E2D5F8] rounded-lg text-xs font-sans text-slate-900 bg-white focus:outline-none focus:border-[#7C3AED]"
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#7C6B93] bg-[#FAF9FA] p-3 rounded-xl border border-[#E2D5F8] font-mono">
                          {!isEditing ? (
                            <>
                              <span className="block font-black uppercase mb-1 text-slate-900">Rubric:</span> {q.rubricSchema || q.rubric}
                            </>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-[#7C6B93] block">Edit Theory Rubric</label>
                              <textarea 
                                value={editForm.rubric}
                                onChange={(e) => setEditForm({ ...editForm, rubric: e.target.value })}
                                className="w-full p-2.5 border border-[#7C3AED] rounded-xl text-xs font-sans font-bold text-slate-900 bg-white focus:outline-none"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* FEEDBACK & APPROVAL CONTROLS */}
              <div className="pt-4 border-t border-[#E2D5F8]/60 text-left font-mono">
                <label className="text-[10px] font-black uppercase text-[#7C6B93] mb-1.5 block">
                  Correction Notes {modalConfig.type === 'reject' && <span className="text-rose-600">*Required</span>}
                </label>
                <textarea 
                  value={rejectionFeedback} 
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  placeholder="Need changes? Leave your correction notes here..." 
                  className={`w-full h-20 p-3 bg-white rounded-2xl text-xs mb-3 border font-sans text-slate-900 font-bold focus:outline-none shadow-2xs ${!rejectionFeedback.trim() && modalConfig.type === 'reject' ? 'border-rose-300' : 'border-[#E2D5F8]'}`}
                />
                <div className="flex justify-end gap-2.5">
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'reject' })} className="px-4 py-2.5 text-[10px] font-black uppercase text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer shadow-2xs transition-all active:scale-[0.97]">Request Adjustments</button>
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'approve' })} className="px-5 py-2.5 text-[10px] font-black uppercase text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.97]">Approve Paper</button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-center font-mono py-20 bg-white/60 rounded-2xl my-auto">
              <p className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans mt-2">NO PENDING VETTING SLIPS CURRENTLY FOUND IN MODERATION QUEUE.</p>
            </div>
          )}
        </div>
      </main>

      {/* EDIT DURATION MODAL */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[60000] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2D5F8] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden font-sans text-left p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2D5F8] pb-3 font-mono">
              <h3 className="text-xs font-black uppercase tracking-tight text-slate-900">Edit Examination Duration</h3>
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
                {isSavingDuration && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Duration
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
        title={modalConfig.type === 'approve' ? "Approve Paper" : "Reject Paper"}
        message={modalConfig.type === 'approve' ? "Grant final clearance?" : "Return to teacher with notes?"}
        onConfirm={modalConfig.type === 'approve' ? handleExecuteApproval : handleExecuteRejection}
        onCancel={() => setModalConfig({ isOpen: false, type: null })}
      />

      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-2xl max-w-xs text-left font-mono">
            <h4 className="text-xs font-black uppercase text-rose-600 mb-2 font-sans">{errorModal.title}</h4>
            <p className="text-[11px] text-slate-600 mb-4 font-bold uppercase">{errorModal.message}</p>
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