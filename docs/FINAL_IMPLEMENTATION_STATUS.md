# Final hackathon implementation status — 10 November 2026

## Completed in this update

- Rescue lifecycle requires dispatcher review, three qualified assignments, team acknowledgments, on-scene status, completed tasks, fresh field verification, explicit acceptance by the assigned medical responder, resolution and supervisor-only closure. Handoff includes receiving destination and a non-identifying summary. The incident timeline reads persisted audit events, including linked task and corridor activity.
- Version-guarded database batches prevent older lifecycle decisions, evidence writes and plan approvals from silently overwriting concurrently changed records.
- MOT20 evidence saving atomically updates corridor uncertainty and produces a source-linked RAISE proposal when the chosen count threshold is crossed. Supervisor approval creates an inspection task. An Access officer can report an obstruction from an acknowledged task and trigger another calculation. Neither cameras nor task completion certify access.
- Side-by-side planning uses actual current inputs and the existing exhaustive solver. Compare restrictions, officer removal or partial camera coverage; an all-officers-unavailable result demonstrates infeasibility. What-if changes do not mutate real operational records.
- Advisory publication requires specific title/message lengths and word counts, rejection of common placeholders, audience selection and explicit supervisor review. Approval identity and time are stored. These checks reduce low-quality input; they do not prove the truth or semantic quality of every message.
- Four defined baseline policies run on six identical synthetic scenarios. Measurements and policy definitions are downloadable. This is an executable toy-policy comparison, not a claim about competing products or real emergency response time.
- Overview and Operational map use Esri satellite/aerial imagery. Synthetic corridor overlays are off by default. A street-map fallback remains available. Imagery is not live satellite video; capture dates vary. Attribution remains visible.
- Existing live Gnani, foreground guard alerts, dataset video, public SOS and role checks remain in place.

## Verification evidence

Run `node tests/run-api-local.mjs`, `node tests/gnani-test.mjs`, `npx tsc --noEmit`, and the supported build helper.

API suite uses the actual route handlers with SQLite through a D1-compatible adapter. Coverage includes the complete rescue lifecycle, missing handoff rejection, supervisor-only closure, source-linked video plans, wrong-role approval, conflicting reservations, stale field updates, meaningful advisory checks, comparison inputs, benchmark policy invariants and persistence through fresh state reads. This is not a database disaster-recovery or restart certification.

Browser checks: satellite tiles rendered, actual restriction comparison changed required actions from one to two, no-feasible-plan explanation displayed, benchmark ran and displayed results, separate field session received a rehearsal task, acknowledgment reached the control-room session. Control-room refresh was used to confirm the final state; continuous 4-second foreground polling remains implemented.

Physical Windows/Android tests and audible Timbre playback on Android have NOT been performed. No locked-screen delivery guarantee is made. Use the existing private-site owner sign-in on both devices, then choose separate demo roles; these roles are not independently authenticated employee accounts.

## Voice sample results — acceptance failed

Both supplied Telugu WAV files returned actual Prisma v3 responses (HTTP 201 through the app). The first took 2,210 ms provider-request time; the second took 914 ms. Both materially differed from the intended scripts and failed to preserve the ghat/gate landmark. See `voice-sample-results.json` for unchanged provider transcripts, request IDs and timings. The origin of the supplied audio (human or synthetic) has not been verified. Do not present these files as passing multilingual accuracy tests. Hindi speech remains untested.

The operator must correct the transcript, select a category and explicitly supply the confirmed location. Missing landmarks show a warning. A keyword match is only a suggestion and cannot dispatch a rescue automatically. The earlier hosted English synthesized-audio roundtrip passed, which proves API connectivity, not broad speech accuracy.

## Measured simulation benchmark

See `benchmark-results.json`. On the six defined scenarios, inappropriate recommendations were A=3, B=3, C=2, D=0; resource conflicts A=0, B=2, C=0, D=0. Task counts A=0, B=6, C=3, D=3. Five cases remain unconfirmed for every policy because no field action is simulated as completed. Runtime timings vary; zeros mean below clock resolution. Inputs and policy assumptions are included so the result can be reproduced and challenged.

## Connected demonstration

1. Create a **Water rescue** report using New incident or Public SOS. In Incidents select it in the lifecycle panel and record Under review.
2. Coordinate the three-role team. Open each responder console via its link. Acknowledge every task.
3. In the control-room lifecycle record Response acknowledged then On scene. Responders begin and complete their tasks.
4. The assigned Access officer examines Corridor evidence. If restricted, the Supervisor must explicitly lift the restriction before fresh Access-officer verification. Completing the task never clears it.
5. In the assigned Medical responder console fill the receiving team/destination and summary; confirm handoff. Return to the Supervisor console to resolve and close. Review the incident timeline.
6. Independently demonstrate CCTV: use sample near 14.4 seconds with five HOG boxes, choose an unreserved demo corridor and threshold 3, then Save current evidence. Inspect its automatically computed plan, authorize as Supervisor, open the assigned officer console and acknowledge/report/verify. If no officer is free, complete existing inspection work or show the truthful no-feasible-plan result.
7. Show RAISE planner comparison and Scenario lab benchmark. Publish a meaningful training advisory to a selected audience.

## Remaining external validation

Representative human Telugu/Hindi recordings, noisy field trials, Android microphone/audio and two-device usability checks, background push, real employee identity, surveyed corridor geometry, live camera feeds, official 112/ambulance interfaces and operational agency approval remain outstanding. No score or selection outcome is guaranteed. Official challenge page is client-rendered; its full final submission rules were not recoverable through the text lookup used in this session.
