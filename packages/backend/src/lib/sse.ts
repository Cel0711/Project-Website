import type { Response } from 'express';
import type { LiveEvent } from '@coreloop/shared';

/**
 * Server-Sent Events fan-out: every open browser tab of a signed-in user is one subscriber. The API runs as a
 * single PM2 process, so an in-memory map is enough; with several processes this would move to Postgres
 * LISTEN/NOTIFY.
 */
export class SseHub {
  private readonly subs = new Map<string, Set<Response>>();
  private beat: ReturnType<typeof setInterval> | undefined;

  /** Keeps proxies from closing idle streams: a comment line every 25 seconds. */
  start(): void {
    this.beat ??= setInterval(() => {
      for (const set of this.subs.values()) for (const res of set) res.write(': ping\n\n');
    }, 25_000);
    this.beat.unref?.();
  }

  stop(): void {
    if (this.beat) clearInterval(this.beat);
    this.beat = undefined;
    for (const set of this.subs.values()) for (const res of set) res.end();
    this.subs.clear();
  }

  subscribe(userId: string, res: Response): void {
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx: do not buffer this stream
    });
    res.write('retry: 3000\n\n');
    const set = this.subs.get(userId) ?? new Set<Response>();
    set.add(res);
    this.subs.set(userId, set);
    res.on('close', () => {
      set.delete(res);
      if (!set.size) this.subs.delete(userId);
    });
  }

  /** True when that user has at least one tab open right now (used to skip emailing someone who is looking at the page). */
  isOnline(userId: string): boolean {
    return (this.subs.get(userId)?.size ?? 0) > 0;
  }

  publish(userIds: Iterable<string>, event: LiveEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const id of new Set(userIds)) for (const res of this.subs.get(id) ?? []) res.write(payload);
  }
}
