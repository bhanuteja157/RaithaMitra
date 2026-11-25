// frontend/src/lib/offline/database.ts
// Versioned IndexedDB storage for AD-31 Offline-First Intelligence.
// All private records are strictly scoped by userId.

const DB_NAME = 'raithamitra_offline_db';
const DB_VERSION = 1;

export const OFFLINE_STORES = [
  'offline_metadata',
  'farm_snapshots',
  'finance_snapshots',
  'inventory_snapshots',
  'market_snapshots',
  'decision_snapshots',
  'offline_drafts',
  'pending_operations',
  'synchronization_receipts',
  'synchronization_conflicts',
  'user_preferences',
] as const;

export type OfflineStoreName = (typeof OFFLINE_STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openOfflineDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is unavailable in this environment.'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of OFFLINE_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const os = db.createObjectStore(store, { keyPath: 'id' });
          os.createIndex('by_user', 'user_id', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB.'));
  });
  return dbPromise;
}

export async function idbPut<T extends { id: string; user_id: string }>(
  storeName: OfflineStoreName,
  record: T
): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetByUser<T extends { id: string; user_id: string }>(
  storeName: OfflineStoreName,
  userId: string
): Promise<T[]> {
  if (!userId) return [];
  const db = await openOfflineDb();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const idx = tx.objectStore(storeName).index('by_user');
    const req = idx.getAll(IDBKeyRange.only(userId));
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: OfflineStoreName, id: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearUserSnapshots(userId: string, includeQueue = false): Promise<void> {
  if (!userId) return;
  const storesToClear: OfflineStoreName[] = [
    'offline_metadata',
    'farm_snapshots',
    'finance_snapshots',
    'inventory_snapshots',
    'market_snapshots',
    'decision_snapshots',
  ];
  if (includeQueue) {
    storesToClear.push('offline_drafts', 'pending_operations', 'synchronization_conflicts');
  }
  for (const store of storesToClear) {
    const rows = await idbGetByUser<{ id: string; user_id: string }>(store, userId);
    for (const r of rows) {
      await idbDelete(store, r.id);
    }
  }
}
