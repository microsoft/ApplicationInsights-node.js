// import * as assert from "assert";
// import * as sinon from "sinon";
// import { Meter } from "@opentelemetry/api";
// import { MeterProvider } from "@opentelemetry/sdk-metrics";
// import { NativePerformanceMetrics } from "../../../src/metrics/collection/nativePerformanceMetrics";

// class TestEmitter {
//     enable() { }
//     disable() { }
//     getLoopData() { }
//     getGCData() { }
// }

// describe("AutoCollection/NativePerformance", () => {
//     let sandbox: sinon.SinonSandbox;
//     let testMeter: Meter;

//     before(() => {
//         sandbox = sinon.createSandbox();
//         const testProvider = new MeterProvider();
//         testMeter = testProvider.getMeter("test");
//     });

//     afterEach(() => {
//         sandbox.restore();
//     });

//     describe("#Metrics", () => {
//         it("init should auto collection interval if native metrics packages is installed", () => {
//             const nativePerformance = new NativePerformanceMetrics(testMeter);
//             nativePerformance["_emitter"] = new TestEmitter();
//             assert.ok(!nativePerformance["_handle"]); // Package is not installed in test execution, TODO: Add test where this is available
//         });

//         it("Calling enable when metrics are not available should fail gracefully", () => {
//             let nativePerformance = null;

//             assert.doesNotThrow(
//                 () => nativePerformance = new NativePerformanceMetrics(testMeter),
//                 "Does not throw when native metrics are not available"
//             );
//         });
//     });
// });
