import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed with this operation?", 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel,
  summaryData = null // Optional summary metrics dictionary object
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 z-[99999] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white border border-[#9A87A9]/30 p-6 rounded-xl shadow-2xl relative text-left">
        
        {/* Top Header layout */}
        <div className="flex items-center gap-3 border-b border-[#FAF9FA] pb-3.5 mb-4">
          <div className="w-9 h-9 bg-[#FAF9FA] rounded-lg border border-[#9A87A9]/20 flex items-center justify-center text-[#2A1A63] shrink-0">
            <AlertCircle className="w-4 h-4 text-[#2A1A63]" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider">{title}</h4>
            <p className="text-[9px] font-mono font-black text-[#9A87A9] uppercase tracking-widest mt-0.5">Verification Required</p>
          </div>
          <button 
            onClick={onCancel} 
            className="absolute top-4 right-4 text-[#9A87A9] hover:text-[#2A1A63] p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content description prompt text */}
        <p className="text-xs text-slate-600 font-bold leading-relaxed mb-5">
          {message}
        </p>

        {/* Dynamic Summary Ledger Field */}
        {summaryData && (
          <div className="bg-[#FAF9FA] border border-[#9A87A9]/20 p-3 rounded-xl text-[10px] font-mono font-black uppercase text-[#2A1A63] space-y-1 mb-6 max-h-[120px] overflow-y-auto shadow-inner">
            {Object.entries(summaryData).map(([key, value]) => (
              <p key={key} className="truncate">
                <span className="text-[#9A87A9]">{key}:</span> {value || 'N/A'}
              </p>
            ))}
          </div>
        )}

        {/* Action button controls elements */}
        <div className="flex justify-end gap-2.5 font-sans">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#9A87A9]/30 text-slate-600 hover:bg-[#FAF9FA] text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 bg-[#2A1A63] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-[0.98] cursor-pointer font-mono"
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}