import React, { useState, useEffect } from 'react';
import { X, Check, Users, Loader2, ShieldCheck, Search } from 'lucide-react';
import { apiRequest } from '../../core/api';

export default function StudentRosterModal({ assessmentId, isOpen, onClose, onRosterSaved }) {
  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchRoster();
    }
  }, [isOpen, assessmentId]);

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/roster`, { method: 'GET' });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        setRoster(data.roster || []);
      }
    } catch (err) {
      console.error("Failed to load student roster:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStudent = (studentProfileId) => {
    setRoster(prev => prev.map(student => {
      if (student.student_profile_id === studentProfileId) {
        return { ...student, is_allowed: !student.is_allowed };
      }
      return student;
    }));
  };

  const handleSelectAll = (status) => {
    setRoster(prev => prev.map(student => ({ ...student, is_allowed: status })));
  };

  const handleSaveRoster = async () => {
    setIsSaving(true);
    try {
      const allowedIds = roster.filter(s => s.is_allowed).map(s => s.student_profile_id);
      
      const res = await apiRequest(`api/v1/teacher/assessments/${assessmentId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ student_profile_ids: allowedIds })
      });

      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        onRosterSaved();
        onClose();
      } else {
        alert(data.message || "Failed to update student roster.");
      }
    } catch (err) {
      console.error("Failed to save roster:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredStudents = roster.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admission_no && s.admission_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allowedCount = roster.filter(s => s.is_allowed).length;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[30000] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E2D5F8] overflow-hidden flex flex-col max-h-[85vh] font-sans">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Exam Access Roster</h3>
              <p className="text-[10px] font-mono text-purple-100 uppercase tracking-widest mt-0.5">
                Cleared Students: {allowedCount} / {roster.length} Selected
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center cursor-pointer transition-all">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search & Bulk Actions Bar */}
        <div className="p-5 border-b border-[#E2D5F8]/60 bg-[#F7F5FC] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 font-mono">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search student or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2D5F8] rounded-xl text-xs font-sans font-semibold text-slate-800 focus:outline-none focus:border-[#7C3AED] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => handleSelectAll(true)} 
              className="px-3 py-1.5 bg-white border border-[#E2D5F8] text-[10px] font-black uppercase text-[#7C3AED] rounded-xl hover:bg-purple-50 cursor-pointer shadow-2xs"
            >
              Select All
            </button>
            <button 
              onClick={() => handleSelectAll(false)} 
              className="px-3 py-1.5 bg-white border border-[#E2D5F8] text-[10px] font-black uppercase text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Student List Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 font-mono text-xs uppercase text-[#7C6B93]">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
              Loading student roster class matrix...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs uppercase text-[#7C6B93]">
              No student records matched your search query.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.student_profile_id}
                onClick={() => handleToggleStudent(student.student_profile_id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer shadow-2xs ${
                  student.is_allowed 
                    ? 'bg-purple-50/60 border-purple-200 text-slate-900 font-bold' 
                    : 'bg-white border-[#E2D5F8] text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    student.is_allowed ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-white border-[#E2D5F8]'
                  }`}>
                    {student.is_allowed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight font-sans text-slate-900">{student.student_name}</p>
                    <p className="text-[10px] font-mono text-[#7C6B93] uppercase tracking-wider">{student.admission_no || 'NO ADMISSION ID'}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider ${
                  student.is_allowed ? 'bg-purple-100 text-[#7C3AED]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {student.is_allowed ? 'Cleared' : 'Restricted'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-[#E2D5F8]/60 bg-[#F7F5FC] flex justify-end gap-3 font-mono shrink-0">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-white border border-[#E2D5F8] rounded-xl text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button 
            disabled={isSaving} 
            onClick={handleSaveRoster} 
            className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <ShieldCheck className="w-4 h-4" /> Save Allowlist Roster
          </button>
        </div>

      </div>
    </div>
  );
}