// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createPerfProgram } from "@azure-tools/test-perf";
import { TrackDependencyTest } from "./trackDependency.spec.js";
import { TrackTraceTest } from "./trackTrace.spec.js";
import fs from "fs";
import util from "util";

// Write console logs to file for parsing
const logFile = fs.createWriteStream("perf.log", { flags: "a" });
const logStdout = process.stdout;
console.log = function() {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
};
const perfProgram = createPerfProgram(TrackDependencyTest, TrackTraceTest);
perfProgram.run();
