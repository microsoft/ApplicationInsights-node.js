import assert = require("assert");
import fs = require("fs");
import os = require("os");
import path = require("path");
import sinon = require("sinon");

import InternalAzureLogger = require("../../Library/InternalAzureLogger");

describe("Library/InternalAzureLogger", () => {

    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
        InternalAzureLogger["_instance"] = null;
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        // Clean files
        try {
            let tempDir = path.join(os.tmpdir(), "appInsights-node");
            if (fs.existsSync(tempDir)) {
                let files = fs.readdirSync(tempDir);
                if (files) {
                    files.forEach(file => {
                        var filePath = path.join(tempDir, file);
                        fs.unlinkSync(filePath);
                    });
                }
            }
        }
        catch (ex) { }
    })

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
            var writeSpy = sandbox.spy(fs, "appendFile");
            internalLogger["_storeToDisk"]("testMessage", (error) => {
                assert.equal(error, null);
                assert.ok(writeSpy.called);
                done();
            });
        });

        it("should create backup file", (done) => {
            var writeSpy = sandbox.spy(fs, "writeFile");
            var renameSpy = sandbox.spy(fs, "rename");
            internalLogger.maxSizeBytes = 0;
            internalLogger["_storeToDisk"]("testMessage", (error) => {
                assert.equal(error, null);
                assert.ok(writeSpy.calledOnce);
                assert.ok(renameSpy.calledOnce);
                assert.equal(writeSpy.lastCall.args[0], renameSpy.lastCall.args[0]);
                assert.notEqual(writeSpy.lastCall.args[0], renameSpy.lastCall.args[1]);
                done();
            });
        });

        it("should create multiple backup files", (done) => {
            var writeSpy = sandbox.spy(fs, "writeFile");
            var renameSpy = sandbox.spy(fs, "rename");
            internalLogger["_fileBackupsCount"] = 0;
            internalLogger.maxSizeBytes = 0;
            internalLogger.maxHistory = 2;
            internalLogger["_storeToDisk"]("testMessage", (error) => {
                internalLogger["_storeToDisk"]("testMessage", (error) => {
                    assert.equal(error, null);
                    assert.ok(writeSpy.calledTwice);
                    assert.ok(renameSpy.calledTwice);
                    done();
                });
            });
        });

        it("should remove backup file", (done) => {
            var unlinkSpy = sandbox.spy(fs, "unlink");
            internalLogger["_fileCleanupTask"]((error) => {
                assert.equal(error, null);
                assert.ok(unlinkSpy.called);
                done();
            });
        });

    });

});
