# Company site + design studio

A complete marketing site with a built-in drag-and-drop UI/UX studio that visitors use
to sketch a screen, pick a plan and send it to you for a quote.

Two versions of this site live in this repo:

1. **`index.html`** — the original, zero-build single file described in the rest of
   this document. No npm, no framework, no server. Open it in a browser and it runs.
2. **`packages/`** — a TypeScript rewrite with the same product, split into a proper
   frontend/backend architecture. Use this if you want typed source, the rendering
   engine broken into modules instead of one file, and a real API that persists quote
   requests server-side instead of only `mailto:`. See below.

---

## The TypeScript monorepo (`packages/`)

```
packages/
  shared/    domain types + zod schemas shared by both sides (Element, Scene, Project,
             QuoteRequestPayload, the /api/* contract) — the single source of truth
             for what crosses the frontend/backend boundary
  frontend/  Vite + vanilla TypeScript port of index.html: the ~50-renderer engine
             (src/renderers/), one folder per page section (src/sections/ — what-we-build,
             catalogue, design-studio, how-we-work, request-quote; each holds its own
             markup, CSS, logic and data, see src/sections/README.md), page chrome
             (src/page/), same CSS, same markup
  backend/   Express API, run under PM2 in production — receives quote submissions
             at POST /api/quotes, validates them against the shared zod schema, and
             persists them (JSON-file storage by default; swap the storage adapter
             for a real database without touching the routes)
```

### Run it locally

```bash
npm install                          # installs all three workspaces
npm run build -w packages/shared     # shared must be built once before the others typecheck

npm run dev:backend                  # Express on :8787 (copy packages/backend/.env.example to .env first)
npm run dev:frontend                 # Vite on :5173 (copy packages/frontend/.env.example to .env.local first,
                                      #                pointing VITE_API_BASE_URL at the backend)
```

Open the Vite dev server URL. The site behaves like `index.html`, plus: submitting the
quote form now also POSTs to the backend (in addition to the `mailto:`/copy/download
routes, which still work with no backend at all — same fallback philosophy as the
original file, see §4 below).

### Deploy the backend with PM2

```bash
npm run pm2:start     # builds shared + backend, then `pm2 start packages/backend/ecosystem.config.cjs`
npm run pm2:logs      # tail its output
npm run pm2:restart
npm run pm2:stop
```

Set `ADMIN_TOKEN` in `packages/backend/.env` to enable `GET /api/quotes` (and
`GET /api/quotes/:id`) — an authenticated "owner inbox" equivalent to the
claude.ai-hosted copy's private panel described in §4, reachable via
`Authorization: Bearer <token>`. Leave it unset to keep those routes disabled.

### What changed vs. the single file

- The claude.ai-specific `window.claude.use('db'/'user')` hooks (§4 below) are gone —
  the Express backend is the persistence layer now, on any host.
- `window.claude.use('downloads')` is gone too; "Save file"/"Download design file"
  always use a plain browser download, same as this self-hosted copy already did.
- Every renderer keeps its own TypeScript prop interface (`interface ChartProps {…}`)
  instead of one untyped `p` bag, checked against the shared `RendererDef<P>` type.
- `CFG` (company name, email, plans) moved to `packages/frontend/src/config.ts` —
  same two fields to edit, same effect, just typed.

Everything else — the CSS, the markup, the 15 catalogue builds, the palette, the
studio's drag/resize/rotate/undo behaviour — is a line-for-line port; §5–§7 below
still describe it accurately, just read `src/renderers/*.ts` where it says "the file."

---

## 1. Change these first

Open `index.html` in any text editor and find the config block at **line 716**
(search for `var CFG = {`). Nothing else needs editing to go live.

```js
var CFG = {
  company: 'Coreloop Systems',      // placeholder — your company name
  email:   'hello@example.com',     // placeholder — where quote requests go
  plans: [ ... ]                    // the four plan cards
};
```

`company` drives the nav, the footer, the browser tab title and the subject line of
every quote email. `email` drives the contact block, the footer link and the `mailto:`
that carries a request to you. `hello@example.com` is a reserved address, so nothing
gets misdirected while it is still unchanged — but a real address is required before
you share the site.

### Plans

`CFG.plans` is the plan chooser in the quote form. Add, remove, rename and reprice
freely; the card grid, the "Most picked" ribbon and the request brief all read from
this array, so you never touch markup.

```js
{ id:'sprint',                       // short id, stored with the request
  name:'Design sprint',
  price:'From 2,400',                // any text — add your currency here
  per:'1 week, fixed price',
  rec:1,                             // optional: shows the "Most picked" ribbon
  items:['Clickable screens','Written scope','Fixed quote for the build'] }
```

---

## 2. Put your real evidence in

The site ships with **no invented client names and no invented performance numbers**.
Those are the three places worth filling in before you send traffic to it.

| What | Where | Note |
|---|---|---|
| Hero figures (`15 systems shipped`, `6 industries`, `2–10 weeks`) | line 427, `class="hero-meta"` | plain HTML |
| Per-build facts: *Built for / Replaces / Key screens* and the fourth field | `PROJECTS` array, line 2322, each `specs:{}` | add real outcomes and client types here |
| The six capability cards | `CAPS` array, line 2444 | headline, paragraph and the small tags |

If you want client logos, add them to the `media` element with `variant:'logoGrid'`,
or drop `<img>` tags into the relevant section — the page allows normal images once
it is hosted on your own domain.

---

## 3. Hosting

Any static host. There is nothing to configure.

- **Netlify / Vercel / Cloudflare Pages** — drag the folder onto the dashboard, or
  connect a repo. Done.
- **GitHub Pages** — commit `index.html` to a repo, enable Pages on the branch.
- **Shared hosting / cPanel** — upload `index.html` to `public_html`.
- **S3 / Azure / GCS** — upload as a static website, set `index.html` as the index.
- **No internet at all** — it still works; the two web fonts fall back to the system
  sans-serif and monospace stacks. To make it fully self-contained, download the
  Archivo and IBM Plex Mono woff2 files, drop them beside `index.html` and replace the
  `<link>` at line 10 with a `@font-face` block.

---

## 4. How a quote request actually reaches you

The visitor draws a screen, picks a plan, fills the form, presses **Send request**.
They then get three routes, and the behaviour differs slightly by where the page lives.

**On your own domain (this package)**

1. **Open email** — their mail app opens with the whole brief pre-written and your
   address in the To field. Plan name goes in the subject. This is the path that
   always works, on every device, with no backend.
2. **Download design file** — a real `.json` download containing every element,
   position, size, style and adjustment. They attach it to the email.
3. **Copy brief** — the plain-text brief on their clipboard.

**On the claude.ai hosted copy** the same three routes exist, plus the request is
logged to the page's own database and you get a private "Your quote inbox" panel under
the contact block when you open the page signed in. That database only exists inside
claude.ai, so this self-hosted copy skips it automatically — the code checks for it and
degrades quietly.

### Wiring it to your own backend (optional)

If you want requests posted straight to your CRM, mailer or inbox, add one `fetch`.
Find `logToDb(f);` inside the submit handler (search for `lastFile=JSON.stringify`,
it is a few lines below) and add:

```js
fetch('https://your-endpoint.example/quotes', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: lastFile            // already built: full request + full design JSON
}).catch(function(){});      // silent: the email route is still offered either way
```

`lastFile` is the complete payload — contact details, chosen plan, budget, timeline,
notes, and the design as structured JSON. Services like Formspree, Basin, Web3Forms or
a Cloudflare Worker all accept exactly this shape. Keep the `.catch()` so a backend
outage never blocks the visitor.

---

## 5. What is inside the studio

| Thing | Where in the file |
|---|---|
| ~40 element renderers (the engine behind both the studio and the 15 screenshots) | `T` registry, line 783 |
| 190+ palette entries, grouped into 13 categories | `PAL` array, line 2707 |
| 140 emojis | `EMOJI`, line 2705 |
| 10 whole-screen presets | `PRESETS`, line 2592 |
| The 15 project screens, also loadable as studio starting points | `SCENES`, line 2022 |
| The "What do you need built?" chips | `KINDS`, line 3523 |

Adding a palette item is one line — `[category, label, rendererType, width, height, props]`:

```js
['Buttons','Download','btn',160,42,{label:'Download report',variant:'secondary',icon:'⬇️'}],
```

Capabilities the visitor gets: drag from the library or tap to place, move, resize from
eight handles, rotate, snap to an 8 px grid with alignment guides, desktop/tablet/phone
canvases, light or dark canvas, layer style (fill, gradient, corners, border, shadow,
padding), adjustments (brightness, contrast, saturation, blur, hue), a layers panel with
lock/hide/reorder, undo/redo, duplicate, keyboard shortcuts, zoom and fit.

Work autosaves to `localStorage` under the key `cl_studio_v1`, so a half-finished sketch
survives a closed tab. The colour theme is remembered under `cl_theme`. Nothing is sent
anywhere until the visitor presses send.

---

## 6. Design system, if you want to restyle

All colour lives in CSS custom properties at **line 14** (`:root`), with a matching dark
set below it. Change these six and the whole site follows, including every rendered
screenshot:

```css
--ink:    #17242A;   /* deep petrol — text and dark sections */
--paper:  #F1F2EE;   /* cool paper — page background       */
--panel:  #FFFFFF;   /* cards and panels                    */
--brand:  #0F5C52;   /* operational teal — primary actions  */
--signal: #FFC41F;   /* hi-vis amber — CTAs and highlights  */
--line:   #D4D9D1;   /* hairlines                           */
```

The screens inside the studio and the portfolio use a separate token set prefixed
`--sc-` (same block) so a mockup can be dark while the page is light.

Type is Archivo throughout, with IBM Plex Mono reserved for real data readouts only.
The scale is set in the `.d1 .d2 .d3 .d4 .lead .sm .xs` classes.

---

## 7. Accessibility and quality notes

- Keyboard focus is visible everywhere (`:focus-visible`, amber outline).
- `prefers-reduced-motion` is respected — the one page-load animation is skipped.
- `prefers-color-scheme` is honoured, with a manual override in the nav.
- Safe-area insets are handled for notched phones.
- Contrast on body text, buttons and status colours passes WCAG AA.
- No cookies, no analytics, no trackers, no third-party scripts.
