# AGENTS.md — working conventions for this repo

Kings Metro School Sokoto. Two independent things:

- `site/` — static public website (single source: `styles.css`, `app.js`). The **only** part
  that runs locally and is deployed from this repo.
- `Google_App_Script/` — **reference-only** copy of the already-deployed Google Apps Script
  portal. It is never run or deployed from here; live code lives in the `cbs4u4me@gmail.com`
  Google Drive project. Portal data is one Google Spreadsheet (each tab a table).

No tests, no CI, and no npm dependencies (the dev server uses only Node built-ins; Node 20+).

## Two independent publish targets — pushing does NOT deploy

GitHub and Vercel are separate; one never triggers the other.

- **GitHub** (code history): stage explicitly (`git add site/ Google_App_Script/ tools/ AGENTS.md README.md package.json package-lock.json .gitignore CBS_Logo_green.png`) → `git commit` → `git push origin main`.
  Do **not** `git add -A`: the untracked `caiit_*` files would get swept in (see [Never commit](#never-commit)).
  Remote `origin` → `https://github.com/cbs-workspace/KMSS.git`, branch `main`.
- **Vercel** (live site): `npm run deploy` → production `https://kingsmetroschools.vercel.app`
  (`npm run deploy:preview` for a preview). Runs `npx --yes vercel@latest deploy --prod --yes --scope cbs4`.
- Vercel **Git integration is intentionally off** — `git push` alone never updates the live
  site. Always finish edits to `site/` with `npm run deploy`.
- Vercel project `kingsmetroschools` (team `cbs4`), **Root Directory `site`**, framework Other,
  already linked via `.vercel/` (gitignored). If the CLI can't resolve the project, add
  `--scope cbs4 --project kingsmetroschools`.
- Commits use the repo-local identity `worker0026 <worker0026@users.noreply.github.com>`.

## Website changes (`site/`)

- All editable settings are in the `var CONFIG` object in **`site/app.js`** (not `index.html` —
  the README's "Public website configuration" section is stale on this). `portalUrl` / `gasUrl`
  are the live GAS `/exec` link; `?portal=`, `?gas=`, `?login=1` override at runtime.
- Pages are `index`, `about`, `academics`, `admissions`, `contact`, `gallery`, `login`. Every page
  loads `styles.css` + `app.js`.
- `loginMode` defaults to `'page'`: login buttons navigate to `/login.html`, which embeds the
  portal full-page so the raw `script.google.com` URL never appears in the address bar.
  (`'modal'` = in-page iframe with `?embed=1`, `'tab'` = new tab.)
- Shared markup (header, footer, floating rail, modal, audio) is **duplicated across every
  `site/*.html`** page — when editing a shared block, apply it to all pages. Run
  `npm run dev` (`npm run site`) to preview at http://localhost:8080; `PORT=<n>` to change it.

## Portal changes (Google Apps Script) — reference only

- Portal source files mirror the Apps Script project 1:1: `Code.gs` (server), `index.html` (portal SPA),
  `Admission.html` (public admission form), `appsscript.json` (manifest). A change is only live after
  pasting the matching file(s) into the editor and redeploying.
- The public site depends on these GAS endpoints — do not rename/remove them:
  `site/app.js` JSONP-loads announcements from `?public=announcements&callback=kmsReceiveAnnouncements`
  and lazy-loads the admission iframe from `?admission=1&embed=1`.
- **Prefer implementing portal changes in `Google_App_Script/index.html`.** The maintainer
  updates the live project by pasting a single file into the Apps Script editor (signed in as
  `cbs4u4me@gmail.com`), so an `index.html`-only change needs just one paste.
- Only edit `Code.gs` when the change genuinely needs server-side logic.
- When a change spans both files, still make the `index.html` side self-sufficient (e.g. default
  a value client-side so the feature works even if `Code.gs` is not re-pasted). Example: brand
  logo defaults via `if (BRAND && !BRAND.logoUrl) BRAND.logoUrl = '…/Logo_kmss.png';`.
- Redeploy as a **New version on the existing deployment** (Deploy → Manage deployments → Edit →
  Version: New version → Deploy) so the `/exec` link stays the same and the website keeps working.
  Never create a brand-new deployment.

### Branding rules (keep for any new email or printable)

- **Email:** always go through `sendPortalMail_(opts)` in `Code.gs` (adds hidden sender,
  reply-to enquiries, and the "do not reply" banner/footer). **Never call `MailApp.sendEmail`
  directly.** The only intentional exception is the unbranded SMS-gateway send in `sendSmsText_`.
- **Server PDF:** `admissionPdfBlob_` builds the admission attachment with DocumentApp.
- **Printables (client-side):** receipts, report cards and the fee schedule are HTML printed via
  `window.print()`, built with `docHeaderHtml(...)` + `docNoteHtml()` in `index.html`. Use these
  helpers for any new printable so it matches the email/PDF look (school green `#14532d`).

## Never commit

`docs/`, `*.docx`, `*.pdf`, `server/`, `client/`, `docker-compose.yml`, `.vercel/`, `.env*`,
`node_modules/`, `dist/` are gitignored. If `git status` shows them, leave them untracked.
`README.md` is committed on purpose.

The untracked root files `caiit_Code.gs`, `caiit_dashboard.html`, `caiit_index.html` are an
**unrelated project** (CAIIT / University of Abuja) that is *not* gitignored — do not `git add -A`
them into a Kings Metro commit.

## Testing the portal

Demo logins ship seeded on the `Users` tab and **all share the password `Demo@1234`**
(`demo.admin`, `demo.principal`, `demo.headmaster`, `demo.bursar`, `demo.account`,
`demo.t.<sec>.*`, `demo.parent1..10`). **Deactivate every `demo.*` account before go-live.**
