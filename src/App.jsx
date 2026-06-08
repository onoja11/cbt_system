import React, { useState } from 'react';
import SecurityProvider from './core/SecurityProvider';

// 📂 STUDENT APP PORTS
import StudentLobby from './student/pages/Lobby';
import StudentWorkspace from './student/pages/ExamWorkspace';

// 📂 FACULTY ASSIGNED CORE MODULES
import TeacherDashboard from './teacher/pages/TeacherDashboard';
import TeacherBuilder from './teacher/pages/QuestionBuilder';
import LiveMonitor from './teacher/pages/LiveMonitor';
import TheoryMarking from './teacher/pages/TheoryMarking';
import UnifiedGradebook from './teacher/pages/Gradebook';
import ScriptReview from './teacher/pages/ScriptReview';

// 📂 INSTITUTIONAL ADMINISTRATION PANELS
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminClassesDirectory from './admin/pages/AdminClassesDirectory';
import AdminRecordsArchive from './admin/pages/AdminRecordsArchive'; // 💡 Connected
import AdminLiveMonitor from './admin/pages/AdminLiveMonitor';
import AdminApprovalDesk from './admin/pages/AdminApproval';
import AdminGradebookView from './admin/pages/AdminGradebookView';

export default function App() {
  // 🔐 THE MASTER ROUTER: App always boots directly into the authorization lock gate
  const [currentDomain, setCurrentDomain] = useState('auth'); 
  
  // Active Profiles Session Cache Memory Stores
  const [sessionUser, setSessionUser] = useState(null);
  const [activeCourseFolder, setActiveCourseFolder] = useState(null);
  const [selectedAssessmentInfo, setSelectedAssessmentInfo] = useState(null);
  const [selectedLiveSession, setSelectedLiveSession] = useState(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState(null);

  // 💡 CENTRAL MASTER ACCOUNT REGISTRY PASSKEYS MATRIX
  const handleSystemLogin = (e) => {
    e.preventDefault();
    const identifier = e.target.identifier.value.trim().toUpperCase();
    const password = e.target.password.value;

    if (!identifier || !password) {
      alert("Please enter authorization credentials.");
      return;
    }

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO A: STUDENT TESTING PORTALS
    // ─────────────────────────────────────────────────────────────────
    if (identifier === 'VTS/JSS3/001' || identifier === 'STEPHEN') {
      setSessionUser({ id: 'st_1', name: 'DUNG STEPHEN NYAM', admissionNo: 'VTS/JSS3/001', classGroup: 'Grade 9 / JSS 3A', initials: 'DS' });
      setCurrentDomain('student_lobby');
      return;
    }
    if (identifier === 'VTS/SS1/009' || identifier === 'FAITH') {
      setSessionUser({ id: 'st_4', name: 'FAITH OCHE', admissionNo: 'VTS/SS1/009', classGroup: 'Grade 10 / SS 1 GOLD', initials: 'FO' });
      setCurrentDomain('student_lobby');
      return;
    }

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO B: TEACHER SYSTEM PORTAL 
    // ─────────────────────────────────────────────────────────────────
    if (identifier === 'TEACHER' || identifier === 'GODSWILL') {
      setSessionUser({ name: 'Mr. Ochigbo Godswill', role: 'teacher' });
      setCurrentDomain('teacher_dash');
      return;
    }

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO C: ADMIN PRINCIPAL COMMAND DESK
    // ─────────────────────────────────────────────────────────────────
    if (identifier === 'ADMIN' || identifier === 'PRINCIPAL') {
      setSessionUser({ name: 'Director of Studies Core', role: 'admin' });
      setCurrentDomain('admin_dash');
      return;
    }

    alert("ACCESS DENIED: Account ID string parameter not registered on Intranet database layer.");
  };

  const handleLogOutSystem = () => {
    setSessionUser(null);
    setActiveCourseFolder(null);
    setSelectedAssessmentInfo(null);
    setSelectedLiveSession(null);
    setSelectedClassGroup(null);
    setCurrentDomain('auth');
  };

  const handleReturnToFolderDashboard = () => {
    setCurrentDomain('teacher_dash');
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] antialiased w-full overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 🔐 SCREEN 1: UNIVERSAL AUTHORIZATION LOCK GATE LAYER                       */}
      {/* ========================================================================= */}
      {currentDomain === 'auth' && (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xl space-y-6">
            
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-slate-950 text-white font-black text-sm flex items-center justify-center rounded-lg mx-auto shadow-md font-mono">VTS</div>
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider pt-2">StartriteIntranet Access Portal</h2>
              <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-tight">LAN Node Workstation Connectivity Authenticator</p>
            </div>

            <form onSubmit={handleSystemLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">User Identity ID Code / Email</label>
                <input type="text" name="identifier" placeholder="e.g., STEPHEN, TEACHER, or ADMIN" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none focus:bg-white focus:border-slate-950 transition-all uppercase font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Security Access Password</label>
                <input type="password" name="password" defaultValue="123456" placeholder="••••••••" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded focus:outline-none focus:bg-white focus:border-slate-950 transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded transition-all shadow-md cursor-pointer active:scale-[0.98]">Request Intranet Verification</button>
            </form>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded text-[10px] font-mono text-slate-400 space-y-1 leading-normal uppercase">
              <span className="font-bold text-slate-600 block mb-0.5 font-sans text-[9px] tracking-wider">💡 DEMO PRESENTATION PASSKEYS:</span>
              • Student A (JSS3): <span className="font-black text-slate-900">STEPHEN</span><br />
              • Student B (SS1): <span className="font-black text-slate-900">FAITH</span><br />
              • Teacher Account: <span className="font-black text-slate-900">TEACHER</span><br />
              • Admin Tower: <span className="font-black text-slate-900">ADMIN</span>
            </div>

          </div>
        </div>
      )}
      
      {/* ========================================================================= */}
      {/* STUDENT ROUTING SPACES                                                   */}
      {/* ========================================================================= */}
      {currentDomain === 'student_lobby' && (
        <StudentLobby student={sessionUser} onStartExam={() => setCurrentDomain('student_exam')} />
      )}
      
      {currentDomain === 'student_exam' && (
        <SecurityProvider onSecurityViolation={(log) => console.warn(`[INTEGRITY] ${log}`)}>
          <StudentWorkspace student={sessionUser} onExamSubmit={handleLogOutSystem} />
        </SecurityProvider>
      )}

      {/* ========================================================================= */}
      {/*  TEACHER ROUTING SPACES                                                */}
      {/* ========================================================================= */}
      {currentDomain === 'teacher_dash' && (
        <TeacherDashboard 
          teacher={sessionUser} 
          initialFolderContext={activeCourseFolder}
          onFolderContextChange={(folder) => setActiveCourseFolder(folder)}
          onNavigateToBuilder={() => setCurrentDomain('teacher_builder')} 
          onNavigateToMonitor={() => setCurrentDomain('teacher_monitor')}
          onNavigateToGrading={() => setCurrentDomain('teacher_grading')}      
          onNavigateToGradebook={() => setCurrentDomain('teacher_gradebook')}
          onNavigateToReview={(info) => { setSelectedAssessmentInfo(info); setCurrentDomain('teacher_review_scripts'); }}
          onLogOut={handleLogOutSystem}
        />
      )}
      {currentDomain === 'teacher_builder' && <TeacherBuilder onNavigateBack={handleReturnToFolderDashboard} />}
      {currentDomain === 'teacher_monitor' && <LiveMonitor onNavigateBack={handleReturnToFolderDashboard} />}
      {currentDomain === 'teacher_grading' && <TheoryMarking onNavigateBack={handleReturnToFolderDashboard} />}
      {currentDomain === 'teacher_gradebook' && <UnifiedGradebook onNavigateBack={handleReturnToFolderDashboard} />}
      {currentDomain === 'teacher_review_scripts' && <ScriptReview selectedAssessmentInfo={selectedAssessmentInfo} onNavigateBack={handleReturnToFolderDashboard} />}

      {/* ========================================================================= */}
      {/*  ADMIN OVERSIGHT ROUTING SPACES                                         */}
      {/* ========================================================================= */}
      {currentDomain === 'admin_dash' && (
        <AdminDashboard 
          onNavigateToApproval={() => setCurrentDomain('admin_approval')}
          onNavigateToClasses={() => setCurrentDomain('admin_classes_directory')}
          onNavigateToArchive={() => setCurrentDomain('admin_records_archive')} // 💡 Synced
          onNavigateToLiveSurveillance={(session) => {
            setSelectedLiveSession(session);
            setCurrentDomain('admin_live_surveillance');
          }}
          onLogOut={handleLogOutSystem}
        />
      )}

      {currentDomain === 'admin_classes_directory' && (
        <AdminClassesDirectory 
          onNavigateToMasterRecords={(classGroupObject) => {
            setSelectedClassGroup(classGroupObject);
            setCurrentDomain('admin_master_records');
          }}
          onNavigateBack={() => setCurrentDomain('admin_dash')} 
        />
      )}

      {currentDomain === 'admin_records_archive' && (
        <AdminRecordsArchive onNavigateBack={() => setCurrentDomain('admin_dash')} />
      )}

      {currentDomain === 'admin_approval' && (
        <AdminApprovalDesk onNavigateBack={() => setCurrentDomain('admin_dash')} />
      )}

      {currentDomain === 'admin_live_surveillance' && (
        <AdminLiveMonitor selectedSessionInfo={selectedLiveSession} onNavigateBack={() => setCurrentDomain('admin_dash')} />
      )}

      {currentDomain === 'admin_master_records' && (
        <AdminGradebookView selectedClassContext={selectedClassGroup} onNavigateBack={() => setCurrentDomain('admin_dash')} />
      )}
      
    </div>
  );
}