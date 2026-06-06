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
    <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[440px] overflow-y-auto">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Item Parameter Editor
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Question Score</label>
            <input type="number" value={questionScore} onChange={(e) => setQuestionScore(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attach Diagram</label>
            <div className="relative border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded text-center py-1 px-3 flex items-center justify-center gap-1.5 min-h-[32px] cursor-pointer">
              <input type="file" accept="image/*" onChange={onImageDrop} className="absolute inset-0 opacity-0 cursor-pointer" />
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px] uppercase">
                {manualImageFile ? manualImageFile.name : 'Choose Image'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Question Prompt Text</label>
          <textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded resize-none" />
        </div>

        {activeSectionTab === 'objective' ? (
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Answer Variants Options</label>
            <div className="space-y-1.5">
              {options.map((option, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <button 
                    onClick={() => setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })))} 
                    className={`w-3.5 h-3.5 border rounded-full flex items-center justify-center shrink-0 ${option.isCorrect ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                  >
                    {option.isCorrect && <div className="w-1 h-1 bg-white rounded-full" />}
                  </button>
                  <input type="text" value={option.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o))} className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded" />
                  <button disabled={options.length <= 2} onClick={() => onRemoveOption(idx)} className="text-slate-300 hover:text-rose-500 disabled:opacity-20"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button type="button" disabled={options.length >= 5} onClick={onAddOption} className="w-full mt-2 py-2 border border-dashed border-slate-200 text-slate-500 hover:border-slate-400 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Choice Option ({options.length}/5)
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Theory Grading Rubric Criteria</label>
            <textarea rows={2} value={theoryRubric} onChange={(e) => setTheoryRubric(e.target.value)} placeholder="Type grading guidelines rubrics..." className="w-full p-3 bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 rounded resize-none" />
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button onClick={onCommitChanges} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold uppercase rounded transition-all active:scale-[0.99]">
          Commit Changes
        </button>
      </div>
    </section>
  );
}