// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

for (const scenario of ["OtelSpanTest", "OtelLogTest"]) {
  test(`${scenario} completes multiple samples with a bounded heap`, () => {
    const tmp = mkdtempSync(join(tmpdir(), "perf-memory-"));
    try {
      const out = join(tmp, "samples.json");
      const child = spawnSync(
        process.execPath,
        [
          "--max-old-space-size=64",
          fileURLToPath(new URL("./bench.mjs", import.meta.url)),
          "--scenario", scenario,
          "--samples", "3",
          "--duration", "1",
          "--warmup", "1",
          "--out", out,
        ],
        { encoding: "utf8", timeout: 30000 },
      );
      assert.ifError(child.error);
      assert.equal(child.signal, null, child.stderr);
      assert.equal(child.status, 0, child.stderr);
      const result = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(result.scenario, scenario);
      assert.equal(result.samples.length, 3);
      for (const sample of result.samples) {
        assert.ok(sample.ops > 0);
        assert.ok(sample.elapsedMs >= 1000);
        assert.ok(Number.isFinite(sample.opsPerSec) && sample.opsPerSec > 0);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
}
