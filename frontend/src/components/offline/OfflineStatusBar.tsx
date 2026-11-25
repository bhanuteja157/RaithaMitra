// frontend/src/components/offline/OfflineStatusBar.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { ConnectivityState, probeConnectivity } from '@/lib/offline/connectivity';
import {
  listQueuedOperations,
  syncPendingOperations,
} from '@/lib/offline/syncEngine';
import {
  CloudOff,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function OfflineStatusBar() {
  const { currentUser, token } = useFarm();
  const [connState, setConnState] = useState<ConnectivityState>('online_backend_ready');
  const [pendingCount, setPendingCount] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [lowBandwidth, setLowBandwidth] = useState(false);

  const refreshQueueCount = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const q = await listQueuedOperations(currentUser.id);
      setPendingCount(
        q.filter((i) => i.status === 'pending_sync' || i.status === 'failed' || i.status === 'conflict_detected').length
      );
    } catch {
      // IndexedDB unavailable in SSR or restricted context
    }
  }, [currentUser?.id]);

  const checkHealth = useCallback(async () => {
    const st = await probeConnectivity();
    setConnState(st);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLowBandwidth(window.localStorage.getItem('rm_low_bandwidth') === '1');

    checkHealth();
    refreshQueueCount();

    const onOnline = () => checkHealth();
    const onOffline = () => setConnState('browser_offline');
    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);

    // Register Service Worker strictly in production builds
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (reg.waiting) setWaitingWorker(reg.waiting);
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(nw);
              }
            });
          });
        })
        .catch(() => undefined);
    }

    const timer = setInterval(checkHealth, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
    };
  }, [checkHealth, refreshQueueCount]);

  const handleSyncNow = async () => {
    if (!token || !currentUser?.id) return;
    setConnState('syncing');
    try {
      await syncPendingOperations({
        userId: currentUser.id,
        token,
        activeUserIdCheck: () => currentUser?.id,
      });
      await refreshQueueCount();
      await checkHealth();
    } catch {
      setConnState('sync_failed');
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    setLowBandwidth(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('rm_low_bandwidth', next ? '1' : '0');
    }
  };

  const handleApplyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return (
    <div className="bg-white/90 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {connState === 'online_backend_ready' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            Online &amp; Connected
          </span>
        ) : connState === 'browser_offline' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            Offline — Showing Saved Data
          </span>
        ) : connState === 'syncing' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Synchronizing...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-semibold">
            <CloudOff className="w-3.5 h-3.5" />
            Backend Unreachable (Offline Drafts Active)
          </span>
        )}

        <Link
          href="/sync-center"
          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
        >
          Sync Queue: {pendingCount}
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleLowBandwidth}
          className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
            lowBandwidth ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Zap className="w-3 h-3" />
          {lowBandwidth ? 'Low-Data: ON' : 'Low-Data: OFF'}
        </button>

        {pendingCount > 0 && connState === 'online_backend_ready' && (
          <button
            onClick={handleSyncNow}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Sync Now
          </button>
        )}

        {installPrompt && (
          <button
            onClick={handleInstall}
            className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Install App
          </button>
        )}

        {waitingWorker && (
          <button
            onClick={handleApplyUpdate}
            className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-semibold"
          >
            Update Available — Refresh
          </button>
        )}
      </div>
    </div>
  );
}
