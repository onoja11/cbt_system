import React from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

export default function QuestionLedger({ 
  questionBank = [], 
  activeQuestionId, 
  activeSectionTab, 
  onSelectQuestion, 
  onAddQuestion, 
  onDeleteQuestion,
  disableAdding = false
}) {
  const cleanType = (typeStr) => String(typeStr || '').trim().toLowerCase();

  const filteredBankList = questionBank.filter(
    (q) => cleanType(q.type) === cleanType(activeSectionTab)
  );

  return (
    <aside className="bg-white border border-[#E2D5F8] rounded-3xl p-4 flex flex-col justify-between shadow-2xs h-[620px] overflow-hidden select-none">
      <div className="w-full flex flex-col h-full overflow-hidden">
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-[#E2D5F8]">
          <span className="text-[10px] font-mono font-black text-[#7C3AED] uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#7C3AED]" />
            {activeSectionTab === 'objective' ? 'Obj Bank' : 'Theory Bank'} ({filteredBankList.length})
          </span>
          <button 
            type="button"
            onClick={onAddQuestion} 
            disabled={disableAdding}
            className="text-[10px] font-mono font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 px-2.5 py-1 rounded-xl uppercase tracking-wide flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3 h-3 stroke-[3]" /> Add Item
          </button>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredBankList.map((q, idx) => {
            const isSelected = String(q.id) === String(activeQuestionId);
            const questionLabel = q.subLabel 
              ? `Q${q.parentNumber || idx + 1}(${q.subLabel})` 
              : `${activeSectionTab === 'objective' ? 'Obj' : 'Theory'} Q${idx + 1}`;

            return (
              <div
                key={q.id || idx}
                onClick={() => onSelectQuestion(q)}
                className={`p-3 border text-left rounded-2xl cursor-pointer transition-all flex justify-between items-center group relative ${
                  isSelected 
                    ? 'border-[#7C3AED] bg-purple-50/80 shadow-2xs ring-1 ring-[#7C3AED]/30' 
                    : 'border-[#E2D5F8] bg-white hover:border-[#7C3AED]/50 hover:bg-purple-50/30'
                }`}
              >
                <div className="truncate pr-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-[#7C3AED] bg-white px-2 py-0.5 rounded-md border border-[#E2D5F8]">
                      {questionLabel}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500">
                      {q.score || 2} pt(s)
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800 truncate block mt-1.5 font-sans">
                    {q.text || 'Untitled Question Entry'}
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={(e) => onDeleteQuestion(q.id, e)}
                  disabled={disableAdding}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-30"
                  title="Remove Question"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {filteredBankList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-[#E2D5F8] rounded-2xl p-4 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                No entries in this section bank.
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}