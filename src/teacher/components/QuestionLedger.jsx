import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function QuestionLedger({ 
  questionBank, 
  activeQuestionId, 
  activeSectionTab, 
  onSelectQuestion, 
  onAddQuestion, 
  onDeleteQuestion 
}) {
  const filteredBankList = questionBank.filter(q => q.type === activeSectionTab);

  return (
    <aside className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-2xs h-[620px] overflow-hidden">
      <div className="w-full flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            {activeSectionTab === 'objective' ? 'Obj Bank' : 'Theory Bank'} ({filteredBankList.length})
          </span>
          <button 
            onClick={onAddQuestion} 
            className="text-[10px] font-bold text-slate-900 uppercase tracking-wide flex items-center gap-0.5 hover:text-slate-600 transition-all"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filteredBankList.map((q, idx) => (
            <div
              key={q.id}
              onClick={() => onSelectQuestion(q)}
              className={`p-3 border text-left rounded cursor-pointer transition-all flex justify-between items-center ${
                q.id === activeQuestionId ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
              }`}
            >
              <div className="truncate pr-2">
                <span className="text-[10px] font-mono block text-slate-400 font-bold uppercase tracking-wider">
                  {activeSectionTab === 'objective' ? `Obj Q${idx + 1}` : `Theory Q${idx + 1}`} • {q.score}pt(s)
                </span>
                <span className="text-xs truncate block mt-0.5">{q.text}</span>
              </div>
              <button 
                onClick={(e) => onDeleteQuestion(q.id, e)}
                className="text-slate-300 hover:text-rose-600 transition-all p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {filteredBankList.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8 italic">No entries inside section.</p>
          )}
        </div>
      </div>
    </aside>
  );
}