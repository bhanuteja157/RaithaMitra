// frontend/src/lib/offline/syncEngine.ts
// User-scoped Offline Operation Queue, Snapshot Cache & Idempotent Synchronization Engine.

import { idbDelete, idbGetByUser, idbPut } from './database';
import { AllowedOfflineOpType, OFFLINE_OPERATIONS } from './operationRegistry';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export type QueueStatus =
  | 'pending_sync'
  | 'synchronizing'
  | 'synchronized'
  | 'failed'
  | 'conflict_detected'
  | 'confirmation_required'
  | 'cancelled';

export interface QueuedOfflineOperation {
  id: string;
  idempotency_key: string;
  user_id: string;
  farm_id: string;
  operation_type: AllowedOfflineOpType;
  payload: Record<string, unknown>;
  status: QueueStatus;
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncReceiptRecord {
  id: string;
  user_id: string;
  operation_type: string;
  idempotency_key: string;
  status: string;
  duplicate_prevented: boolean;
  response: Record<string, unknown>;
  created_at: string;
}

export async function enqueueOfflineOperation(params: {
  userId: string;
  farmId: string;
  operationType: AllowedOfflineOpType;
  payload: Record<string, unknown>;
}): Promise<QueuedOfflineOperation> {
  const now = new Date().toISOString();
  const opId = `qop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const idemKey = `idem_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedOfflineOperation = {
    id: opId,
    idempotency_key: idemKey,
    user_id: params.userId,
    farm_id: params.farmId,
    operation_type: params.operationType,
    payload: params.payload,
    status: 'pending_sync',
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  };
  await idbPut('pending_operations', item);
  return item;
}

export async function listQueuedOperations(userId: string): Promise<QueuedOfflineOperation[]> {
  const rows = await idbGetByUser<QueuedOfflineOperation>('pending_operations', userId);
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function cancelQueuedOperation(opId: string): Promise<void> {
  await idbDelete('pending_operations', opId);
}

export async function listLocalSyncReceipts(userId: string): Promise<SyncReceiptRecord[]> {
  const rows = await idbGetByUser<SyncReceiptRecord>('synchronization_receipts', userId);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function syncPendingOperations(params: {
  userId: string;
  token: string;
  activeUserIdCheck: () => string | undefined;
}): Promise<{ synced: number; conflicts: number; confirmationRequired: number; failed: number }> {
  const queue = await listQueuedOperations(params.userId);
  const eligible = queue.filter((q) => q.status === 'pending_sync' || q.status === 'failed');

  let synced = 0;
  let conflicts = 0;
  let confirmationRequired = 0;
  let failed = 0;

  for (const op of eligible) {
    // Abort immediately if authenticated account switched mid-sync
    if (params.activeUserIdCheck() !== params.userId) {
      break;
    }
    if (!OFFLINE_OPERATIONS[op.operation_type]) continue;

    try {
      const res = await fetch(`${BASE_URL}/sync/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
          operation_type: op.operation_type,
          idempotency_key: op.idempotency_key,
          farm_id: op.farm_id,
          payload: op.payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newStatus: QueueStatus =
        data.status === 'conflict_detected'
          ? 'conflict_detected'
          : data.status === 'confirmation_required'
          ? 'confirmation_required'
          : 'synchronized';

      if (newStatus === 'synchronized') synced += 1;
      else if (newStatus === 'conflict_detected') conflicts += 1;
      else if (newStatus === 'confirmation_required') confirmationRequired += 1;

      await idbPut('pending_operations', {
        ...op,
        status: newStatus,
        last_error: newStatus === 'conflict_detected' ? data.response?.message || 'Conflict detected' : null,
        updated_at: new Date().toISOString(),
      });

      await idbPut('synchronization_receipts', {
        id: data.receipt_id || op.id,
        user_id: params.userId,
        operation_type: op.operation_type,
        idempotency_key: op.idempotency_key,
        status: data.status,
        duplicate_prevented: Boolean(data.duplicate_prevented),
        response: data.response || {},
        created_at: data.created_at || new Date().toISOString(),
      });
    } catch (err: unknown) {
      failed += 1;
      await idbPut('pending_operations', {
        ...op,
        status: 'failed',
        retry_count: op.retry_count + 1,
        last_error: err instanceof Error ? err.message : 'Sync network error',
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { synced, conflicts, confirmationRequired, failed };
}

export async function downloadUserSnapshot(params: {
  userId: string;
  farmId?: string;
  token: string;
}): Promise<Record<string, unknown>> {
  const qs = params.farmId ? `?farm_id=${encodeURIComponent(params.farmId)}` : '';
  const res = await fetch(`${BASE_URL}/sync/snapshot${qs}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  if (!res.ok) {
    throw new Error('Unable to download farm snapshot.');
  }
  const snap = await res.json();
  const ts = snap.snapshot_timestamp || new Date().toISOString();

  await idbPut('offline_metadata', {
    id: `meta_${params.userId}`,
    user_id: params.userId,
    last_synced_at: ts,
  });
  if (snap.farms) {
    await idbPut('farm_snapshots', { id: `farms_${params.userId}`, user_id: params.userId, data: snap.farms, ts });
  }
  if (snap.finance_snapshot) {
    await idbPut('finance_snapshots', { id: `fin_${params.userId}`, user_id: params.userId, data: snap.finance_snapshot, ts });
  }
  if (snap.inventory_snapshot) {
    await idbPut('inventory_snapshots', { id: `inv_${params.userId}`, user_id: params.userId, data: snap.inventory_snapshot, ts });
  }
  if (snap.market_snapshot) {
    await idbPut('market_snapshots', { id: `mkt_${params.userId}`, user_id: params.userId, data: snap.market_snapshot, ts });
  }
  if (snap.decision_snapshot) {
    await idbPut('decision_snapshots', { id: `dec_${params.userId}`, user_id: params.userId, data: snap.decision_snapshot, ts });
  }

  return snap;
}
