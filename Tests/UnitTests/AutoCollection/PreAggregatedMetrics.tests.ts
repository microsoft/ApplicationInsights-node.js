// import * as assert from "assert";
// import * as sinon from "sinon";

// import { AutoCollectPreAggregatedMetrics } from "../../../src/autoCollection/preAggregatedMetrics";
// import { Config } from "../../../src/Library/configuration";
// import { MetricHandler } from "../../../src/library/handlers";

// describe("AutoCollection/PreAggregatedMetrics", () => {
//     var sandbox: sinon.SinonSandbox;

//     before(() => {
//         sandbox = sinon.createSandbox();
//     });

//     afterEach(() => {
//         sandbox.restore();
//     });

//     describe("#init and #dispose()", () => {
//         it("init should enable and dispose should stop auto collection interval", () => {
//             var setIntervalSpy = sandbox.spy(global, "setInterval");
//             var clearIntervalSpy = sandbox.spy(global, "clearInterval");
//             let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
//             let metrics = new AutoCollectPreAggregatedMetrics(metricHandler);
//             metrics.enable(true);
//             assert.equal(
//                 setIntervalSpy.callCount,
//                 1,
//                 "setInterval should be called as part of PreAggregatedMetrics initialization"
//             );
//             metrics.enable(false);
//             assert.equal(
//                 clearIntervalSpy.callCount,
//                 1,
//                 "clearInterval should be called once as part of PreAggregatedMetrics shutdown"
//             );
//         });
//     });
// });
