import { useEffect, useState } from 'react';
import { getAllUnsyncedAnswers, clearSyncedAnswers } from '../core/offlineDb';

export function useOfflineSync(assessmentId, studentId, syncIntervalMs = 30000) {
  const [syncStatus, setSyncStatus] = useState('Synced'); // 'Synced' | 'Syncing...' | 'Offline_Saving_Local'

  useEffect(() => {
    const executeBatchSync = async () => {
      // Pull whatever answers are currently saved on this computer's hard drive
      const unsyncedRecords = await getAllUnsyncedAnswers();
      
      // If nothing has changed, keep status clean and stop
      if (unsyncedRecords.length === 0) {
        setSyncStatus('Synced');
        return;
      }

      setSyncStatus('Syncing...');

      // 📦 COMPILE THE BATCH PAYLOAD FOR THE LARAVEL CONTROLLER
      const batchPayload = {
        student_id: studentId,
        assessment_id: assessmentId,
        sync_packet: unsyncedRecords
      };

      try {
        // Dispatches the entire bundle in ONE single network request to minimize router load
        const response = await fetch('http://192.168.1.100/api/v1/exam/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchPayload)
        });

        if (response.ok) {
          // If Laravel says "Got it!", erase those specific answers from our local queue
          const syncedIds = unsyncedRecords.map(r => r.question_id);
          await clearSyncedAnswers(syncedIds);
          setSyncStatus('Synced');
        } else {
          setSyncStatus('Offline_Saving_Local');
        }
      } catch (error) {
        // If Wi-Fi fails or server dies, catch the error silently so the student's exam doesn't freeze
        console.warn('[OFFLINE ENGINE] LAN Server unreachable. Retaining progress in IndexedDB.');
        setSyncStatus('Offline_Saving_Local');
      }
    };

    // Run this process automatically on your timed loop interval
    const syncTimer = setInterval(executeBatchSync, syncIntervalMs);
    return () => clearInterval(syncTimer);
  }, [assessmentId, studentId, syncIntervalMs]);

  return syncStatus;
}