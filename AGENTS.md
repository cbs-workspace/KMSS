# AGENTS.md — working conventions for this repo

Kings Metro School Sokoto. Public website lives in `site/` (static; deployed to Vercel).
The management portal is a Google Apps Script web app whose reference source lives in
`Google_App_Script/` (`Code.gs`, `index.html`, `Admission.html`, `appsscript.json`).

## Portal changes (Google Apps Script)

- **Prefer implementing portal changes in `Google_App_Script/index.html` (client-side).**
  The maintainer updates the live project by pasting a single file into the Apps Script
  editor, so a change that lives only in `index.html` needs just one paste.
- Only edit `Code.gs` when the change genuinely requires server-side logic.
- When a change spans both files, still make the `index.html` side self-sufficient
  wherever possible (e.g. default a value in `index.html` so the feature works even if
  `Code.gs` is not updated). Example: the brand logo defaults in `index.html` via
  `if (BRAND && !BRAND.logoUrl) BRAND.logoUrl = '…/Logo_kmss.png';`.
- After editing, tell the maintainer exactly which file(s) to paste and the deploy steps:
  **Deploy → Manage deployments → Edit → Version: New version → Deploy** (keeps the
  same `/exec` link so `site/login.html` and the embedded portal keep working).

## Website changes

- Static pages in `site/` share `styles.css` and `app.js`. Shared markup (header, footer,
  floating rail, modal, audio) is duplicated across the `.html` pages — when editing a
  shared block, apply it to all pages.
- `site/login.html` embeds the portal full-page (login mode `page` in `CONFIG`);
  never expose the raw `script.google.com` URL in the address bar.
- Keep local-only files out of git: `docs/`, `server/`, `client/`, `docker-compose.yml`,
  `*.docx`, `*.pdf` are gitignored. Committed reference/build files are `site/`, `tools/`,
  `package.json`, `package-lock.json`, `README.md`, and the portal source in
  `Google_App_Script/` (reference only — it is never built or deployed from this repo).

## Style

- Do not add comments to code unless asked.
