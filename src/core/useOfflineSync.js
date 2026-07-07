import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import { getAllUnsyncedAnswers, clearSyncedAnswers } from './offlineDb'; 

export function useOfflineSync(assessmentId, studentId, intervalMs = 15000) {
  const [syncStatus, setSyncStatus] = useState('Synced');

  useEffect(() => {
    if (!assessmentId) return;

    const performLanBackgroundSync = async () => {
      let unsyncedPackets = [];
      try {
        unsyncedPackets = await getAllUnsyncedAnswers();
      } catch (err) {
        console.error("[OFFLINE ENGINE] Failed reading IndexedDB rows:", err);
        return;
      }

      if (unsyncedPackets.length === 0) {
        setSyncStatus('Synced');
        return;
      }

      setSyncStatus('Syncing...');
      
      for (const packet of unsyncedPackets) {
        try {
          // Pull live strikes from localStorage context to ensure syncing threads remain perfectly accurate
          const persistedStrikes = parseInt(localStorage.getItem(`exam_strikes_${assessmentId}_${studentId}`), 10) || 0;

          const response = await apiRequest(`api/v1/student/assessments/${assessmentId}/sync-telemetry`, {
            method: 'POST',
            body: JSON.stringify({
              question_id: packet.question_id,
              answered_index: packet.answered_index,
              theory_response: packet.theory_response,
              security_strikes: persistedStrikes, 
              current_seconds_remaining: packet.current_seconds_remaining || null,
              objective_progress_string: packet.objective_progress_string || null,
              theory_progress_string: packet.theory_progress_string || null
            })
          });

          if (response.ok) {
            await clearSyncedAnswers([packet.question_id]);
            console.log(`[OFFLINE ENGINE] Question node ID ${packet.question_id} securely committed to master server.`);
          } else {
            console.warn(`[OFFLINE ENGINE] Server rejected data package: ${response.status}`);
            setSyncStatus('Error Syncing');
            return; 
          }
        } catch (error) {
          console.error("[OFFLINE ENGINE] LAN Server unreachable. Retaining progress in IndexedDB.");
          setSyncStatus('Offline Buffer');
          return; 
        }
      }

      setSyncStatus('Synced');
    };

    const syncWorkerDaemon = setInterval(performLanBackgroundSync, intervalMs);
    return () => clearInterval(syncWorkerDaemon);
  }, [assessmentId, studentId, intervalMs]);

  return syncStatus;
}