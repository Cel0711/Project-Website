import { emailOnlySchema, loginSchema, registerSchema, resetPasswordSchema, tokenSchema, type AuthResponse, type PublicUser } from '@coreloop/shared';
import { Router, type Request, type Response } from 'express';
import { cookieOptions, requireAuth, SESSION_COOKIE } from '../middleware/auth.js';
import type { Limiters } from '../middleware/limits.js';
import { parse, wrap } from '../lib/http-error.js';
import type { AuthService, RequestMeta } from '../services/auth.service.js';

export function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip ?? '', userAgent: req.get('user-agent') ?? '' };
}

export function authRouter(auth: AuthService, limits: Limiters): Router {
  const router = Router();

  const reply = (res: Response, user: PublicUser | null, status = 200): void => {
    const body: AuthResponse = { ok: true, user, emailEnabled: auth.emailEnabled };
    res.status(status).json(body);
  };

  router.post(
    '/register',
    limits.register,
    wrap(async (req, res) => {
      const { user, token } = await auth.register(parse(registerSchema, req.body), requestMeta(req));
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      reply(res, user, 201);
    }),
  );

  router.post(
    '/login',
    limits.login,
    wrap(async (req, res) => {
      const input = parse(loginSchema, req.body);
      const { user, token } = await auth.login(input.identifier, input.password, requestMeta(req));
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      reply(res, user);
    }),
  );

  router.post(
    '/logout',
    wrap(async (req, res) => {
      if (req.sessionId) await auth.logout(req.sessionId);
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      res.json({ ok: true });
    }),
  );

  // Not an error when nobody is signed in: the landing page asks on every load to decide what the nav shows.
  router.get('/me', (req, res) => reply(res, req.user ?? null));

  router.post(
    '/verify',
    limits.mail,
    wrap(async (req, res) => {
      await auth.verifyEmail(parse(tokenSchema, req.body).token);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/resend-verification',
    requireAuth({ allowMustChange: true }),
    limits.mail,
    wrap(async (req, res) => {
      await auth.resendVerification(req.user!);
      res.json({ ok: true, emailEnabled: auth.emailEnabled });
    }),
  );

  router.post(
    '/forgot',
    limits.mail,
    wrap(async (req, res) => {
      await auth.forgot(parse(emailOnlySchema, req.body).email);
      res.json({ ok: true, emailEnabled: auth.emailEnabled });
    }),
  );

  router.post(
    '/remind',
    limits.mail,
    wrap(async (req, res) => {
      await auth.remind(parse(emailOnlySchema, req.body).email);
      res.json({ ok: true, emailEnabled: auth.emailEnabled });
    }),
  );

  router.post(
    '/reset',
    limits.mail,
    wrap(async (req, res) => {
      const input = parse(resetPasswordSchema, req.body);
      await auth.resetPassword(input.token, input.password, req.ip ?? '');
      res.json({ ok: true });
    }),
  );

  return router;
}
