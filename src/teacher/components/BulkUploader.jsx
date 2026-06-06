import React from 'react';
import { FileText, Upload, Image as ImageIcon, HelpCircle, X, CheckCircle2 } from 'lucide-react';

export default function BulkUploader({
  csvFile,
  onCSVUpload,
  onClearCSV,
  detectedImageHandles,
  bulkImages,
  onBulkImagesDrop,
  onClearBulkImages,
  onSubmitBatch // 💡 New prop to trigger the submission workflow
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between shadow-2xs h-[620px] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Side Partition: CSV Data Ingestion */}
        <div className="flex flex-col justify-between space-y-4 md:border-r border-slate-100 md:pr-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">01 / CSV Ingestion Data</span>
            </div>

            {!csvFile ? (
              <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 p-6 bg-slate-50 rounded relative cursor-pointer flex flex-col items-center justify-center min-h-[110px] text-center transition-all">
                <input type="file" accept=".csv" onChange={onCSVUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Choose Spreadsheet Template (.csv)</p>
              </div>
            ) : (
              <div className="border border-slate-200 p-4 bg-slate-50/50 rounded flex flex-col items-center justify-center min-h-[110px] text-center relative transition-all">
                <div className="absolute top-2 right-2">
                  <button onClick={onClearCSV} className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-800 rounded"><X className="w-4 h-4" /></button>
                </div>
                <FileText className="w-6 h-6 text-slate-900 mb-1" />
                <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] uppercase font-mono">{csvFile.name}</p>
                <button onClick={onClearCSV} className="mt-3 px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase rounded">Remove File</button>
              </div>
            )}

            {detectedImageHandles.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Image Placeholders Verified:</span>
                <div className="space-y-1">
                  {detectedImageHandles.map((handle, idx) => {
                    const isMatched = bulkImages.some(img => img.name === handle);
                    return (
                      <div key={idx} className="flex justify-between items-center text-[10px] font-mono font-bold uppercase p-1 bg-white border border-slate-100 rounded">
                        <span className="text-slate-700 truncate max-w-[150px]">{handle}</span>
                        <span className={`font-black text-[9px] ${isMatched ? 'text-emerald-600' : 'text-amber-500 animate-pulse'}`}>{isMatched ? '✓ Linked' : '• Awaiting Upload'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded text-left space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700 border-b border-slate-200 pb-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">CSV Global Instructions Blueprint</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium space-y-3 leading-relaxed font-mono uppercase">
              <div>
                <p className="text-slate-900 font-black mb-1">[A] OBJECTIVE PATTERN:</p>
                <p className="bg-white p-1.5 border rounded border-slate-200 text-slate-600 overflow-x-auto whitespace-nowrap text-[9px]">
                  "What is RAM?", objective, 2, "Memory", "Storage", "Disk", "Port", A, ""
                </p>
              </div>
              <div>
                <p className="text-slate-900 font-black mb-1">[B] THEORY PATTERN (With Instructions):</p>
                <p className="bg-white p-1.5 border rounded border-slate-200 text-slate-600 overflow-x-auto whitespace-nowrap text-[9px]">
                  "Explain RAM functions", theory, 5, "", "", "", "", "", "instructions: Answer 3 out of 5 | max_choice: 3"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Partition: Bulk Folder Images & Submission Trigger */}
        <div className="flex flex-col justify-between text-center space-y-4 pl-2 h-full">
          <div className="space-y-4 w-full flex-1 flex flex-col">
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 text-left">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">02 / Bulk Image Folders</span>
              </div>
              {bulkImages.length > 0 && (
                <button onClick={onClearBulkImages} className="text-[9px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wide transition-all cursor-pointer">Clear ({bulkImages.length}) Cache</button>
              )}
            </div>
            
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 p-8 bg-slate-50 rounded relative flex flex-col items-center justify-center min-h-[140px] cursor-pointer transition-all flex-1">
              <input type="file" multiple accept="image/*" onChange={onBulkImagesDrop} className="absolute inset-0 opacity-0 cursor-pointer" />
              <ImageIcon className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {bulkImages.length > 0 ? `${bulkImages.length} Images Loaded` : 'Drag and Drop Image Pack'}
              </p>
            </div>
          </div>

          {/* 💡 THE NEW PROCESS SUBMIT BUTTON REGION */}
          {csvFile && (
            <div className="pt-4 border-t border-slate-100 w-full animate-none">
              <button
                onClick={onSubmitBatch}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Submit Batch Upload
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}