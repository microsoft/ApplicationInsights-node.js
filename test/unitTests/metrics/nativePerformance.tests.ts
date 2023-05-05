import * as assert from "assert";
import * as sinon from "sinon";
import { Meter } from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { NativePerformanceMetrics } from "../../../src/metrics/collection/nativePerformanceMetrics";

class TestEmitter {
    enable() { }
    disable() { }
    getLoopData() { }
    getGCData() { }
}

describe("AutoCollection/NativePerformance", () => {
    let sandbox: sinon.SinonSandbox;
    let testMeter: Meter;
    let testProvider: MeterProvider;
    let autoCollect: NativePerformanceMetrics;

    before(() => {
        sandbox = sinon.createSandbox();
        testProvider = new MeterProvider();
        testMeter = testProvider.getMeter("test");
    });

    afterEach(() => {
        sandbox.restore();
        autoCollect.shutdown();
    });

    after(() => {
        testProvider.shutdown();
    });

    describe("#Metrics", () => {
        it("init should auto collection interval if native metrics packages is installed", () => {
            autoCollect = new NativePerformanceMetrics(testMeter);
            autoCollect["_emitter"] = new TestEmitter();
            assert.ok(!autoCollect["_handle"]); // Package is not installed in test execution, TODO: Add test where this is available
        });

        it("Calling enable when metrics are not available should fail gracefully", () => {
            assert.doesNotThrow(
                () => autoCollect = new NativePerformanceMetrics(testMeter),
                "Does not throw when native metrics are not available"
            );
        });
    });
});
