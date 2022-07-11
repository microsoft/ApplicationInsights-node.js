import * as assert from "assert";
import * as sinon from "sinon";
import { AutoCollectPerformance } from "../../../src/autoCollection";
import { Config } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";


describe("AutoCollection/Performance", () => {
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            let performance = new AutoCollectPerformance(metricHandler.getMeter());
            performance.enable(true);
            assert.equal(
                setIntervalSpy.callCount,
                1,
                "setInteval should be called three times as part of performance initialization and also as part of Statsbeat"
            );
            performance.enable(false);
            assert.equal(
                clearIntervalSpy.callCount,
                1,
                "clearInterval should be called once as part of performance shutdown"
            );
        });
    });
});
