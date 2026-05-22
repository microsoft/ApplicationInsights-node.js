#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * Measures throughput of a single scenario directly, without going through
 * the @azure-tools/test-perf framework's worker pool. Running in a single
 * process makes JSON output and result capture deterministic, and a fresh
 * Node child per scenario keeps OpenTelemetry global state isolated.
 *
 * Usage:
 *   node bench.mjs --scenario <Name> --duration <sec> --warmup <sec> --out <file>
 */

import { writeFileSync } from "node:fs";

function parseArgs(argv) {
    const a = { duration: 8, warmup: 2 };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        const v = () => argv[++i];
        if (k === "--scenario") a.scenario = v();
        else if (k === "--duration") a.duration = Number(v());
        else if (k === "--warmup") a.warmup = Number(v());
        else if (k === "--out") a.out = v();
    }
    if (!a.scenario || !a.out) {
        console.error("Required: --scenario <Name> --out <file>");
        process.exit(2);
    }
    return a;
}

const SCENARIO_MODULES = {
    TrackDependencyTest: "./dist-esm/trackDependency.spec.js",
    TrackTraceTest: "./dist-esm/trackTrace.spec.js",
    AzureMonitorSpanTest: "./dist-esm/azureMonitorSpan.spec.js",
    AzureMonitorLogTest: "./dist-esm/azureMonitorLog.spec.js",
    OtelSpanTest: "./dist-esm/otelSpan.spec.js",
    OtelLogTest: "./dist-esm/otelLog.spec.js",
};

async function runLoop(instance, durationMs) {
    // Tight async loop. We rely on each .run() awaiting only synchronous-ish
    // work (the scenarios under test do not perform real network I/O). The
    // loop polls Date.now() infrequently (every BATCH iterations) to keep
    // measurement overhead negligible.
    const deadline = Date.now() + durationMs;
    let ops = 0;
    const BATCH = 256;
    while (true) {
        for (let i = 0; i < BATCH; i++) {
            await instance.run();
        }
        ops += BATCH;
        if (Date.now() >= deadline) break;
    }
    return ops;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const modulePath = SCENARIO_MODULES[args.scenario];
    if (!modulePath) {
        console.error(`Unknown scenario: ${args.scenario}`);
        process.exit(2);
    }
    const mod = await import(modulePath);
    const Cls = mod[args.scenario];
    if (!Cls) {
        console.error(`Module ${modulePath} does not export ${args.scenario}`);
        process.exit(2);
    }
    const instance = new Cls();

    // Warmup (not counted)
    if (args.warmup > 0) {
        await runLoop(instance, args.warmup * 1000);
    }

    const startWall = Date.now();
    const ops = await runLoop(instance, args.duration * 1000);
    const elapsedMs = Date.now() - startWall;
    const opsPerSec = (ops / elapsedMs) * 1000;

    writeFileSync(
        args.out,
        JSON.stringify(
            {
                scenario: args.scenario,
                opsPerSec,
                ops,
                elapsedMs,
                timestamp: new Date().toISOString(),
            },
            null,
            2,
        ),
    );

    console.log(
        `[bench] ${args.scenario}: ${ops} ops in ${elapsedMs}ms => ${opsPerSec.toFixed(0)} ops/s`,
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
