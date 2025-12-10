# Release History

### 3.12.1 (2025-11-10)

#### Other Changes

- Updated @azure/monitor-opentelemetry and @azure/monitor-opentelemetry-exporter.

### 3.12.0 (2025-09-29)

#### Other Changes

- Update OTLP metric creation to respect multiple inputs. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1470)
- Fix security vulnerability with json-bigint 0.3.1. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1472)

### 3.11.0 (2025-09-25)

#### Other Changes

- Use OTLP/Protobuf exporter for AMW endpoint. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1470)

### 3.10.0 (2025-09-16)

#### Features Added

- Create OTLP metrics exporter in AKS auto-attach scenarios. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1467)

#### Other Changes

- Improve README config clarity. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1464)
- Fix base URI throwing warnings due to legacy generated files. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1462)
- Update functional tests to resolve CodeQL warning. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1460)
- Rename customer statsbeat to customer SDK stats for clarity. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1456)

### 3.9.0 (2025-08-05)

#### Bugs Fixed

- Fix diagnostic-channel console import. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1452)

### 3.8.0 (2025-07-28)

#### Features Added

- Upgrade to use OpenTelemetry JS 2.x dependencies. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1449)

#### Bugs Fixed

- Fix `trackDependency` default timing to treat current time as end time. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1445)
- Fix URI decode logging errors. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1448)

#### Other Changes

- Suppress CodeQL warnings for test files. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1443)
- Add copilot instructions. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1446)

### 3.7.1 (2025-07-08)

#### Features Added

- Add support for full request and dependency filtering. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1425)
- Add support for tracking mutli-iKey usage and the feature statsbeat handler. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1438)
- Add 15 second delay to long-interval statsbeat. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1440)

#### Bugs Fixed

- Fix preserving custom values passed to track methods. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1435)

#### Other Changes

- Improve unit test coverage. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1429)
- Improve correlation context documentation. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1430)
- Update packages with vulnerabilities. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1434)
- Remove explicit creation of metric exporter in AKS auto-attach scenario. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1436)

### 3.7.0 (2025-04-22)

#### Other Changes

- Add stale issue handling. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1421)

### 3.6.0 (2025-03-06)

#### Features Added

- Add `setAzureMonitorOptions()` to configuration. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1416)

### 3.5.0 (20205-01-31)

#### Other Changes

- Remove populating azure attributes limitation from README. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1409)
- Update Azure Functions dependency. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1401)

### 3.4.0 (2024-10-25)

#### Other Changes

- Update OpenTelemetry links in README. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1397)
- Update performance test naming. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1395)
- Send performance test data to Geneva upon run. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1392)
- Update README regarding ESM support. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1390)
- Remove unused Undici import. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1387)

### 3.3.0 (2024-09-16)

#### Features Added

- Allow distro config to be specified. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1382)
- Add support for Azure Functions programming model v4. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1374)

#### Bugs Fixed

- Fix adding log processors repeatedly when there is any config warning. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1377)
- Fix Azure Functions dependency issues. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1376)

#### Other Changes

- Bump express version in the functional tests. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1384)
- Bump body-parser version in the fucntional tests. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1381)
- Add code sample that tracks custom availability to README. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1381)
- Update OpenTelemetry dependencies. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1371)

### 3.2.2 (2024-08-19)

#### Other Changes

- Bumped to using `@azure/monitor-opentelemetry` v1.7.0. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1369)

### 3.2.1 (2024-07-05)

#### Features Added

- Add ETW diagnostic logging for Windows agent. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1350)

#### Bugs Fixed

- Fix issue with ETW log generation. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1357)

#### Other Changes

- Remove `@microsoft/typescript-etw` dependency. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1351)
- Bump `@azure/identity` dependency version. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1346)
- Bump `@grpc/grpc-js` dependency version. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1347)

### 3.2.0 (2024-06-14)

#### Features Added

- Update Live Metrics to be on by Default. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1340)
- Support tracking App Insights v3 shim usage in statsbeat. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1331)

#### Other Changes

- Bump `@azure/msal-node` version. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1344)
- Update sampling percentage to accept zero as valid. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1337)
- Update SDK backoff check. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1334)

### 3.1.0 (2024-05-13)

#### Features Added

- Fix default logger settings and add console log level support. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1326)

#### Other Changes

- Remove Winston diagnostic channel. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1327)
- Update performance counter names. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1325)
- Update tracer provider typing. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1314)

### 3.0.1 (2024-04-23)

#### Bugs Fixed

- Fix telemetry to log conversion. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1312)

### 3.0.0 (2024-03-08)

#### Other Changes

- Update agent backoff logic. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1296)
- Update warning tests and add console logging by default. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1292)
- Update support status of native metrics and environment variables. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1298)
- Clean up shim files and fix check for extended metrics environment variable. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1300)
- Add Application Insights v3 shim performance testing. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1302)
- Update unsupported message and remove deprecated semantic attributes. (https://github.com/microsoft/ApplicationInsights-node.js/pull/1306)
