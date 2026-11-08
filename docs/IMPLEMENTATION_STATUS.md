# Implementation status — YatraRaksha GUARDIAN

This is a functional research prototype, not an operational emergency dispatch system.

## Implemented and tested

- React/TypeScript responsive command center with the requested four brand colors.
- Hosted Worker API and durable D1 SQL database: incidents, observations, corridors, tasks, plans, responders, advisories, notifications, sessions, audit events and configuration.
- Immediate SOS storage independent of AI; tracking tokens protect report status; duplicate reports are retained.
- HttpOnly synthetic role sessions; server-side permission checks. The private Site supplies the outer identity boundary. Demo roles deliberately remain selectable by the owner.
- Optimistic corridor version checks, restriction precedence, five-minute field verification expiration.
- Supervisor-authorized intervention plans create field tasks and reserve access officers.
- Qualified medical/water-rescue assignment and unique responder reservations reject conflicts.
- Task acknowledgment, start, completion and escalation; completion does not imply corridor clearance.
- Six one-shot scenario replays modify the shared operational records.
- Synthetic camera observation ingestion and manual review; stored threshold determines whether an observation raises possible obstruction.
- CSV export, printable reports, filtered tables, persistent public advisories, notifications, settings and audit trail.
- Python CP-SAT optimizer and NetworkX path eligibility tested independently.
- Exact test results are in `api-test-results.json` and `python-test-results.txt`.

## Implemented; further integration testing required

- MapLibre vector network view with synthetic geographic geometry. The preview browser lacks WebGL2; its automatic interactive SVG fallback was verified. GPU rendering requires verification on a WebGL2-capable device.
- OpenCV HOG person-count pipeline for locally supplied authorized clips. Blank-video smoke test passed; no accuracy validation or crowded-scene calibration.
- FastAPI research service, PostGIS schema, Docker Compose configuration. Docker/PostGIS was not launched in this environment.
- Gnani Prisma/Timbre adapters based on official contracts. No credentialed request was tested.
- Playwright test source included for local execution; browser checks in this build used the available cloud browser.

## Simulated / simplified

- All people, incidents, cameras, ghat geometry, qualifications, resource distances and operational authority.
- Hosted RAISE uses a transparent bounded deterministic candidate planner. The CP-SAT service is implemented separately and is not connected to the hosted UI.
- Counterfactual comparison is conditional rule-based reasoning, not a calibrated queue or crowd-flow model.
- Camera views contain explicit synthetic annotations. Local uploaded videos are played in-browser without inference. The OpenCV command produces actual model outputs separately.
- Voice input can be recorded locally; manually entered or scenario transcripts are never labeled Gnani output.
- Language selection changes the public greeting/SOS label. Full application translation is not implemented.
- In-app notification records are real; polling occurs every 15 seconds. No WebSocket/SSE, browser push or SMS integration.

## Requires credentials / authorization

- Authorized Gnani account, permitted models and voice, runtime secrets.
- Live CCTV access, real geospatial survey, verified responder roster and operational SOPs.
- Official ERSS-112, ambulance/hospital or government dispatch integration and authorization.

## Not implemented

- A single integrated PostgreSQL/PostGIS-backed full platform; hosted storage is D1 and the local PostGIS companion holds route geometry only.
- Production employee identity, user provisioning and qualification verification. Do not share the demo publicly or treat the role selector as production RBAC enrollment.
- Normalized full 35-table domain schema, row-level Postgres policies, immutable audit storage, atomic outbox/event delivery and idempotent workflow consumption.
- Automatic acknowledgment escalation scheduler, push notification delivery, durable offline queue/reconciliation and configurable automated retention.
- Segment-level route editor, scenario pause/resume/reset scheduler, historical map playback and video event seeking.
- Benchmark implementations for all four competing baselines; load, concurrency and camera accuracy performance campaigns.
- Clinical triage, autonomous crowd control, drowning detection or real emergency response.

The visual app is ready for an interactive demonstration of the core workflow. The gaps above prevent claiming full completion of the supplied master specification or field readiness.
