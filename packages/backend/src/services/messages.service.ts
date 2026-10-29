import type { ChatMessage, ConversationSummary, PublicUser } from '@coreloop/shared';
import { isoOf, isoOrNull, type Db, type Queryable, type Row } from '../db/types.js';
import { forbidden, notFound } from '../lib/http-error.js';
import * as emails from './email-templates.js';
import type { Notifier } from './notifier.js';
import { addNotification } from '../repos/notifications.repo.js';
import { activeIdsByRole } from '../repos/users.repo.js';

const EMAIL_EVERY_MS = 15 * 60_000;

const CONV_SQL = `
  select c.id, c.client_id, c.quote_id, c.subject, c.last_message_at, c.last_message_preview,
         q.ref as quote_ref, u.full_name, u.email, u.company,
         (select count(*) from messages m
           where m.conversation_id = c.id and m.sender_id is distinct from $1
             and m.id > coalesce(r.last_read_message_id, 0) and ($2::boolean or not m.system)) as unread
    from conversations c
    join users u on u.id = c.client_id
    left join quote_requests q on q.id = c.quote_id
    left join conversation_reads r on r.conversation_id = c.id and r.user_id = $1`;

function conversation(r: Row): ConversationSummary {
  return {
    id: r.id,
    client: { id: r.client_id, fullName: r.full_name, email: r.email, company: r.company },
    quoteId: r.quote_id ?? null,
    quoteRef: r.quote_ref ?? null,
    subject: r.subject,
    lastMessageAt: isoOrNull(r.last_message_at),
    lastMessagePreview: r.last_message_preview,
    unread: Number(r.unread ?? 0),
  };
}

function chatMessage(r: Row): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    sender: r.sender_id ? { id: r.sender_id, fullName: r.full_name, role: r.role } : { id: '', fullName: 'Lab-Lace', role: 'admin' },
    body: r.body,
    createdAt: isoOf(r.created_at),
    system: !!r.system,
  };
}

/** Chat between a client and the team. A client sees their own threads; every Admin sees all of them. */
export class MessagesService {
  private readonly lastEmail = new Map<string, number>();

  constructor(
    private readonly db: Db,
    private readonly n: Notifier,
  ) {}

  /** The thread that is not about any one request. Created on demand. */
  async ensureGeneral(q: Queryable, clientId: string): Promise<string> {
    await q.query(`insert into conversations (client_id, subject) values ($1, 'General') on conflict (client_id) where quote_id is null do nothing`, [clientId]);
    const r = await q.query<{ id: string }>('select id from conversations where client_id = $1 and quote_id is null', [clientId]);
    return r.rows[0]!.id;
  }

  async list(user: PublicUser): Promise<ConversationSummary[]> {
    if (user.role === 'finance') throw forbidden();
    const isClient = user.role === 'client';
    if (isClient) await this.ensureGeneral(this.db, user.id);
    const scope = isClient ? 'where c.client_id = $1' : 'where (c.last_message_at is not null or c.quote_id is not null)';
    const r = await this.db.query(`${CONV_SQL} ${scope} order by c.last_message_at desc nulls last, c.created_at desc`, [user.id, isClient]);
    return r.rows.map(conversation);
  }

  private async get(user: PublicUser, convId: string): Promise<ConversationSummary> {
    if (user.role === 'finance') throw forbidden();
    const isClient = user.role === 'client';
    const r = await this.db.query(`${CONV_SQL} where c.id::text = $3 ${isClient ? 'and c.client_id = $1' : ''}`, [user.id, isClient, convId]);
    if (!r.rows[0]) throw notFound('Conversation not found');
    return conversation(r.rows[0]);
  }

  async thread(user: PublicUser, convId: string, opts: { afterId?: number; limit?: number } = {}): Promise<{ conversation: ConversationSummary; messages: ChatMessage[]; otherReadId: number }> {
    const conv = await this.get(user, convId);
    const limit = Math.min(Math.max(opts.limit ?? 80, 1), 200);
    const base = `select m.id, m.conversation_id, m.sender_id, m.body, m.system, m.created_at, u.full_name, u.role
                    from messages m left join users u on u.id = m.sender_id where m.conversation_id = $1`;
    const rows = opts.afterId
      ? await this.db.query(`${base} and m.id > $2 order by m.id limit ${limit}`, [conv.id, opts.afterId])
      : await this.db.query(`select * from (${base} order by m.id desc limit ${limit}) t order by id`, [conv.id]);
    // "Seen": how far the other side has read
    const other = await this.db.query<{ id: number | null }>(
      user.role === 'client'
        ? `select max(r.last_read_message_id) as id from conversation_reads r join users u on u.id = r.user_id where r.conversation_id = $1 and u.role = 'admin'`
        : 'select max(r.last_read_message_id) as id from conversation_reads r where r.conversation_id = $1 and r.user_id = $2',
      user.role === 'client' ? [conv.id] : [conv.id, conv.client.id],
    );
    return { conversation: conv, messages: rows.rows.map(chatMessage), otherReadId: other.rows[0]?.id ?? 0 };
  }

  async post(user: PublicUser, convId: string, body: string): Promise<ChatMessage> {
    if (user.role === 'finance') throw forbidden('Finance accounts do not take part in conversations.');
    const conv = await this.get(user, convId);
    const admins = await activeIdsByRole(this.db, ['admin']);
    const toClient = user.role !== 'client';
    const recipients = toClient ? [conv.client.id] : admins.filter((id) => id !== user.id);
    const preview = body.replace(/\s+/g, ' ').slice(0, 140);
    const link = `/messages/${conv.id}`;

    const msg = await this.db.tx(async (q) => {
      const r = await q.query(`insert into messages (conversation_id, sender_id, body) values ($1, $2, $3) returning id, conversation_id, sender_id, body, system, created_at`, [conv.id, user.id, body]);
      await q.query('update conversations set last_message_at = now(), last_message_preview = $2 where id = $1', [conv.id, preview]);
      await q.query(
        `insert into conversation_reads (conversation_id, user_id, last_read_message_id) values ($1, $2, $3)
         on conflict (conversation_id, user_id) do update set last_read_message_id = greatest(conversation_reads.last_read_message_id, excluded.last_read_message_id)`,
        [conv.id, user.id, r.rows[0]!.id],
      );
      for (const id of recipients) await addNotification(q, id, { kind: 'message', title: `New message from ${user.fullName}`, body: preview, link }, true);
      return chatMessage({ ...r.rows[0], full_name: user.fullName, role: user.role });
    });

    this.n.push([conv.client.id, ...admins], { type: 'message', conversationId: conv.id, messageId: msg.id });
    this.n.push(recipients, { type: 'notification' });
    this.emailOffline(user, conv, recipients, preview);
    return msg;
  }

  /** An email only when nobody on the receiving side has the page open, and at most one per thread every 15 minutes. */
  private emailOffline(sender: PublicUser, conv: ConversationSummary, recipients: string[], preview: string): void {
    if (!this.n.mailer.enabled) return;
    const offline = recipients.filter((id) => !this.n.hub.isOnline(id));
    if (!offline.length) return;
    const toClient = sender.role !== 'client';
    const key = `${toClient ? conv.client.id : 'team'}:${conv.id}`;
    if (Date.now() - (this.lastEmail.get(key) ?? 0) < EMAIL_EVERY_MS) return;
    this.lastEmail.set(key, Date.now());
    const url = this.n.url(`/messages/${conv.id}`);
    if (toClient && conv.client.email) void this.n.email(conv.client.email, emails.newMessage({ company: this.n.company, name: conv.client.fullName, from: `the ${this.n.company} team`, preview, url }));
    else void this.n.emailTeam(emails.newMessage({ company: this.n.company, name: 'team', from: sender.fullName, preview, url }));
  }

  /** A line the system itself writes into a client's General thread (payment reminders and the like). */
  async postSystem(senderId: string, clientId: string, body: string): Promise<void> {
    const convId = await this.ensureGeneral(this.db, clientId);
    const r = await this.db.query<{ id: number }>('insert into messages (conversation_id, sender_id, body, system) values ($1, $2, $3, true) returning id', [convId, senderId, body]);
    await this.db.query('update conversations set last_message_at = now(), last_message_preview = $2 where id = $1', [convId, body.slice(0, 140)]);
    this.n.push([clientId], { type: 'message', conversationId: convId, messageId: r.rows[0]!.id });
  }

  async markRead(user: PublicUser, convId: string): Promise<void> {
    const conv = await this.get(user, convId);
    const last = await this.db.query<{ id: number | null }>('select max(id) as id from messages where conversation_id = $1', [conv.id]);
    const id = last.rows[0]?.id ?? 0;
    if (!id) return;
    await this.db.query(
      `insert into conversation_reads (conversation_id, user_id, last_read_message_id) values ($1, $2, $3)
       on conflict (conversation_id, user_id) do update set last_read_message_id = greatest(conversation_reads.last_read_message_id, excluded.last_read_message_id)`,
      [conv.id, user.id, id],
    );
    await this.db.query("update notifications set read_at = now() where user_id = $1 and kind = 'message' and link = $2 and read_at is null", [user.id, `/messages/${conv.id}`]);
    // tell the other side so their "Seen" updates, and the reader's other tabs so their badges do
    const admins = await activeIdsByRole(this.db, ['admin']);
    this.n.push([conv.client.id, ...admins], { type: 'message', conversationId: conv.id, messageId: id });
  }

  /** An Admin opens (or creates) the General thread with a client to write first. */
  async start(user: PublicUser, clientId: string): Promise<ConversationSummary> {
    if (user.role !== 'admin') throw forbidden();
    const c = await this.db.query("select id from users where id = $1 and role = 'client'", [clientId]);
    if (!c.rows[0]) throw notFound('Client not found');
    const convId = await this.ensureGeneral(this.db, clientId);
    return this.get(user, convId);
  }
}
