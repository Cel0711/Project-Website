# Page sections

One folder per section of the page. Each folder holds everything for that section —
its markup (`*.html`), styles (`*.css`), behaviour (`index.ts`) and content data — so a
change to a section should only touch that folder.

| Nav / heading | Anchor | Folder | Edit here for… |
|---|---|---|---|
| What we build | `#build` | [`what-we-build/`](what-we-build/) | the six capability cards → `caps.ts` · heading/intro copy → `what-we-build.html` |
| Catalogue | `#work` | [`catalogue/`](catalogue/) | the 15 builds → `projects.ts` · the screens drawn for each → `scenes.ts` · detail pop-up → `project-modal.html` |
| Design studio | `#studio` | [`design-studio/`](design-studio/) | toolbar/canvas layout → `design-studio.html` · element library → `palette-data.ts` · starter layouts → `presets.ts` · behaviour → `canvas.ts`, `inspector.ts`, `toolbar.ts`, … |
| How we work | `#process` | [`how-we-work/`](how-we-work/) | the four stages → `how-we-work.html` (static, no script) |
| Request a quote | `#quote` | [`request-quote/`](request-quote/) | form fields and plans → `form.ts` / `request-quote.html` · API call → `api-client.ts` · no-backend fallback → `fallback.ts` |

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
| [`../page/`](../page/) | Page chrome: nav + theme toggle (`chrome.ts`), hero laptop (`hero.ts`), footer links (`footer.ts`). Their markup stays inline in `index.html`. |
| [`../core/`](../core/), [`../engine/`](../engine/), [`../renderers/`](../renderers/) | The shared drawing engine (~50 element renderers). The catalogue, hero and studio all render screens through it. |
| [`../styles/main.css`](../styles/main.css) | Design tokens, base styles, nav, hero, footer, toast, and the `.stage` rules for rendered screens. |
| [`../config.ts`](../config.ts) | Company name, email, plans. |
| [`../boot.ts`](../boot.ts) | Starts everything. Also holds the one piece of glue between sections: the modal's "Open this in the studio" button (catalogue → studio). |

## Dependencies between sections

Kept to the minimum the product needs:

- **design-studio → catalogue** — "Start from a build" reads `catalogue/projects.ts` and `catalogue/scenes.ts`.
- **request-quote ↔ design-studio** — the quote form can attach the studio design (`design-studio/state.ts`), and the studio's "Send this for a quote" button calls `request-quote/form.ts`.
- **page/hero.ts, page/footer.ts → catalogue** — the hero paints one catalogue scene; footer links open catalogue modals.

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
2. Add `<!-- @include src/sections/<name>/<name>.html -->` to `index.html` where it should appear.
3. Import and call its init function in `src/boot.ts`.
