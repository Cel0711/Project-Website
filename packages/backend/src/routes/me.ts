import { changePasswordSchema, updateProfileSchema, type AuthResponse } from '@coreloop/shared';
import { Router } from 'express';
import { parse, wrap } from '../lib/http-error.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthService } from '../services/auth.service.js';

/** The signed-in person's own account: profile, password, devices. */
export function meRouter(auth: AuthService): Router {
  const router = Router();

  router.patch(
    '/',
    requireAuth(),
    wrap(async (req, res) => {
      const user = await auth.updateProfile(req.user!.id, parse(updateProfileSchema, req.body));
      const body: AuthResponse = { ok: true, user, emailEnabled: auth.emailEnabled };
      res.json(body);
    }),
  );

  // Allowed while "must change password" is set: it is how that flag gets cleared.
  router.post(
    '/password',
    requireAuth({ allowMustChange: true }),
    wrap(async (req, res) => {
      const input = parse(changePasswordSchema, req.body);
      await auth.changePassword(req.user!, req.sessionId, input.currentPassword, input.newPassword, req.ip ?? '');
      res.json({ ok: true });
    }),
  );

  router.get(
    '/sessions',
    requireAuth(),
    wrap(async (req, res) => {
      res.json({ ok: true, sessions: await auth.sessions(req.user!.id, req.sessionId) });
    }),
  );

  router.delete(
    '/sessions/:id',
    requireAuth(),
    wrap(async (req, res) => {
      await auth.revokeSession(req.user!.id, String(req.params['id']));
      res.json({ ok: true });
    }),
  );

  return router;
}
