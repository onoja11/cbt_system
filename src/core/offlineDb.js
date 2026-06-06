import { openDB } from 'idb';

const DB_NAME = 'Veritas_CBT_Offline_Core';
const DB_VERSION = 1;

// 💡 1. INITIALIZE THE LOCAL DATA VAULTS
export const initOfflineDb = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store A: Caches incoming question sheets so they run with zero loading latency
      if (!db.objectStoreNames.contains('assessment_payload')) {
        db.createObjectStore('assessment_payload', { keyPath: 'assessment_id' });
      }
      // Store B: Queue for tracking student choices, timestamps, and security flags
      if (!db.objectStoreNames.contains('student_sync_queue')) {
        db.createObjectStore('student_sync_queue', { keyPath: 'question_id' });
      }
    },
  });
};

// 💡 2. INSTANTLY WRITE STUDENT SELECTIONS TO LOCAL STORAGE
export const saveAnswerLocally = async (answerPacket) => {
  const db = await initOfflineDb();
  // Overwrites old entries automatically if the student changes their mind on an answer
  await db.put('student_sync_queue', {
    ...answerPacket,
    client_timestamp: new Date().toISOString()
  });
};

// 💡 3. FETCH ALL ANSWERS CURRENTLY LOGGED INSIDE THE LOCAL HARD DRIVE
export const getAllUnsyncedAnswers = async () => {
  const db = await initOfflineDb();
  return db.getAll('student_sync_queue');
};

// 💡 4. WIPE PROCESSED ENTRIES ONCE THE LAN SERVER CONFIRMS RECEIPT
export const clearSyncedAnswers = async (questionIdsArray) => {
  const db = await initOfflineDb();
  const tx = db.transaction('student_sync_queue', 'readwrite');
  for (const id of questionIdsArray) {
    await tx.store.delete(id);
  }
  await tx.done;
};