# Web Sunset Plan (P4-T3 Draft)

## Objective
Retire the web UI safely after mobile parity is confirmed, while keeping the existing Next.js backend APIs as the source of truth.

Hard policy: functional parity alone is not sufficient. Web sunset is blocked until stakeholder confirms mobile UI/UX quality and feel are at parity.

## 1) Parity Gate (Must Pass Before Sunset)
All gates below must be satisfied:
1. Android and iOS manual validation complete for parity tasks (`P3-T1` through `P3-T5`).
2. API contract smoke checks pass in authenticated mode.
3. No P0/P1 backend auth/response-shape regressions.
4. Mobile internal beta has no P0/P1 issues for 7 consecutive days.
5. Stakeholder explicitly signs off that mobile UI design, interaction quality, and overall UX feel are ready for web replacement.

## 2) Sunset Timeline (Proposed)
Dates are proposed and should be approved before execution.
These dates are conditional and must shift if parity gates are not fully met.

- **February 10, 2026**: parity gate review and go/no-go.
- **February 17, 2026**: web enters read-only mode for logging surfaces.
- **February 24, 2026**: show persistent migration banner on all web app pages.
- **March 10, 2026**: disable new web log creation completely.
- **March 24, 2026**: web UI redirects signed-in users to mobile onboarding instructions.

## 3) Read-Only Web Behavior
When read-only mode starts:
- Keep auth working for history access.
- Disable mutating actions (create/edit/delete for meals, workouts, metrics, conversation).
- Keep assistant/chat read-only responses if needed for continuity.
- Keep backend APIs live for mobile; do not remove API routes during UI sunset.

## 4) Communication Plan
### User communication waves
1. T-14 days: in-app banner + email announcement.
2. T-7 days: reminder banner + FAQ link.
3. T-1 day: final reminder with exact switchover timestamp.
4. T+0 day: confirmation message in web app and support contact.

### Required message content
- What is changing (web UI deprecation).
- What is not changing (account, data, backend API continuity).
- Exact date/time of change.
- How to install/login to mobile.
- Support channel for migration issues.

## 5) Operational Checklist
1. Add feature flag for web read-only mode.
2. Add feature flag for migration banner.
3. Add runbook entry for rollback (re-enable web writes if severe incident).
4. Monitor backend error rates + auth failures during each phase.
5. Keep web route uptime dashboards active for at least 30 days after sunset.

## 6) Risks and Mitigations
- Risk: iOS parity not validated in time.
  - Mitigation: delay read-only date until iOS gate is complete.
- Risk: OAuth/connectivity friction during migration.
  - Mitigation: publish a step-by-step mobile sign-in guide with screenshots.
- Risk: hidden web-only workflows still used by users.
  - Mitigation: event analytics on web interactions before lock date.
