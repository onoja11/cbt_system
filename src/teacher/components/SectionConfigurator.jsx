import React from 'react';
import { FileEdit } from 'lucide-react';

export default function SectionConfigurator({ activeSectionTab, sectionRules, onRuleChange }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
        <FileEdit className="w-4 h-4 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          {activeSectionTab === 'objective' ? 'Section A Global Rules' : 'Section B Global Rules'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Global Section Instructions Text</label>
          <input 
            type="text" 
            value={sectionRules[activeSectionTab].instructions}
            onChange={(e) => onRuleChange('instructions', e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Questions Student Can Answer</label>
          <input 
            type="text" 
            value={sectionRules[activeSectionTab].maxToAnswer}
            onChange={(e) => onRuleChange('maxToAnswer', e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 rounded"
          />
        </div>
      </div>
    </section>
  );
}