import React, { useState } from 'react';
import { ArrowLeft, Search, FileSpreadsheet, Loader2, Award, BookOpen, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../core/api';
import Logo from '../../shared/Logo';

export default function AdminStudentReportCard({ onNavigateBack }) {
  const [admissionQuery, setAdmissionQuery] = useState('');
  const [studentRecord, setStudentRecord] = useState(null);
  const [subjectResults, setSubjectResults] = useState([]);
  const [isClassReady, setIsClassReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearchStudentResults = async (e) => {
    e.preventDefault();
    if (!admissionQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await apiRequest(`api/v1/admin/student-report?admission_no=${encodeURIComponent(admissionQuery.trim())}`, { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'SUCCESS') {
          setStudentRecord(payload.student);
          setSubjectResults(payload.results || []);
          setIsClassReady(payload.class_results_ready || false);
        } else {
          setStudentRecord(null);
          setSubjectResults([]);
        }
      }
    } catch (err) {
      console.error("❌ [REPORT CARD SEARCH FAULT]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#FAF9FA] flex flex-col justify-between select-none text-[#2A1A63] font-sans w-full overflow-hidden text-left">
      
      <header className="w-full bg-white border-b border-[#9A87A9]/30 px-4 md:px-6 py-4 sticky top-0 z-40 flex justify-between items-center shrink-0 shadow-3xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={onNavigateBack} 
            className="p-1.5 border border-[#9A87A9]/30 bg-white hover:bg-[#FAF9FA] text-[#9A87A9] hover:text-[#2A1A63] rounded-lg cursor-pointer transition-all active:scale-[0.95]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="mr-1"><Logo size={45} showText={false} /></div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950">Student Complete Term Result Viewer</h2>
            <p className="text-[10px] font-bold text-[#9A87A9] font-mono uppercase tracking-wider mt-0.5">Centralized Academic Results Transcripts</p>
          </div>
        </div>

        <form onSubmit={handleSearchStudentResults} className="flex gap-2 w-full max-w-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#9A87A9] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={admissionQuery}
              onChange={(e) => setAdmissionQuery(e.target.value)}
              placeholder="Enter Admission No (e.g. SRS/STU/2026/001)..." 
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9FA] border border-[#9A87A9]/40 text-xs font-bold text-slate-950 rounded-lg uppercase focus:outline-none focus:border-[#2A1A63]"
            />
          </div>
          <button type="submit" className="px-4 py-1.5 bg-[#2A1A63] text-white text-xs font-bold uppercase rounded-lg shadow-md cursor-pointer">
            Search
          </button>
        </form>
      </header>

      <main className="flex-1 bg-[#FAF9FA] p-6 overflow-y-auto h-full">
        {isLoading ? (
          <div className="h-full flex flex-col justify-center items-center text-[#9A87A9] font-mono text-xs uppercase font-bold gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#2A1A63]" /> Querying academic transcripts...
          </div>
        ) : !hasSearched ? (
          <div className="h-full flex flex-col justify-center items-center text-[#9A87A9] p-8 text-center bg-white border border-dashed border-[#9A87A9]/30 rounded-xl py-24 shadow-3xs max-w-lg mx-auto my-auto">
            <Award className="w-8 h-8 text-[#9A87A9]/40 stroke-[1.5] mb-2" />
            <p className="text-xs font-black uppercase tracking-wide font-mono">Student Transcript Lookup</p>
            <p className="text-xs text-slate-500 font-medium normal-case mt-1.5">Enter a student admission number above to review complete subject performance scores.</p>
          </div>
        ) : !studentRecord ? (
          <div className="h-full flex flex-col justify-center items-center text-[#C62927] p-8 text-center bg-white border border-rose-200 rounded-xl py-24 shadow-3xs max-w-lg mx-auto my-auto">
            <AlertTriangle className="w-8 h-8 text-[#C62927] mb-2" />
            <p className="text-xs font-black uppercase tracking-wide font-mono">Student Not Found</p>
            <p className="text-xs text-slate-500 font-medium normal-case mt-1.5">No student profile matches the provided admission code.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Student Info Card */}
            <div className="bg-white border border-[#9A87A9]/20 rounded-xl p-5 shadow-3xs flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-black bg-indigo-50 border border-indigo-100 text-[#2A1A63] px-2 py-0.5 rounded uppercase">
                  {studentRecord.admission_no}
                </span>
                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight mt-1">{studentRecord.name}</h3>
                <p className="text-[11px] font-mono text-[#9A87A9] uppercase mt-0.5">Class Arm: <span className="font-bold text-slate-800">{studentRecord.class_arm}</span></p>
              </div>
              <div className="text-right font-mono">
                <span className="text-[9px] font-black text-[#9A87A9] uppercase block">Class Results Status</span>
                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border mt-1 inline-block ${
                  isClassReady ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {isClassReady ? '● CLASS RESULTS READY (ALL GRADED)' : '○ PENDING GRADING (SOME PENDING)'}
                </span>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white border border-[#9A87A9]/20 rounded-xl overflow-hidden shadow-3xs">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="bg-[#2A1A63] text-white font-black uppercase text-[10px] tracking-wider">
                    <th className="p-3 pl-4">Subject Title</th>
                    <th className="p-3 text-center">CA 1</th>
                    <th className="p-3 text-center">CA 2</th>
                    <th className="p-3 text-center">CA 3</th>
                    <th className="p-3 text-center">Exam</th>
                    <th className="p-3 text-center bg-slate-900">Total</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center pr-4 font-sans">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 uppercase font-bold text-slate-700">
                  {subjectResults.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF9FA]/40 transition-colors">
                      <td className="p-3 pl-4 font-sans font-black text-slate-950 text-xs">{sub.subject_name}</td>
                      <td className="p-3 text-center text-[#9A87A9]">{sub.ca1}</td>
                      <td className="p-3 text-center text-[#9A87A9]">{sub.ca2}</td>
                      <td className="p-3 text-center text-[#9A87A9]">{sub.ca3}</td>
                      <td className="p-3 text-center text-[#9A87A9]">{sub.exam}</td>
                      <td className="p-3 text-center bg-[#FAF9FA] font-black text-[#2A1A63] border-x border-[#9A87A9]/10">{sub.total}</td>
                      <td className="p-3 text-center font-black text-slate-950">{sub.grade}</td>
                      <td className="p-3 text-center pr-4 font-sans text-[10px]">
                        {sub.is_graded ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black border border-emerald-200">Graded</span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-black border border-amber-200">Pending Teacher Grading</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </main>

      <footer className="w-full border-t border-[#9A87A9]/20 bg-white py-2.5 text-center text-[9px] font-black text-[#9A87A9] tracking-wider font-mono uppercase shrink-0 px-4">
        Start-Rite Schools Student Transcripts Registry Layer © 2026
      </footer>
    </div>
  );
}