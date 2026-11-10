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

## Dataset evidence and online map update

- CCTV intelligence now includes the licensed MOT20-01 sequence (approximately 17 seconds). Play/scrub to inspect actual OpenCV HOG detections computed in advance. Select a demo corridor and a box-count review threshold, then save evidence. The server derives counts from the packaged inference result rather than trusting a browser count. A trigger can request inspection but cannot remove an active restriction or verify access. This is inference replay, not a live camera service.
- Operational map now loads OpenStreetMap street tiles using Leaflet without WebGL. Pan/zoom and toggle the illustrative corridor overlay. The optional Locate my device action requires permission, stays local to the page, and includes accuracy. Tiles require Internet; no live traffic or crowd source is connected.
- Incidents → Water-rescue coordination assigns three qualified responders atomically. Open each responder console, acknowledge, begin and complete tasks. Resolve via the incident details only after fresh Access officer verification; the server rejects premature resolution.
- Validation: 97 API checks and six optimizer assertions pass with the actual route handlers on the SQLite test adapter. Production build and TypeScript pass. The video bundle records source and output SHA-256 hashes, OpenCV version, processing duration and all sampled detections. These are reproducibility measurements, not detection-accuracy results.
- HOG detected 0–5 boxes per sampled frame in this dense train-station clip. It misses many visible people; use it to demonstrate evidence integration, not deployment-ready crowd counting. Follow public/datasets/ATTRIBUTION.md (CC BY-NC-SA 3.0) for the footage and derived outputs.
- Reproduce: install services/requirements.txt and ffmpeg, then `python scripts/prepare-dataset.py`. OpenCV 4.x is required for the HOG implementation. Python services and Gnani still need a separately configured service/provider for live inference and transcription.
