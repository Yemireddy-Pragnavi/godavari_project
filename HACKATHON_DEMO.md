# Tomorrow's demonstration

Open the private hosted preview while signed into its owner account. The current demo is a web app; Play Store publication is not required. A second device needs the same authorized access.

1. Start in Supervisor → Overview. Open the guard console from the mission panel in another window (prefer two visible windows or two devices).
2. In the guard console, tap **Enable sound & voice**, then **Test audio**. Check the actual device volume. Keep Field operations visible and the phone unlocked.
3. From Supervisor, send a rehearsal task. It uses synthetic data and never dispatches a real emergency service.
4. Show the named guard's assignment and countdown. Sound/device speech attempts repeat every 15 seconds by default; choose 30 or 60 seconds if desired. Telugu/Hindi depend on installed voices and fall back to English.
5. To demonstrate escalation, wait 60 seconds without acknowledging, keeping at least one operational page visible and connected. The supervisor receives one overdue notification; the assignment remains pending.
6. Acknowledge on the guard console. Reminders stop. Start and complete the inspection. Completion does not declare a corridor safe; authorized verification is separate.
7. Demonstrate restricted corridors, RAISE feasible action search, unavailable responder rejection, and stale evidence rejection. Export the audit evidence for judges.

## What is real
Persistent shared database, per-tab demo sessions, responder-scoped tasks, 4-second refresh, foreground oscillator sound and browser device speech, acknowledgment timestamps, first device presentation record, deduplicated overdue escalation, version conflicts, resource reservations, role checks, small exact TypeScript action-set search and audit records.

## What is simulated or pending
Crowd/camera observations and locations are synthetic. No ERSS-112, real ambulance dispatch, production employee authentication, background push, SMS, or guaranteed locked-screen audio. Escalation is driven by active-page heartbeat, not an unattended scheduler. Device presentation and speech attempts do not prove the guard heard anything. The hosted search is not Python CP-SAT; that companion service remains separately deployable. Gnani requires credentials and integration. Do not present the app as operational emergency infrastructure.

## Validation
`node tests/run-api-local.mjs`: 45 existing API checks plus 20 additional alert API checks and 6 optimizer assertions, using the actual API handlers against SQLite with a D1-compatible adapter. TypeScript check and production build pass. Real-device hearing and background behavior need manual validation on the phone used at the event.
