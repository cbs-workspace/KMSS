# Kings Metro School — Website & School Management System

Marketing website plus the school's role-based management portal for **Kings Metro
School Sokoto** (combined Creche / KG / Primary / Secondary).

- **Public website (`site/`)** — static HTML/CSS/JS, deployed to **Vercel**. This is the
  only part of the repository that runs locally and is deployed from here.
- **School portal** — a **Google Apps Script web app** backed by a single Google Sheet,
  **already deployed online** under `cbs4u4me@gmail.com`. The website embeds it; users sign
  in through the live deployment link. There is no portal server to run or host.

`Google_App_Script/` in this repo is a **reference-only copy** of that Google Apps Script code, kept
so portal changes can be planned and version-controlled. It is **never run locally and never
deployed** by this project — the live code is updated in the `cbs4u4me@gmail.com` Google Drive
and redeployed on the same deployment link — see
[The Apps Script portal](#the-apps-script-portal).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and
[`docs/AUDIT.md`](docs/AUDIT.md) for the audit/test report (both files are **local only** — they
are not part of the GitHub repository).

---

## ⚡ For AI agents — read this first

**Mental model:** `site/` is a static public website. The management portal is a
**separate, already-deployed Google Apps Script (GAS) web app** that the website loads in an
iframe. **You never run the portal/GAS locally — it runs on Google's servers.** Local work
in this repo means editing `site/` and, when relevant, recording portal changes in
`Google_App_Script/` so they can be applied in the Apps Script editor.

### Two delivery targets (publish them separately)

GitHub and Vercel are **independent**. Pushing code does **not** update the live site, and
deploying to Vercel does **not** update GitHub. Do both when a change should be recorded
*and* go live.

| Target | What ships | How to publish |
| --- | --- | --- |
| **GitHub** | the deployable code only — `site/`, `Google_App_Script/`, `tools/`, `package.json`, `package-lock.json`, `.gitignore` (docs and legacy files are excluded) | `git add <changed paths>` → `git commit -m "..."` → `git push origin main` (**never** `git add -A` — it sweeps in untracked local-only files) |
| **Vercel** | only `site/` (the public website) | `npm run deploy` (production) or `npm run deploy:preview` |

### Standard update loop

```powershell
# 1. Edit site/ (and/or Google_App_Script/ to record a portal change — see below)
# 2. Preview locally:  npm run dev   ->  http://localhost:8080
# 3. Commit and push to GitHub (do NOT use `git add -A` — it would add local-only files)
git add site/ Google_App_Script/ tools/ AGENTS.md README.md package.json package-lock.json .gitignore
git commit -m "<type>(scope): <summary>"
git push origin main
# 4. Publish the public website to Vercel production
npm run deploy
```

### Changing the portal (Google Apps Script) — reference only

The Apps Script code under `Google_App_Script/` is a **reference copy for development only**. It is
never run or deployed from this repo, and editing it here has **no effect on the live portal**.
The code that actually runs lives in the Apps Script project in the Google Drive of
**`cbs4u4me@gmail.com`**. Use the repo copy to plan/record a change, then apply it in that
Google account and redeploy.

To change the portal:

1. Make the change in the matching file under `Google_App_Script/` (`Code.gs`, `index.html`,
   `Admission.html`, `appsscript.json`) so the intended change is recorded in the repo.
2. Sign in to <https://script.google.com> (or Google Drive) as **`cbs4u4me@gmail.com`**, open the
   Kings Metro Apps Script project, and apply the same change to the live code.
3. **Redeploy the *existing* deployment** so its `/exec` link does not change:
   **Deploy → Manage deployments → select the current deployment → Edit (pencil) →
   Version: New version → Deploy.**
4. Commit the `Google_App_Script/` change and `git push origin main` (records source history only).

> 💡 **Prefer single-file pastes.** The maintainer updates the live project by pasting a file into
> the Apps Script editor, so implement UI and most logic in **`index.html`** wherever possible
> (one paste). Edit **`Code.gs`** only when the change genuinely needs server-side logic — such as
> the email/PDF branding below — and make the `index.html` side self-sufficient where you can.

> ⚠️ **Always create a "New version" on the existing deployment — never a brand-new deployment.**
> The website's login iframe points at the current deployment's `/exec` URL
> (`CONFIG.portalUrl` in `site/app.js`). Reusing the same deployment keeps that link
> identical, so the **login section keeps working and needs no website change**.

### Facts agents need

- **The portal is served by the deployed GAS app.** Its `/exec` URL is in `var CONFIG`
  inside `site/app.js`:
  - `portalUrl` — the page/modal login target (the iframe loads it with `?embed=1`); "Open in new tab" uses it as-is.
  - `gasUrl` — the announcements feed and the public admission form (`?admission=1`).
  When the public page is loaded, this already-online link is what lets users sign in.
- **GitHub remote:** `origin` → `https://github.com/cbs-workspace/KMSS.git`, default branch `main`.
- **Git identity used in this repo:** `worker0026 <worker0026@users.noreply.github.com>`
  (set locally in `.git/config`; keep commits consistent with it).
- **Vercel project:** `kingsmetroschools`, team scope **`cbs4`**
  (`team_l5KxHP1LNqNZiKnLwTBZ87Ux`).
  Production URL: **https://kingsmetroschools.vercel.app**
- **Vercel build settings:** Root Directory = **`site`**, Framework = **Other** (static, no build command).
- **Vercel Git integration is intentionally NOT used.** Vercel allows only one
  GitHub account per Vercel account; the linked account (`Abel-Ability`) cannot see
  the `cbs-workspace` user account that owns this repo. **Always deploy with the CLI.**
- **Vercel auth:** the CLI is already logged in (`abelosagie-7097`); credentials live
  in `%APPDATA%\com.vercel.cli\Data\auth.json` on Windows. Do **not** commit that file.
- The repo root is linked to the Vercel project via `.vercel/` (gitignored). If the
  link is missing, run the deploy from the repo root; the CLI resolves the project by
  name. If it complains, add `--scope cbs4 --project kingsmetroschools`.

### Never commit (docs and legacy files are local-only)

The GitHub repository is kept to just what is needed to build/deploy the public site.
**Documentation and the legacy stack must never be committed or pushed** — they live on this
machine only and are covered by [`.gitignore`](.gitignore):

- `docs/` — `ARCHITECTURE.md`, `AUDIT.md`, the `.docx` guides, and any other notes.
- `*.docx` / `*.pdf` anywhere in the tree.
- `server/`, `client/`, `docker-compose.yml` — the old Express/React stack (reference only).

`README.md` (this file) **is** committed and is the repository's landing guide.

Also never commit `.env*`, `.vercel/`, `node_modules/`, `dist/`. If `git status` shows any of
these, leave them untracked — do **not** `git add` them.

---

## Repository layout

Entries tagged `[GitHub]` are committed and pushed. Entries tagged `[LOCAL ONLY]` stay on this
machine and are excluded by [`.gitignore`](.gitignore) — see [Never commit](#never-commit-docs-and-legacy-files-are-local-only).

```
.
├── site/                      # Public marketing website (the Vercel target)      [GitHub]
│   ├── index.html             # Home + login modal + admission embed (shared header/footer/rail)
│   ├── about.html  academics.html  admissions.html  contact.html  gallery.html
│   ├── login.html             # Full-page in-site portal embed (default loginMode 'page')
│   ├── styles.css             # Single stylesheet for every page
│   ├── app.js                 # CONFIG + all shared behaviour (nav, music, theme, rail, marquee)
│   ├── Logo_kmss.png          # Crest (referenced as /Logo_kmss.png)
│   ├── CBS_Logo_green.png
│   └── music.mp3
├── tools/serve-site.js        # Zero-dependency static server for site/ (npm run site)  [GitHub]
├── Google_App_Script/         # REFERENCE copy of the deployed Google Apps Script  [GitHub]
│   ├── Code.gs                # server logic, all api_* endpoints, seeders, email/PDF branding
│   ├── index.html             # portal single-page UI + printed documents (receipt/report/fee sheet)
│   ├── Admission.html         # public admission form
│   └── appsscript.json        # manifest
├── package.json               # root scripts (dev, site, deploy)                 [GitHub]
├── package-lock.json          # lockfile for the root scripts                    [GitHub]
├── .gitignore                 # excludes the local-only entries below            [GitHub]
│
├── README.md                  # this guide                                         [GitHub]
│
├── docs/                      # ARCHITECTURE.md, AUDIT.md, guides (.docx)   [LOCAL ONLY]
├── server/                    # legacy Express/Prisma API (reference only)   [LOCAL ONLY]
├── client/                    # legacy React/Vite dashboard (reference only) [LOCAL ONLY]
└── docker-compose.yml         # legacy compose file                          [LOCAL ONLY]
```

`site/`, `tools/` and `Google_App_Script/` are plain files — there are no npm workspaces.

---

## Local development (public website only)

Only the static website is run locally. The portal and its API live in the online GAS app,
so there is **no server, database or portal build to start**.

**Prerequisites:** Node.js 20+ (the static server in `tools/serve-site.js` uses only Node
built-ins — no dependencies to install).

```powershell
# Serve the public website at http://localhost:8080 (SPA fallback, no build step)
npm run dev        # alias of: npm run site
```

| Service | URL |
| --- | --- |
| Public website | http://localhost:8080 |

Open the page, then click **Staff / Parent Login** — by default this opens `/login.html`,
which embeds the live GAS deployment full-page so users sign in against the real online portal
(see `CONFIG.loginMode` in `site/app.js`).

---

## Public website configuration

All editable settings live in the `CONFIG` object near the top of `site/app.js`
(search for `var CONFIG`):

```js
var CONFIG = {
  name: 'Kings Metro School Sokoto',
  loginMode: 'page',   // 'page' (default) -> /login.html | 'modal' -> in-page iframe | 'tab' -> new tab
  portalUrl: 'https://script.google.com/macros/s/.../exec', // deployed GAS app
  gasUrl:    'https://script.google.com/macros/s/.../exec', // announcements + admission form
  address: 'Sokoto, Sokoto State, Nigeria',
  phone: '+234 812 210 0528',
  whatsapp: '+234 812 210 0528',
  email: 'info@kingsmetroschools.com.ng'
};
```

`portalUrl` and `gasUrl` are the **already-connected deployment link** of the GAS app; do not
point them at a local server. With the default `loginMode: 'page'` the login buttons open
`/login.html`, which embeds `portalUrl` full-page with `?embed=1` (the raw `script.google.com`
URL never shows in the address bar); `'modal'` uses the in-page iframe and `'tab'` opens the
plain URL in a new tab. Useful query overrides: `?portal=<url>`, `?gas=<url>`, `?login=1`.

After editing the site, always run `npm run deploy` to publish it.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Serve the public website on :8080 (same as `npm run site`) |
| `npm run site` | Serve only the public website on :8080 |
| `npm run deploy` | **Publish `site/` to Vercel production** |
| `npm run deploy:preview` | Deploy `site/` to a Vercel preview URL |

---

## Deployment details

The two targets are **independent** — deploy them separately. Neither one triggers the other.

### GitHub (source code)

Publishes the repository (the public site + the reference Apps Script + tooling). Docs and the
legacy stack are gitignored and are never pushed.

```powershell
# Stage only the paths you changed — never `git add -A` (it sweeps in local-only/untracked files)
git add site/ Google_App_Script/ tools/ AGENTS.md README.md package.json package-lock.json .gitignore
git commit -m "<type>(scope): <summary>"
git push origin main
```

- Remote: `origin` → `https://github.com/cbs-workspace/KMSS.git`, branch `main`.
- No CI is configured and there are no checks to satisfy before pushing.
- **Pushing to GitHub does not update the live website.**

### Vercel (public website)

Publishes **only `site/`** to production.

```powershell
npm run deploy          # production  -> https://kingsmetroschools.vercel.app
npm run deploy:preview  # a preview URL
```

- Runs `npx --yes vercel@latest deploy --prod --yes --scope cbs4` from the repo root; the project's
  **Root Directory is `site`**, so only the website is uploaded.
- Production alias: **https://kingsmetroschools.vercel.app**
- Root directory, framework preset and the project link are already configured; do not change
  them unless intentionally re-architecting.
- Because Git integration is intentionally off, **`git push` alone never updates the live site**
  — always run `npm run deploy` as the final step after editing `site/`.

---

## The Apps Script portal

The school portal is a Google Apps Script web app:

- **Where it runs:** on Google's servers, bound to the Google Sheet/Drive owned by
  **`cbs4u4me@gmail.com`**. It is **not** run or hosted by this repository.
- **`Google_App_Script/` here is reference only:** a copy of the deployed source kept for development
  and history. It is never run or deployed by this repo. Future portal development is done in
  the Google Drive project of **`cbs4u4me@gmail.com`**, then **redeployed as a *New version* on
  the *existing* deployment** so the `/exec` link stays the same — see
  [Changing the portal](#changing-the-portal-google-apps-script-reference-only).
- **How users reach it:** through the public website's login flow (`/login.html`, the in-page modal,
  or a new tab — see `CONFIG.loginMode`), which loads the deployment
  `/exec` URL from `CONFIG.portalUrl`. Because the deployment is already online and its link is
  reused on every redeploy, signing in keeps working with no website change — no local portal is
  required.
- **Data store:** one Google Spreadsheet (each tab is a table) plus a Google Drive folder for
  uploads. The spreadsheet is the single source of truth — back it up with Drive version history
  or *File → Make a copy*.

---

## Portal branding — emails, PDFs & printed documents

Every auto-generated message the portal sends, and every document it produces, shares one
consistent identity (school green `#14532d`). **Keep these rules when adding any new email or
printable** — never bypass them.

### Outbound email — server-side (`Google_App_Script/Code.gs`)

All portal email is sent through **`sendPortalMail_(opts)`** (near the top of `Code.gs`). It wraps
every message automatically, so callers pass only the inner content. It guarantees:

- **Hidden sender** — `MailApp` can only send from the script owner's Gmail, so the address is
  obscured behind a display name: `SENDER_DISPLAY_NAME`
  (default `"Kings Metro School Sokoto (No-Reply)"`).
- **Replies routed to enquiries** — `replyTo` is always `ENQUIRIES_EMAIL`
  (`info@kingsmetroschools.com.ng`).
- **Auto-generated caveat + contact pointer** — in both the HTML body (red "DO NOT REPLY" banner
  on top, footer below via `buildBrandedHtml_`) **and** the plain-text body (via `mailTextFooter_`),
  stating the message is automated and giving the enquiries address and phone.
- **Real From alias (optional)** — set `NOREPLY_FROM_ALIAS` to an address first added under
  Gmail/Workspace **"Send mail as"** to send from it; leave blank to use the display name only.

**To brand a new email:** call `sendPortalMail_({ to, subject, body, htmlBody })` where
`htmlBody = buildBrandedHtml_(innerHtml)` (or `brandedPlainHtml_(text)` for simple text).
**Never call `MailApp.sendEmail` directly** — that skips the branding. `SENDER_DISPLAY_NAME` and
`ENQUIRIES_EMAIL` can also be overridden at runtime via Script Properties (no code edit).

> The only intentional exception is the **SMS email-gateway** send inside `sendSmsText_`
> (`to + gateway`): it is machine-to-machine to the SMS provider and must stay unbranded.

### Admission PDF — server-side (`Google_App_Script/Code.gs`)

`admissionPdfBlob_(a, level)` builds the email attachment with **DocumentApp** (no extra Google
service needed): logo (fetched from `BRAND.logoUrl` via `brandLogoBlob_`), school name in green,
subtitle + contact line, a full-width **green band** with the document title, a bordered details
table, and a footer stating it is auto-generated with the enquiries address. Edit this one
function to change that PDF.

### Printed documents — client-side (`Google_App_Script/index.html`)

Receipts, report cards and the fee schedule are **not** server PDFs — they are HTML rendered in the
portal and printed via the browser (`window.print()`). They share two helpers so they match the
email/PDF look:

- **`docHeaderHtml(kind, brand?)`** — centred logo + school name (green) + subtitle + contact line,
  followed by a green `.doc-band` carrying the title (e.g. `"Official Receipt"`,
  `"Terminal Report"`, `"Fee Schedule"`).
- **`docNoteHtml()`** — footer stating the document was generated automatically and pointing to
  `info@kingsmetroschools.com.ng`.

Used by `viewReport()` (report card), `receiptHtml()` (wrapped in `.receipt`) and the fee-schedule
card. Supporting CSS lives in the `index.html` `<style>` block: `.report-head`, `.doc-band`,
`.doc-note`, `.receipt .r-subtitle`, plus `@media print` rules that force the green colours with
`print-color-adjust: exact`. **Add any new printable with `docHeaderHtml` + `docNoteHtml`.**

### Applying a branding change

Branding spans both portal files, so paste **both** `Code.gs` and `index.html` into the Apps Script
editor, then redeploy as a **New version** on the existing deployment (see
[Changing the portal](#changing-the-portal-google-apps-script-reference-only)). Verify by sending a
real admission application (check the sender, banner, footer and PDF) and by opening a receipt and a
report card in the portal and previewing the print output.

---

## Roles

`ADMIN`, `PRINCIPAL`, `HEADMASTER`, `BURSAR`, `ACCOUNT_OFFICER`, `TEACHER`, `PARENT`.
Section scoping: Admin → all; Principal → Secondary; Headmaster → Primary + KG. Teachers can
view students/academics, record attendance and enter scores; only Admin/Principal/Headmaster
manage staff, admissions, subjects, publishing and announcements.

---

## Demo accounts (testing only)

The `Users` tab ships with seeded demo logins — **every one shares the password `Demo@1234`**.
They are created by `createDemoUsers()` / `createDemoParents()` in `Code.gs` and are listed live
in the spreadsheet's `Users` tab and the portal **Users** page (Admin only):

| Username | Role | Scope |
| --- | --- | --- |
| `demo.admin` | ADMIN | All sections |
| `demo.principal` | PRINCIPAL | Secondary |
| `demo.headmaster` | HEADMASTER | Primary + KG |
| `demo.bursar` | BURSAR | All sections |
| `demo.account` | ACCOUNT_OFFICER | All sections |
| `demo.t.kg.hod`, `demo.t.primary.hod`, `demo.t.secondary.hod` | TEACHER | Their section, all class arms |
| `demo.t.<sec>.1` … `demo.t.<sec>.N` | TEACHER | Their section, one per active class arm (`<sec>` = `kg` / `primary` / `secondary`) |
| `demo.parent1` … `demo.parent10` | PARENT | Their linked wards |

The **owner administrator** (`cbs4u4me@gmail.com`) is separate — its password is auto-generated
and emailed during `setUp()`. **Deactivate every `demo.*` account before go-live.**

---

## Troubleshooting

- **Login modal is blank** — the iframe needs the deployed `/exec` URL to allow embedding
  (`X-Frame-Options: ALLOWALL` is set by the GAS app). Confirm `CONFIG.portalUrl` is the current
  deployment URL and open it directly to test.
- **Announcements or the admission form don't load** — check `CONFIG.gasUrl`; both are served by
  the GAS app, not locally.
- **Port 8080 in use** — stop the other process, or set `PORT=<n>` when running
  `npm run site`.
- **Vercel deploy can't find the project** — run from the repo root and/or append
  `--scope cbs4 --project kingsmetroschools`.
- **Git push asks for credentials** — git uses the Windows Credential Manager
  (`credential.helper=manager`); sign in as the account with access to `cbs-workspace/KMSS`.
