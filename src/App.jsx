import React, { useState, useEffect } from 'react';
import Login from './shared/Login';
import TeacherDashboard from './teacher/pages/TeacherDashboard';
import QuestionBuilder from './teacher/pages/QuestionBuilder';
import LiveMonitor from './teacher/pages/LiveMonitor'; 
import StudentLobby from './student/pages/StudentLobby'; 
import ExamWorkspace from './student/pages/ExamWorkspace'; 
import { apiRequest } from './core/api';

// IMPORT YOUR OFFLINE STORAGE METHODS TO FORCE FLUSH ON SUBMIT
import { getAllUnsyncedAnswers, clearSyncedAnswers } from './core/offlineDb';

// ADMINISTRATIVE MASTER MODULE IMPORTS
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminApproval from './admin/pages/AdminApproval';
import AdminClassesDirectory from './admin/pages/AdminClassesDirectory';
import AdminGradebookView from './admin/pages/AdminGradebookView';
import AdminLiveMonitor from './admin/pages/AdminLiveMonitor';
import AdminRecordsArchive from './admin/pages/AdminRecordsArchive';
import ExamScheduler from './admin/pages/ExamScheduler';

// DYNAMIC GRADING WORKSPACE IMPORTS
import MarkEssays from './teacher/pages/MarkEssays';
import GradebookMatrix from './teacher/pages/GradebookMatrix';

export default function App() {
  // MASTER INFRASTRUCTURE SYSTEM STATES
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('login'); 
  const [userSession, setUserSession] = useState(null);
  
  // CONTEXT RECOVERY LEDGER STORAGE PIPES
  const [teacherFolderContext, setTeacherFolderContext] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedAdminLiveSession, setSelectedAdminLiveSession] = useState(null);

  // Helper sanitizer to strip out event objects completely
  const sanitizeIncomingId = (idInput) => {
    if (!idInput) return null;
    if (idInput && idInput.target !== undefined && typeof idInput.preventDefault === 'function') {
      return null;
    }
    if (typeof idInput === 'object') {
      return idInput.id || idInput.assessmentId || idInput.assessment_id || null;
    }
    const parsed = parseInt(idInput, 10);
    return isNaN(parsed) ? null : parsed;
  };

  // 🎯 RECONCILED CONTEXT RECOVERY LEDGER LOOKUPS ON MOUNT
  useEffect(() => {
    const savedToken = localStorage.getItem('intranet_bearer_token');
    const savedUser = localStorage.getItem('user_metadata');
    const savedDomain = localStorage.getItem('active_domain_context');
    const savedFolder = localStorage.getItem('saved_folder_context');
    const savedAsmId = localStorage.getItem('saved_asm_id_context');
    const savedAdminLive = localStorage.getItem('saved_admin_live_context');

    if (savedToken && savedUser && savedDomain) {
      setIsAuthenticated(true);
      setUserSession(JSON.parse(savedUser));
      
      // Safety normalize string to protect route contexts
      const normalizedDomain = savedDomain === 'admin' ? 'admin_dash' : savedDomain;
      setCurrentDomain(normalizedDomain);
      
      if (savedFolder) setTeacherFolderContext(JSON.parse(savedFolder));
      if (savedAdminLive) setSelectedAdminLiveSession(JSON.parse(savedAdminLive));

      if (savedAsmId && !savedAsmId.includes('Object') && savedAsmId !== 'NaN') {
        setSelectedAssessmentId(parseInt(savedAsmId, 10));
      }
    }
  }, []);

  const handleAuthSuccess = (token, domainContext, userMetadata) => {
    const operationalDomain = domainContext === 'admin' ? 'admin_dash' : domainContext;

    localStorage.setItem('intranet_bearer_token', token);
    localStorage.setItem('user_metadata', JSON.stringify(userMetadata));
    localStorage.setItem('active_domain_context', operationalDomain);
    
    setIsAuthenticated(true);
    setUserSession(userMetadata);
    setCurrentDomain(operationalDomain);
  };

  const handleSessionTermination = () => {
    localStorage.removeItem('intranet_bearer_token');
    localStorage.removeItem('user_metadata');
    localStorage.removeItem('active_domain_context');
    localStorage.removeItem('saved_asm_id_context');
    localStorage.removeItem('saved_admin_live_context');
    
    setIsAuthenticated(false);
    setUserSession(null);
    setTeacherFolderContext(null);
    setSelectedAssessmentId(null);
    setSelectedAdminLiveSession(null);
    setCurrentDomain('login');
  };

  const handleFolderContextCacheUpdate = (folder) => {
    setTeacherFolderContext(folder);
    if (folder) {
      localStorage.setItem('saved_folder_context', JSON.stringify(folder));
    } else {
      localStorage.removeItem('saved_folder_context');
    }
  };

  const navigateToDomainContext = (targetDomain) => {
    const safeDomainName = targetDomain === 'admin' ? 'admin_dash' : targetDomain;
    setCurrentDomain(safeDomainName);
    localStorage.setItem('active_domain_context', safeDomainName);
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      
      {/* 1. PUBLIC GATEWAY: IDENTITY VERIFICATION TERMINAL */}
      {currentDomain === 'login' && (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}

      {/* 2. STUDENT LOBBY GATEWAY */}
      {currentDomain === 'student_lobby' && (
        <StudentLobby 
          student={userSession} 
          onLogoutSuccess={handleSessionTermination} 
          onLaunchWorkspace={(examId) => {
            const cleanId = sanitizeIncomingId(examId);
            setSelectedAssessmentId(cleanId);
            localStorage.setItem('saved_asm_id_context', String(cleanId));
            navigateToDomainContext('student_workspace');
          }}
        />
      )}

      {/* 3. STUDENT WORKSPACE */}
      {currentDomain === 'student_workspace' && (
        <ExamWorkspace 
          student={userSession}
          assessmentId={selectedAssessmentId}
          onExamSubmit={async () => {
            try {
              const remainingPackets = await getAllUnsyncedAnswers();
              if (remainingPackets && remainingPackets.length > 0) {
                for (const packet of remainingPackets) {
                  await apiRequest(`api/v1/student/assessments/${selectedAssessmentId}/sync-telemetry`, {
                    method: 'POST',
                    body: JSON.stringify({
                      question_id: packet.question_id,
                      answered_index: packet.answered_index,
                      theory_response: packet.theory_response,
                      security_strikes: packet.security_strikes || 0
                    })
                  });
                  await clearSyncedAnswers([packet.question_id]);
                }
              }
              await apiRequest(`api/v1/student/assessments/${selectedAssessmentId}/finalize-submission`, { method: 'POST' });
              alert("🎉 EXAM SECURELY COMMITTED AND SEALED!");
            } catch (err) {
              console.error(err);
            } finally {
              handleSessionTermination();
            }
          }}
        />
      )}

      {/* 4. MASTER HUB PANEL */}
      {currentDomain === 'admin_dash' && (
        <AdminDashboard 
          adminUser={userSession} 
          onNavigateToClasses={() => navigateToDomainContext('admin_classes')}
          onNavigateToApproval={() => navigateToDomainContext('admin_approval')}
          onNavigateToArchive={() => navigateToDomainContext('admin_archive')}
          onNavigateToScheduler={() => navigateToDomainContext('admin_scheduler')} // 💡 WIRED CORRECTLY NOW
          onNavigateToLiveSurveillance={(session) => {
            setSelectedAdminLiveSession(session);
            localStorage.setItem('saved_admin_live_context', JSON.stringify(session));
            navigateToDomainContext('admin_live');
          }}
          onLogOut={handleSessionTermination} 
        />
      )}

      {/* ADMIN LEVEL SUBSYSTEM ROUTES */}
      {currentDomain === 'admin_classes' && <AdminClassesDirectory onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_approval' && <AdminApproval onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_archive' && <AdminRecordsArchive onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_scheduler' && <ExamScheduler onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      
      {currentDomain === 'admin_live' && (
        <AdminLiveMonitor 
          selectedSessionInfo={selectedAdminLiveSession} 
          onNavigateBack={() => {
            setSelectedAdminLiveSession(null);
            localStorage.removeItem('saved_admin_live_context');
            navigateToDomainContext('admin_dash');
          }} 
        />
      )}

      {currentDomain === 'admin_gradebook' && <AdminGradebookView onNavigateBack={() => navigateToDomainContext('admin_dash')} />}

      {/* 5. INSTRUCTOR CONTROL PANEL DECK */}
      {currentDomain === 'teacher_dash' && (
        <TeacherDashboard 
          teacher={userSession} 
          initialFolderContext={teacherFolderContext} 
          onFolderContextChange={handleFolderContextCacheUpdate}
          onNavigateToBuilder={(id) => { const c = sanitizeIncomingId(id); setSelectedAssessmentId(c); localStorage.setItem('saved_asm_id_context', String(c)); navigateToDomainContext('teacher_builder'); }}
          onNavigateToMonitor={(id) => { const c = sanitizeIncomingId(id); setSelectedAssessmentId(c); localStorage.setItem('saved_asm_id_context', String(c)); navigateToDomainContext('teacher_monitor'); }}
          onNavigateToGrading={(id) => { const c = sanitizeIncomingId(id); setSelectedAssessmentId(c); localStorage.setItem('saved_asm_id_context', String(c)); navigateToDomainContext('teacher_grading'); }}
          onNavigateToGradebook={(f) => { handleFolderContextCacheUpdate(f); navigateToDomainContext('teacher_gradebook_matrix'); }}
          onNavigateToReview={() => alert("Retrieving Student Scripts...")}
          onLogOut={handleSessionTermination}
        />
      )}

      {currentDomain === 'teacher_grading' && <MarkEssays assessmentId={selectedAssessmentId} onNavigateBack={() => navigateToDomainContext('teacher_dash')} />}
      {currentDomain === 'teacher_gradebook_matrix' && <GradebookMatrix activeFolderContext={teacherFolderContext} onNavigateBack={() => navigateToDomainContext('teacher_dash')} />}
      {currentDomain === 'teacher_builder' && <QuestionBuilder assessmentId={selectedAssessmentId} onNavigateBack={() => navigateToDomainContext('teacher_dash')} />}
      {currentDomain === 'teacher_monitor' && <LiveMonitor assessmentId={selectedAssessmentId} onNavigateBack={() => navigateToDomainContext('teacher_dash')} />}

    </div>
  );
}