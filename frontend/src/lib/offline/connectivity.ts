// frontend/src/lib/offline/connectivity.ts
// Connectivity intelligence distinguishing browser offline vs backend unreachable vs ready.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export type ConnectivityState =
  | 'online_backend_ready'
  | 'online_backend_unreachable'
  | 'browser_offline'
  | 'syncing'
  | 'sync_failed';

export async function probeConnectivity(): Promise<ConnectivityState> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'browser_offline';
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok ? 'online_backend_ready' : 'online_backend_unreachable';
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? 'browser_offline'
      : 'online_backend_unreachable';
  }
}
