# H R Foundation — Website & Administration

Public website and staff administration dashboard for **H R Foundation**, a charitable trust in Peddapalli, Telangana.

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, MongoDB + Mongoose, Radix UI (shadcn/ui-style components), TanStack Table, Recharts, React Hook Form + Zod, pdf-lib, Argon2.

## 1. Setup

Requirements: Node.js 22+, MongoDB 7+ (local) or MongoDB Atlas.

```bash
npm install
cp .env.example .env.local        # fill in values (see section 2)
npm run db:indexes                # create database indexes
npm run db:seed                   # load the website's current content and default settings (safe to re-run)
npm run admin:create -- --email you@example.org --name "Your Name"
npm run dev                       # http://localhost:3000  ·  admin at /admin
```

`admin:create` prints a **random temporary password once**; the first sign-in forces a new password. There is no default password. To issue a new temporary password from the command line: `npm run admin:create -- --email you@example.org --reset`.

**Live database:** the CLI scripts use `.env.local` by default. Add `--live` to use `.env.production.local` instead, e.g. `npm run admin:create -- --live --email you@example.org --name "Your Name"` or `npm run db:indexes -- --live`. Each script prints which database it is using before it starts.

Other commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:rules` (brute-force check that waiting-period/age database filters agree with the calculator).

**Development only:** `npm run dev:seed-demo` creates one test account per role on a *local* database and writes their random passwords to `.dev-credentials.local` (git-ignored). It refuses to run against a non-local database.

## 2. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | e.g. `mongodb://127.0.0.1:27017/hr_foundation` or an Atlas URI |
| `NEXT_PUBLIC_SITE_URL` | Yes (production) | Public URL used for canonical links, sitemap and reset links |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Production only | `true` only on the live site; anything else blocks search engines |
| `RESEND_API_KEY` | Optional | Enables email (notifications, password reset, receipts). Server-only |
| `FORM_FROM_EMAIL` | With Resend | Verified sender, e.g. `H R Foundation <noreply@your-domain>` |
| `FORM_TO_EMAIL` | Optional | Fallback inbox for new-enquiry alerts (the dashboard setting takes priority) |

Secrets are only read on the server and are never stored in the database or sent to the browser. Without email configured, the dashboard still works; notifications are logged as "skipped" and password resets are done by a Super Admin.

## 3. Administration dashboard (`/admin`)

| Area | What it does |
| --- | --- |
| Dashboard | Live counts and charts from the database; only verified donations count in totals |
| Membership | Applications, members, payments (record → verify against statement), approval/activation with a unique membership ID, suspend/reinstate, nominees, notes, six-month waiting-period tracker |
| Death-benefit claims | Record claims, assign reviewers, private document upload, verification notes, information requests, recommendation, authorised decision with an eligibility snapshot, payment recording, closure |
| Donations & finance | Manual UPI/bank/cash/cheque records, reconciliation queue, duplicate detection, receipts (PDF) with correction by cancel-and-re-issue, reports |
| Website | Pages (draft → publish), services, activities, news, public documents (separate publish permission), media library, contact enquiries |
| Administration | Users & roles, audit log, website settings, membership rules, notification templates & delivery log |

### Roles

| Role | Access |
| --- | --- |
| Super Admin | Everything, including users, settings and membership rules |
| Content Manager | Website content, documents, media, enquiries |
| Membership Manager | Applications, payments, decisions, nominees |
| Finance Manager | Donations, reconciliation, receipts, financial reports, claim payments |
| Claims Reviewer | Claims, claim documents, decisions |

A Super Admin can grant individual extra permissions (e.g. let a Content Manager read membership records). **Every page, server action and API route checks permissions on the server** (`src/lib/auth/dal.ts`); the sidebar only hides what a user cannot open.

### Business rules enforced on the server

- Membership activates only from *Pending Approval*, after a **verified** payment; activation is a single conditional update, so it cannot happen twice. Membership IDs are unique (`HRF-M-YYYY-NNNNN`).
- Waiting period = effective date + N calendar months (default 6), clamped to month end (31 Aug → 28/29 Feb). "Completed" never means "eligible for payment".
- Claim approval re-checks eligibility at decision time (scheme formally approved, active membership, verified payment, waiting period complete before date of death, age limit, no review flag) and is **blocked** unless every check passes. The approved amount cannot exceed the configured limit. Rejection requires a reason. Nothing is approved or paid automatically; the dashboard does not move money.
- While Membership Rules mark the scheme as **proposed**, claims can be reviewed but never approved.
- Transaction references (UTR/cheque) are unique across donations and membership payments. Only one active receipt can exist per donation.
- Money is stored as integer paise.

### Security & privacy

- Argon2id password hashing; 12+ character policy; database-backed sessions (random token in an HttpOnly cookie, hashed in the DB, 8-hour idle / 7-day maximum); all sessions end when a password changes or a user is deactivated; sign-out reloads the page so no admin data stays in memory.
- Login rate limiting by IP and email plus account lockout (5 failures → 15 minutes), stored in MongoDB.
- Server actions have Next.js's built-in origin checks (CSRF protection); route handlers check the session and permissions.
- Uploads are checked by file content (not extension), size-limited, and stored in MongoDB GridFS. Claim documents are in a **private** bucket served only to authorised users, with every view audited. Public documents download only when published *and* marked public.
- Nominee and claimant details are visible only to roles with nominee/claim access, and are never included in exports. CSV exports protect against spreadsheet formula injection and are audited.
- The audit log is append-only and redacts phone numbers, addresses, emails and identity fields from stored details.

## 4. Website content

Public pages read their text from the CMS (cached; refreshed immediately when published in the dashboard). The files in `src/content/` hold the original approved defaults used to seed the database and as a fallback if the database is unavailable. Search the code for **`CLIENT TO CONFIRM`** for values awaiting the foundation.

Content principles: nothing is presented as an operating programme until approved; no unverified impact figures; the death benefit is labelled proposed / not insurance / not guaranteed until approved; no tax-deduction claims.

## 5. Deployment

1. Use a MongoDB **replica set** (Atlas provides one). Critical operations are written to be safe on a standalone server, but a replica set adds durability and backups.
2. Set the environment variables above; run `npm run db:indexes` and `npm run db:seed` once against the production database, then `npm run admin:create`.
3. `npm run build && npm start` (or deploy to a Node.js host such as Vercel). Serve over HTTPS — the session cookie uses the `__Host-` prefix and `Secure` flag in production.
4. Enable automated backups (Atlas: continuous backup; self-hosted: scheduled `mongodump` stored off-site, tested restores).
5. Agree a data-retention policy (e.g. rejected applications, closed enquiries) and document it in the privacy policy.

## 6. Not included (future work)

These are deliberately not implemented and nothing in the UI pretends they exist:

- **Online payment gateway** (Razorpay/Cashfree): needs server-side order creation, signed webhook verification and idempotent event handling. The data model reserves `source: "gateway"`.
- **Online claim submission by nominees** (would need nominee identity verification). Claims are currently recorded by staff.
- **SMS** notifications.
- Two-factor authentication for administrators (recommended before launch).
