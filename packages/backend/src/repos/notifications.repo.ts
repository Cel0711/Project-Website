import type { NotificationItem } from '@coreloop/shared';
import { isoOf, isoOrNull, type Queryable } from '../db/types.js';

export interface NewNotification {
  kind: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Adds an in-app notification. With `coalesce`, an unread one for the same link is refreshed instead of
 * piling up (ten chat messages in a row become one bell entry).
 */
export async function addNotification(q: Queryable, userId: string, n: NewNotification, coalesce = false): Promise<void> {
  if (coalesce && n.link) {
    const r = await q.query('update notifications set title = $3, body = $4, created_at = now() where user_id = $1 and link = $2 and kind = $5 and read_at is null', [userId, n.link, n.title, n.body ?? '', n.kind]);
    if (r.rowCount) return;
  }
  await q.query('insert into notifications (user_id, kind, title, body, link) values ($1, $2, $3, $4, $5)', [userId, n.kind, n.title, n.body ?? '', n.link ?? '']);
}

export async function listNotifications(q: Queryable, userId: string, limit = 30): Promise<{ items: NotificationItem[]; unread: number }> {
  const rows = await q.query('select id, kind, title, body, link, read_at, created_at from notifications where user_id = $1 order by id desc limit $2', [userId, limit]);
  const unread = await q.query<{ n: number }>('select count(*) as n from notifications where user_id = $1 and read_at is null', [userId]);
  return {
    items: rows.rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, readAt: isoOrNull(r.read_at), createdAt: isoOf(r.created_at) })),
    unread: unread.rows[0]?.n ?? 0,
  };
}

export async function markNotificationsRead(q: Queryable, userId: string, ids?: number[]): Promise<void> {
  if (ids?.length) await q.query('update notifications set read_at = now() where user_id = $1 and read_at is null and id = any($2::int[])', [userId, ids]);
  else await q.query('update notifications set read_at = now() where user_id = $1 and read_at is null', [userId]);
}
