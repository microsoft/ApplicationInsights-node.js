import * as assert from "assert";
import * as fs from "fs";
import * as sinon from "sinon";

import { InternalAzureLogger } from "../../../Library/Logging/InternalAzureLogger";
import * as  FileSystemHelper from "../../../Library/Util/FileSystemHelper";

describe("Library/InternalAzureLogger", () => {

    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        InternalAzureLogger["_instance"] = null;
        InternalAzureLogger["_fileCleanupTimer"] = setInterval(() => { }, 0);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("Write to file", () => {

        let internalLogger: InternalAzureLogger = null;
        var originalEnv = process.env["APPLICATIONINSIGHTS_LOG_DESTINATION"];

        before(() => {
            process.env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
            internalLogger = InternalAzureLogger.getInstance();
        });

        after(() => {
            process.env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = originalEnv;
        })

        it("should log message to file", (done) => {
            var writeSpy = sandbox.spy(FileSystemHelper, "appendFileAsync");
            internalLogger["_storeToDisk"]("testMessage").then(() => {
                assert.ok(writeSpy.called);
                assert.ok(writeSpy.lastCall.args[0].indexOf("applicationinsights.log") > 0);
                assert.equal(writeSpy.lastCall.args[1], "testMessage\r\n");
                done();
            }).catch((error) => { done(error); });
        });

        it("should create backup file", (done) => {
            var writeSpy = sandbox.spy(FileSystemHelper, "writeFileAsync");
            var readSpy = sandbox.spy(FileSystemHelper, "readFileAsync");
            internalLogger.maxSizeBytes = 0;
            internalLogger["_storeToDisk"]("backupTestMessage").then(() => {
                assert.ok(readSpy.calledOnce);
                assert.ok(writeSpy.calledTwice);
                //assert.equal(writeSpy.args[0][0], "C:\Users\hectorh\AppData\Local\Temp\appInsights-node\1636481017787.applicationinsights.log"); // Backup file format
                assert.ok(typeof writeSpy.args[0][1]);
                //assert.equal(writeSpy.args[1][0], "C:\Users\hectorh\AppData\Local\Temp\appInsights-node\applicationinsights.log"); // Main file format
                assert.equal(writeSpy.args[1][1], "backupTestMessage\r\n");
                done();
            }).catch((error) => { done(error); });
        });

        it("should create multiple backup files", (done) => {
            var writeSpy = sandbox.spy(FileSystemHelper, "writeFileAsync");
            var readSpy = sandbox.spy(FileSystemHelper, "readFileAsync");
            internalLogger.maxSizeBytes = 0;
            internalLogger.maxHistory = 2;
            internalLogger["_storeToDisk"]("testMessage").then(() => {
                internalLogger["_storeToDisk"]("testMessage").then(() => {
                    assert.equal(writeSpy.callCount, 4);
                    assert.ok(readSpy.calledTwice);
                    done();
                }).catch((error) => { done(error); });
            }).catch((error) => { done(error); });
        });

        it("should start file cleanup task", () => {
            InternalAzureLogger["_fileCleanupTimer"] = null;
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            internalLogger = InternalAzureLogger.getInstance();
            assert.ok(setIntervalSpy.called);
        });

        it("should remove backup files", (done) => {
            var unlinkSpy = sandbox.spy(FileSystemHelper, "unlinkAsync");
            internalLogger.maxHistory = 0;
            internalLogger["_fileCleanupTask"]().then(() => {
                assert.ok(unlinkSpy.called);
                FileSystemHelper.readdirAsync(internalLogger["_tempDir"]).then((files) => {
                    assert.equal(files.length, 1);
                    done();
                });
            });
        });

        it("cleanup should keep configured number of backups", (done) => {
            var unlinkSpy = sandbox.spy(FileSystemHelper, "unlinkAsync");
            internalLogger.maxHistory = 1;
            internalLogger.maxSizeBytes = 0;
            internalLogger["_storeToDisk"]("testMessage").then(() => {
                internalLogger["_storeToDisk"]("testMessage").then(() => {
                    internalLogger["_fileCleanupTask"]().then(() => {
                        assert.ok(unlinkSpy.called);
                        FileSystemHelper.readdirAsync(internalLogger["_tempDir"]).then((files) => {
                            assert.equal(files.length, 2);
                            done();
                        }).catch((error) => { done(error); });
                    }).catch((error) => { done(error); });
                }).catch((error) => { done(error); });
            }).catch((error) => { done(error); });
        });
    });
});
