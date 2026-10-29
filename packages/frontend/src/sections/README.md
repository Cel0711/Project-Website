# Page sections

One folder per section of the site. Each folder holds everything for that section —
its markup (`*.html`), styles (`*.css`), behaviour (`index.ts`) and content data — so a
change to a section should only touch that folder.

The site is one document made of **pages**: `index.html` wraps each section in a
`<div class="page" data-page="…">` and [`../page/router.ts`](../page/router.ts) shows exactly one of
them, chosen by the URL hash (`/#/work`, `/#/studio`, …). Old anchors such as `#quote` still work
(they are redirected to the new routes).

| Nav / heading | Route | Folder | Edit here for… |
|---|---|---|---|
| Home (below the hero) | `#/` | [`home-previews/`](home-previews/) | which cards each preview shows → `index.ts` · preview headings and buttons → `home-previews.html` |
| What we build | `#/services` | [`what-we-build/`](what-we-build/) | the six capability cards → `caps.ts` · heading/intro copy → `what-we-build.html` |
| Catalogue | `#/work` (and `#/work/WRK-07` for a build's detail pop-up) | [`catalogue/`](catalogue/) | the 15 builds → `projects.ts` · the screens drawn for each → `scenes.ts` · detail pop-up → `project-modal.html` |
| Design studio | `#/studio` | [`design-studio/`](design-studio/) | toolbar/canvas layout → `design-studio.html` · element library → `palette-data.ts` · starter layouts → `presets.ts` · behaviour → `canvas.ts`, `inspector.ts`, `toolbar.ts`, … |
| How we work | `#/process` | [`how-we-work/`](how-we-work/) | the four stages → `how-we-work.html` (static, no script) |
| Request a quote | `#/contact` | [`request-quote/`](request-quote/) | form fields and plans → `form.ts` / `request-quote.html` · API call → `api-client.ts` · no-backend fallback → `fallback.ts` |
| "Get a quote" band | closes every page except Contact | [`cta-band/`](cta-band/) | the band's wording → `cta-band.html` (static, no script) |
| Sign in / Create account | a box over any page: `#/login`, `#/signup`, the nav "Sign in" button, or the quote form | [`auth-modal/`](auth-modal/) | the box → `auth-modal.html`, `index.ts` · the nav account chip → `nav.ts` · styles → `auth-modal.css` |

The signed-in **portal** is a second document, `portal/index.html`, with its own code in [`../portal/`](../portal/)
(router, shell, one screen per file under `views/`). It reuses the quote form from `request-quote/` for "Get a quote".
See [docs/PORTAL.md](../../../../docs/PORTAL.md).

Every page except Home starts with a banner (breadcrumb, eyebrow tag, the page's single `<h1>`, intro) — its
markup is the first `<section class="pagehead">` of that section's `.html`.

## Inside a section folder

| File | Role |
|---|---|
| `<section>.html` | The section's markup. `index.html` pulls it in with `<!-- @include … -->` (see below). |
| `<section>.css` | Styles used only by this section, including its responsive `@media` rules. |
| `index.ts` | Entry point: imports the CSS and exports the `init…`/`build…` function that `src/boot.ts` calls. |
| other `.ts` | Section-specific logic and content data. |

## Not owned by any section

| Where | What |
|---|---|
| [`../page/`](../page/) | Page chrome: the hash router that shows one page at a time (`router.ts`), nav + theme toggle (`chrome.ts`), the hero laptop and its replayable opening animation (`hero.ts`, motion in `main.css`), the hero's animated rings (`hero-bg.ts`), footer links (`footer.ts`). Their markup stays inline in `index.html`. |
| [`../core/`](../core/), [`../engine/`](../engine/), [`../renderers/`](../renderers/) | The shared drawing engine (~50 element renderers). The catalogue, hero and studio all render screens through it. |
| [`../styles/main.css`](../styles/main.css) | Design tokens, base styles, nav, hero, footer, toast, and the `.stage` rules for rendered screens. |
| [`../config.ts`](../config.ts) | Company name, email, plans. |
| [`../boot.ts`](../boot.ts) | Starts everything and registers the router hooks (re-fit rendered screens and the studio canvas when a page is shown, replay the laptop intro on Home, open/close the build modal from the URL). Also holds the one piece of glue between sections: the modal's "Open this in the studio" button (catalogue → studio). |

## Dependencies between sections

Kept to the minimum the product needs:

- **design-studio → catalogue** — "Start from a build" reads `catalogue/projects.ts` and `catalogue/scenes.ts`.
- **request-quote ↔ design-studio** — the quote form can attach the studio design (`design-studio/state.ts`), and the studio's "Send this for a quote" button calls `request-quote/form.ts`.
- **page/hero.ts → catalogue** — the hero paints one catalogue scene. Footer links are plain `#/work/WRK-0x` URLs; the router opens the modal.
- **home-previews → what-we-build, catalogue** — Home reuses the capability cards and the catalogue plates (and reads the stage titles from How we work) instead of copying them.
- **catalogue, request-quote → page/router.ts** — they only call `navigate()` (plate click, "Send this for a quote"); the router imports nothing from the sections.
- **Pages are hidden until visited**, so anything sized from its container (rendered screens, the studio canvas) is re-fitted by `boot.ts` whenever a page is shown.

## How the HTML partials work

`index.html` is a skeleton. Each section is included by a line such as

```html
<!-- @include src/sections/catalogue/catalogue.html -->
```

`vite.config.ts` (`htmlInclude`) replaces that line with the file's contents at build/dev time, so
the shipped page is the same single static HTML document as before — nothing is fetched at runtime.
Paths are relative to `packages/frontend/`. Editing a partial reloads the dev server.

## Adding a section

1. Create `sections/<name>/` with `<name>.html`, `<name>.css` and `index.ts` (import the CSS there).
2. Add `<!-- @include src/sections/<name>/<name>.html -->` to `index.html`, inside the `.page` block it belongs to
   (or add a new `<div class="page" data-page="<id>" hidden>` — then add the id to `PageId`, `SEGMENT` and `LABEL`
   in `src/page/router.ts` and a link with `data-route="<id>"` to the nav).
3. Import and call its init function in `src/boot.ts`.
