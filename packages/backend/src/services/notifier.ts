import type { LiveEvent } from '@coreloop/shared';
import type { SseHub } from '../lib/sse.js';
import { sendQuietly, type MailMessage, type Mailer } from './mailer.js';

export interface NotifierConfig {
  appUrl: string;
  companyName: string;
  /** Shared team inbox that gets an email when a client writes. */
  notifyEmail: string;
}

/** Everything that tells a person something happened: live push to open tabs, plus email. */
export class Notifier {
  constructor(
    readonly hub: SseHub,
    readonly mailer: Mailer,
    readonly cfg: NotifierConfig,
  ) {}

  get company(): string {
    return this.cfg.companyName;
  }

  /** A link into the portal, e.g. url('/requests/QT-2026-0001'). */
  url(portalPath: string): string {
    return `${this.cfg.appUrl}/portal/#${portalPath}`;
  }

  /** The sign-in page on the landing site. */
  loginUrl(): string {
    return `${this.cfg.appUrl}/#/login`;
  }

  push(userIds: Iterable<string>, event: LiveEvent): void {
    this.hub.publish(userIds, event);
  }

  /** Sends email, never throws, and does nothing when SMTP is not configured. */
  email(to: string, body: Omit<MailMessage, 'to'>): Promise<void> {
    return sendQuietly(this.mailer, { to, ...body });
  }

  /** Emails the shared team inbox. */
  emailTeam(body: Omit<MailMessage, 'to'>): Promise<void> {
    return this.email(this.cfg.notifyEmail, body);
  }
}
