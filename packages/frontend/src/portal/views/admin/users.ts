import type { PublicUser } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { $, esc, toast } from '../../../core/dom.js';
import { confirmDialog, openDialog } from '../../dialog.js';
import type { View } from '../../routes.js';
import { ago, avatar, badge, card, empty, options, pageHead, table } from '../../ui.js';

const ROLE_LABEL = { admin: 'Admin', finance: 'Finance', client: 'Client' } as const;

/** The team: invite Admin and Finance people, change roles, switch accounts off, hand out new passwords. */
const view: View = async (ctx) => {
  async function load(): Promise<void> {
    const [a, f] = await Promise.all([api.get<{ users: PublicUser[] }>('/api/admin/users?role=admin&limit=200'), api.get<{ users: PublicUser[] }>('/api/admin/users?role=finance&limit=200')]);
    if (!ctx.alive()) return;
    const team = [...a.users, ...f.users].sort((x, y) => x.fullName.localeCompare(y.fullName));
    const host = $('#teamList', ctx.root);
    if (!host) return;
    host.innerHTML = card(
      '',
      table(
        [{ label: 'Person' }, { label: 'Role' }, { label: 'Status' }, { label: 'Last sign-in', cls: 'hide-s' }, { label: '' }],
        team.map((u) => {
          const me = u.id === ctx.user.id;
          return {
            cells: [
              `<div class="who">${avatar(u.fullName)}<div><b>${esc(u.fullName)}${me ? ' <span class="muted">(you)</span>' : ''}</b><small class="muted">${esc(u.email)}${u.username ? ` · ${esc(u.username)}` : ''}</small></div></div>`,
              me ? esc(ROLE_LABEL[u.role]) : `<select data-role="${esc(u.id)}" aria-label="Role of ${esc(u.fullName)}">${options([{ value: 'admin', label: 'Admin' }, { value: 'finance', label: 'Finance' }], u.role)}</select>`,
              u.status === 'active' ? badge('Active', 'ok') : u.status === 'pending' ? badge('Invited', 'warn') : badge('Disabled', 'neutral'),
              esc(u.lastLoginAt ? ago(u.lastLoginAt) : 'never'),
              me
                ? ''
                : `<div class="btn-row"><button class="btn btn-line btn-sm" type="button" data-reset="${esc(u.id)}" data-name="${esc(u.fullName)}">${u.status === 'pending' ? 'Resend invite' : 'Reset password'}</button><button class="btn btn-line btn-sm" type="button" data-status="${u.status === 'disabled' ? 'active' : 'disabled'}" data-id="${esc(u.id)}" data-name="${esc(u.fullName)}">${u.status === 'disabled' ? 'Enable' : 'Disable'}</button></div>`,
            ],
          };
        }),
        empty('No team members yet'),
      ),
      '',
      'flush',
    );
  }

  ctx.root.innerHTML = pageHead('Team', 'Admins run the business side; Finance people handle invoices and payments. Clients sign themselves up.', '<button class="btn btn-hi" type="button" id="invite">Invite a team member</button>') + '<div id="teamList"></div>';
  await load();

  /** With no mail server the temporary password is shown once, here, so it can be passed on. */
  const showTemp = (name: string, temp: string): void =>
    openDialog({
      title: 'Temporary password',
      body: `<p class="dlg-msg">Give this to ${esc(name)}. They must choose their own password when they first sign in. It is not shown again.</p><div class="tempbox"><code id="tempPw">${esc(temp)}</code><button class="btn btn-line btn-sm" type="button" id="copyPw">Copy</button></div>`,
      mount: (form) => form.querySelector('#copyPw')?.addEventListener('click', () => void navigator.clipboard?.writeText(temp).then(() => toast('Copied'))),
    });

  $('#invite', ctx.root)?.addEventListener('click', () =>
    openDialog({
      title: 'Invite a team member',
      body: `<div class="fi"><label for="ivName">Full name</label><input id="ivName" name="fullName" autocomplete="off" required></div>
             <div class="fi"><label for="ivMail">Email</label><input id="ivMail" name="email" type="email" autocomplete="off" required></div>
             <div class="fi"><label for="ivRole">Role</label><select id="ivRole" name="role">${options([{ value: 'finance', label: 'Finance — invoices and payments' }, { value: 'admin', label: 'Admin — everything' }])}</select></div>
             <p class="muted">They get an email with a link to choose their password. If email is not set up, you will be shown a temporary password instead.</p>`,
      submit: 'Send invite',
      onSubmit: async (d) => {
        const r = await api.post<{ user: PublicUser; tempPassword?: string }>('/api/admin/users', { fullName: d['fullName'], email: d['email'], role: d['role'] });
        toast(`${r.user.fullName} added`);
        await load();
        if (r.tempPassword) setTimeout(() => showTemp(r.user.fullName, r.tempPassword ?? ''), 120);
      },
    }),
  );

  ctx.root.addEventListener('change', async (ev) => {
    const sel = (ev.target as HTMLElement).closest<HTMLSelectElement>('[data-role]');
    if (!sel) return;
    try {
      await api.patch(`/api/admin/users/${encodeURIComponent(sel.dataset['role'] ?? '')}`, { role: sel.value });
      toast('Role updated');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the role.');
    }
    void load();
  });

  ctx.root.addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    const reset = t.closest<HTMLElement>('[data-reset]');
    const status = t.closest<HTMLElement>('[data-status]');
    try {
      if (reset) {
        const name = reset.dataset['name'] ?? 'this person';
        if (!(await confirmDialog('Reset password?', `${esc(name)} is signed out everywhere and gets a way to choose a new password.`, 'Reset password'))) return;
        const r = await api.post<{ tempPassword?: string }>(`/api/admin/users/${encodeURIComponent(reset.dataset['reset'] ?? '')}/reset`, {});
        if (r.tempPassword) showTemp(name, r.tempPassword);
        else toast('A reset link is on its way');
        void load();
      } else if (status) {
        const to = status.dataset['status'];
        const name = status.dataset['name'] ?? 'this person';
        if (to === 'disabled' && !(await confirmDialog('Disable this account?', `${esc(name)} is signed out straight away and cannot sign in until you enable it again.`, 'Disable account', true))) return;
        await api.patch(`/api/admin/users/${encodeURIComponent(status.dataset['id'] ?? '')}`, { status: to });
        toast(to === 'disabled' ? 'Account disabled' : 'Account enabled');
        void load();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.');
    }
  });
};

export default view;
