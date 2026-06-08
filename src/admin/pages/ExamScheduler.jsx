import React, { useState } from 'react';
import { Calendar, UserCheck, Layers, BookOpen, Plus, Play, Power, CheckCircle } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function ExamScheduler() {
  // Master Scheduled Sessions State
  const [scheduledExams, setScheduledExams] = useState([
    { id: 'sch_1', classGroup: 'Grade 9 / JSS 3', subject: 'Computer Science', teacher: 'Mr. Ochigbo Godswill', duration: '60 Mins', status: 'active' },
    { id: 'sch_2', classGroup: 'Grade 10 / SS 1', subject: 'Mathematics', teacher: 'Dr. Felix Uloko', duration: '45 Mins', status: 'pending' }
  ]);

  // Form Field Configuration States
  const [targetClass, setTargetClass] = useState('Grade 9 / JSS 3');
  const [targetSubject, setTargetSubject] = useState('');
  const [assignedTeacher, setAssignedTeacher] = useState('');
  const [durationWindow, setDurationWindow] = useState('60');

  // Modal Control Triggers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleTriggerVerification = (e) => {
    e.preventDefault();
    if (!targetSubject.trim() || !assignedTeacher.trim()) {
      alert("Error: Please provide valid parameters for all configuration cells.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleExecuteScheduleCommit = () => {
    const newSession = {
      id: `sch_${Date.now()}`,
      classGroup: targetClass,
      subject: targetSubject.toUpperCase(),
      teacher: assignedTeacher,
      duration: `${durationWindow} Mins`,
      status: 'pending'
    };

    setScheduledExams([...scheduledExams, newSession]);
    setIsModalOpen(false);
    
    // Clear dynamic inputs fields
    setTargetSubject('');
    setAssignedTeacher('');
    
    // Flash Success Toast Alert
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const toggleSessionStatus = (id) => {
    setScheduledExams(scheduledExams.map(exam => 
      exam.id === id ? { ...exam, status: exam.status === 'active' ? 'pending' : 'active' } : exam
    ));
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none">
      
      {/* Upper Infrastructure Dashboard Navbar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">
              ADM
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">System Infrastructure Console</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-mono">Master Route Orchestrator Network</p>
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase bg-slate-50 border px-2 py-0.5 rounded-xs">LAN_SERVER_STATUS // OK</span>
        </div>
      </header>

      {/* Main Structural Twin Grid Panel Layout Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-stretch">
        
        {/* LEFT COLUMN COMPARTMENT: Configuration Parameter Form Panel */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[520px]">
          <form onSubmit={handleTriggerVerification} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Create Exam Link Wrapper</span>
            </div>

            {/* 1. Structural Layer: Class Group Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> 01 / Target Class Group
              </label>
              <select 
                value={targetClass} 
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Grade 7 / JSS 1">Grade 7 / JSS 1</option>
                <option value="Grade 8 / JSS 2">Grade 8 / JSS 2</option>
                <option value="Grade 9 / JSS 3">Grade 9 / JSS 3</option>
                <option value="Grade 10 / SS 1">Grade 10 / SS 1</option>
                <option value="Grade 11 / SS 2">Grade 11 / SS 2</option>
                <option value="Grade 12 / SS 3">Grade 12 / SS 3</option>
              </select>
            </div>

            {/* 2. Structural Layer: Subject Input String */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> 02 / Examination Subject
              </label>
              <input 
                type="text" 
                required
                value={targetSubject}
                onChange={(e) => setTargetSubject(e.target.value)}
                placeholder="e.g., Computer Science, Mathematics" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all rounded"
              />
            </div>

            {/* 3. Structural Layer: Assign Teacher Link Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" /> 03 / Assigned Teacher Evaluator
              </label>
              <input 
                type="text" 
                required
                value={assignedTeacher}
                onChange={(e) => setAssignedTeacher(e.target.value)}
                placeholder="e.g., Mr. Ochigbo Godswill" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all rounded"
              />
            </div>

            {/* 4. Structural Layer: Allocation Duration Time values */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">04 / Session Duration Window</label>
              <select 
                value={durationWindow} 
                onChange={(e) => setDurationWindow(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none focus:border-slate-900 transition-all cursor-pointer"
              >
                <option value="30">30 Minutes Time Window</option>
                <option value="45">45 Minutes Time Window</option>
                <option value="60">60 Minutes Time Window</option>
                <option value="90">90 Minutes Time Window</option>
                <option value="120">120 Minutes Time Window</option>
              </select>
            </div>
          </form>

          <button 
            onClick={handleTriggerVerification}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-all mt-4 flex items-center justify-center gap-1 shadow-2xs active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" /> Deploy Session Wrapper
          </button>
        </section>

        {/* RIGHT COLUMN COMPARTMENT: Active Rooms Ledger Database Table View Grid */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[520px] overflow-hidden">
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Allocated Networks Operational Logs ({scheduledExams.length})</span>
            </div>

            {/* Flat Ledger structural layout grid table data container */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded">
              <table className="w-full border-collapse text-left text-xs font-medium text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 font-mono font-bold uppercase text-[9px] text-slate-400 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 px-4">Class Group</th>
                    <th className="p-3">Subject / Paper</th>
                    <th className="p-3">Teacher In-Charge</th>
                    <th className="p-3">Window</th>
                    <th className="p-3 text-right px-4">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                  {scheduledExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="p-3 px-4 text-slate-900 uppercase font-bold text-[11px] font-mono tracking-tight">{exam.classGroup}</td>
                      <td className="p-3 max-w-[140px] truncate">{exam.subject}</td>
                      <td className="p-3 truncate max-w-[120px] text-slate-500">{exam.teacher}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{exam.duration}</td>
                      <td className="p-3 text-right px-4">
                        <button 
                          onClick={() => toggleSessionStatus(exam.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded border transition-all flex items-center gap-1 ml-auto cursor-pointer ${
                            exam.status === 'active'
                              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-400'
                          }`}
                        >
                          {exam.status === 'active' ? (
                            <>
                              <Power className="w-3 h-3 text-emerald-400 shrink-0" /> Live On-Air
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-slate-400 shrink-0" /> Standby
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>

      {/* Reusable Confirmation Modal Canvas Setup */}
      <ConfirmationModal 
        isOpen={isModalOpen}
        title="Confirm Exam Deployment"
        message="Are you sure you want to initialize and deploy this exam session configuration across the intranet terminals hub network layer?"
        confirmLabel="Initialize Room"
        cancelLabel="Discard Block"
        onConfirm={handleExecuteScheduleCommit}
        onCancel={() => setIsModalOpen(false)}
        summaryData={{
          "Target Partition": targetClass,
          "Subject Core": targetSubject.toUpperCase(),
          "Assigned Link": assignedTeacher,
          "Time Perimeter": `${durationWindow} Minutes`
        }}
      />

      {/* Success Notification Alert */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-md shadow-xl border border-slate-800 flex items-center gap-2 font-mono text-xs uppercase">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> Exam Session Successfully Activated!
        </div>
      )}

      {/* Global Bottom Sticky Branding row footer */}
      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Management Framework Cluster
      </footer>

    </div>
  );
}