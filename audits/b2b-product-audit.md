# Welgo Desk — B2B SaaS Product Audit

_Auditor framing: senior B2B SaaS product auditor with travel-tech / tour-operator / booking-platform background (Bókun, Rezdy, TourPlan, WeTravel reference set)._

---

## 0. Framing (before anything else)

The audit prompt assumes a **tour-operator booking platform** (Bókun/Rezdy/TourPlan class). After mapping the codebase, Welgo Desk is not that. It is an **AI hotel-search and quote-assistance workspace** that sits upstream of booking — agents use it to shortlist hotels, analyze options, and copy a formatted quote to the client. There is no booking engine, no inventory, no payment pipeline, no supplier contracts, no channel manager, no invoicing, no reporting — by design. The Next.js app is a thin proxy to a Python backend; all domain logic is there. Supabase handles auth only.

Treating the 16-dimension framework literally would produce a false scorecard. Instead each dimension is marked as in-scope, out-of-scope-by-design, or strategic-gap, with depth focused on what actually exists or is within 1–2 product cycles of reach.

If the goal is to compete head-on with Bókun, this is a different product. If the goal is to own the **agent decision-support layer** (where those platforms are genuinely weak), the positioning is strong and the audit reflects that.

---

## 1. Executive summary — top 5 issues blocking adoption or retention

| # | Issue | Why it matters | Priority |
|---|---|---|---|
| 1 | **No password reset, no 2FA, no SSO** | B2B procurement blocker. A single forgotten password = IT ticket. Enterprise buyers require 2FA/SSO to sign. | **Critical** |
| 2 | **No audit log anywhere** | Disputes between agents, between agency and client, and any compliance review are unresolvable. Also blocks enterprise pricing. | **Critical** |
| 3 | **Hardcoded single currency (UZS for search, USD for plans), no FX, no timezone** | An agent quoting a Dubai hotel to a Russian client hits data-trust issues immediately. Product is effectively single-market (UZ). | **Critical** |
| 4 | **Quotes have no persistence or artifact** | Agents compose a quote in the Quote Box and copy to WhatsApp. No PDF, no sharable link with tracking, no "open rate", no amendments. The product exits exactly where its value should compound. | **High** |
| 5 | **Power-user efficiency is shallow** — no ⌘K, no saved views, no bulk actions, no table exports, no keyboard nav through results | B2B agents live in the app 4–8 hours/day. Every extra click × 200 bookings/month × 12 months = real churn pressure. | **High** |

Three of these are one-sprint fixes. Two are scope decisions.

---

## 2. Quick wins (each <1 day of engineering)

1. **Password reset via Supabase** — `resetPasswordForEmail` + a `/auth/reset` page. The #1 gap.
2. **Global ⌘K / Ctrl-K conversation search** — search conversation titles + client names. No backend change needed; `conversations` list is already fetched.
3. **"Pin this conversation" bookmarks** — simple boolean in `Conversation`, separate section at the top of the sidebar.
4. **Export last quote to PDF** — use browser print stylesheet on the Quote Box. Zero dependencies.
5. **Copy-to-clipboard confirmation at the top of every list** — instead of silent copies. The analysis panel now has it; propagate the pattern.
6. **"Was this helpful?" thumb after each analysis** — PostHog event plus 1 DB column. Gets you the signal loop you need for AI quality.
7. **Timezone picker in Profile** — default from browser, persist on profile. Even before full FX work, this prevents the most common data-trust bug.
8. **CSV export for the team list + conversation list** — two lines each; blocks no procurement but shows the product respects data ownership.
9. **A `/health` + public status JSON** — procurement-blocker removal. Not even a status page, just a reachable endpoint.
10. **Display build version + last-login timestamp in Profile** — telemetry the support team will ask for within a week.

---

## 3. Full findings by dimension

| # | Dimension | State today | Finding | Priority |
|---|---|---|---|---|
| 1 | **Roles & access** | `admin` / `agent` only; superadmin role detected in `SuperAdminPage`; org isolation via API-layer only, no RLS visible | Too coarse for real agencies (need Ops, Finance, Sales, Guide, Read-only). No per-tour/region scoping. Supabase RLS not used — tenant isolation depends entirely on the Python backend getting every query right. One bug = cross-agency leak. | **Critical** |
| 1 | **Invites / seats** | Invite code string (not URL), seat cap enforced server-side | Invite-by-code is a manual step that scales poorly. No "invite via email" flow with ownership of the signup domain. No seat-expiration or last-seen column. | High |
| 1 | **Audit log** | None | The single biggest enterprise blocker after auth. Every mutation — invite, plan change, org enable/disable, credit consumption, AI query, client_info edit — should land in an append-only log with user, org, IP, timestamp, diff. | **Critical** |
| 1 | **Password reset / 2FA / SSO** | None (Supabase primitive only) | Password reset is ~1 day. 2FA via Supabase TOTP is ~2–3 days. SSO (SAML/OIDC) is weeks and needed only at enterprise — put it on the roadmap with a "sales-assisted" flag. | **Critical** (reset) / High (2FA) / Medium (SSO) |
| 2 | **Power-user efficiency** | Enter/Shift-Enter/Esc only | No ⌘K, no command palette, no ⌘↵ to submit, no `/` for search, no J/K to navigate hotel cards, no number-keys to select hotels, no `b` to toggle Quote Box, no keyboard-only path through tier pills. Agents with 200 bookings/mo notice. | **High** |
| 2 | **Bulk actions** | None | "Compare" in the All-Hotels modal is the only multi-select action. No bulk-hide, bulk-send, bulk-export, bulk-rename conversations. | High |
| 2 | **Tables sortable/filterable/exportable** | Team list is not sortable; conversations are chronological only | Minimum bar: column sort, pinned filter, CSV export, and a "remember my last view" preference. | High |
| 2 | **Global search** | None | ⌘K spanning conversations + clients + hotels is a day's work and ships instant perceived quality. | **High** |
| 2 | **Saved views / filters** | None | Agents re-enter the same filter every morning ("Мальдивы, 5 звёзд, 7 ночей, до $2500"). Saved-view presets belong in the welcome builder. | High |
| 2 | **Pre-fill / dedupe** | Minimal — conversation keeps `client_info`, no cross-conversation memory | No persistent client record = same phone number re-entered every time. Add a lightweight `Client` table (phone = unique key) shared across org's conversations. | High |
| 2 | **Clicks to first result** | 1 destination click + Enter ≈ ~3 clicks | This is actually good. Welcome builder is a bright spot. Don't regress it. | Low (keep) |
| 3 | **Tour/inventory management** | Not present | Out of scope by design unless strategy changes. Do not build this half-heartedly. If you do build it, buy or integrate (Bókun's API, for instance) rather than re-implement. | Out-of-scope |
| 3 | **Seasonal / tiered / promo pricing** | N/A | Out-of-scope |
| 3 | **Availability calendar, resources, versioning, multi-lang content** | N/A | Out-of-scope |
| 4 | **Booking flow** | There's a `/api/desk/tour-link` endpoint that suggests a hand-off to an external booking system | Confirm what that endpoint does. If it's a redirect, document it as a clear hand-off, not a "booking". If it's an internal booking, the audit changes fundamentally — start there. | **Verify** |
| 4 | **Booking detail, notes, modifications, waitlist, statuses** | N/A | Out-of-scope unless booking flow exists |
| 4 | **Client/customer record** | Only per-conversation `client_info` | **Add a `Client` entity** shared across the org. The ROI is immediate: phone-lookup, repeat-client tag, "last search was 3 months ago — follow up". This is the minimum CRM bar. | **High** |
| 5 | **Multi-currency / FX / deposits / invoices / commission / accounting / refunds / tax** | Hardcoded UZS + USD, nothing else | Out-of-scope *as booking features*, but you'll still want multi-currency for quote display (USD/EUR/RUB/UZS) and a configurable FX source. | High (quote display) / Out-of-scope (rest) |
| 6 | **Suppliers / contracts / net-gross / markup** | Operator filter exists; no contract store, no rate management | Out-of-scope, but the operator-filter UX is fragile (see Lane C work — now much better). | Out-of-scope |
| 7 | **OTA distribution / widget / reseller portal / rate parity** | Not present | Out-of-scope. If the product evolves toward distribution, Bókun has an open API and is the pragmatic target. | Out-of-scope |
| 8 | **Reporting & BI** | None | **Agencies without reports export to Excel forever.** Ship 3 canned reports for day-one credibility: (a) daily search volume & credit burn, (b) agent performance (searches, conversations), (c) top destinations & operators by agency. | **High** |
| 8 | **Custom report builder / BI export** | None | Defer. First get the 3 canned reports right. | Medium |
| 8 | **Real-time KPI dashboard** | Profile credits ring is the closest thing | Scope creep. Put it on the 6-month roadmap. | Low |
| 9 | **Client CRM / templates / triggers / WhatsApp / ticketing** | `client_info` per conversation; quote is copy-paste into WhatsApp | The **single biggest strategic opportunity**. Every quote already flows to WhatsApp by hand. A "Send quote as WhatsApp template via Twilio" button with delivery + read tracking is a 2-week project that transforms the product. Plus: `Client` table (above), email templates with merge tags. | **High / Strategic** |
| 9 | **Helpdesk / Intercom / HubSpot** | None | The product is too narrow to be the CRM of record. Build clean webhooks, let HubSpot be HubSpot. | Medium (webhooks) |
| 10 | **Public API / docs / webhooks / sandbox** | Only internal Next.js → Python proxy | No public API, no webhook infra, no sandbox mode. Blocks any integration conversation. A minimal `GET /public/v1/conversations` + webhook on new quote is the unlock. | **High** |
| 10 | **Native integrations** | Supabase (auth), PostHog (analytics). Nothing else. | Prioritise: Twilio/WhatsApp Business, Google Calendar (agent availability), Stripe (when billing moves in-app), an accounting export (1C for CIS, QuickBooks/Xero for international). | **High** (WhatsApp first) |
| 10 | **Zapier / Make / CSV import** | None | Zapier connector is a 1–2 week project and unlocks hundreds of downstream use cases for cheap. CSV import for existing client books is essential onboarding work. | High |
| 11 | **Uptime SLA / status page** | Unknown. Not advertised in-app. | Without a public status page you cannot sell enterprise. 1 day of work with a free tier (Statuspage, Instatus). | High |
| 11 | **Scale to 10k+ bookings, 50+ concurrent** | Unverifiable from frontend. The Python backend does the heavy work. Session/conversation scroll probably degrades visibly past ~100 messages. | Load-test end-to-end before signing a ≥15-seat plan. Verify SSE stream behavior when 50 agents search in parallel. | **High** (test before sell) |
| 11 | **Async for heavy ops** | AI streaming is already SSE (good). Quote generation, future reports must follow the pattern. | Don't regress this. | Keep |
| 11 | **Offline / graceful degradation** | None. Pure online SPA. | Agents in hotels with hotel Wi-Fi hit this. "Last quote is still visible" via localStorage (Lane A already did filters). Full offline is overkill; reconnect handling is not. | Medium |
| 11 | **Data backup / export / portability** | None user-facing | Every agency that churns will ask "how do we get our data out?". Silent answer = bad reviews. Export all conversations as JSON + attachments. | **High** |
| 12 | **Onboarding / guided setup / sample data / KB / tutorials** | Onboarding is "create org OR join code". No tour, no sample conversation, no help widget. | New agent time-to-first-useful-search is probably ~10 min if they already speak the workflow, ∞ if they don't. Add a sample conversation + 3 tooltips on the welcome builder. | **High** |
| 12 | **Searchable KB, video, documentation** | None. | Launch a minimal help center on Notion/GitBook before chasing enterprise. Needs to be searchable from inside the app. | Medium |
| 13 | **Mobile app / responsive / field use / manifest / QR check-in** | Web is responsive (Lane F drawer). No mobile app. No manifest/offline mode. | Given you're not a booking platform, no manifest and no field ops features. The mobile web is now usable for a reservation agent checking something on the go; that's the right bar. | Keep |
| 14 | **UI languages** | RU + UZ. Coverage deep (~236 keys each). | Add EN (for enterprise prospects who evaluate in English) and TR (given Turkey's travel market). Low effort. | Medium |
| 14 | **Multi-timezone / date-format / regional payments (Click, Payme, Humo)** | None. UZS-only. | Timezone is cheap. Currency display is medium. Regional payments apply only if you move billing in-app — defer until then. | Medium |
| 15 | **GDPR / PII / retention / PCI / e-signature / contract storage** | Unknown. No visible retention policy, no data-subject-request UI. | The moment a European agency asks about GDPR, you need a DPA, a retention spec, an export endpoint, and a deletion endpoint. None are code-intensive; all require policy. | **High** |
| 15 | **PCI** | N/A while payments stay out-of-band | N/A (good). Keep payments out of your scope until billing migrates. | Keep |
| 16 | **Pricing page / trial / self-serve / billing portal** | Pricing is hardcoded in the UI (`$39 / $99 / $249`); billing is out-of-band | No trial flow in-app. No billing portal. No downgrade/upgrade self-service. All handled by sales = doesn't scale past ~50 orgs. | **High** (strategic) |

---

## 4. Strategic roadmap

### 1–3 months (stabilize for enterprise conversations)
1. Password reset, 2FA (Supabase TOTP)
2. Audit log (one table; one append helper at the API boundary)
3. `Client` entity shared across an org's conversations
4. ⌘K global search across conversations & clients
5. Status page + `/health` endpoint
6. Data export (conversations + team + clients as JSON/CSV)
7. Three canned reports (credit burn, agent performance, top destinations)
8. Timezone picker + multi-currency quote display (USD/EUR/RUB/UZS via configurable FX)
9. Save the `welgo:desk:*` filter state server-side, not just sessionStorage (preserves work across devices)
10. Saved-view presets on the welcome builder
11. English UI

### 3–6 months (expand the moat)
1. **WhatsApp Business send + tracking on quotes** — this is the product's strongest leverage point
2. Public API v1 + webhooks + Zapier connector
3. Quote as PDF with agency branding (logo in Profile)
4. SSO (SAML + Google Workspace)
5. Granular roles (Ops, Finance, Sales, Guide, Read-only) + per-region scoping
6. Self-serve billing (Stripe) + in-app plan upgrade/downgrade
7. Sample-conversation onboarding flow + in-app help
8. If the strategy is to enter booking/inventory: **integrate, don't build** — partner with a regional booking backend or Bókun's API, don't re-implement TourPlan

---

## 5. Competitive benchmarks

Qualitative; based on general industry knowledge of these platforms, not a live-product inspection.

| Capability | Welgo | Bókun | Rezdy | TourPlan | WeTravel |
|---|---|---|---|---|---|
| AI-driven hotel discovery for agents | **Best-in-class** | None | None | None | None |
| Booking engine | None | Strong | Strong | Strong | Medium |
| Channel manager (OTA) | None | Strong | Strong | Medium | Weak |
| Payments / finance | None | Strong | Medium | Strong | Strong |
| Supplier contracts / nets | None | Medium | Medium | Strong | Weak |
| Reseller / sub-agent portal | None | Medium | Medium | Strong | Medium |
| Quote builder + send | **Quote text only** | Weak | Weak | Medium | Weak |
| Reporting | None | Medium | Medium | Strong | Medium |
| Public API | None | Strong | Strong | Medium | Medium |
| UI modernity | **Strong** (post the Lane A–G work) | Medium | Medium | Weak (legacy) | Strong |
| CIS market fit (RU/UZ, regional payments) | **Strong** | Weak | Weak | Weak | Weak |
| Enterprise compliance (SSO/audit/SLA) | Weak | Medium | Medium | Strong | Medium |

**Positioning implication:** Welgo wins on (a) AI decision-support and (b) CIS market fit. Welgo loses on (c) everything downstream of a shortlist. Two strategic paths:

- **Narrow** — own the decision-support layer, integrate to booking backends via API. Invest in WhatsApp send, quote persistence, reporting, and Zapier/Bókun/1C integrations. Don't build a booking engine.
- **Full-stack** — partner-acquire or integrate a booking backend. Don't build it from scratch; the table shows that's a 3-year race against incumbents who already won it.

**Recommendation: Narrow.** The upstream AI layer is genuinely differentiated; downstream is a commodity race.

---

## 6. Things that could not be verified from the frontend (flag for confirmation)

- What `/api/desk/tour-link` actually does — if it creates a booking, many "out-of-scope" rows above flip to "in-scope" and the audit changes
- Whether Supabase RLS is enabled in the DB (the frontend doesn't rely on it; that's different from it being absent)
- Whether the Python backend logs mutations anywhere durable
- SLA / uptime history
- Whether the backend enforces the seat/credit caps, or whether the frontend hint is the only gate
- Whether the `.env` contains Stripe/Twilio/OTA keys that haven't reached the frontend — if so, the scope picture changes

---

## 7. One-sprint pickup candidates

If implementation appetite is there, the cleanest one-sprint scopes from this audit are:

1. ⌘K global search (conversations + clients)
2. Sample-conversation onboarding flow
3. Audit-log scaffolding (one table, one middleware)
4. `Client` entity + phone-key dedupe
5. Password reset + email-verify
6. Data-export endpoint (JSON/CSV)

Each is bounded, independently shippable, and lands on a different file surface — suitable for parallel lanes if desired.
