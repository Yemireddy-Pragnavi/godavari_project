# Latest prototype update

Online OpenStreetMap/Leaflet basemap, licensed MOT20 recorded-video inference replay, and atomic three-role water-rescue coordination are now included. See [HACKATHON_DEMO.md](HACKATHON_DEMO.md) and [dataset attribution](public/datasets/ATTRIBUTION.md). The map has synthetic corridor overlays; there is no live traffic feed. Video detections are computed offline and replayed, not live CCTV.

# YatraRaksha GUARDIAN — RAISE

A working public-safety research prototype for Godavari Pushkaralu PS-02. Brand palette: #000000, #FCAFC1, #3D7584, #89B8BF.

## Start with the hosted demo

The owner-private Site contains three role-specific views. Open the avatar to choose a synthetic role.

1. In **RAISE planner**, compare interventions for Corridor B.
2. As **Supervisor**, authorize the recommended option. This reserves an officer and creates a field task.
3. Switch to **Access officer**, acknowledge the task, begin it, and complete the inspection.
4. Open corridor evidence and submit a field verification. Eligibility expires in five minutes.
5. Switch to **Supervisor**, restrict that corridor. Its previous verification cannot reopen it.
6. In **Scenario lab**, run camera failure + stale clearance. Inspect the audit trail.
7. Switch to **Devotee** to submit a synthetic SOS. No official responder is contacted.

No demo password is needed inside the owner-private Site; role switching is intentional. These sessions are not a production identity or employee-provisioning solution.

## Web application setup

Requirements: Node 22.13+ (Node 24 recommended), npm, a Linux/macOS development machine.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brave_jamie_braddock.sql
npm run dev
```

Apply the migration only once per local database. Use the development URL printed by the command. The hosted platform applies migrations at deployment. Keep the Sites build integration and `.openai/hosting.json`.

## Python research service

This companion supplies the requested CP-SAT, NetworkX, PostGIS and Gnani components. It is **not yet wired to the hosted command center**.

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r services/requirements.txt
export SERVICE_API_KEY="choose-a-local-service-secret"
uvicorn services.api.main:app --host 127.0.0.1 --port 8000
```

For PostGIS + the API, set `POSTGRES_PASSWORD` and `SERVICE_API_KEY` in a local `.env` and run `docker compose up --build`. Never commit secrets. `/health` is public; `/v1/*` requires the service token. API docs: http://localhost:8000/docs.

Authorized local video analysis:

```sh
python -m services.vision.analyze /absolute/path/authorized-video.mp4 --output observations.json
```

The detector is OpenCV's default HOG people detector, sampled at fixed intervals for at most 30 seconds. It is not validated for dense crowds or water rescue. Output includes count, boxes, ROI, blur, brightness and model provenance. Results are not automatically ingested into the hosted app.

## Gnani configuration

See `.env.example`. Explicitly configure permitted STT/TTS model versions, API key, endpoint, languages and voice. Missing configuration returns 503; it never returns a fabricated transcript. REST recordings must use a documented supported format and be ≤30 seconds. Browser WebM recordings need conversion before using the Python endpoint.

Official contracts reviewed: https://docs.gnani.ai/api/STT/speech-to-text and https://docs.gnani.ai/api/TTS/tts-inference . Credentialed calls remain untested.

## Tests

```sh
node node_modules/typescript/bin/tsc --noEmit
node tests/run-api-local.mjs
python -m pytest tests/test_research.py -q
```

The API harness executes the actual handler with a SQLite D1-compatible adapter, not a live deployed database. `tests/api-test.mjs` also supports a reachable server through `BASE_URL`. The browser review checked the actual preview-backed approval and task flow. Test evidence is in `docs/`.

Playwright source is provided in `tests/e2e.spec.ts`. To run outside this managed environment, install its Chromium browser with `npx playwright install chromium`, and use `BASE_URL=<your preview URL> npx playwright test`. Playwright was not executed here.

## What is complete and what is not

Read [implementation status](docs/IMPLEMENTATION_STATUS.md) before a presentation or deployment. The app has real persistent workflows, but does not fulfill every item in the full master specification. In particular, live integrations, production identity, the integrated PostgreSQL architecture, automatic notification delivery, calibrated simulation and comparative benchmarks remain incomplete.

[Architecture, API and database reference](docs/ARCHITECTURE.md)

Never use this prototype to direct a real rescue or imply official emergency-service connectivity.
