import * as fs from "fs";
import assert = require("assert");
import sinon = require("sinon");
import { StatusLogger } from "../../Bootstrap/StatusLogger";

describe("#writeFile()", () => {
    it("should write a status file to disk", (done) => {
        const statusLogger = new StatusLogger();
        if (!statusLogger.isNodeVersionCompatible()) {
            done();
        } else {
            statusLogger.makeStatusDirs();
            statusLogger.writeFile(StatusLogger.DEFAULT_STATUS, () => {
                const buffer = JSON.parse(fs.readFileSync(statusLogger.FULL_PATH, "utf8"));
                assert.deepEqual(buffer, StatusLogger.DEFAULT_STATUS);
                done();
            });
        }
    });
});

describe("#addCloseHandler()", () => {
    it("should add a process exit handler", () => {
        const statusLogger = new StatusLogger();
        if (statusLogger.isNodeVersionCompatible()) {
            const processSpy = sinon.spy(process, "on");
            assert.ok(processSpy.notCalled);

            statusLogger.addCloseHandler();
            assert.equal(processSpy.callCount, 1);
            assert.equal(processSpy.args[0][0], "exit");

            processSpy.restore();
        }
    })
});
