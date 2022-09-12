import assert = require("assert");
import fs = require("fs");
import sinon = require("sinon");

import InternalAzureLogger = require("../../Library/InternalAzureLogger");
import FileSystemHelper = require("../../Library/FileSystemHelper");

describe("Library/InternalAzureLogger", () => {

    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    let internalLogger: InternalAzureLogger = null;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        originalEnv = process.env;
        InternalAzureLogger["_instance"] = null;
        internalLogger = InternalAzureLogger.getInstance();
        InternalAzureLogger["_fileCleanupTimer"] = setInterval(() => { }, 0);
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        internalLogger = null;
    });

    describe("Write to file", () => {
        it("should log message to file", (done) => {
            let confirmDirStub = sandbox.stub(FileSystemHelper, "confirmDirExists", async (directory: string) => {
                // Fake directory creation
            });
            var appendFileAsyncStub = sandbox.stub(FileSystemHelper, "appendFileAsync");
            internalLogger["_logToFile"] = true;
            internalLogger["_storeToDisk"]("testMessage").then(() => {
                assert.ok(confirmDirStub.called, "confirmDirStub called");
                assert.ok(appendFileAsyncStub.called, "writeStub called"); // File creation was called
                assert.ok(
                    appendFileAsyncStub.lastCall.args[0].toString().indexOf("applicationinsights.log") > 0
                );
                assert.equal(appendFileAsyncStub.lastCall.args[1], "testMessage\r\n");
                done();
            }).catch((error) => { done(error); });
        });

        it("should create backup file", (done) => {
            sandbox.stub(FileSystemHelper, "confirmDirExists", async (directory: string) => { });
            sandbox.stub(FileSystemHelper, "accessAsync", async (directory: string) => { });
            sandbox.stub(FileSystemHelper, "getShallowFileSize", async (path: string) => {
                // Fake file size check
                return 123;
            });
            internalLogger["maxSizeBytes"] = 122;

            var writeStub = sandbox.stub(FileSystemHelper, "writeFileAsync");
            var appendStub = sandbox.stub(FileSystemHelper, "appendFileAsync");
            var readStub = sandbox.stub(FileSystemHelper, "readFileAsync");
            internalLogger["_logToFile"] = true;
            internalLogger["_storeToDisk"]("backupTestMessage").then(() => {
                assert.ok(readStub.calledOnce, "readStub calledOnce"); // Read content to create backup
                assert.ok(appendStub.notCalled, "appendStub notCalled");
                assert.ok(writeStub.calledTwice, "writeStub calledTwice");
                assert.ok(writeStub.args[0][0].toString().indexOf(".applicationinsights.log") > 0, ".applicationinsights.log present in backup file name"); // First call is for backup file
                assert.equal(writeStub.args[1][1], "backupTestMessage\r\n");
                done();
            }).catch((error) => { done(error); });
        });

        it("should create multiple backup files", (done) => {
            sandbox.stub(FileSystemHelper, "confirmDirExists", async (directory: string) => { });
            sandbox.stub(FileSystemHelper, "accessAsync", async (directory: string) => { });
            sandbox.stub(FileSystemHelper, "getShallowFileSize", async (path: string) => {
                // Fake file size check
                return 123;
            });
            var writeStub = sandbox.stub(FileSystemHelper, "writeFileAsync");
            var readStub = sandbox.stub(FileSystemHelper, "readFileAsync");
            internalLogger["maxSizeBytes"] = 122;
            internalLogger["_logToFile"] = true;
            internalLogger["_storeToDisk"]("testMessage").then(() => {
                internalLogger["_storeToDisk"]("testMessage").then(() => {
                    assert.equal(writeStub.callCount, 4);
                    assert.ok(readStub.calledTwice);
                    done();
                }).catch((error) => { done(error); });
            }).catch((error) => { done(error); });
        });

        it("should start file cleanup task", () => {
            InternalAzureLogger["_instance"] = null;
            InternalAzureLogger["_fileCleanupTimer"] = null;
            const env = <{ [id: string]: string }>{};
            env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
            process.env = env;
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            internalLogger = InternalAzureLogger.getInstance();
            assert.ok(setIntervalSpy.called);
            assert.ok(InternalAzureLogger["_fileCleanupTimer"]);
        });

        it("should remove backup files", (done) => {
            sandbox.stub(FileSystemHelper, "readdirAsync", async (path: string) => {
                return ["applicationinsights.log", "123.applicationinsights.log", "456.applicationinsights.log"];
            });
            internalLogger["maxHistory"] = 0;
            var unlinkStub = sandbox.stub(FileSystemHelper, "unlinkAsync");
            internalLogger["_fileCleanupTask"]().then(() => {
                assert.ok(unlinkStub.calledTwice, "unlinkStub calledTwice");
                done();
            }).catch((error) => { done(error); });
        });

        it("cleanup should keep configured number of backups", (done) => {
            sandbox.stub(FileSystemHelper, "readdirAsync", async (path: string) => {
                return ["applicationinsights.log", "123.applicationinsights.log", "456.applicationinsights.log"];
            });
            internalLogger["maxHistory"] = 1;
            var unlinkStub = sandbox.stub(FileSystemHelper, "unlinkAsync");
            internalLogger["_fileCleanupTask"]().then(() => {
                assert.ok(unlinkStub.calledOnce, "unlinkStub calledOnce");
                assert.ok(unlinkStub.args[0][0].toString().indexOf("123.applicationinsights.log") > 0, "Oldest file is deleted");
                done();
            }).catch((error) => { done(error); });
        });
    });
});
