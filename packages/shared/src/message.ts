import type { PersonRef } from './auth.js';

export interface ConversationSummary {
  id: string;
  client: PersonRef;
  /** null = the client's "General" thread; otherwise the thread belongs to that quote request. */
  quoteId: string | null;
  quoteRef: string | null;
  subject: string;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unread: number;
}

export interface ChatMessage {
  id: number;
  conversationId: string;
  sender: PersonRef;
  body: string;
  createdAt: string;
  /** System messages (payment reminders, status notes) are drawn differently from chat bubbles. */
  system: boolean;
}

export interface NotificationItem {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

/** What the server pushes over GET /api/events (Server-Sent Events). */
export type LiveEvent =
  | { type: 'message'; conversationId: string; messageId: number }
  | { type: 'quote'; id: string }
  | { type: 'invoice'; id: string }
  | { type: 'notification' };
