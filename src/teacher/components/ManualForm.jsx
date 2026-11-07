import React, { useState } from 'react';
import { Sliders, Image as ImageIcon, Plus, Trash2, BookOpen, Sparkles, ChevronDown, ChevronUp, Settings2, Check } from 'lucide-react';

export default function ManualForm({
  activeSectionTab,
  questionScore,
  setQuestionScore,
  manualImageFile,
  onImageDrop,
  questionText,
  setQuestionText,
  options,
  setOptions,
  parentNumber,
  setParentNumber,
  subLabel,
  setSubLabel,
  sectionTitle,
  setSectionTitle,
  sectionInstructions,
  setSectionInstructions,
  passageText,
  setPassageText,
  availableSections = [],
  onAddOption,
  onRemoveOption,
  onCommitChanges,
  onOpenPassageModal
}) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);

  return (
    <section className="bg-white border border-[#E2D5F8] rounded-3xl p-5 flex flex-col justify-between shadow-xs h-[650px] overflow-y-auto text-left font-sans">
      <div className="space-y-4">
        {/* HEADER BAR */}
        <div className="flex justify-between items-center border-b border-[#E2D5F8]/60 pb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Clean Item Creator
          </span>
          <span className="text-[9px] font-mono bg-purple-50 border border-purple-200 text-[#7C3AED] px-2 py-0.5 rounded font-black uppercase">
            {activeSectionTab} Mode
          </span>
        </div>

        {/* 🚀 SECTION SELECTOR & PARENT BINDING */}
        <div className="bg-[#FAF9FA] border border-[#E2D5F8] rounded-2xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full p-3 bg-purple-50/40 hover:bg-purple-50 flex items-center justify-between text-slate-700 font-mono text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all"
          >
            <span className="flex items-center gap-1.5 text-[#7C3AED]">
              <Settings2 className="w-3.5 h-3.5" />
              {sectionTitle ? `Section: ${sectionTitle}` : 'Select Section & Sub-Question Link'}
            </span>
            {showAdvancedSettings ? <ChevronUp className="w-4 h-4 text-[#7C3AED]" /> : <ChevronDown className="w-4 h-4 text-[#7C3AED]" />}
          </button>

          {showAdvancedSettings && (
            <div className="p-3 space-y-3 border-t border-[#E2D5F8] bg-white animate-fadeIn">
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[8px] font-black text-slate-500 uppercase font-mono">Assign to Section</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsCreatingNewSection(!isCreatingNewSection); setSectionTitle(''); }}
                    className="text-[9px] font-mono text-[#7C3AED] font-bold hover:underline cursor-pointer"
                  >
                    {isCreatingNewSection ? '← Pick Existing' : '+ New Section'}
                  </button>
                </div>

                {!isCreatingNewSection ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableSections.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-mono italic">No sections created yet. Click "+ New Section"</span>
                    )}
                    {availableSections.map((sec, idx) => {
                      const isSelected = sectionTitle === sec;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSectionTitle(sec)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#7C3AED] text-white shadow-xs' 
                              : 'bg-purple-50/60 border border-purple-100 text-slate-700 hover:bg-purple-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {sec}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={sectionTitle} 
                      onChange={(e) => setSectionTitle(e.target.value)} 
                      placeholder="Type new section title (e.g. Section B)..." 
                      className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED]" 
                    />
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 font-mono">Section Instructions (Optional)</label>
                      <input 
                        type="text" 
                        value={sectionInstructions} 
                        onChange={(e) => setSectionInstructions(e.target.value)} 
                        placeholder="e.g. Answer all questions in this section" 
                        className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED]" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 font-mono">Parent No. (e.g. 3)</label>
                  <input 
                    type="text" 
                    value={parentNumber} 
                    onChange={(e) => setParentNumber(e.target.value)} 
                    placeholder="Leave blank if main item" 
                    className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] font-mono" 
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 font-mono">Sub-Label</label>
                  <input 
                    type="text" 
                    value={subLabel} 
                    onChange={(e) => setSubLabel(e.target.value.toLowerCase())} 
                    placeholder="e.g. a" 
                    className="w-full px-2.5 py-1.5 bg-[#FAF9FA] border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] font-mono text-center uppercase" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 📖 READING PASSAGE TOGGLE BUTTON (Connected to Modal) */}
        <div>
          <button
            type="button"
            onClick={onOpenPassageModal}
            className="text-[10px] font-mono font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer pt-0.5"
          >
            <BookOpen className="w-3 h-3" /> {passageText ? 'Edit Reading Passage Context' : '+ Attach Reading Passage Context'}
          </button>
        </div>

        {/* ⚖️ SCORE & DIAGRAM ATTACHMENT */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Question Score</label>
            <input 
              type="number" 
              step="0.5"
              value={questionScore} 
              onChange={(e) => setQuestionScore(e.target.value)} 
              className="w-full px-3.5 py-2.5 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs font-mono text-center" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Attach Diagram</label>
            <label className="w-full px-3 py-2.5 bg-white border border-[#E2D5F8] hover:border-[#7C3AED] text-slate-700 text-[11px] font-bold uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all relative">
              <input type="file" accept="image/*" onChange={onImageDrop} className="absolute inset-0 opacity-0 cursor-pointer" />
              <ImageIcon className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span className="text-[10px] font-black text-slate-700 truncate max-w-[120px] uppercase font-mono">
                {manualImageFile ? manualImageFile.name : 'Choose Image'}
              </span>
            </label>
          </div>
        </div>

        {/* 📝 QUESTION PROMPT */}
        <div>
          <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
            <span>Question Prompt Text</span>
            {parentNumber && (
              <span className="text-[9px] font-mono text-[#7C3AED] font-black uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Bound to Q{parentNumber}({subLabel || 'a'})
              </span>
            )}
          </label>
          <textarea 
            rows={4} 
            value={questionText} 
            onChange={(e) => setQuestionText(e.target.value)} 
            placeholder="Type question prompt text here... (Paragraph breaks and spacing are preserved)" 
            className="w-full p-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs resize-none font-sans whitespace-pre-wrap leading-relaxed" 
          />
        </div>

        {/* 🎯 OBJECTIVE OPTIONS OR THEORY */}
        {activeSectionTab === 'objective' ? (
          <div className="space-y-2.5 pt-1">
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider font-mono">Answer Variants Options</label>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {options.map((option, idx) => (
                <div key={idx} className={`flex gap-2 items-center p-2 border rounded-xl transition-all shadow-2xs ${option.isCorrect ? 'bg-[#F3EEFC] border-[#7C3AED]' : 'bg-white border-[#E2D5F8]'}`}>
                  <button 
                    type="button"
                    onClick={() => setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })))} 
                    className={`w-4 h-4 border rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${option.isCorrect ? 'border-[#7C3AED] bg-[#7C3AED] text-white' : 'border-slate-300 bg-white'}`}
                  >
                    {option.isCorrect && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>
                  <textarea 
                    rows={1}
                    value={option.text} 
                    onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))} 
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`} 
                    className="flex-1 px-2 py-1 bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-sans whitespace-pre-wrap resize-none" 
                  />
                  <button type="button" disabled={options.length <= 2} onClick={() => onRemoveOption(idx)} className="text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" disabled={options.length >= 5} onClick={onAddOption} className="w-full py-2 border border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] text-[#7C3AED] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs font-mono">
              <Plus className="w-3.5 h-3.5" /> Add Choice Option ({options.length}/5)
            </button>
          </div>
        ) : (
          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-center">
            <p className="text-[10px] font-mono text-[#7C3AED] font-bold">Theory items configured without multiple-choice options.</p>
          </div>
        )}
      </div>

      {/* FOOTER COMMIT BUTTON */}
      <div className="pt-3 border-t border-[#E2D5F8]/60 flex justify-end mt-4">
        <button 
          type="button"
          onClick={onCommitChanges} 
          disabled={!questionText.trim()}
          className="w-full py-3.5 bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 font-mono"
        >
          <Sparkles className="w-4 h-4" /> COMMIT QUESTION ENTRY
        </button>
      </div>
    </section>
  );
}