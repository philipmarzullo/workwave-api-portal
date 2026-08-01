# WorkWave API Access Portal — Hackathon Brief

## Team & Schedule

- **Hackathon entry**: API Access Platform
- **Working sessions**: Monday & Tuesday
- **Pitch**: Wednesday
- **POC URL**: https://ww-api-portal.onrender.com/
- **Password**: `Philip123!`

---

## The Problem

WorkWave has **no centralized system** for managing third-party API access across its product portfolio (PestPac, RealGreen, WinTeam, Route Manager, Lighthouse, Timegate+). Today:

1. **Intake is manual** — API access requests come in via PDF forms emailed to a shared inbox. Forms are inconsistent (3+ versions exist), often incomplete, and require back-and-forth.
2. **No single source of truth** — Partner/integrator information is scattered across spreadsheets, Salesforce cases, email threads, and tribal knowledge. No one can quickly answer "who has access to what?"
3. **Competitive risk is unmanaged** — Some API consumers compete directly with WorkWave products (e.g., Sellify AI, Avoca AI). There's no systematic way to flag, review, or block competitive integrators.
4. **Endpoint visibility is poor** — WinTeam alone has 462+ API endpoints across legacy and CSA generations. Reviewers don't know what's available, what overlaps, or what a request actually covers.
5. **Trusted partner status is informal** — The "approved integrators" list lives in spreadsheets per platform with no cross-platform view or consistent criteria.
6. **Compliance pressure is real** — The Garda contract requires API usage tracking effective June 30. A Power Automate query was built as a band-aid, but a real solution is needed.
7. **Cross-platform fragmentation** — PestPac/RealGreen APIs are on AWS (Apigee), WinTeam is on Azure (APIM/Concourse). No unified governance layer exists.

---

## The Vision

A **single internal portal** that handles the full lifecycle of third-party API access:

- **Customers** browse an approved partner directory, submit structured API access requests, track status, and view their active integrations.
- **Reviewers** (CSMs, Partnerships, Security, Legal, API Engineering) process requests through a multi-stage approval workflow with full context: competitive flags, historical data, endpoint details, risk scoring.
- **Leadership** gets dashboards showing request volume, approval rates, revenue impact, and usage intelligence across all platforms.

This replaces PDFs, spreadsheets, and tribal knowledge with a governed, auditable process.

---

## What We've Built (POC)

The POC is a fully functional React application with 17 views, localStorage-backed data, and an AI assistant powered by Claude.

### Customer-Facing Views

| View | What it does |
|------|-------------|
| **Partner Directory** | Browse approved integration partners with filtering by product, integration type, and tier. Customers see only approved partners. |
| **Trusted Integrators** | View the approved integrator list (imported from real spreadsheet data — 98 integrators across PestPac, RealGreen, WinTeam, International). |
| **Request Form** | Structured API access intake form replacing the PDF. Captures: product, builder type, use case, data categories, endpoints needed, technical contact, timeline. |
| **Confirmation** | Post-submission confirmation with case number. |
| **My Integrations** | View active integrations and their provisioning status. |
| **Check Status** | Look up a request by case number. |
| **Ask the Agent** | AI assistant (Claude Haiku) available on every customer page for contextual help. |

### Reviewer-Facing Views

| View | What it does |
|------|-------------|
| **Review Queue** | All pending requests with priority sorting, competitive flags, domain badges, and endpoint counts. |
| **Request Detail** | Full request review with multi-stage approval workflow, enriched endpoint display (matched against API catalog), catalog-backed endpoint picker, pricing configuration, provisioning checklist. |
| **Active Access** | Inventory of all approved integrations across customers. |
| **Partner Directory (Reviewer)** | Full partner view with competitive flagging, blocking, and Salesforce case references. |
| **Integrators (Reviewer)** | Full integrator view with trust status, competitive levels, ARR impact, do-not-approve flags. Stats: total count, active, trusted, competitive, commercial agreements, total ARR. |
| **Risk Profiles** | Developer risk scoring with weighted criteria (competitive overlap, data sensitivity, resell intent, compliance history). |
| **Applications** | Historical PDF applications extracted and normalized — 150+ legacy applications searchable and cross-referenced. |
| **Analytics** | Dashboard with request volume trends, approval rates, product distribution, time-to-approval, and an AI analyst. |
| **Usage Intelligence** | API usage patterns, product gap analysis, endpoint coverage, and strategic recommendations. |
| **API Catalog** | Multi-platform endpoint inventory. WinTeam: 462 endpoints across 15 projects, 14 domains, 3 generations (legacy/CSA/connector). Other platforms show "Coming Soon" with platform tabs. |

### Cross-Cutting Features

- **Password-gated access** — Portal is behind a password gate for demo security.
- **Persona switching** — Switch between different customer users to see different data contexts.
- **Customer/Reviewer toggle** — Switch between the two view modes from the nav bar.
- **Ask the Agent** — Claude-powered AI assistant available on most pages, context-aware.
- **Catalog-enriched review** — Endpoint requests are fuzzy-matched against the WinTeam API catalog to show enriched cards with method badges, routes, purposes, and domain/generation context.
- **Hackathon feedback widget** — Amber floating button on every page. Click to leave contextual feedback tied to the current page. Toggle off for the pitch with `?feedback=off` in the URL.
- **Reset button** — Resets all data to seed state for demo purposes.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6.0, Vite 8.1, Tailwind CSS 4.3 |
| Data | localStorage (seed data + runtime mutations) |
| AI | Claude Haiku 4.5 via Express proxy (`/api/ask`) |
| Icons | Lucide React |
| Routing | React Router v7 |

No database, no auth service, no cloud deployment — this is a self-contained POC. The architecture has a clear seam for Supabase migration (the `store.ts` module).

---

## What's Still Needed

### Before Pitch (Wednesday)

- [ ] Review all views for polish — typos, alignment, edge cases
- [ ] Test persona switching across all customer views
- [ ] Prepare 2-3 demo scenarios to walk through
- [ ] Disable feedback widget for pitch (`?feedback=off`)
- [ ] Capture any feedback from Monday/Tuesday sessions

### Near-Term (Post-Hackathon)

- [ ] **Dan K's catalog data** — Dan offered to generate API catalog data from Concourse repos using Claude. This would populate PestPac, RealGreen, and other platform catalogs.
- [ ] **Real endpoint matching** — Current matching works for WinTeam. Extend to other platforms once catalog data is available.
- [ ] **Supabase migration** — Move from localStorage to a real database. The store.ts abstraction layer makes this straightforward.
- [ ] **Real authentication** — Replace password gate with SSO/OAuth.
- [ ] **Salesforce integration** — Connect case references to actual SF records.
- [ ] **Apigee/Concourse integration** — Pull real usage data from the API gateways.

### Strategic

- [ ] **Cross-platform governance** — Unified policies for API access across PestPac (Apigee), WinTeam (Concourse), and future platforms.
- [ ] **Automated provisioning** — Connect the provisioning checklist to actual gateway configuration APIs.
- [ ] **Revenue tracking** — Volume-based pricing model with real metering data.
- [ ] **Partner self-service** — Let approved partners manage their own integrations within guardrails.
- [ ] **Compliance reporting** — Automated reports for contracts like Garda that require API usage tracking.

---

## Providing Feedback

The POC has a built-in feedback widget:

1. Look for the **amber chat button** in the bottom-right corner of every page
2. Click it to open the feedback panel
3. Enter your name (remembered for the session) and your comment
4. Feedback is tagged with the current page and view mode
5. All feedback is stored locally in the browser

To **hide the feedback widget** (e.g., for the pitch): add `?feedback=off` to the URL.
To **re-enable**: add `?feedback=on` to the URL.

---

## Key Conversations That Shaped This

- **Ed/DL call**: Discussed the need for an "approved partner list" per platform, competitive review process, and the gap between having APIs and governing access to them.
- **Dan K engineering sync**: Dan saw the POC live, offered to generate catalog data from Concourse repos using Claude. Confirmed the WinTeam catalog structure is correct. Discussed the gap between legacy APIs (Concourse-managed) and CSA APIs (auto-generated from C# controllers).
- **Garda compliance**: Active contract requiring API usage tracking — creates urgency for a real solution beyond spreadsheets and Power Automate queries.

---

## Data Sources Used

| Source | What we imported |
|--------|-----------------|
| WinTeam API inventory (JSON) | 462 endpoints across 15 projects, 14 domains |
| Trusted Integrators spreadsheet (Excel) | 98 integrators across 4 platform sheets |
| Historical API applications (PDFs) | 150+ legacy applications extracted and normalized |
| Seed data | 6 partner companies, 4 customers, 12 API requests with realistic scenarios |
