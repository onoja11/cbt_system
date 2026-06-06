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
  summaryData = null // Optional dictionary object to show key summary metrics to users
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 z-[9999] flex items-center justify-center p-4 backdrop-blur-[1.5px]">
      <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-lg shadow-xl relative animate-none">
        
        {/* Top Header line layout */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-4">
          <div className="w-9 h-9 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
            <AlertCircle className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{title}</h4>
            <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mt-0.5">System Verification Required</p>
          </div>
          <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content body description prompt text */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
          {message}
        </p>

        {/* Dynamic Summary Ledger Field (If passed inside parameters) */}
        {summaryData && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded text-[10px] font-mono font-bold uppercase text-slate-600 space-y-1 mb-6 max-h-[100px] overflow-y-auto">
            {Object.entries(summaryData).map(([key, value]) => (
              <p key={key} className="truncate">
                <span className="text-slate-400">{key}:</span> {value || 'N/A'}
              </p>
            ))}
          </div>
        )}

        {/* Action button grids controls elements */}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-all active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}