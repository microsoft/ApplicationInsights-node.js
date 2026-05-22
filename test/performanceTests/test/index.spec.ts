// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createPerfProgram } from "@azure-tools/test-perf";
import { TrackDependencyTest } from "./trackDependency.spec.js";
import { TrackTraceTest } from "./trackTrace.spec.js";
import { AzureMonitorSpanTest } from "./azureMonitorSpan.spec.js";
import { AzureMonitorLogTest } from "./azureMonitorLog.spec.js";
import { OtelSpanTest } from "./otelSpan.spec.js";
import { OtelLogTest } from "./otelLog.spec.js";
import https from "https";
import fs from "fs";

const json = JSON.parse(fs.readFileSync("package.json", "utf8"));
let perfTestData: string = "";
const originalConsole = console.log;

console.log = function (message: string) {
    perfTestData += message + "\n";
};

const perfProgram = createPerfProgram(
    TrackDependencyTest,
    TrackTraceTest,
    AzureMonitorSpanTest,
    AzureMonitorLogTest,
    OtelSpanTest,
    OtelLogTest,
);

const scenarioFromArgv = process.argv
    .slice(2)
    .find((a) => !a.startsWith("-")) || "unknown";

perfProgram.run().then(() => {
    console.log = originalConsole;

    // Only post telemetry when the Microsoft-internal CI secrets are present;
    // local/CI-without-secrets runs simply re-emit captured output and exit.
    process.stdout.write(perfTestData);

    const iKey = process.env.GENEVA_IKEY;
    const apiKey = process.env.API_KEY;
    if (!iKey || !apiKey) {
        return;
    }

    // Match the LAST occurrence of ops/s (skips the warmup line).
    const allMatches = [...perfTestData.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*ops\/s/g)];
    if (allMatches.length === 0) {
        console.error("Error: Could not find a performance value to report.");
        return;
    }
    const lastMatch = allMatches[allMatches.length - 1];
    const value = Number(lastMatch[1].replace(/,/g, ""));

    const time = new Date().toISOString();
    const name = "SDKPerfTest";
    const ver = "4.0";
    const testName = "NodePerfTests";
    const unit = "ops/sec";
    const metric = "ops";
    const sdkVersion = (json.dependencies?.applicationinsights || "0.0.0").replace(/^\^/, "");
    const sku = scenarioFromArgv;

    https
        .get(
            `https://browser.events.data.microsoft.com/OneCollector/1.0/t.js?qsp=true&name=%22${name}%22&time=%22${time}%22&ver=%22${ver}%22&iKey=%22${iKey}%22&apikey=${apiKey}&-testName=%22${testName}%22&-sku=%22${sku}%22&-version=%22${sdkVersion}%22&-unitOfMeasure=%22${unit}%22&-metric=%22${metric}%22&-value*6=${value}`,
            (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    console.log(data);
                });
            },
        )
        .on("error", (err) => {
            console.error(err);
        });
});