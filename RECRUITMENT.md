# H06 Recruitment Module — Phase 1

Vacancy management and candidate applications, built into the existing H06 platform
(same Next.js app, same database, same design system, same deploy pipeline).
Live surfaces: public careers area at `/careers`, staff area under `/admin/recruitment`.

---

## What shipped in Phase 1

- **Vacancy lifecycle** with owner-gated approval: draft → internal_review → approved →
  published → paused/closed → archived, plus owner-only reopen with written reason.
  Every action is audited (actor, role, timestamp, reason, previous config).
- **Public careers area**: listing, vacancy detail, multi-step application form
  (email OTP verification, autosave drafts, progress bar, per-step validation, real
  uploads with progress, review step, receipt with reference), candidate dashboard
  (status tracking, withdrawal, versioned corrections), recruitment privacy notice v1.0.
- **Application pipeline** with a server-enforced state machine: submitted → screening →
  shortlisted → interview → final_assessment → finalist → owner_review →
  conditional_offer → hired, plus reserve / rejected / withdrawn. One stage at a time;
  skipping is an Owner override — allowed only with a written reason and flagged
  `OVERRIDE` on the audit trail. Nothing moves silently.
- **Files**: PDF/DOCX CVs (5 MB), supporting docs (10 MB), MP4/MOV video (200 MB,
  stored at original quality — no recompression), MP3/WAV audio (30 MB). Extension +
  MIME + size validated server-side. Stored privately (Supabase Storage bucket
  `recruitment` in production; `.data/uploads` with HMAC expiring tokens in dev).
  Access only via short-lived signed URLs; every access (and denial) is logged to
  `file_access_log`. No public URLs exist.
- **Privacy & consent**: privacy notice version, acknowledgement timestamp, lawful
  basis (`legitimate_interest` default) recorded per application. Core processing is
  never presented as optional consent. Talent-pool consent is a separate checkbox,
  unticked by default, with its own timestamp. No sensitive data (DOB, religion,
  marital status, ethnicity, photos, etc.) is requested anywhere.
- **Retention**: per-vacancy retention days (default 180). Terminal outcomes set
  `retention_expiry`. Owner sees a review queue of expired applications and
  anonymises them explicitly (files destroyed, personal data blanked, anonymous stage
  history retained). Legal hold suspends deletion. Talent-pool-consented applications
  are excluded from anonymisation. Nothing is deleted automatically.
- **Communications**: 8 approved templates (submission confirmation, draft reminder,
  missing information, correction received, shortlist invitation, rejection,
  withdrawal confirmation, talent-pool request) with live preview, plus manual
  messages. All delivery logged with status in `candidate_comms`. Internal notes are a
  separate table and never rendered on any candidate surface.

## Permission matrix (enforced server-side in every action/route)

| Capability | Owner | HR | Hiring manager | Assessor | Applicant |
|---|---|---|---|---|---|
| Create/edit vacancies | ✅ | ✅ | — | — | — |
| Approve vacancy for publication | ✅ only | — | — | — | — |
| Publish approved / pause / close | ✅ | ✅ | — | — | — |
| Reopen closed vacancy | ✅ (reason) | — | — | — | — |
| Edit selection criteria after applications open | ✅ (reason + snapshot) | ❌ blocked | — | — | — |
| View candidates | all | all | panelled vacancies | panelled vacancies | own only |
| Advance pipeline stages | ✅ | ✅ (up to owner_review) | ❌ | ❌ | — |
| Advance out of owner_review / mark hired | ✅ only | ❌ | ❌ | ❌ | — |
| Reject (with reason) | ✅ | ✅ | ❌ | ❌ | — |
| Reserve list | ✅ only | ❌ | ❌ | ❌ | — |
| Override / reinstate terminal states | ✅ (reason, flagged) | ❌ | ❌ | ❌ | — |
| View files | all | all | panelled | panelled | own only |
| Send candidate comms | ✅ | ✅ | ❌ | ❌ | — |
| Internal notes | ✅ | ✅ | ✅ | ✅ | never sees them |
| Retention: anonymise / legal hold | ✅ only | ❌ | ❌ | ❌ | — |
| Withdraw application | — | — | — | — | ✅ own |

Applicants use a **separate session** (`h06_cand` cookie, email OTP, no password) —
staff and candidate auth never mix. The Owner's break-glass login and all existing
staff roles are untouched. New staff roles `hiring_manager` and `assessor` are
creatable under Team (owner-only).

## API surface

Candidate (all require the candidate session unless noted):

| Route | Method | Purpose |
|---|---|---|
| `/api/careers/otp` | POST | `{action:"start",email}` send code · `{action:"verify",email,code}` create session · `{action:"signout"}` |
| `/api/careers/draft` | PUT | Autosave `{vacancyId, form}`; creates the draft application on first save |
| `/api/careers/upload` | POST | multipart `{applicationId, kind, file}`; draft-stage only; replaces prior file of the kind |
| `/api/careers/submit` | POST | Final submission; validates questions + required uploads + declarations; freezes snapshot; runs eligibility screen; emails confirmation |
| `/api/careers/withdraw` | POST | `{applicationId}`; audited; sets retention expiry; confirms by email |
| `/api/careers/amend` | POST | `{applicationId, note}`; versioned correction, original preserved |
| `/api/careers/file/[id]` | GET | Redirects to a 5-minute signed URL for the candidate's own file |
| `/api/careers/local-file` | GET | Dev-only: serves local files against HMAC expiring tokens |

Staff:

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/recruitment/file/[id]` | GET | Role- and panel-checked, logged, redirects to signed URL |

Everything else staff-side is server actions in `src/app/admin/recruitment/actions.ts`
(create/update/duplicate vacancy, status transitions, pipeline moves, notes, comms,
legal hold, anonymise) — each re-checks the session role before touching data.

## Data model (all tables additive, self-provisioning)

`vacancies`, `vacancy_audit`, `candidates`, `applications` (UNIQUE(vacancy_id,
candidate_id) prevents duplicates), `application_amendments`, `application_audit`,
`application_files`, `file_access_log`, `candidate_comms`, `application_notes`.
Migrations are `CREATE TABLE IF NOT EXISTS` in `src/lib/db/index.ts` and apply
themselves on first boot — production needs no manual migration step.

## Seed & test accounts

- Seeded vacancy: **Founding Host & Brand Creator** (`H06-VAC-0001`, published, closes
  31 Aug 2026, CV + video required, one eligibility question, 180-day retention).
- Owner: the existing break-glass login (`owner` + `ADMIN_PASSWORD`).
- HR: any staff account with role `hr` (existing HR accounts gain the Recruitment tab).
- Candidate: any email works via OTP; in environments without `RESEND_API_KEY` the
  code is printed in server logs and stored in `email_log`.

## Automated tests

`npm test` (vitest) — 17 tests over the state machine and retention:
role gates on approval/publication/reopen, one-stage-at-a-time enforcement, override
flagging, reject/reserve rules, terminal-state locking, retention expiry maths.

## Manual QA checklist (all passed 2026-07-20 on a production build)

- [x] Careers listing shows only published vacancies; closed/paused states render correctly
- [x] Vacancy detail: full sections, closing date, privacy link; staff preview of unpublished vacancies (banner shown), 404 for the public
- [x] OTP: code delivered, wrong code rejected, session established
- [x] Draft autosave creates and updates the application; submitted apps refuse further drafting (409 + ref)
- [x] Upload: `.exe` rejected, size/MIME enforced, replace-on-reupload, progress UI
- [x] Submit blocked until required uploads present; eligibility auto-screen recorded; snapshot frozen; confirmation email + team notification sent
- [x] Candidate file access: 307 → signed token → correct bytes; unauthenticated access 401; tampered token rejected
- [x] Correction stored as amendment; original untouched; both emails logged
- [x] Withdrawal: audited, retention expiry set (terminal + 180d verified), duplicate withdraw 409, dashboard shows Withdrawn
- [x] Admin: owner sees Recruitment tab; vacancy list with application counts
- [x] Vacancy admin: workflow buttons match state machine; guarded-edit warning once applications open; audit trail with reasons and preserved previous config
- [x] Pipeline: submitted → screening with mandatory reason; audit row written; move options re-computed per state; override options labelled and warned
- [x] Owner override: withdrawn → screening reinstatement, reason required, flagged on audit
- [x] Notes: saved with author + role, candidate-invisible
- [x] Comms: template preview renders with real variables; history logged with status

## Deployment

Nothing beyond the normal flow:

1. Push to `main` → Vercel builds and deploys.
2. First production request auto-creates the new tables and seeds the vacancy.
3. `SUPABASE_SERVICE_ROLE_KEY` must be present in Vercel env (added 2026-07-19) —
   with it the storage driver is Supabase and the private `recruitment` bucket is
   created on first upload. Without it uploads would use ephemeral local disk, which
   is unacceptable in production; verify the env var exists before announcing the role.
4. Optional later: a scheduled job for draft reminders / retention nudges (none exists
   yet — the owner review queue covers retention manually).

## Rollback plan

The module is additive. To roll back: `vercel rollback` (or redeploy the previous
commit from the Vercel dashboard). The new tables are ignored by the old build and
can stay in place; no data migration to reverse. To hide the module without a deploy:
owner closes/archives the vacancy — the careers page then shows "no roles open" and
the application APIs refuse new submissions.

## Assumptions & accepted risks

- **No malware scanning service** is attached. Mitigations: strict extension + MIME +
  size validation, private storage, no execution surface, `scan_status` column ready
  for a scanner later. Accepted for Phase 1.
- **Eligibility screening** is limited to flagged yes/no questions; failures are
  marked `fail` but still human-reviewed — no automatic rejection (deliberate).
- **Retention deletion is manual** (owner review queue) — no cron exists on this
  stack yet. The queue makes expiry visible; nothing is silently deleted or kept.
- **Scoring/assessment forms for panel members** (competency scoresheets, blind
  scoring) are Phase 2; competency weights are stored and displayed but not yet
  collected as structured scores.
- **OTP email delivery** depends on Resend; if Resend is down candidates can't sign
  in (codes are still logged server-side for support to assist manually).
- PGlite dev database is single-process: never open `.data/pglite` from a second
  process while the dev server runs (it corrupts the WAL — learned the hard way).
