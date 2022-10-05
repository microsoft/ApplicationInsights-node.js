import * as assert from "assert";
import * as sinon from "sinon";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { NativePerformanceMetrics } from "../../../src/autoCollection/metrics/collection/nativePerformanceMetrics";
import { Meter } from "@opentelemetry/api-metrics";


describe("AutoCollection/NativePerformance", () => {
    var sandbox: sinon.SinonSandbox;
    let testMeter: Meter;

    before(() => {
        sandbox = sinon.createSandbox();
        let testProvider = new MeterProvider();
        testMeter = testProvider.getMeter("test");
    })

    beforeEach(() => {
       
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("init should enable and dispose should stop auto collection interval", () => {
            var nativePerformance = new NativePerformanceMetrics(testMeter);
            nativePerformance.enable(true);
            if (
                nativePerformance["_metricsAvailable"]
            ) {
                assert.ok(nativePerformance["_handle"]);
                nativePerformance.enable(false);
                assert.ok(!nativePerformance["_handle"]);
            } else {
                assert.ok(!nativePerformance["_handle"]);
            }
        });

        it("Calling enable when metrics are not available should fail gracefully", () => {
            var nativePerformance = new NativePerformanceMetrics(testMeter);
            nativePerformance["_metricsAvailable"] = false;
            assert.ok(!(<any>nativePerformance)["_emitter"]);

            assert.doesNotThrow(
                () => nativePerformance.enable(true),
                "Does not throw when native metrics are not available and trying to enable"
            );
            assert.doesNotThrow(
                () => nativePerformance.enable(false),
                "Does not throw when native metrics are not available and trying to disable"
            );
        });
    });
});
