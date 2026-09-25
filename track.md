# IBVAP Hackathon Track Strategy

## Recommendation

Submit IBVAP under these tracks:

1. **Primary technical track: Tiger Data**
2. **Secondary build-process track: Trace Commons AI — $100 prize**
3. **Optional product track: Google Cloud / Gemini**, only if the Gemini workflow is completed and demonstrated

Do **not** submit to every track. Judges reward a focused, working sponsor integration more than several weak integrations.

> Prize eligibility and winnings are not guaranteed. Submit only claims supported by a live demo, repository code, logs, and deployment evidence.

## Why Tiger Data is the best primary track

IBVAP already has the data shape Tiger Data is designed for:

- A Next.js command-and-control dashboard with real-time events and analytics
- A Python computer-vision service producing detections and normalized events
- An Express backend that ingests those events
- A PostgreSQL/Prisma model containing relational users, cameras, BOPs, alerts, evidence, and audit logs
- High-frequency time-stamped detections that can become Tiger Data hypertables
- WebSocket updates and Recharts dashboards that can benefit from continuous aggregates

Current evidence in the repository:

- PostgreSQL datasource: `backend/prisma/schema.prisma`
- Event, alert, detection, evidence, and audit models: `backend/prisma/schema.prisma`
- Event ingestion and threat scoring: `backend/src/services/ai.service.ts`
- Analytics queries: `backend/src/services/analytics.service.ts`
- Real-time UI stack: `frontend/package.json`
- YOLO, tracking, face recognition, and event processing: `ml/README.md`
- SHA-256 evidence integrity and Hyperledger Fabric integration: `chaincode/ibvap-evidence-chaincode/`

This creates a strong Tiger Data story: **high-volume surveillance telemetry and relational operational context in one high-performance PostgreSQL data stack**.

## Tiger Data implementation plan

### Core concept: Border Intelligence Pipeline

Move the current `DATABASE_URL` to a Tiger Data PostgreSQL instance, retain Prisma for normal relational operations, and use Tiger Data/SQL features for time-series workloads.

Recommended flow:

```text
Video frame
  -> Python YOLO/tracking service
  -> Express event-ingestion API
  -> Tiger Data PostgreSQL
       -> relational camera/BOP/user/evidence tables
       -> hypertable for high-frequency detections
       -> continuous aggregates for dashboard metrics
  -> REST + WebSocket
  -> Next.js live command center
  -> SHA-256 evidence verification
  -> Hyperledger Fabric ledger
```

### Use Tiger Data in a way judges can measure

1. **Create a detection telemetry hypertable**
   - Store timestamp, camera ID, BOP ID, event type, confidence, threat score, and track ID.
   - Keep user, camera, BOP, evidence, and watchlist information relational.
   - Use a partitioning scheme that includes time in the hypertable key.

2. **Create continuous aggregates**
   - Five-minute or fifteen-minute detections per camera.
   - Hourly alerts per BOP and severity.
   - Daily intrusion and watchlist-match trends.
   - Camera AI-health and event-rate metrics for the system-health dashboard.

3. **Serve dashboards from precomputed data**
   - Replace full-table aggregation with continuous-aggregate queries.
   - Refresh recent buckets quickly and older buckets according to policy.
   - Return the same analytics response shape to the existing frontend so the UI needs minimal changes.

4. **Prove performance**
   - Replay a clearly labeled synthetic event dataset.
   - Measure event-ingest throughput, analytics p50/p95 latency, dashboard freshness, storage use, and continuous-aggregate improvement over direct SQL.
   - Show command-line output or an in-app benchmark panel. Never invent results.

5. **Demonstrate a meaningful Tiger Data feature**
   - Show a five-minute threat heatmap updating as new telemetry arrives.
   - Refresh the same materialization on demand during the demo.
   - Compare direct relational queries with the continuous aggregate.

### Tiger Data win factors

- **Impact:** Faster detection-to-decision time can improve border operator response.
- **Innovation:** Combines computer vision, relational evidence, tamper-evident records, and time-series analytics.
- **Performance:** A reproducible benchmark makes the integration measurable rather than decorative.
- **Unified stack:** Relational identities/cameras/evidence and telemetry live in one PostgreSQL platform.
- **Real-time product value:** Continuous aggregates directly support a live command center instead of an offline report.

### Honest current status

Tiger Data is **not yet evidenced as implemented** in this repository. Before submission, make the database connection, hypertable, continuous aggregates, and measured benchmark visible in code and the live demo. Only then write or say that IBVAP “uses Tiger Data.”

## Trace Commons AI — $100 prize strategy

### Track fit

This track asks: **“How effectively can you use an AI agent while building your project?”**

IBVAP is a strong candidate because it has a substantial codebase across a Next.js frontend, TypeScript backend, Python ML service, Prisma database, and Hyperledger chaincode. A meaningful agent can inspect the whole system, find defects, make verified changes, and help deploy it.

### Best way to earn this track

Because the project already exists, use Trace Commons AI for a meaningful final engineering sprint rather than generating cosmetic documentation.

A strong agent workflow is:

1. Give the agent the repository and a specific acceptance criterion.
2. Ask it to inspect existing conventions and identify security, correctness, and deployment risks.
3. Have it implement a bounded change, such as Tiger Data integration, API tests, or environment validation.
4. Require it to run tests, lint, type checks, and builds and fix failures.
5. Review the diff manually and record the resulting commit, test output, and live behavior.

Recommended Trace Commons AI tasks:

- Audit authentication, authorization, upload limits, and secret handling.
- Add Tiger Data migrations and continuous aggregates through the existing backend.
- Diagnose a deliberately reproduced WebSocket or analytics failure.
- Add backend integration tests for event ingestion.
- Diagnose deployment build failures across frontend, backend, and ML service.
- Produce a source-linked incident investigation, then verify every recommendation manually.

### Evidence judges need

Keep all of the following:

- Trace Commons AI task URL or shareable trace link
- Exact prompts and acceptance criteria
- Before-and-after code or commit links
- Test/build output before and after the change
- A short before/after demo video
- A human review showing which agent suggestions were accepted or rejected
- A final statement of time saved and concrete defects prevented

### Conditional submission wording

Use this only **after Trace Commons AI has genuinely been used and the evidence is available**:

> We used Trace Commons AI as an engineering agent across IBVAP’s TypeScript backend, Next.js dashboard, Python ML service, and Hyperledger chaincode. The agent audited authentication and event-ingestion paths, implemented and tested the Tiger Data time-series layer, diagnosed deployment failures, and helped close the loop from source changes to passing builds and a live demo. We preserved task traces, reviewed the generated diffs, and validated every change with tests and manual checks. This reduced integration time while keeping a human operator responsible for architecture, security, and final approval.

If there is no Trace Commons trace, replace the first sentence with “We plan to use Trace Commons AI for the final integration sprint.” Do **not** claim past usage without evidence.

### 90-second Trace Commons AI demo

1. Show the agent task and acceptance criteria.
2. Show the repository scope it analyzed.
3. Show the real trace identifying a defect.
4. Show its patch and the failing/passing test.
5. Manually review one decision the agent got wrong or uncertain about.
6. Show the deployed result.

Human review and validation are stronger than pretending the agent was perfect.

## Google Cloud / Gemini secondary option

Gemini has good product fit but no current Gemini integration in the repository.

A focused implementation would let Gemini act as an **incident-analysis copilot**, not an autonomous enforcement system:

- Accept a high-severity event and gather its camera, timeline, related detections, watchlist matches, and evidence status through controlled tools.
- Return a structured incident summary with source event IDs, uncertainty, and recommended operator actions.
- Use a controlled tool such as `get_event`, `get_camera_context`, `get_related_events`, and `get_evidence_status`.
- Require JSON/schema validation and human approval before any alert is escalated.
- Use synthetic data in the public demo.

To win, show a real Gemini API call, constrained tool use, source-linked output, a hallucination/failure case, latency, and cost. Do not submit the Google track based only on the project already using computer vision; sponsor technology must be used directly.

## Other sponsor tracks

| Track | Fit | Current evidence | Recommended use | Decision |
|---|---:|---|---|---|
| Tiger Data | Very high | PostgreSQL, telemetry, analytics, real-time dashboard | Hypertables, continuous aggregates, measured time-series performance | **Primary** |
| Trace Commons AI | High if genuinely used | Large multi-language project and clear engineering tasks | Agent-driven integration, testing, debugging, and deployment audit | **Secondary for $100 prize** |
| Google Cloud / Gemini | High | AI-based surveillance and investigation product | Grounded incident-analysis agent using Gemini tools | Optional |
| ElevenLabs | Medium | Alerts and incident narration are natural features | Generate severity-aware spoken alerts and natural voice investigation briefings | Only after a live audio demo |
| Auth0 | Medium-high | Existing JWT users, roles, refresh tokens, RBAC, and protected APIs | Replace local auth with Auth0 and use roles/permissions for operator and agent actions | Optional if time permits |
| Snowflake | Medium | Existing relational analytics and AI data | Warehouse events and build a grounded analytics/AI feature | Weaker because it duplicates PostgreSQL |
| Presage | Medium-low | Cameras, face processing, and operator-focus use case | Use operator heart rate, breathing, or focus to flag fatigue and adapt alert presentation | Requires SDK, consent, and a strong safety story |
| Solana | Low | Evidence anchoring uses Hyperledger Fabric, not Solana | Avoid a superficial Solana wrapper | **Do not submit** |

### ElevenLabs quick-win

If the Tiger Data flow is finished early, add ElevenLabs as a polished secondary feature:

- Read only sanitized, operator-approved incident summaries.
- Use different voices or urgency settings by alert severity.
- Keep the visual and written alert as the source of truth.
- Include mute, replay, accessibility, and privacy controls.

This is a feature, not the strongest IBVAP architecture track, so use it only after the core submission works.

### Auth0 quick-win

The existing backend already models users, roles, refresh tokens, and RBAC, making an Auth0 migration technically plausible. Demonstrate protected API access, role-based operator permissions, and human approval for AI-agent actions. Do not claim Auth0 usage until the deployed login flow is visibly backed by Auth0.

## What can be deployed now

### Already available

- Next.js frontend with production build/start scripts
- Express/TypeScript backend with production build/start scripts
- Python FastAPI ML service
- Prisma PostgreSQL data model and seed flow
- WebSocket client/server abstractions
- Mock modes for AI and blockchain integration
- Fabric chaincode for evidence integrity

### Not currently evidenced

- No public frontend or API URL is present in the repository
- No deployment configuration for Vercel, Render, Railway, Fly.io, or a container platform is present
- Tiger Data is configured only as ordinary PostgreSQL and has no proven hypertable/continuous-aggregate implementation
- Gemini, ElevenLabs, Snowflake, Auth0, Presage, and Solana are not integrated
- The default environment selects mock AI and mock blockchain modes

Therefore, describe the project as **deployable**, not currently deployed, until a working public URL and sponsor dashboard/configuration are available.

## Recommended deployment

For the minimum credible public demo:

1. Deploy the frontend to Vercel.
2. Deploy the backend to a Node-capable host with WebSocket support.
3. Deploy the ML API to a CPU or GPU host suitable for the selected demo.
4. Use Tiger Cloud for the hosted PostgreSQL/Tiger Data instance.
5. Use S3-compatible storage for evidence.
6. Run Fabric locally or on a small VM, or clearly use mock blockchain mode in the core demo.
7. Set all secrets in the host environment; never commit them.
8. Restrict CORS and use HTTPS for every hosted endpoint.

For judges, reliability matters more than deploying every infrastructure component. The primary demo path should be:

```text
Public dashboard -> hosted backend -> real Tiger Data-backed event data -> live alert
                                                      -> evidence hash verification
```

Use synthetic/consented sample feeds and pre-recorded fallback clips if RTSP access is unavailable.

## Winning execution order

### Must do

1. Integrate and visibly demonstrate Tiger Data.
2. Run and record a reproducible performance benchmark.
3. Deploy a stable public demo.
4. Add sponsor names and integrations only where the code and live UI prove usage.
5. Record a complete end-to-end incident demo.

### Trace prize minimum

1. Use Trace Commons AI for one substantial, difficult task.
2. Preserve the trace and prompt.
3. Show agent analysis, patch, tests, and human review.
4. Link the evidence in the final submission.

### Only after the must-do list

- Gemini incident copilot
- ElevenLabs voice alerts
- Auth0 deployment
- Presage operator-wellness demo

## Two-hour submission sprint

| Time | Action | Proof to capture |
|---:|---|---|
| 0–15 min | Finalize primary track and one-sentence pitch | Track selection |
| 15–45 min | Complete Tiger Data hypertable and one continuous aggregate | SQL/migration and live query |
| 45–60 min | Replay synthetic events and record actual performance numbers | Terminal output and raw dataset |
| 60–70 min | Connect analytics response to the existing dashboard | Live dashboard recording |
| 70–80 min | Deploy and test the public path | Public URLs and health check |
| 80–100 min | Use Trace Commons AI on a meaningful final engineering task | Trace, diff, and test output |
| 100–115 min | Record the complete demo and prepare evidence screenshots | Demo video and screenshots |
| 115–120 min | Submit only verified claims | Final submission checklist |

## Submission copy

### Project pitch

> IBVAP is an AI-assisted border surveillance command center that converts computer-vision detections into real-time, explainable incidents. It combines multimodal detection, threat scoring, high-performance time-series analytics, role-aware operations, and tamper-evident evidence verification in one deployable platform.

### Tiger Data submission copy

> IBVAP applies Tiger Data to the hardest part of border surveillance: continuously analyzing high-frequency detection telemetry while preserving relational camera, operator, watchlist, and evidence context. We use a time-series hypertable for detections and continuous aggregates for live BOP, camera, severity, and intrusion trends, then stream the results to a command-and-control dashboard through WebSockets. Our demo shows a complete detection-to-decision workflow and an actual before/after benchmark covering ingest throughput, query latency, dashboard freshness, and storage efficiency. Tiger Data is therefore a core, measurable part of the product rather than a sponsor badge.

### Trace Commons AI submission copy

Use the conditional wording above only after completing and documenting the agent workflow.

## Final pre-submission checklist

- [ ] Public frontend URL opens without local setup
- [ ] Public API health endpoint succeeds
- [ ] Demo credentials are safe and clearly labeled
- [ ] Real Tiger Data connection is visible in host configuration
- [ ] Hypertable and continuous aggregate are demonstrated live
- [ ] Performance numbers come from an actual reproducible run
- [ ] AI and blockchain mock modes are not presented as real integrations
- [ ] Every sponsor claim has matching code, configuration, and UI evidence
- [ ] Trace Commons AI task has a shareable trace and passing validation
- [ ] Demo video, screenshots, test output, and architecture diagram are ready
- [ ] Public demo uses synthetic or properly consented data
- [ ] Submission identifies **Tiger Data** as the main technical integration
- [ ] Submission enters **Trace Commons AI** for the **$100 prize** if its evidence requirement is genuinely satisfied
