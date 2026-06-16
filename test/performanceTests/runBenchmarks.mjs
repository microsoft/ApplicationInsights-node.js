#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * Runs each scenario via bench.mjs in a fresh Node child process to avoid
 * OpenTelemetry global-state contamination across scenarios. Median ops/s is recorded.
 *
 * Usage:
 *   node runBenchmarks.mjs --out results.json [--samples 5] [--duration 8]
 *                          [--warmup 2]       [--scenarios a,b,c]
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// "gating" scenarios block the PR on regression; "informational" are reported
// but never fail the build. Upstream-OTel benchmarks are informational since
// regressions there are not owned by this repository.
const SCENARIOS = [
    { name: "TrackDependencyTest", tier: "gating" },
    { name: "TrackTraceTest", tier: "gating" },
    { name: "AzureMonitorSpanTest", tier: "gating" },
    { name: "AzureMonitorLogTest", tier: "gating" },
    { name: "OtelSpanTest", tier: "informational" },
    { name: "OtelLogTest", tier: "informational" },
];

function parseArgs(argv) {
    const args = { samples: 5, duration: 8, warmup: 2 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === "--out") args.out = next();
        else if (a === "--samples") args.samples = Number(next());
        else if (a === "--duration") args.duration = Number(next());
        else if (a === "--warmup") args.warmup = Number(next());
        else if (a === "--scenarios") args.scenarios = next().split(",");
    }
    if (!args.out) {
        console.error("--out <file> is required");
        process.exit(1);
    }
    return args;
}

function median(nums) {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function mean(nums) {
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function stdev(nums) {
    const m = mean(nums);
    const variance = nums.reduce((sum, n) => sum + (n - m) ** 2, 0) / nums.length;
    return Math.sqrt(variance);
}

function runOne(scenario, args, outPath) {
    const child = spawnSync(
        process.execPath,
        [
            join(__dirname, "bench.mjs"),
            "--scenario",
            scenario,
            "--duration",
            String(args.duration),
            "--warmup",
            String(args.warmup),
            "--samples",
            String(args.samples),
            "--out",
            outPath,
        ],
        {
            cwd: __dirname,
            stdio: ["ignore", "inherit", "inherit"],
        },
    );
    if (child.error) {
        throw new Error(
            `Scenario ${scenario} could not be spawned: ${child.error.message}`,
        );
    }
    if (child.signal) {
        throw new Error(`Scenario ${scenario} terminated by signal ${child.signal}`);
    }
    if (child.status !== 0) {
        throw new Error(`Scenario ${scenario} failed with exit code ${child.status}`);
    }
    const result = JSON.parse(readFileSync(outPath, "utf8"));
    if (!Array.isArray(result.samples) || result.samples.length === 0) {
        throw new Error(`Scenario ${scenario} produced no samples`);
    }
    const ops = result.samples.map((s) => s.opsPerSec);
    for (const v of ops) {
        if (!isFinite(v)) {
            throw new Error(`Scenario ${scenario} produced a non-finite ops/s value`);
        }
    }
    return ops;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const selected = args.scenarios
        ? SCENARIOS.filter((s) => args.scenarios.includes(s.name))
        : SCENARIOS;

    const tmp = mkdtempSync(join(tmpdir(), "perf-"));
    const results = [];

    try {
        for (const scenario of selected) {
            const out = join(tmp, `${scenario.name}.json`);
            console.log(
                `\n[run] ${scenario.name}: ${args.samples} sample(s) x ${args.duration}s (warmup ${args.warmup}s)`,
            );
            const samples = runOne(scenario.name, args, out);
            results.push({
                name: scenario.name,
                tier: scenario.tier,
                samples,
                median: median(samples),
                mean: mean(samples),
                stdev: stdev(samples),
            });
        }
    } finally {
        try {
            rmSync(tmp, { recursive: true, force: true });
        } catch {
            /* noop */
        }
    }

    const out = {
        generatedAt: new Date().toISOString(),
        node: process.version,
        samples: args.samples,
        duration: args.duration,
        warmup: args.warmup,
        results,
    };
    writeFileSync(args.out, JSON.stringify(out, null, 2));
    console.log(`\nWrote ${args.out}`);
}

main();
