import React, { useState } from 'react';
import { BookOpen, Plus, Activity, CheckSquare, Send, FileText, FileSpreadsheet, ArrowLeft, Folder, ChevronRight, Eye, LogOut, ShieldAlert } from 'lucide-react';
import ConfirmationModal from '../../shared/ConfirmationModal';

export default function TeacherDashboard({ 
  teacher, 
  initialFolderContext, 
  onFolderContextChange, 
  onNavigateToBuilder, 
  onNavigateToMonitor, 
  onNavigateToGrading, 
  onNavigateToGradebook, 
  onNavigateToReview,
  onLogOut 
}) {
  // 💡 STATE FOR SYSTEM LOGOUT DRAWER INTERACTION
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);
  
  // Assigned Course Folders List
  const [assignedCourses] = useState([
    { id: 'cs_jss3', code: 'CMP 301', name: 'COMPUTER SCIENCE', classGroup: 'Grade 9 / JSS 3' },
    { id: 'dp_jss3', code: 'DTP 302', name: 'DATA PROCESSING', classGroup: 'Grade 9 / JSS 3' },
    { id: 'bd_jss1', code: 'BDL 101', name: 'BASIC DIGITAL LITERACY', classGroup: 'Grade 7 / JSS 1' }
  ]);

  // FIXED DATA REGISTRY LAYER
  const [assessmentsRegistry, setAssessmentsRegistry] = useState([
    { id: 'asm_1', courseId: 'cs_jss3', type: 'CA 1', duration: '30 Mins', totalQuestions: 10, status: 'Graded' },
    { id: 'asm_2', courseId: 'cs_jss3', type: 'CA 2', duration: '30 Mins', totalQuestions: 12, status: 'Graded' },
    { id: 'asm_3', courseId: 'cs_jss3', type: 'CA 3 Obj', duration: '30 Mins', totalQuestions: 15, status: 'Exam in Progress' }, 
    { id: 'asm_3_theory', courseId: 'cs_jss3', type: 'CA 3 Theory', duration: '30 Mins', totalQuestions: 2, status: 'Finished (Ready to Grade)' }, 
    { id: 'asm_4', courseId: 'cs_jss3', type: 'Exam', duration: '60 Mins', totalQuestions: 25, status: 'Draft' }
  ]);

  const [activeCourseFolder, setActiveCourseFolder] = useState(initialFolderContext || null);

  const handleSetFolderContext = (folder) => {
    setActiveCourseFolder(folder);
    onFolderContextChange(folder);
  };

  const [assessmentType, setAssessmentType] = useState('CA 3');
  const [durationWindow, setDurationWindow] = useState('30');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, targetId: null });

  const handleOpenInitModal = (e) => {
    e.preventDefault();
    setModalConfig({ isOpen: true, type: 'create_slot', targetId: null });
  };

  const handleCreateSlotShell = () => {
    const newSlot = {
      id: `asm_${Date.now()}`,
      courseId: activeCourseFolder.id,
      type: assessmentType,
      duration: `${durationWindow} Mins`,
      totalQuestions: 0,
      status: 'Draft'
    };
    setAssessmentsRegistry([...assessmentsRegistry, newSlot]);
    setModalConfig({ isOpen: false, type: null, targetId: null });
  };

  const openFolderSlots = assessmentsRegistry.filter(asm => asm.courseId === activeCourseFolder?.id);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col justify-between select-none relative overflow-hidden">
      
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeCourseFolder && (
              <button 
                onClick={() => handleSetFolderContext(null)}
                className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 cursor-pointer mr-1 transition-all active:scale-[0.95]"
                title="Back to Subject Folders"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 bg-slate-900 text-white font-bold text-xs flex items-center justify-center rounded">T</div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Faculty Portal Workspace</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-mono">Lecturer Account: {teacher?.name || "Mr. Ochigbo Godswill"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-50 border px-2 py-0.5 rounded-xs">LAN_SERVER // CONNECTED</span>
            <button 
              onClick={() => setShowLogoutDrawer(true)}
              className="flex items-center gap-1 px-2 py-1 border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-600 hover:text-white rounded text-[10px] font-mono font-bold uppercase cursor-pointer transition-all active:scale-[0.95]"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* VIEW LAYER 1: Course Cards Folder Directories */}
      {!activeCourseFolder ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-start my-auto">
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Your Assigned Courses</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select an individual subject course path folder to manage continuous assessments or review student script logs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assignedCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => handleSetFolderContext(course)}
                className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-slate-900 cursor-pointer group transition-all duration-200 flex flex-col justify-between h-44 shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block">{course.code} • {course.classGroup}</span>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">{course.name}</h4>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[11px] font-bold text-slate-400 font-mono">
                  <span>{assessmentsRegistry.filter(a => a.courseId === course.id).length} Active Envelopes</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        
        /* VIEW LAYER 2: Assessment Management (Inside selected course folder) */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-stretch">
          
          {/* Creation Form Panel Container */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[520px]">
            <form onSubmit={handleOpenInitModal} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Initialize Assessment Slot</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Subject Directory</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-100 text-xs font-bold text-slate-900 rounded uppercase font-mono">
                  {activeCourseFolder.name} ({activeCourseFolder.classGroup})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assessment Slot Label</label>
                <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none cursor-pointer">
                  <option value="CA 1">Continuous Assessment 1 (CA 1)</option>
                  <option value="CA 2">Continuous Assessment 2 (CA 2)</option>
                  <option value="CA 3">Continuous Assessment 3 (CA 3)</option>
                  <option value="Exam">Terminal Examination Paper</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Timer Allotment</label>
                <select value={durationWindow} onChange={(e) => setDurationWindow(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none">
                  <option value="30">30 Minutes duration</option>
                  <option value="45">45 Minutes duration</option>
                  <option value="60">60 Minutes duration</option>
                  <option value="90">90 Minutes duration</option>
                </select>
              </div>
            </form>

            <button type="button" onClick={handleOpenInitModal} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-all mt-4 flex items-center justify-center gap-1 shadow-2xs">
              <Plus className="w-3.5 h-3.5" /> Initialize Assessment Slot
            </button>
          </section>

          {/* Assessment Timeframes List */}
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-2xs h-[520px] overflow-hidden">
            <div className="w-full h-full flex flex-col overflow-hidden">
              
              <div className="mb-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Active Folder Context Management Roll</span>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{activeCourseFolder.name} Content</h3>
                </div>

                <button 
                  onClick={onNavigateToGradebook}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.97] cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> View Master Gradebook
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {openFolderSlots.map((asm) => (
                  <div key={asm.id} className="p-4 border border-slate-200 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white hover:border-slate-300 transition-all gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold uppercase border px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-500">{asm.type}</span>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{activeCourseFolder.name} Assessment Block</h4>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{activeCourseFolder.classGroup} • {asm.totalQuestions} Questions saved • Time: <span className="font-mono font-bold text-slate-700">{asm.duration}</span></p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono tracking-wide border ${
                        asm.status === 'Exam in Progress' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 animate-pulse font-black' :
                        asm.status === 'Finished (Ready to Grade)' ? 'bg-blue-50 border-blue-200 text-blue-600 font-black' :
                        asm.status === 'Graded' ? 'bg-slate-900 border-slate-900 text-white' :
                        'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {asm.status}
                      </span>

                      <div className="flex gap-1.5">
                        
                        {asm.status === 'Exam in Progress' && (
                          <button 
                            onClick={onNavigateToMonitor} 
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow-2xs transition-all active:scale-[0.96]"
                          >
                            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Monitor Live
                          </button>
                        )}

                        {asm.status === 'Finished (Ready to Grade)' && (
                          <button 
                            onClick={onNavigateToGrading}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow-2xs transition-all active:scale-[0.96] cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-white" /> Mark Essays
                          </button>
                        )}

                        {asm.status === 'Graded' && (
                          <button 
                            onClick={() => onNavigateToReview(asm)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> Review Scripts
                          </button>
                        )}

                        {asm.status === 'Draft' && (
                          <>
                            <button onClick={onNavigateToBuilder} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1">Add Questions</button>
                            <button onClick={() => setModalConfig({ isOpen: true, type: 'send_review', targetId: asm.id })} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1">Send to Admin</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>
      )}

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.type === 'create_slot' ? "Initialize Assessment Envelope" : "Submit Paper for Review"}
        message={modalConfig.type === 'create_slot' ? `Confirm creation of a new, independent ${assessmentType} assessment folder envelope?` : "Are you sure you want to lock this question paper ledger set and submit it for administrative inspection?"}
        confirmLabel={modalConfig.type === 'create_slot' ? "Create Slot Folder" : "Lock & Submit"} cancelLabel="Go Back"
        onConfirm={modalConfig.type === 'create_slot' ? handleCreateSlotShell : () => setModalConfig({ isOpen: false, type: null, targetId: null })}
        onCancel={() => setModalConfig({ isOpen: false, type: null, targetId: null })}
        summaryData={modalConfig.type === 'create_slot' ? { "Course Owner": activeCourseFolder?.name, "Slot Classification": assessmentType, "Duration Boundary": `${durationWindow} Minutes Bound` } : { "Workflow Target": "Admin Authorization Desk Queue", "Edit Constraints": "Will Restrain Canvas Modifications" }}
      />

      <footer className="w-full border-t border-slate-200/60 bg-white py-2 text-center text-[9px] font-bold text-slate-400 tracking-wider font-mono uppercase">
        StartriteIntranet Campus Management Cluster Layer
      </footer>

      {/* ========================================================================= */}
      {/* 💡 PREMIUM SLIDE-UP LOGOUT DRAWER OVERLAY                                 */}
      {/* ========================================================================= */}
      <div className={`fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-[10000] transition-all duration-300 flex flex-col justify-end ${showLogoutDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`w-full bg-white border-t-2 border-rose-600 p-6 shadow-2xl transition-all duration-300 transform font-mono ${showLogoutDrawer ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-tight font-sans">De-authenticate Intranet Session Node?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">Terminating session closes all active multi-class workloads dashboards.</p>
              </div>
            </div>
            <div className="flex gap-6 w-full sm:w-auto font-sans">
              <button 
                onClick={() => setShowLogoutDrawer(false)}
                className="flex-1 sm:flex-none px-8 border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-all"
              >
                Cancel 
              </button>
              <button 
                onClick={onLogOut}
                className="flex-1 sm:flex-none px-8 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md cursor-pointer transition-all font-mono"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}