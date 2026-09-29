import React from 'react';
import { Sliders, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

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
  theoryRubric,
  setTheoryRubric,
  onAddOption,
  onRemoveOption,
  onCommitChanges
}) {
  return (
    <section className="bg-white border border-[#E2D5F8] rounded-3xl p-5 flex flex-col justify-between shadow-2xs h-[560px] overflow-y-auto text-left">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-[#E2D5F8]/60 pb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Item Parameter Editor
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Question Score</label>
            <input type="number" value={questionScore} onChange={(e) => setQuestionScore(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs font-mono text-center" />
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

        <div>
          <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Question Prompt Text</label>
          <textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Type question prompt text..." className="w-full p-3 bg-white border border-[#E2D5F8] text-xs font-bold text-slate-900 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs resize-none font-sans" />
        </div>

        {activeSectionTab === 'objective' ? (
          <div className="space-y-2.5">
            <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider font-mono">Answer Variants Options</label>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {options.map((option, idx) => (
                <div key={idx} className={`flex gap-2 items-center p-2 border rounded-xl transition-all shadow-2xs ${option.isCorrect ? 'bg-[#F3EEFC] border-[#7C3AED]' : 'bg-white border-[#E2D5F8]'}`}>
                  <button 
                    type="button"
                    onClick={() => setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })))} 
                    className={`w-4 h-4 border rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${option.isCorrect ? 'border-[#7C3AED] bg-[#7C3AED] text-white' : 'border-slate-300 bg-white'}`}
                  >
                    {option.isCorrect && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>
                  <input type="text" value={option.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="flex-1 px-2 py-1 bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-sans" />
                  <button type="button" disabled={options.length <= 2} onClick={() => onRemoveOption(idx)} className="text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button type="button" disabled={options.length >= 5} onClick={onAddOption} className="w-full py-2 border border-dashed border-[#7C3AED]/40 hover:border-[#7C3AED] text-[#7C3AED] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs font-mono">
              <Plus className="w-3.5 h-3.5" /> Add Choice Option ({options.length}/5)
            </button>
          </div>
        ) : (
          <div>
            {/* <label className="block text-[10px] font-black text-[#2A1A63] uppercase tracking-wider mb-1.5 font-mono">Theory Grading Rubric Criteria</label>
            <textarea rows={3} value={theoryRubric} onChange={(e) => setTheoryRubric(e.target.value)} placeholder="Type grading guidelines rubrics..." className="w-full p-3 bg-white border border-[#E2D5F8] text-xs font-mono text-slate-800 rounded-xl focus:outline-none focus:border-[#7C3AED] shadow-2xs resize-none" /> */}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#E2D5F8]/60 flex justify-end mt-4">
        <button 
          type="button"
          onClick={onCommitChanges} 
          className="w-full py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-[0.99]"
        >
          COMMIT CHANGES
        </button>
      </div>
    </section>
  );
}