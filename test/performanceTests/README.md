### Performance Tests

The performance test harness measures throughput (ops/s) for hot-path APIs in
this package and reports them against an upstream-OpenTelemetry-only baseline.

#### Manual run

1. Copy `sample.env` to `.env` and set `APPLICATIONINSIGHTS_CONNECTION_STRING`
   (any well-formed connection string works; the perf path never sends data
   when an unreachable ingestion endpoint is configured).
2. Run a single scenario via the existing harness:

   - `npm run perf-test:node -- TrackDependencyTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
   - `npm run perf-test:node -- TrackTraceTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
   - `npm run perf-test:node -- AzureMonitorSpanTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
   - `npm run perf-test:node -- AzureMonitorLogTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
   - `npm run perf-test:node -- OtelSpanTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
   - `npm run perf-test:node -- OtelLogTest --warmup 1 --iterations 1 --parallel 2 --duration 15`

3. Or run every scenario and produce a JSON summary suitable for comparison:

   `npm run perf:benchmark -- --out results.json --samples 3 --duration 5`

#### Scenario tiers

| Scenario | Tier | What it measures |
|---|---|---|
| `TrackDependencyTest` | gating | `appInsights.defaultClient.trackDependency()` via the v2 shim |
| `TrackTraceTest` | gating | `appInsights.defaultClient.trackTrace()` via the v2 shim |
| `AzureMonitorSpanTest` | gating | `useAzureMonitor()` + `tracer.startSpan()` |
| `AzureMonitorLogTest` | gating | `useAzureMonitor()` + `logger.emit()` |
| `OtelSpanTest` | informational | Upstream `@opentelemetry/sdk-trace-base` only |
| `OtelLogTest` | informational | Upstream `@opentelemetry/sdk-logs` only |

Only **gating** scenarios block CI on regression. Upstream-OTel scenarios are
reported as a reference for like-for-like comparison and are not owned by this
repo, so they are never used for gate-fail decisions.

#### Regression CI

`.github/workflows/performance.yml` runs on every PR. It packs both the PR and
the base branch as tarballs, installs each in turn under the PR's perf harness,
runs the benchmark suite, and fails the job (blocking merge when set as a
required check) if any gating scenario regresses beyond
`PERF_REGRESSION_THRESHOLD` percent (default 15%). All benchmark results are
uploaded as the `perf-results` artifact.

`.github/workflows/performance-comment.yml` then runs in the base repository's
trusted context via `workflow_run`, downloads the artifact, regenerates the
comparison markdown from the JSON inputs using the base branch's own
`comparePerf.mjs` (so attacker-supplied markdown is never posted under the
base repo's writable token), and posts a sticky PR comment. This split is
what allows fork PRs to receive a perf-comparison comment.
