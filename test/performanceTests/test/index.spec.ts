// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createPerfProgram } from "@azure-tools/test-perf";
import { TrackDependencyTest } from "./trackDependency.spec.js";
import { TrackTraceTest } from "./trackTrace.spec.js";

const perfProgram = createPerfProgram(TrackDependencyTest, TrackTraceTest);
perfProgram.run();
