# Client portal: run it, deploy it, keep it safe

The website has two parts that share one login:

| Part | Address | What it is |
|---|---|---|
| Landing site | `/` | The showcase (catalogue, design studio, contact form). Visitors sign in or sign up from the nav; the quote form needs an account. |
| Portal | `/portal/` | The signed-in app. **Clients** request quotes, follow progress, chat and see invoices. **Admins** manage requests, chat with clients and run the team. **Finance** raises invoices, records payments and watches the money. |

Everything is stored in PostgreSQL (`lablace_db`). The API is the Express app in `packages/backend` (PM2 in production).

## Roles at a glance

| | Client | Finance | Admin |
|---|---|---|---|
| Sign up themselves | yes | no | no |
| Send a request, follow progress, approve a quote, chat | yes | | |
| Read all requests | | yes (read-only) | yes |
| Change requests, send quotes, chat with clients, see audit log | | | yes |
| Invite and manage team accounts | | | yes |
| Invoices, payments, finance dashboard, CSV | own invoices only | yes | yes |

Team accounts are created by an Admin (they get an email invite) or by the seed script. Clients can never become staff.

## Run it on your PC

You need Node (the repo pins one in `node_modules`), and for the real database an SSH tunnel.

```powershell
# 1. In its own PowerShell window, leave this running (your server's Postgres appears on 127.0.0.1:5434):
ssh -N -L 5434:localhost:5432 <ssh-user>@<server-ip>

# 2. Once: copy the settings template and fill it in (packages/backend/.env is git-ignored)
copy packages\backend\.env.example packages\backend\.env
#    set DATABASE_URL (password URL-encoded: "@" is %40) and keep DB_SCHEMA=dev

# 3. Create the tables in the dev schema, then the first accounts
npm run db:migrate -w packages/backend
#    put SEED_ADMIN_EMAIL / SEED_ADMIN_NAME (and optionally SEED_FINANCE_*) in .env, then:
npm run db:seed -w packages/backend        # prints a temporary password if you did not set one

# 4. Start both servers
npm run dev:backend                          # API on :8787
npm run dev:frontend                         # site on :5173  (restart it after pulling, the proxy settings changed)
```

Open http://localhost:5173, press **Sign in**. A seeded account must choose its own password first.

**Dev uses its own schema.** `public` in `lablace_db` is kept clean for production; development lives in the `dev` schema, and tests use throwaway schemas. (The database user cannot create extra databases, which is why schemas are used. If a DB admin creates `lablace_dev` for you, just change `DATABASE_URL` and drop `DB_SCHEMA`.)

### Try everything with no database at all

```powershell
npm run dev:demo -w packages/backend         # API on :8788, in-memory Postgres, prints its demo accounts
$env:VITE_API_PROXY = 'http://localhost:8788'; npm run dev:frontend
```

Accounts: `admin@demo.test`, `finance@demo.test`, `ana@demo.test`, `ben@demo.test`, password `Demo-password-1`. Everything is forgotten when you stop it.

### Tests

```powershell
npm test -w packages/backend                 # 58 tests on an in-memory Postgres, no server needed

# The same tests on the real server, each file in a throwaway schema that is dropped afterwards:
$env:TEST_DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5434/lablace_db'
npm test -w packages/backend
```

## Settings (`packages/backend/.env`)

| Setting | Meaning |
|---|---|
| `DATABASE_URL` | `postgresql://user:password@host:port/database`. Dev: the tunnel (`127.0.0.1:5434`). Server: `localhost:5432`. |
| `DB_SCHEMA` | `dev` on your PC. **Leave empty in production** (uses `public`). |
| `APP_URL` | The public address of the site, used in email links and as an allowed origin for writes. |
| `COOKIE_SECURE` | `true` in production (HTTPS only). `false` on `http://localhost`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Outgoing email. **Empty = email off:** sign-ups are accepted without verification and Forgot / Remind me tell people to contact you. |
| `NOTIFY_EMAIL` | The team inbox that is emailed when a client sends a request or message. |
| `SEED_*` | First Admin / Finance accounts for `db:seed`. Remove them from `.env` afterwards. |
| `SESSION_TTL_DAYS` | How long a sign-in lasts (14). |

## Go live

You need a domain pointing at the server (HTTPS is required: the sign-in cookie is `Secure`).

1. **Server, once:** Node, `nginx`, `pm2`, `certbot`; firewall open only for 22, 80, 443; Postgres listening on localhost only.
2. **Settings:** on the server create `packages/backend/.env` with `DATABASE_URL` for `localhost:5432/lablace_db`, no `DB_SCHEMA`, `COOKIE_SECURE=true`, `APP_URL=https://your-domain`, SMTP details, `SEED_*`.
3. **First deploy:** `npm ci`, `npm run build`, `npm run db:migrate:prod -w packages/backend`, `npm run db:seed:prod -w packages/backend`, `pm2 start packages/backend/ecosystem.config.cjs`, `pm2 save`, `pm2 startup`.
4. **nginx:** copy `deploy/nginx.lablace.conf` (replace the domain), enable it, run `certbot --nginx`. The built site goes in `/var/www/lablace`.
5. **Next deploys, from your PC:** `.\deploy\deploy.ps1 -Server <user>@<server-ip>` (pull, build, migrate, copy site, reload API).
6. **Backups:** schedule `deploy/backup-db.sh` in cron (nightly) and restore one dump into a scratch database to prove it works.
7. **Before announcing:** add Terms and a Privacy Policy page (accounts hold personal data), then change the sign-in box's terms line into a link.

## Security checklist

- **Rotate every password that was ever in `server.env`** (root SSH, the SSH user, the database user). That file was committed and pushed to GitHub before this branch untracked it. Treat the old values as public, and optionally purge git history (`git filter-repo`) once they are changed.
- Use SSH keys, turn off SSH password login and root login, and use a normal SSH user for the tunnel.
- Keep real values only in git-ignored `.env` files. `*.env` is ignored; only `*.env.example` templates are tracked.
- Passwords are stored as argon2id hashes; sessions are random tokens whose hashes are stored; cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production. Sign-in is rate limited and locks an account for 15 minutes after 8 wrong passwords.
- Clients can only ever read their own requests, messages and invoices; the server checks ownership in every query. Staff routes check the role.
- Run `npm audit` now and then.

## Where things are

```
packages/shared/src/        types + zod schemas used by both sides (auth, quote, message, finance, currency)
packages/backend/
  migrations/               001_users_sessions, 002_quotes, 003_messaging, 004_finance (SQL, "-- Up/Down Migration")
  src/db/                   pg pool, migration runner
  src/repos|services|routes/  SQL, business rules, HTTP (auth, quotes, messages, finance, users)
  src/scripts/              migrate, seed
  test/                     API tests (in-memory Postgres, or a real one with TEST_DATABASE_URL)
  dev/demo-server.ts        the no-database demo
packages/frontend/
  index.html                the landing site (hash routes); sign-in box in src/sections/auth-modal/
  portal/index.html         the portal; code in src/portal/ (router, shell, views per role)
deploy/                     nginx.lablace.conf, deploy.ps1, backup-db.sh
```

Request statuses: `submitted` -> `reviewing` -> `quoted` -> `accepted` -> `building` -> `delivered` (or `declined` / `cancelled`). A quote is sent in the client's chosen currency; every invoice stores its own currency and the Finance dashboard shows one currency at a time.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/api/health` says `db: down` | The SSH tunnel is closed, or `DATABASE_URL` is wrong. |
| "The database is not configured" | No `DATABASE_URL` in `packages/backend/.env`; restart the backend after creating it. |
| Sign-in works but you are signed out on refresh | `COOKIE_SECURE=true` on plain `http://`, or `VITE_API_BASE_URL` points at another address. |
| No emails arrive | `SMTP_HOST` is empty (check the backend start-up line "email: off"), or the provider rejects `SMTP_FROM`. |
| Changes to `vite.config.ts` have no effect | Restart `npm run dev:frontend`. |
