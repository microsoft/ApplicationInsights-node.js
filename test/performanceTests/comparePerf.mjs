#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * Compares two perf result JSON files produced by runBenchmarks.mjs.
 *
 * Usage:
 *   node comparePerf.mjs baseline.json candidate.json [markdown.md]
 *
 * Environment:
 *   PERF_REGRESSION_THRESHOLD  Percent regression that fails the gate (default 15)
 *
 * Exit codes:
 *   0  no gating regression beyond threshold
 *   1  one or more gating scenarios regressed beyond threshold
 *   2  invalid input
 */

import { readFileSync, writeFileSync } from "node:fs";

function loadResults(path) {
    const data = JSON.parse(readFileSync(path, "utf8"));
    const map = new Map();
    for (const r of data.results) {
        map.set(r.name, r);
    }
    return { meta: data, map };
}

const [baselinePath, candidatePath, markdownPath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
    console.error("Usage: comparePerf.mjs <baseline.json> <candidate.json> [markdown.md]");
    process.exit(2);
}

const threshold = Number(process.env.PERF_REGRESSION_THRESHOLD || "15");

const baseline = loadResults(baselinePath);
const candidate = loadResults(candidatePath);

const rows = [];
const regressions = [];

for (const [name, b] of baseline.map) {
    const c = candidate.map.get(name);
    if (!c) {
        rows.push({ name, tier: b.tier, status: "missing in candidate" });
        continue;
    }
    // Positive deltaPct means improvement (more ops/s); negative means regression.
    const deltaPct = ((c.median - b.median) / b.median) * 100;
    const row = {
        name,
        tier: b.tier,
        baselineMedian: b.median,
        candidateMedian: c.median,
        deltaPct,
    };
    rows.push(row);
    if (b.tier === "gating" && deltaPct < -threshold) {
        regressions.push(row);
    }
}

// Scenarios present only in candidate (e.g. newly added) are informational.
for (const [name, c] of candidate.map) {
    if (!baseline.map.has(name)) {
        rows.push({ name, tier: c.tier, status: "new in candidate", candidateMedian: c.median });
    }
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "n/a");
const arrow = (d) => (d > 0 ? "🟢" : d < 0 ? "🔴" : "⚪");

let md = `## Performance comparison\n\n`;
md += `Threshold for gating regression: **-${threshold}%** (median ops/s)\n\n`;
md += `| Scenario | Tier | Baseline (ops/s) | Candidate (ops/s) | Δ % |\n`;
md += `|---|---|---:|---:|---:|\n`;
for (const r of rows) {
    if (r.status) {
        md += `| \`${r.name}\` | ${r.tier} | ${r.status} | ${fmt(r.candidateMedian)} | n/a |\n`;
        continue;
    }
    md += `| \`${r.name}\` | ${r.tier} | ${fmt(r.baselineMedian)} | ${fmt(r.candidateMedian)} | ${arrow(r.deltaPct)} ${fmt(r.deltaPct)}% |\n`;
}

if (regressions.length) {
    md += `\n### ❌ Gating regressions\n\n`;
    for (const r of regressions) {
        md += `- \`${r.name}\`: ${fmt(r.deltaPct)}% (baseline ${fmt(r.baselineMedian)} → candidate ${fmt(r.candidateMedian)} ops/s)\n`;
    }
} else {
    md += `\n### ✅ No gating regression beyond threshold.\n`;
}

md += `\n<sub>baseline: ${baseline.meta.generatedAt} (node ${baseline.meta.node}, ${baseline.meta.samples} samples × ${baseline.meta.duration}s)</sub>\n`;
md += `<sub>candidate: ${candidate.meta.generatedAt} (node ${candidate.meta.node}, ${candidate.meta.samples} samples × ${candidate.meta.duration}s)</sub>\n`;

console.log(md);

if (markdownPath) {
    writeFileSync(markdownPath, md);
}

process.exit(regressions.length ? 1 : 0);
