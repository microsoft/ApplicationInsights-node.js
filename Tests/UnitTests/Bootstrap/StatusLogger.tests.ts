import * as fs from "fs";

import * as os from "os";
import * as assert from "assert";
import * as sinon from "sinon";
import * as path from "path";

import { StatusLogger, DEFAULT_STATUS_CONTRACT } from "../../../Bootstrap/StatusLogger";
import { FileWriter, homedir } from "../../../Bootstrap/FileWriter";

describe("#logStatus()", () => {

    const fileName = `status_${os.hostname()}_${process.pid}.json`;

    it("should write a status file to disk", (done) => {
        const filepath = path.join(homedir, "LogFiles/ApplicationInsights/status");
        const fileWriter = new FileWriter(filepath, fileName);
        const statusLogger = new StatusLogger(fileWriter);
        statusLogger.logStatus(DEFAULT_STATUS_CONTRACT, (err: Error) => {
            assert.equal(err, null);
            const buffer = JSON.parse(fs.readFileSync(path.join(filepath, fileName), "utf8"));
            assert.deepEqual(buffer, DEFAULT_STATUS_CONTRACT);
            done();
        });
    });

    it("should write status to console", () => {
        const consoleStub = sinon.stub(console, "log");

        // Act
        const statusLogger = new StatusLogger(console);
        statusLogger.logStatus(DEFAULT_STATUS_CONTRACT);

        // Assert
        assert.ok(consoleStub.calledOnce);
        assert.deepEqual(consoleStub.args[0][0], DEFAULT_STATUS_CONTRACT);

        // Cleanup
        consoleStub.restore();
    });
});
