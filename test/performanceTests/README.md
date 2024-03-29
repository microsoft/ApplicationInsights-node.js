### Guide

1. Copy the `sample.env` file and name it as `.env`.
2. Create an Application Insights resource and populate the `.env` file with connectionString.
3. Run the tests as follows (parameters can be modified to as appropriate):

- Tracking Dependencies (spans)
  - `npm run perf-test:node -- TrackDependencyTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
- Tracking Traces (logs)
  - `npm run perf-test:node -- TrackTraceTest --warmup 1 --iterations 1 --parallel 2 --duration 15`
