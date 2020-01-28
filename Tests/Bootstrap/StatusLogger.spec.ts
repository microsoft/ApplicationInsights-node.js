import * as fs from "fs";
import assert = require("assert");
import sinon = require("sinon");
import * as StatusLogger from "../../Bootstrap/StatusLogger";

describe("#writeFile()", () => {
    it("should write a status file to disk", (done) => {
        if (!StatusLogger.isNodeVersionCompatible()) {
            done();
        } else {
            StatusLogger.makeStatusDirs();
            StatusLogger.writeFile(StatusLogger.DEFAULT_STATUS, () => {
                const buffer = JSON.parse(fs.readFileSync(StatusLogger.FULL_PATH, "utf8"));
                assert.deepEqual(buffer, StatusLogger.DEFAULT_STATUS);
                done();
            });
        }
    });
});

describe("#addCloseHandler()", () => {
    it("should add a process exit handler", () => {
        if (StatusLogger.isNodeVersionCompatible()) {
            const processSpy = sinon.spy(process, "on");
            assert.ok(processSpy.notCalled);

            StatusLogger.addCloseHandler();
            assert.equal(processSpy.callCount, 1);
            assert.equal(processSpy.args[0][0], "exit");

            processSpy.restore();
        }
    })
});
