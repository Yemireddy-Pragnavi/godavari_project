# Voice integration and remaining demo gaps

The hosted application now calls Gnani Prisma v3 transcription and Timbre v3 speech through server endpoints. GNANI_API_KEY belongs only in runtime secret storage. Never commit it. Rotate any key shared in chat.

Open **Voice intelligence**. Select English, Telugu or Hindi, record up to 25 seconds or upload an audio clip under 30 seconds, then click **Transcribe with Gnani**. Browser audio is converted to 16 kHz mono PCM WAV. Original transcript, provider request ID, measured request latency and keyword-based suggestions are retained; raw audio is not persisted by the app. Review the transcript, category and location before creating an incident. Speech generation is a separate deliberate request with an audio player. Device-speech guard reminders remain the foreground alert mechanism.

Authentication, same-origin mutations, role permissions, file validation, provider timeouts, error fallback and a single concurrent speech request lease protect the endpoints. Demo roles are not production employee authentication. API-key configuration is not proof of a successful provider call.

## Checklist gaps still requiring evidence

- Live Gnani success must be demonstrated on the deployed app; the development network returned HTTP 403 on the provider test.
- The rescue team workflow exists, but a separately verified clinical handoff record is still needed.
- CCTV is a licensed prerecorded dataset with offline HOG detections, not live ghat surveillance. Crowded-scene detection quality remains limited.
- RAISE uses an exact constrained subset search, not a deployed CP-SAT solver. No field response-time improvement is claimed.
- Real responder accounts, background push/telephony, 112 integration, live staffing/location feeds and medical agency onboarding remain external integration work.
- Record a complete multi-device drill with acknowledgments, restriction precedence, fresh verification, stale evidence rejection and resolution. Measure actual drill timings separately from simulation.

Validation: existing API suites plus mocked Gnani adapter checks and TypeScript/build checks. English/Telugu/Hindi recognition quality still requires representative human recordings and provider access.
