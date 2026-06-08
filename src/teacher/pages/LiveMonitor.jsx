import React, { useState } from 'react';
import { ShieldAlert, Users, Clock, CheckCircle, Search, Power, Lock, Play, RotateCcw, Send, ArrowLeft } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function LiveMonitor({ onNavigateBack }) {
  // Real-time student canvas state tracking loop blocks
  const [studentStatuses, setStudentStatuses] = useState([
    { id: 'st_1', name: 'DUNG STEPHEN NYAM', desk: 'COMP-01', objectiveProgress: '2/2 Done', theoryProgress: '1/3 Answered', violations: 0, status: 'Writing Exam' },
    { id: 'st_2', name: 'OCHIGBO GODSWILL', desk: 'COMP-02', objectiveProgress: '2/2 Done', theoryProgress: '3/3 Answered', violations: 0, status: 'Submitted' },
    { id: 'st_3', name: 'EMMANUEL AMEH', desk: 'COMP-03', objectiveProgress: '1/2 Done', theoryProgress: '0/3 Answered', violations: 3, status: 'Locked Out (3 Strikes)' },
    { id: 'st_4', name: 'FAITH OCHE', desk: 'COMP-04', objectiveProgress: '2/2 Done', theoryProgress: '2/3 Answered', violations: 1, status: 'Writing Exam' }
  ]);

  const [searchFilter, setSearchFilter] = useState('');
  const [isExamRoomPaused, setIsExamRoomPaused] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, studentId: null, studentName: '' });

  const executeForceSubmit = (id) => {
    setStudentStatuses(prev => prev.map(st => st.id === id ? { ...st, status: 'Submitted' } : st));
    closeModal();
  };

  const toggleIndividualPause = (id) => {
    setStudentStatuses(prev => prev.map(st => {
      if (st.id === id) {
        const nextStatus = st.status === 'Paused by Teacher' ? 'Writing Exam' : 'Paused by Teacher';
        return { ...st, status: nextStatus };
      }
      return st;
    }));
  };

  const executeStrikeClearanceOverride = (id) => {
    setStudentStatuses(prev => prev.map(st => st.id === id ? { ...st, violations: 0, status: 'Writing Exam' } : st));
    closeModal();
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, studentId: null, studentName: '' });

  const filteredStudents = studentStatuses.filter(st => 
    st.name.toLowerCase().includes(searchFilter.toLowerCase()) || st.desk.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      {/* 💡 RE-DESIGNED HEADER: Features the standard left-hand arrow for uniform back navigation */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            
            {/* Left navigation escape handle link wire anchor */}
            <button 
              onClick={onNavigateBack} 
              className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded text-slate-500 mr-2 cursor-pointer transition-all active:scale-[0.97]"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isExamRoomPaused ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Live Exam Monitor Room</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">Subject: COMPUTER SCIENCE (JSS 3)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsExamRoomPaused(!isExamRoomPaused)}
              className={`px-4 py-2 border text-xs font-bold uppercase tracking-wider rounded transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                isExamRoomPaused ? 'bg-amber-500 border-amber-500 text-white font-black' : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50/40'
              }`}
            >
              <Power className="w-3.5 h-3.5" /> {isExamRoomPaused ? 'Resume All Computers' : 'Pause Everyone\'s Exam'}
            </button>
          </div>
        </div>
      </header>

      {isExamRoomPaused && (
        <div className="w-full bg-amber-500 text-white font-mono text-[10px] font-black uppercase tracking-widest text-center py-2 border-b border-amber-600 animate-none">
          ⚠️ ALL STUDENT COMPUTER SCREENS ARE CURRENTLY FROZEN AND LOCKED BY THE TEACHER
        </div>
      )}

      {/* Analytical counter summaries maps dashboard */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Students Logged In</span>
            <p className="text-sm font-bold text-slate-900 font-mono">{studentStatuses.length} Computers Connected</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Exams Finished & Submitted</span>
            <p className="text-sm font-bold text-slate-900 font-mono">{studentStatuses.filter(s => s.status === 'Submitted').length} Papers Received</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-md flex items-center gap-3 shadow-2xs bg-rose-50/20 border-rose-100">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <div>
            <span className="text-[9px] font-bold text-rose-400 uppercase font-mono tracking-wider block">Cheating / Window Alerts</span>
            <p className="text-sm font-bold text-rose-600 font-mono">{studentStatuses.filter(s => s.violations > 0).length} Candidates Flagged</p>
          </div>
        </div>
      </div>

      {/* Main Table Matrix Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col h-[410px] overflow-hidden shadow-2xs">
          
          <div className="relative mb-4 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search student name or computer number..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none rounded-sm" />
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-100 rounded">
            <table className="w-full border-collapse text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-mono font-bold uppercase text-[9px] text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="p-3 px-4">Computer No.</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Objective Progress</th>
                  <th className="p-3">Theory Progress</th>
                  <th className="p-3">Screen Alerts</th>
                  <th className="p-3 text-right px-4">Supervisor Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/40 transition-all">
                    <td className="p-3 px-4 font-mono font-bold text-slate-900 text-[11px]">{st.desk}</td>
                    <td className="p-3 text-slate-900 uppercase font-bold text-xs">{st.name}</td>
                    <td className="p-3 font-mono text-slate-400">{st.objectiveProgress}</td>
                    <td className="p-3 font-mono text-slate-400">{st.theoryProgress}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        st.violations >= 3 ? 'bg-rose-600 text-white animate-pulse font-black' :
                        st.violations > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {st.violations} / 3 Window Swaps
                      </span>
                    </td>
                    <td className="p-3 text-right px-4">
                      <div className="flex gap-1.5 justify-end items-center">
                        
                        {/* Status tracking light indicators for clear visualization fields */}
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 hidden sm:block ${
                          st.status === 'Submitted' ? 'bg-slate-900' :
                          st.status === 'Locked Out (3 Strikes)' ? 'bg-rose-600 animate-ping' :
                          st.status === 'Paused by Teacher' ? 'bg-amber-500 animate-pulse' :
                          'bg-emerald-500 animate-pulse'
                        }`} />

                        {st.status !== 'Submitted' && (
                          <>
                            {/* Force Remote Ingestion Submit */}
                            <button 
                              onClick={() => setModalConfig({ isOpen: true, type: 'force_submit', studentId: st.id, studentName: st.name })}
                              className="p-1.5 border border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-900 rounded bg-white transition-all cursor-pointer active:scale-[0.95]"
                              title="Force Submit Student Paper"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {/* Freeze / Unfreeze toggle buttons */}
                            <button 
                              onClick={() => toggleIndividualPause(st.id)}
                              className={`p-1.5 border rounded transition-all cursor-pointer active:scale-[0.95] ${
                                st.status === 'Paused by Teacher' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'border-slate-200 text-slate-500 hover:text-amber-600'
                              }`}
                              title={st.status === 'Paused by Teacher' ? "Unlock Screen" : "Freeze Screen"}
                            >
                              {st.status === 'Paused by Teacher' ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}

                        {/* Reset strikes and override parameters cell linkage */}
                        {st.violations >= 3 && st.status === 'Locked Out (3 Strikes)' && (
                          <button
                            onClick={() => setModalConfig({ isOpen: true, type: 'clear_override', studentId: st.id, studentName: st.name })}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-[0.97]"
                          >
                            <RotateCcw className="w-3 h-3" /> Clear Alerts & Unlock
                          </button>
                        )}

                        {st.status === 'Submitted' && (
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase pr-2 bg-slate-50 px-2 py-0.5 border rounded-xs select-none">
                            ✓ Received
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'force_submit' ? "Force Student Submission" : "Clear Student Screen Alerts"}
        message={modalConfig.type === 'force_submit' 
          ? `Are you completely sure you want to pull and forcibly submit the exam paper for ${modalConfig.studentName}? This will instantly log them out.`
          : `Student ${modalConfig.studentName} is currently locked out because they switched tabs 3 times. Confirming this resets their swap counter to 0 and unlocks their screen immediately.`
        }
        confirmLabel={modalConfig.type === 'force_submit' ? "Force Submit" : "Unlock Student Computer"}
        cancelLabel="Go Back"
        onConfirm={modalConfig.type === 'force_submit' ? () => executeForceSubmit(modalConfig.studentId) : () => executeStrikeClearanceOverride(modalConfig.studentId)}
        onCancel={closeModal}
        summaryData={{
          "Student": modalConfig.studentName,
          "Action Rule": modalConfig.type === 'force_submit' ? "REMOTE_FORCE_SUBMIT" : "RESET_ALERTS_AND_UNLOCK"
        }}
      />

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Monitoring Management Hub
      </footer>

    </div>
  );
}