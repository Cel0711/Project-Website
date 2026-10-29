import { messageSchema, startConversationSchema } from '@coreloop/shared';
import { Router } from 'express';
import { z } from 'zod';
import { parse, wrap } from '../lib/http-error.js';
import type { SseHub } from '../lib/sse.js';
import { requireAuth, requireRole, requireVerified } from '../middleware/auth.js';
import type { Limiters } from '../middleware/limits.js';
import type { Db } from '../db/types.js';
import { listNotifications, markNotificationsRead } from '../repos/notifications.repo.js';
import type { MessagesService } from '../services/messages.service.js';

const markReadSchema = z.object({ ids: z.array(z.number().int()).max(200).optional() });

/** Client <-> team chat. Clients see their own threads, Admins see all, Finance none. */
export function conversationsRouter(messages: MessagesService, limits: Limiters): Router {
  const router = Router();
  const chat = requireRole('admin', 'client');

  router.get(
    '/',
    chat,
    wrap(async (req, res) => {
      res.json({ ok: true, conversations: await messages.list(req.user!) });
    }),
  );

  router.post(
    '/',
    requireRole('admin'),
    wrap(async (req, res) => {
      const input = parse(startConversationSchema, req.body);
      res.status(201).json({ ok: true, conversation: await messages.start(req.user!, input.clientId) });
    }),
  );

  router.get(
    '/:id/messages',
    chat,
    wrap(async (req, res) => {
      const after = Number(req.query['after']);
      const limit = Number(req.query['limit']);
      const r = await messages.thread(req.user!, String(req.params['id']), { afterId: Number.isFinite(after) && after > 0 ? after : undefined, limit: Number.isFinite(limit) && limit > 0 ? limit : undefined });
      res.json({ ok: true, ...r });
    }),
  );

  router.post(
    '/:id/messages',
    chat,
    requireVerified,
    limits.message,
    wrap(async (req, res) => {
      const input = parse(messageSchema, req.body);
      res.status(201).json({ ok: true, message: await messages.post(req.user!, String(req.params['id']), input.body) });
    }),
  );

  router.post(
    '/:id/read',
    chat,
    wrap(async (req, res) => {
      await messages.markRead(req.user!, String(req.params['id']));
      res.json({ ok: true });
    }),
  );

  return router;
}

/** The bell: in-app notifications for whoever is signed in. */
export function notificationsRouter(db: Db): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth(),
    wrap(async (req, res) => {
      res.json({ ok: true, ...(await listNotifications(db, req.user!.id)) });
    }),
  );

  router.post(
    '/read',
    requireAuth(),
    wrap(async (req, res) => {
      await markNotificationsRead(db, req.user!.id, parse(markReadSchema, req.body ?? {}).ids);
      res.json({ ok: true });
    }),
  );

  return router;
}

/** One open stream per browser tab. The server only says "something changed"; the page then fetches what it needs. */
export function eventsRouter(hub: SseHub): Router {
  const router = Router();
  router.get('/', requireAuth({ allowMustChange: true }), (req, res) => {
    hub.subscribe(req.user!.id, res);
    res.write(': connected\n\n');
  });
  return router;
}
