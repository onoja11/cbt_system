import React, { useState, useEffect } from 'react';
import Login from './shared/Login';
import TeacherDashboard from './teacher/pages/TeacherDashboard';
import QuestionBuilder from './teacher/pages/QuestionBuilder';
import LiveMonitor from './teacher/pages/LiveMonitor'; 
import StudentLobby from './student/pages/StudentLobby'; 
import ExamWorkspace from './student/pages/ExamWorkspace'; 
import { apiRequest } from './core/api';

import { getAllUnsyncedAnswers, clearSyncedAnswers } from './core/offlineDb';

// ADMINISTRATIVE MASTER MODULE IMPORTS
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminApproval from './admin/pages/AdminApproval';
import AdminClassesDirectory from './admin/pages/AdminClassesDirectory';
import AdminLiveMonitor from './admin/pages/AdminLiveMonitor';
import AdminExamAuditCenter from './admin/pages/AdminExamAuditCenter';
import ExamScheduler from './admin/pages/ExamScheduler';
import AdminUsersDirectory from './admin/pages/AdminUsersDirectory';
import DataInspectorPortal from './admin/pages/DataInspectorPortal';

// DYNAMIC GRADING WORKSPACE IMPORTS
import MarkEssays from './teacher/pages/MarkEssays';
import GradebookMatrix from './teacher/pages/GradebookMatrix';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('login'); 
  const [userSession, setUserSession] = useState(null);
  
  const [teacherFolderContext, setTeacherFolderContext] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedAdminLiveSession, setSelectedAdminLiveSession] = useState(null);

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
      
      {currentDomain === 'login' && (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}

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
            } catch (err) {
              console.error(err);
            } finally {
              // 🎯 Return to lobby after exam submission so they can use "View Graded Objective Results"
              navigateToDomainContext('student_lobby');
            }
          }}
        />
      )}

      {currentDomain === 'admin_dash' && (
        <AdminDashboard 
          adminUser={userSession} 
          onNavigateToClasses={() => navigateToDomainContext('admin_classes')}
          onNavigateToApproval={() => navigateToDomainContext('admin_approval')}
          onNavigateToArchive={() => navigateToDomainContext('admin_archive')}
          onNavigateToScheduler={() => navigateToDomainContext('admin_scheduler')}
          onNavigateToUsers={() => navigateToDomainContext('admin_users_directory')}
          onNavigateToDataInspector={() => navigateToDomainContext('admin_data_inspector')}
          onNavigateToLiveSurveillance={(session) => {
            setSelectedAdminLiveSession(session);
            localStorage.setItem('saved_admin_live_context', JSON.stringify(session));
            navigateToDomainContext('admin_live');
          }}
          onLogOut={handleSessionTermination} 
        />
      )}

      {currentDomain === 'admin_classes' && <AdminClassesDirectory onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_approval' && <AdminApproval onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_archive' && <AdminExamAuditCenter onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_scheduler' && <ExamScheduler onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_users_directory' && <AdminUsersDirectory onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      {currentDomain === 'admin_data_inspector' && <DataInspectorPortal onNavigateBack={() => navigateToDomainContext('admin_dash')} />}
      
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