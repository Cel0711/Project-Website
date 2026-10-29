import nodemailer from 'nodemailer';
import { env, type SmtpConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  /** False when no SMTP server is configured: nothing is sent and email-dependent features degrade gracefully. */
  readonly enabled: boolean;
  send(message: MailMessage): Promise<void>;
}

export function createMailer(smtp: SmtpConfig | null = env.smtp): Mailer {
  if (!smtp) {
    return {
      enabled: false,
      async send(m) {
        logger.info('email not sent (SMTP is not configured)', { to: m.to, subject: m.subject });
        if (!env.isProd && env.nodeEnv !== 'test') console.log(`\n--- email to ${m.to}: ${m.subject}\n${m.text}\n`);
      },
    };
  }
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  return {
    enabled: true,
    async send(m) {
      await transport.sendMail({ from: smtp.from, to: m.to, subject: m.subject, text: m.text, html: m.html });
    },
  };
}

/** Email is a courtesy on top of the in-app screens, so a failed send is logged and never fails the request. */
export async function sendQuietly(mailer: Mailer, message: MailMessage): Promise<void> {
  try {
    await mailer.send(message);
  } catch (err) {
    logger.warn('email failed', { to: message.to, subject: message.subject, error: String(err) });
  }
}
