// frontend/src/app/sync-center/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { ConnectivityState, probeConnectivity } from '@/lib/offline/connectivity';
import { clearUserSnapshots, idbGetByUser } from '@/lib/offline/database';
import { OFFLINE_OPERATIONS } from '@/lib/offline/operationRegistry';
import {
  cancelQueuedOperation,
  downloadUserSnapshot,
  enqueueOfflineOperation,
  listLocalSyncReceipts,
  listQueuedOperations,
  QueuedOfflineOperation,
  syncPendingOperations,
  SyncReceiptRecord,
} from '@/lib/offline/syncEngine';
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function SyncCenterPage() {
  const { currentFarm, currentUser, token } = useFarm();
  const [connState, setConnState] = useState<ConnectivityState>('online_backend_ready');
  const [queue, setQueue] = useState<QueuedOfflineOperation[]>([]);
  const [receipts, setReceipts] = useState<SyncReceiptRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [expAmount, setExpAmount] = useState(500);
  const [expCat, setExpCat] = useState('fertilizers');
  const [expDesc, setExpDesc] = useState('Fertilizer / Field Expense (Offline Ready)');

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLocalState = useCallback(async () => {
    const st = await probeConnectivity();
    setConnState(st);
    if (!currentUser?.id) return;
    try {
      const [qRows, rRows, metaRows] = await Promise.all([
        listQueuedOperations(currentUser.id),
        listLocalSyncReceipts(currentUser.id),
        idbGetByUser<{ id: string; user_id: string; last_synced_at?: string }>('offline_metadata', currentUser.id),
      ]);
      setQueue(qRows);
      setReceipts(rRows);
      setLastSyncedAt(metaRows[0]?.last_synced_at || null);
    } catch {
      // non-fatal
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadLocalState();
  }, [loadLocalState]);

  const handleQueueExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setErrorMsg(null);
    try {
      await enqueueOfflineOperation({
        userId: currentUser.id,
        farmId: currentFarm?.id || 'farm_001',
        operationType: 'create_manual_expense',
        payload: {
          amount_inr: expAmount,
          category: expCat,
          description: expDesc,
          tx_date: new Date().toISOString().slice(0, 10),
        },
      });
      setStatusMsg(`Saved ₹${expAmount} expense locally in IndexedDB queue.`);
      loadLocalState();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to queue expense.');
    }
  };

  const handleSyncNow = async () => {
    if (!token || !currentUser?.id) return;
    setErrorMsg(null);
    setConnState('syncing');
    try {
      const res = await syncPendingOperations({
        userId: currentUser.id,
        token,
        activeUserIdCheck: () => currentUser?.id,
      });
      setStatusMsg(
        `Sync complete: ${res.synced} synchronized, ${res.confirmationRequired} awaiting confirmation, ${res.conflicts} conflicts, ${res.failed} failed.`
      );
      loadLocalState();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Synchronization failed.');
      loadLocalState();
    }
  };

  const handleDownloadSnapshot = async () => {
    if (!token || !currentUser?.id) return;
    setErrorMsg(null);
    try {
      await downloadUserSnapshot({
        userId: currentUser.id,
        farmId: currentFarm?.id,
        token,
      });
      setStatusMsg('Downloaded latest farm, finance, inventory, market, and decision snapshots to IndexedDB.');
      loadLocalState();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Snapshot download failed.');
    }
  };

  const handleClearOptionalCache = async () => {
    if (!currentUser?.id) return;
    await clearUserSnapshots(currentUser.id, false);
    setStatusMsg('Cleared cached read-only snapshots (unsynchronized drafts and pending queue preserved).');
    loadLocalState();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AD-31 Offline-First PWA &amp; Synchronization Center
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Offline Queue, Snapshots &amp; Conflict Resolution
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                IndexedDB user-scoped storage, idempotent queue synchronization, and offline-ready agricultural records.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadSnapshot}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <CloudDownload className="w-4 h-4" />
              Save Offline Snapshot
            </button>
            <button
              onClick={handleSyncNow}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500">Connectivity</div>
            <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5 text-sm">
              {connState === 'online_backend_ready' ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
              {connState.replace(/_/g, ' ')}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500">Last Snapshot Sync</div>
            <div className="font-bold text-slate-900 mt-1 text-sm">
              {lastSyncedAt ? lastSyncedAt.slice(0, 19).replace('T', ' ') : 'Not synced yet'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500">Queued Operations</div>
            <div className="font-bold text-amber-700 mt-1 text-xl">{queue.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500">Sync Receipts</div>
            <div className="font-bold text-emerald-700 mt-1 text-xl">{receipts.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <form onSubmit={handleQueueExpense} className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Queue Offline Agricultural Expense
            </h2>
            <div>
              <label className="font-semibold text-slate-600">Amount (₹)</label>
              <input
                type="number"
                min={1}
                value={expAmount}
                onChange={(e) => setExpAmount(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600">Category</label>
              <select
                value={expCat}
                onChange={(e) => setExpCat(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
              >
                <option value="fertilizers">Fertilizers</option>
                <option value="seed_procurement">Seed Procurement</option>
                <option value="labour">Labour</option>
                <option value="transport">Transport</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600">Description</label>
              <input
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">
              Save Expense Locally to Queue
            </button>
          </form>

          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Pending &amp; Processed Queue ({queue.length})</h2>
              <button
                onClick={handleClearOptionalCache}
                className="text-slate-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Read-Only Cache
              </button>
            </div>
            {queue.length === 0 ? (
              <p className="text-slate-500">No operations queued for {currentUser?.name}.</p>
            ) : (
              <div className="space-y-2.5">
                {queue.map((op) => (
                  <div key={op.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-start gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {OFFLINE_OPERATIONS[op.operation_type]?.label || op.operation_type}
                      </div>
                      <div className="text-slate-600">
                        Status: <span className="font-bold uppercase">{op.status}</span> • Key: {op.idempotency_key.slice(0, 18)}...
                      </div>
                      {op.last_error && <div className="text-rose-700 mt-0.5">{op.last_error}</div>}
                    </div>
                    {op.status !== 'synchronized' && (
                      <button
                        onClick={async () => {
                          await cancelQueuedOperation(op.id);
                          loadLocalState();
                        }}
                        className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
