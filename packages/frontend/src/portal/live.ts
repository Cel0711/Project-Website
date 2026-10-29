import type { LiveEvent } from '@coreloop/shared';
import { API_BASE } from '../api/client.js';

/**
 * The live channel: the server says "something changed" over Server-Sent Events and each screen that cares
 * reloads what it shows. "resync" is sent after a reconnect or when the tab becomes visible again, to catch
 * anything missed meanwhile.
 */
export type LiveMessage = LiveEvent | { type: 'resync' };

const bus = new EventTarget();
let source: EventSource | null = null;
let hadError = false;

function emit(m: LiveMessage): void {
  bus.dispatchEvent(new CustomEvent('m', { detail: m }));
}

export function onLive(fn: (m: LiveMessage) => void): () => void {
  const h = (e: Event): void => fn((e as CustomEvent<LiveMessage>).detail);
  bus.addEventListener('m', h);
  return () => bus.removeEventListener('m', h);
}

export function startLive(): void {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource(`${API_BASE}/api/events`, { withCredentials: true });
  source.onmessage = (e) => {
    try {
      emit(JSON.parse(e.data) as LiveEvent);
    } catch {
      /* ignore a malformed line */
    }
  };
  source.onerror = () => {
    hadError = true;
  };
  source.onopen = () => {
    if (hadError) {
      hadError = false;
      emit({ type: 'resync' });
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') emit({ type: 'resync' });
  });
}

export function stopLive(): void {
  source?.close();
  source = null;
}
