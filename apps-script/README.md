# Kings Metro School Portal — Google Apps Script

The school portal runs entirely on **Google Apps Script + Google Sheets**. There is no external server, database or hosting. Everything lives in a single script project and a single spreadsheet.

This replaces the earlier React + Express + PostgreSQL app (kept in `client/` and `server/` for reference only) and the first modular Apps Script draft (moved to `legacy-modular/`).

## Files (two, plus the manifest)

| Repo file | Apps Script editor type | Editor name |
| --- | --- | --- |
| `Code.gs` | Script | `Code` |
| `index.html` | HTML | `index` |
| `Admission.html` | HTML | `Admission` |
| `appsscript.json` | Manifest | `appsscript` |

Everything else — config, database layer, auth, reference data, students, staff, attendance, results, report cards, fee catalogue & receipts, announcements, Drive uploads, payments and the whole single-page UI — is inside those files.

## What it does

- Username/password sign-in (salted SHA-256, session tokens in `CacheService`)
- Role-based access: Admin, Principal, Headmaster, Bursar, Account Officer, Teacher, Parent
- **Students** — add/edit/delete with photo upload, scoped to a teacher's class(es) / a leader's section
- **Staff** — record staff with photo upload, staff numbers auto-generated `KMS/STF/0001`
- **Attendance** — daily register per class with PRESENT/ABSENT/LATE/EXCUSED + note
- **Results** — two entry modes: per-subject grids (CA1–CA3 /10, Exam /70) **and per-student entry across the whole curriculum**; totals, averages, positions and `ResultSheets` rows are generated automatically on save, with explicit Compute/Publish still available
- **Report cards** — printable modern terminal report (school logo + motto, score table, attendance summary, remarks with signature lines, grading key); no designer branding
- **Payments** — parents record fees/uniform/books payments and upload evidence; bursar/account officer verify
- **Fees & receipts** — a fee catalogue (per section / class level / term) is maintained in the **Fees** tab or portal **Fees** page; parents pick optionals per ward/term, choose a 2- or 3-installment plan, and every payment produces an official printable receipt with running balance
- **My Wards** — parents see the students linked to their account
- **My Fees** — parents see each ward's fee schedule, select items, print the schedule and their receipts
- **Announcements** — audience targeting (all / **website** / section / staff / parents), with an optional label (badge) and link. Anything posted to the **WEBSITE** audience appears on the public school website's scrolling marquee.
- **Setup** — maintain class levels, class arms, subjects, subject↔class mapping, terms, grade scale, parent↔ward links
- **Users** — admin-only panel to add users and manage access, plus self-service password change (see below)
- **Modern dashboards** — role-aware statistics and directory search (see below)
- **Statistics & analytics** — a whole-school (section-scoped) analytics page for Admin/Principal/Headmaster/Bursar: enrollment, attendance trends, term performance, fee collection and termly trends (see below)
- **Messaging** — bulk email and SMS (via the Termii provider, or a gateway fallback) to parents/staff, plus automatic **fee reminders** and **attendance alerts** (see below)
- **Staff register & timetable** — a daily staff-attendance register and a weekly class/subject timetable & exam schedule (see below)

## Dashboards

Every role lands on a tailored, self-contained (no external libraries) dashboard:

| Role | Dashboard |
| --- | --- |
| **Admin** | School-wide headcounts (students & staff), students/staff by section, gender split, enrollment by class, attendance today, payments summary, and a whole-school directory search |
| **Principal** | Same layout **scoped to SECONDARY** — secondary students & staff stats and search |
| **Headmaster** | Same layout **scoped to PRIMARY + KG (incl. Creche)** — students & staff stats and search |
| **Teacher** | Their own classes, students, subjects, current term, attendance today, and a search scoped to their class arms |
| **Bursar / Account Officer** | Finance focus — pending/verified/rejected counts and naira totals, plus attendance and search |
| **Parent** | Wards with quick report-card access, payment status, and announcements |

The directory search matches students and staff by name, admission/staff number, guardian, email, designation or phone, and is automatically restricted to the signed-in role's section/classes.

## Prerequisites

- A Google account
- A Google Drive folder to hold uploaded files and the logos (optional but recommended)

## Setup (one time)

1. Go to <https://script.google.com> → **New project**.
2. Rename the project (e.g. *Kings Metro Portal*) and open **Project Settings** → enable **Show `appsscript.json` manifest file**.
3. Create the files in the editor and paste the matching file from this folder:
   - **File → New → Script** → name it `Code` → paste `Code.gs`
   - **File → New → HTML** → name it `index` → paste `index.html`
   - Open `appsscript.json` and paste the contents of `appsscript.json`
4. The ids are **already baked into `Code.gs`** (`DEFAULT_SPREADSHEET_ID` = the Kings Metro data sheet, `DEFAULT_DRIVE_FOLDER_ID` = the uploads folder), so no Script Properties are strictly required. You can still override any of these via **Project Settings → Script Properties**:

   | Property | Default | Purpose |
   | --- | --- | --- |
   | `SPREADSHEET_ID` | *(baked in)* | Target Google Sheet id (`setUp()` creates one if omitted) |
   | `DRIVE_FOLDER_ID` | *(baked in)* | Drive folder for uploads/logos (falls back to the Sheet's parent folder, then a new folder, if invalid) |
   | `SCHOOL_NAME` | *Kings Metro School Sokoto* | Displayed school name |
   | `SCHOOL_LOGO_URL` | — | Public image URL for the school logo |
   | `CBS_LOGO_URL` | — | Public image URL for the designer (CBS) logo |
   | `FOOTER_TEXT` | *© 2026 Capacity Building and Support (CBS). All rights reserved.* | Footer line |

5. Run the setup function once: in the editor choose `setUp` and click **Run**. Approve the permissions prompt. **`setUp()` is destructive — it clears every tab and re-seeds the reference data and the owner administrator** (reset & re-seed). Only run it when you want a clean slate.

   Existing deployment upgrading to **Phase 1 (fees/settings)**? Do **not** run `setUp()` — run `ensureFeeTables()` instead. It **non-destructively** creates the `Fees`, `FeeSelections`, `FeePlans` and `Settings` tabs and extends the `Payments` columns (adding receipt/installment fields). The same `ensureFeeTables()` also creates the Phase 4 `StaffAttendance` and `Timetable` tabs, so it is the safe migration for any existing sheet.
6. **Deploy → New deployment → Web app**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (or *Anyone with Google account*)
   - Copy the Web app URL.

## Sign in

The **owner administrator** account is created on setup from the email baked into `Code.gs`:

| Username | Password |
| --- | --- |
| `cbs4u4me@gmail.com` | Auto-generated and **emailed to cbs4u4me@gmail.com** during `setUp()` |

Change it after first sign-in via **Change password** (top right of the portal). If the credential email fails for any reason, the temporary password is printed in the Apps Script execution log instead.

## Logos from Google Drive

1. Upload `Logo_kmss.png` (and `CBS_Logo_green.png`) to Drive.
2. Right-click → **Share** → *Anyone with the link* → copy the link (`https://drive.google.com/file/d/FILE_ID/view`).
3. Use it as `https://drive.google.com/uc?export=view&id=FILE_ID` in the `SCHOOL_LOGO_URL` / `CBS_LOGO_URL` script properties.

## Roles, sections and scoping

- **Roles** — `ADMIN, PRINCIPAL, HEADMASTER, BURSAR, ACCOUNT_OFFICER, TEACHER, PARENT`
- **Sections** — `KG, PRIMARY, SECONDARY`
- **Scope** — Admin sees all; Principal → `SECONDARY`; Headmaster → `PRIMARY,KG`; teachers are limited by the comma-separated class-arm ids in `classArmScope` (blank = all arms).
- **Parents** — linked to wards through the `ParentStudents` tab; they only see their own wards, payments and announcements aimed at parents.

## Managing users (admin-only panel)

The **Users** page (ADMIN only) is the admin panel for all accounts in the school:

- **Add user** — enter username, full name, role, email (for credentials), section scope and class-arm ids. A random password is generated and **emailed** to the given address; if no email is given, it is shown **once** on screen. Passwords are never stored in plain text and can never be viewed after creation.
- **Deactivate / Activate** — switch a user's access on or off (ending any open sessions).
- **Reset password** — emails the user a new random password (and ends their open sessions).
- **Change password** — any signed-in user can change their own password from the top-right button.
- **Audit log** — the page lists every account action (who, when, what).

Role notes for new accounts:

- **Role** — `TEACHER` for class teachers; `PARENT` for guardians; plus Principal, Headmaster, Bursar, Account Officer, Admin.
- **Section scope** — for leaders: `SECONDARY` (principal), `PRIMARY,KG` (headmaster); blank = all sections.
- **Class-arm ids** — comma-separated ids of the arms a teacher owns (blank = all arms). Read ids from the *Class arms* tab.

There is also a helper `createUser(username, password, role, fullName, sectionScope, classArmScope)` you can run from the editor (you supply the password).

## Teachers (role-scoped assignment)

The **Teachers** page is available to Admin, Principal and Headmaster and sets which classes each teacher owns:

- **Admin** — any class, any section.
- **Principal** — secondary-school teachers only (SECONDARY).
- **Headmaster** — primary, nursery and creche teachers only (PRIMARY + KG).

Within their scope an assigner can **add a teacher** (auto-generated password, emailed or shown once), **assign classes** (tick the arms the teacher owns), **activate/deactivate**, and **reset passwords**. Every action is logged to the `AuditLog` and revokes the teacher's open sessions. Teachers appear here only if all of their classes are inside the assigner's scope.

## Admissions (public application form)

Members of the public can apply **without signing in** through a standalone page served by the same web app at `…/exec?admission=1` (embedded on the website in the *Admissions* section). The form saves to the `Applications` tab:

- Required: child first/last name, gender, DOB (not in the future), applying class level, guardian name + phone; guardian email is validated if given.
- Optional uploads: a **passport photo** (auto-resized to ≤ 800 px JPEG on the client) and a **document** (e.g. birth certificate, ≤ 7 MB) — both stored in the *Applications* subfolder of the Drive folder with link sharing, and referenced by `photoFileId` / `documentFileId`.
- A honeypot field and a short **cooldown per guardian phone/email** (5 min) reduce spam/duplicate submissions.
- Every application gets a reference `KMS/APP/YYYY/0001` and starts as `PENDING`.

The **Applications** page in the portal (Admin, Principal, Headmaster) shows the application inbox with per-status counts. Review a row to see all details, download the uploaded files, move it through the workflow (`PENDING → REVIEWED → OFFERED → ADMITTED` or `REJECTED`), and add remarks. Scoping is the same as everywhere else: the principal sees secondary applications, the headmaster sees KG/primary ones, admin sees all. Every update is written to the `AuditLog`.

## Demo data

Run one of these from the editor (all idempotent — existing rows are skipped):

| Function | What it seeds |
| --- | --- |
| `createDemoStudents()` | **100 students per class arm** (Nursery, KG, Primary 1–6, JSS 1–3, SSS 1–3 = **1,700**) with every field filled (admission no. `KMS/YYYY/0000`, Nigerian names, ages per class, guardians, phones, Sokoto addresses). Photos are left empty (passport upload is required for hand-entered students). |
| `createDemoStaff()` | Staff records (staff no. `KMS/STF/0000`, name, gender, DOB, phone, email, address, designation, section) for leadership, finance, department heads and class teachers — **plus a login for each** — plus **15 non-teaching staff** (cleaners, security, cook, librarian, lab attendant, driver, receptionist, storekeeper, nurse, ICT, exams officer, counsellor, secretary) as records only (no login). |
| `createDemoUsers()` | Logins for the teaching/admin roster (this is what `createDemoStaff()` uses for passwords). |
| `createDemoParents()` | **10 parent logins** `demo.parent1` … `demo.parent10`, each linked to 1–3 wards of the same surname. |
| `createDemoData()` | **Everything below in one run** — users, staff, students, the 10 parents, staff attendance (last 5 school days), student attendance (last 5 school days, all 1,700), scores for every subject + auto-generated result sheets for the current term, fee selections/plans/payments + receipts (~150 students), a full weekly timetable (17 arms × Mon–Fri), announcements, admission applications (one per status) and default settings. Expect ~20k rows and 1–3 minutes. |

Demo logins (shared password `Demo@1234`):

| Username | Role | Scope |
| --- | --- | --- |
| `demo.admin` | Admin | all |
| `demo.principal` | Principal | SECONDARY |
| `demo.headmaster` | Headmaster | PRIMARY, KG |
| `demo.bursar` | Bursar | all |
| `demo.account` | Account Officer | all |
| `demo.t.kg.hod` · `demo.t.kg.1` … `demo.t.kg.5` | Teachers | HOD = all KG arms; each class teacher owns one arm |
| `demo.t.primary.hod` · `demo.t.primary.1` … `.6` | Teachers | Primary |
| `demo.t.secondary.hod` · `demo.t.secondary.1` … `.6` | Teachers | Secondary |
| `demo.parent1` … `demo.parent10` | Parents | each sees only their linked wards |

**These are demo accounts with a known password — deactivate them (Users/Teachers panels) before go-live.** Sign in uses the username, not the email. Run `createDemoData()` after `setUp()` so students exist before the parent links are created.

## Payments & parent uploads

- A parent opens **Payments**, enters category, amount, method, reference and note for one of their wards, and attaches evidence.
- The evidence file is saved to the Drive folder and a `Files` row plus a `Payments` row (`status = PENDING`) are written.
- Bursar / Account Officer open **Payments**, review the evidence and **verify** or reject; status becomes `VERIFIED` / `REJECTED`.

## Fees, fee selections & receipts

- **Fee catalogue** (`Fees` tab, or portal **Fees** page for ADMIN/PRINCIPAL/HEADMASTER/BURSAR). Each fee/charge has a category (TUITION, FEES, BOOKS, UNIFORM, SPORT, PRACTICAL, LABORATORY, TRANSPORT, ICT, EXCURSION, DEVELOPMENT, OTHER), an amount, and scoping: section, class level, session and term — blank means *all*. `mandatory` items are added to every bill automatically; optional ones are chosen by parents. `active=false` hides it.
- **Parent selection** (portal **My Fees**). Per ward + term a parent sees the applicable items, a total bill, amount paid and balance, ticks the optional items they want (mandatory items are locked on), chooses to pay in **1, 2 or 3 installments**, and saves. Selections are stored in `FeeSelections`, the chosen plan in `FeePlans`.
- **Receipts**. Whenever a payment is recorded (by the parent or finance staff) the row is stamped with `receiptNo` (`KMS/RCP/<year>/<0001>`), `installmentNo`, `amountPaid` and `balanceAfter` (the running bill balance after that payment). Attaching evidence fills the `viewfile` link. Parents view/print official receipts (school logo, no designer branding) from **My Fees** or **Payments**.

## Settings

A small key/value `Settings` tab. Current settings:

| Key | Default | Purpose |
| --- | --- | --- |
| `ADMISSION_NOTIFY_EMAILS` | owner admin email | Extra recipients of admission-application notifications (the applicant + every active ADMIN/PRINCIPAL user are always notified) |
| `SMS_PROVIDER` | *(blank)* | SMS API provider. Currently `TERMII` (auto-selected if an API key is present) |
| `SMS_API_KEY` | *(blank)* | Provider API key (Termii dashboard) |
| `SMS_SENDER_ID` | `KMS` | Approved alphanumeric sender ID (3–11 chars) |
| `SMS_CHANNEL` | `generic` | Termii route: `generic` (promotional) or `dnd` (transactional, all numbers) |
| `SMS_COUNTRY_CODE` | `234` | Default country code used to normalise local phone numbers |
| `SMS_EMAIL_GATEWAY` | *(blank)* | Fallback carrier email-to-SMS suffix (e.g. `@vtext.com`) used only when no provider is configured |

Editable from the portal **Fees → Settings** card, or directly in the `Settings` tab. Admission mail is sent via MailApp (counts against the Gmail quota — keep the list small); SMS is sent via the provider and is billed separately.

## Results & report cards

Score entry lives on the **Results** page (Admin, Principal, Headmaster, Teacher) with three tabs:

- **Score entry** — a grid for one subject at a time across the whole class arm (CA1–CA3 /10, Exam /70). Saving a grid recomputes the class result sheets automatically.
- **Per-student grades** — pick a class, term and student to see **every subject in that student's curriculum** with its current scores in one page. Totals update live as you type; **Save grades** writes the whole set and **automatically regenerates that student's `ResultSheets` row** (total, average, position, status preserved) — no separate "Compute" click needed. A completeness note shows how many subjects are still outstanding, and a **Report card** button opens the result.
- **Result sheets** — the class ranking (position, total, average, status) with the explicit **Compute** and **Publish** buttons; publish flips every sheet for the class/term to `PUBLISHED`.

Subjects are validated against the student's own curriculum, entry requires teacher/leader scope, and parents cannot enter grades (they view their ward's report card). Teachers see only their assigned arms.

The **report card** (`Report card` on any sheet/row, or from a parent's **My Wards**) prints a clean terminal report: school logo and motto, student/term/attendance meta, position/total/average/status, a striped score table with a totals row, teacher & principal remarks with signature lines, the grading-scale key, and an official sign-off. It carries **no CBS/designer branding** and needs no counter-signature.

## Statistics & analytics

The **Statistics** page (Admin, Principal, Headmaster, Bursar) is a management overview powered by `api_getAnalytics`, scoped to the signed-in role (admin = whole school, principal = SECONDARY, headmaster = PRIMARY+KG, bursar = school-wide finance). Pick a **term of focus** and the performance and finance blocks recompute.

- **Headline cards** — total students, attendance rate, average score and fee-collection rate.
- **Enrollment** — by section and gender bars, plus a per-class-level table.
- **Attendance trend** — present-rate by month.
- **Performance (focus term)** — grade distribution, per-subject averages, and the top-10 students (each with a report-card link).
- **Fees & collections (focus term)** — billed vs collected vs outstanding, payment status counts and naira totals, a per-section breakdown, and monthly collections. The "billed" figure is derived from the fee catalogue (mandatory fees + each student's saved optional selections), so it matches parents' schedules.
- **Termly trends** — attendance rate, average score, billed, collected and collection rate across the most recent terms.

Everything is aggregated from the existing `Students`, `Attendance`, `Scores`, `ResultSheets`, `Fees`, `FeeSelections`, `Payments` and `Staff` tabs — no extra sheets are required.

## Messages, reminders & alerts

The **Messages** page (Admin, Principal, Headmaster, Bursar) sends bulk messages to **parents/guardians**, **staff**, or **both**, optionally narrowed to a section or class arm, over **Email**, **SMS**, or **both**. A live **Audience** card shows how many addresses will receive it, whether SMS is configured, and a short sample before you send. Addresses are de-duplicated (a parent with several wards receives one copy) and capped at 300 recipients per send to protect the Gmail daily quota; every send is logged.

- **SMS provider (recommended)** — create a [Termii](https://termii.com) account, get an **API key** and an approved **Sender ID**, then on **Fees → Settings** set **Provider = TERMII**, paste the **API key** and **Sender ID**. Messages are sent directly to any Nigerian network. Choose the route: **Generic** (promotional; will not reach DND numbers) or **DND** (transactional; reaches all numbers — needs DND enabled on your Termii account). Phone numbers are normalised automatically (local `0803…` or `+234…` → `234803…`); set **Default country code** if you are not in Nigeria.
- **Email-to-SMS gateway (fallback)** — if no provider is set, an optional `SMS_EMAIL_GATEWAY` suffix (e.g. `@vtext.com`) routes each SMS as `number@gateway`. Leave both blank to send email only (SMS recipients are reported as skipped).
- **Quick actions** — *Send fee reminders* contacts guardians of students with an outstanding balance for the current term (bill computed from the fee catalogue minus non-rejected payments); *Send attendance alerts* contacts guardians of students below a present-rate threshold (default 75%, min 3 recorded days). Both honour the selected **Channel** and show a confirmation with the recipient count first.

> SMS is billed by the provider and is **not** limited by the Gmail quota. Test with a small audience first.

## Staff register

The **Staff register** page (Admin, Principal, Headmaster) records daily staff attendance — Present / Absent / Late / Excused plus an optional note — for the staff in your section scope, stored in the `StaffAttendance` tab keyed by staff and date.

## Timetable & exams

The **Timetable** page (staff) manages a weekly class schedule per class arm and term: day, start/end time, subject (or free-text title), teacher, room and type (`CLASS` or `EXAM`). Entries are stored in the `Timetable` tab. Teachers may edit their own classes; parents with a ward in the arm get a read-only view.

## Data model (spreadsheet tabs)

| Tab | Purpose |
| --- | --- |
| `Users` | Accounts, roles, section/class scoping |
| `ClassLevels` | Creche, Pre-Nursery … SSS 3, grouped by section |
| `ClassArms` | Arm “A” (add B, C… as needed) per level |
| `Subjects` | Subjects per section |
| `SubjectClass` | Which subjects belong to which class level |
| `Terms` | Sessions + First/Second/Third term, `isCurrent` flag |
| `GradeScale` | A–F boundaries per section |
| `Students` | Enrollments (admission no. auto-generated `KMS/<year>/0001`); all fields + passport photo are required for hand-entered students |
| `Staff` | Staff records (staff no. `KMS/STF/0001`) |
| `ParentStudents` | Parent ↔ ward links |
| `Attendance` | One row per student per day |
| `Scores` | One row per student/subject/term (CA1, CA2, CA3, Exam, total, grade) |
| `ResultSheets` | Per student/term totals, average, position, remarks, status — regenerated automatically when scores are saved (per-subject grid or per-student) |
| `Payments` | Fee/uniform/books payments + evidence + verification + receipt fields (`feePlanId`, `installmentNo`, `amountPaid`, `balanceAfter`, `receiptNo`, `viewfile`, `items`) |
| `Fees` | Fee/charge catalogue (category, section/level/session/term scope, amount, mandatory, active) |
| `FeeSelections` | Which optional fees a parent has selected per student/term |
| `FeePlans` | Installment plan (1/2/3) per student/term |
| `StaffAttendance` | Daily staff attendance (Present/Absent/Late/Excused + note) keyed by date + staff |
| `Timetable` | Weekly class timetable & exam schedule per class arm/term (day, times, subject/title, teacher, room, kind) |
| `Settings` | Key/value school settings (`ADMISSION_NOTIFY_EMAILS`, `SMS_PROVIDER`, `SMS_API_KEY`, …) |
| `Files` | Uploaded file index (Drive file id, url, owner, size) |
| `Applications` | Public admission applications (ref, child, guardian, class level, files, status workflow) |
| `Announcements` | Posts with audience targeting; `category` (badge) and `link` are optional extra columns |
| `AuditLog` | Account activity — who added/activated/deactivated/reset which user, and when |

## Embedding in your website

The portal is a standalone web app (deployed by Google, reached by its `/exec` URL). It is designed to be embedded inside the Kings Metro website (Cloudflare Pages) via an **iframe**:

```html
<iframe
  src="https://script.google.com/macros/s/XXXX/exec"
  title="Kings Metro Portal"
  style="width:100%;height:calc(100vh - 80px);border:0"
  allow="clipboard-write">
</iframe>
```

Embed options (query parameters on the `/exec` URL):

| Parameter | Effect |
| --- | --- |
| `view=<key>` | Open directly on a page — `dashboard`, `students`, `attendance`, `results`, `statistics`, `messages`, `staff-register`, `timetable`, `staff`, `teachers`, `applications`, `payments`, `my-wards`, `fees`, `users`, `admin`, `announcements` |
| `embed=1` | Compact mode: hides the CBS footer and tightens page padding to blend into the host page |
| `admission=1` | Show the **public admission application form** (`Admission.html`), no login required — embed it on the website alongside the portal |
| `public=announcements&callback=<fn>` | **Public, no login** — returns the website announcements as JS (JSONP) for the landing-page marquee. Only active posts with audience `WEBSITE` are returned. |

The web app already sends `XFrame-IframeOptions: ALLOWALL`, so no extra headers are needed. Sessions are kept in the browser for 6 hours, so users sign in once inside the iframe.

## Website marquee & background music

The public landing site (`../site/index.html`) shows a scrolling announcement marquee at the top of the page (gold/emerald ticker, pauses on hover, seamless loop).

- **Publishing**: in the portal, **Announcements → New announcement**, set **Audience = `WEBSITE`**. Add an optional **Label** (shown as the badge) and **Link**. The marquee auto-refreshes on each page load.
- **How it loads**: the page fetches `…/exec?public=announcements&callback=…` via JSONP (the Apps Script web app can't be called cross-origin with `fetch`). The endpoint is public, returns only `WEBSITE` posts, and never exposes other sheet data.
- **No announcements**: if nothing is published, the marquee stays hidden (no empty bar).
- **Background music**: drop an audio file at `site/music.mp3`. It starts on the visitor's first click/tap (browsers block autoplay) and loops. A floating mute/play button with animated equalizer bars appears bottom-right; the choice is remembered in `localStorage`. If `music.mp3` is missing, the button hides itself.

> If you upgraded from an earlier version of the `Announcements` sheet, run the editor function **`ensureAnnouncementColumns()`** once to add the new `category` and `link` header cells without touching your data. A fresh `setUp()` already includes them.

## Notes

- Session tokens expire after 6 hours (Apps Script `CacheService` limit); users simply sign in again.
- Passwords are salted SHA-256 hashes only — they are never stored in plain text and can never be read back. Users set their own password via **Change password**; admins can only email a freshly generated temporary one.
- Five failed sign-in attempts on the same username lock that account for 15 minutes.
- Changing/resetting a password (or deactivating a user) instantly ends all of that user's open sessions.
- The spreadsheet is the single source of truth — back it up with Drive version history or *File → Make a copy*.
- Score entry clamps CA1–CA3 to 10 and Exam to 70; totals and grades are computed server-side, and `ResultSheets` are regenerated automatically whenever scores are saved.
- The client talks to the server only through `api_*` functions via `google.script.run` (see `index.html` `call()`).
- Deploying a **new version** is required after code changes: *Deploy → Manage deployments → edit → Version: New version*. Adding scopes (e.g. MailApp) may also require you to re-authorize once and/or create a new deployment.
