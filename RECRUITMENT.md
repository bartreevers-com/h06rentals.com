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
| `/api/careers/upload` | POST | Two-step direct upload in production (Vercel caps request bodies at ~4.5 MB): JSON `{action:"sign",…}` validates and returns a one-time signed URL the browser PUTs the file to, then `{action:"confirm",…}` verifies the object landed and records it. Local dev accepts classic multipart. Draft-stage only; replaces prior file of the kind |
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

---

# Phase 2 — Assessment, scoring, AI assistant, owner decision (2026-07-20)

The first vacancy is now **Podcast Host & Brand Creator** (`H06-VAC-0001`,
published; existing deployments upgrade the seeded vacancy in place on boot).

## What was added

- **Human eligibility screening** — HR records Eligible / Not eligible / Needs
  review with a mandatory reason, essentials checkbox, notes, reviewer and
  timestamp (`screenings`, full history kept). The automatic yes/no question
  screen is only a pre-flag; no candidate is ever rejected automatically.
- **Interview scheduling** — date/time, online or in-person, link/location,
  interviewer assignment, reschedule / cancel / attended / no-show, invitation +
  reschedule + cancellation emails, and a daily Vercel cron
  (`/api/cron/recruitment`, 07:00 UTC, `vercel.json`) that emails reminders for
  interviews within 24 hours. Optional: set `CRON_SECRET` in Vercel to lock the
  endpoint.
- **Structured scorecards** — the approved competency framework
  (Conversation & listening 20%, Improvisation 15%, Intelligence & curiosity 15%,
  Humour 10%, Fluency & clarity 10%, Reliability & preparation 10%,
  Brand judgement 10%, Commercial & content instinct 10%), each scored 1–5 with
  evidence, strengths, concerns and an overall recommendation. The weighted
  total (0–100) is computed server-side (and live in the UI).
- **Independent panel scoring** — assessors cannot see anyone else's scores
  until their own scorecard is submitted (enforced server-side). HR/owner see
  the score matrix, per-competency averages, average weighted total, and ⚑ flags
  where assessors disagreed by 2+ points. Submitted scorecards can only be
  edited by their author, with a written reason; every previous version is
  preserved in `revisions`.
- **AI assistant (assistant only)** — with `ANTHROPIC_API_KEY` set in Vercel,
  HR/owner can generate an evidence-linked summary: every observation quotes
  the candidate's actual words and names its source; plus missing-information
  and follow-up-question lists. The system prompt forbids scoring, ranking,
  rejecting, judging appearance/accent/personality, or inferring protected
  characteristics, and the output is always rendered under the label
  *"AI-assisted summary. This is not a hiring decision and must be reviewed by
  a human."* Video/audio are NOT transcribed (no speech-to-text provider yet) —
  the analysis covers written answers only, and says so.
- **Finalists & comparison** — HR selects up to three (each move walks the
  audited pipeline one stage at a time), candidates are emailed, and
  `/admin/recruitment/[id]/compare` shows scores, per-competency averages,
  screening result, strengths/concerns, panel recommendations, AI summary,
  availability, expected compensation and conflict declarations side by side —
  with the explicit note that the top score doesn't automatically win.
- **Owner decision** — approve (→ offer email), reserve, request information,
  return to HR, or reject all; a written reason is demanded when approving
  against the panel's top score (and for every non-approve action). The
  decision never edits or deletes scorecards.
- **Recruitment dashboard** — open vacancies, applications by stage, interviews
  in the next 7 days, scorecards outstanding, finalists awaiting the owner,
  hired/rejected/withdrawn.
- **Extended audit** — `recruitment_events` records candidate views, screening
  decisions, interview actions, score submissions and changes, AI runs,
  finalist selections, owner decisions, retention changes and reminder sends —
  alongside the existing status-change audit.
- **Branded emails** — every email (recruitment and booking) now renders in the
  H06 template: emerald-on-ink, brand mark, footer. Plain-text alternative
  always included.
- **Application form additions** — availability (required) and expected
  compensation (optional).
- **Production uploads fixed** — Vercel caps request bodies at ~4.5 MB, so
  uploads now go **directly from the browser to Supabase Storage** via one-time
  signed upload URLs (`sign` → direct PUT → `confirm`, which verifies the object
  actually landed and its size). Local dev still uses simple multipart.

## Administrator guide (the 5-minute version)

**HR runs the process; the Owner decides.**

1. **Vacancy**: Recruitment → New vacancy → fill the brief → Submit for review.
   The Owner approves; HR publishes. The page appears at `/careers`.
2. **Applications arrive** — dashboard counts them; each opens from the vacancy.
3. **Screen** every application: Eligible / Not eligible / Needs review, with a
   reason. Then advance the pipeline (each move asks for a reason).
4. **Interview**: schedule from the candidate page — the invitation email goes
   out automatically; reminders send themselves the day before.
5. **Score**: every panel member opens the candidate and submits their own
   scorecard. Nobody sees anyone else's until they've submitted. The weighted
   total is automatic.
6. **Finalists**: from the vacancy page tick up to three → "Send to the Owner".
7. **Decide**: the Owner opens Compare finalists and approves / reserves /
   returns / rejects. The offer email sends on approval.
8. **Afterwards**: rejected/reserve candidates get their retention date
   automatically; expired ones appear in the Owner's deletion-review queue —
   nothing is deleted without a click.

Environment variables that matter: `SUPABASE_SERVICE_ROLE_KEY` (file storage —
already set), `RESEND_API_KEY` (email — already set), `ANTHROPIC_API_KEY`
(enables the AI assistant — **add this to use AI summaries**), `CRON_SECRET`
(optional, locks the cron endpoint).

## Phase 2 test results (2026-07-20, production build, local)

- 25/25 automated tests pass (`npm test`): state machine, retention, competency
  weights (sum = 100), weighted totals (all-5s = 100, all-1s = 20), incomplete
  scorecards rejected, per-competency averaging, 2+ point disagreement flags.
- Manual end-to-end on a fresh database: candidate applied on the podcast
  vacancy (with availability + expected compensation) → HR screened *Eligible*
  with reason → interview scheduled (invitation email logged) → scorecard
  submitted (weighted total 84/100, matching the hand-calculated value) →
  finalist selected (notification email) → Owner approved (offer email) —
  final status `conditional_offer`, and the event log recorded:
  candidate_viewed ×5, screening, interview_scheduled, score_submitted,
  finalists_submitted, owner_decision: approve.
- Cron endpoint returns `{ok, remindersSent}`; reminder window (24 h) verified
  by inspection.
- Not exercised live: AI generation (needs `ANTHROPIC_API_KEY`; the
  not-configured error path returns a friendly message) and multi-assessor
  blind view (single-assessor environment; the gate is a single server-side
  condition — assessors get aggregate visibility only after their own
  `submitted_at` is set).
