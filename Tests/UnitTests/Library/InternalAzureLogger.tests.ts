import * as assert from "assert";
import { writeFileSync } from "fs";
import * as sinon from "sinon";

import { InternalAzureLogger } from "../../../src/library/Logging/InternalAzureLogger";
import * as fileHelper from "../../../src/library/util/fileSystemHelper";


describe("Library/InternalAzureLogger", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    let internalLogger: InternalAzureLogger = null;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        originalEnv = process.env;
        internalLogger = InternalAzureLogger.getInstance();
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        InternalAzureLogger["_instance"] = null;
    });

    describe("Write to file", () => {
        it("should log message to new file", (done) => {
            let confirmDirStub = sandbox.stub(fileHelper, "confirmDirExists").callsFake(async (directory: string) => {
                // Fake directory creation
            });
            var accessStub = sandbox.stub(fileHelper, "accessAsync").callsFake(async (directory: string) => {
                new Error("Not found");
            });
            var writeStub = sandbox.stub(fileHelper, "appendFileAsync");
            internalLogger["_logToFile"] = true;

            internalLogger.info("testMessage")
                .then(() => {
                    assert.ok(confirmDirStub.called, "confirmDirStub called");
                    assert.ok(accessStub.called, "accessStub called");
                    assert.ok(writeStub.called, "writeStub called"); // File creation was called
                    assert.ok(
                        writeStub.lastCall.args[0].toString().indexOf("applicationinsights.log") > 0
                    );
                    assert.equal(writeStub.lastCall.args[1], "testMessage\r\n");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("should create backup file", (done) => {
            sandbox.stub(fileHelper, "confirmDirExists").callsFake(async (directory: string) => { });
            sandbox.stub(fileHelper, "accessAsync").callsFake(async (directory: string) => { });
            sandbox.stub(fileHelper, "getShallowFileSize").callsFake(async (path: string) => {
                // Fake file size check
                return 123;
            });
            internalLogger.maxSizeBytes = 122;

            var writeStub = sandbox.stub(fileHelper, "writeFileAsync");
            var appendStub = sandbox.stub(fileHelper, "appendFileAsync");
            var readStub = sandbox.stub(fileHelper, "readFileAsync");
            internalLogger["_logToFile"] = true;

            internalLogger.info("backupTestMessage")
                .then(() => {
                    assert.ok(readStub.calledOnce, "readStub calledOnce"); // Read content to create backup
                    assert.ok(appendStub.notCalled, "appendStub notCalled");
                    assert.ok(writeStub.calledTwice, "writeStub calledTwice");
                    //assert.equal(writeSpy.args[0][0], "C:\Users\hectorh\AppData\Local\Temp\appInsights-node\1636481017787.applicationinsights.log"); // Backup file format
                    assert.ok(writeStub.args[0][0].toString().indexOf(".applicationinsights.log") > 0, ".applicationinsights.log present in backup file name"); // First call is for backup file
                    //assert.equal(writeSpy.args[1][1], "C:\Users\hectorh\AppData\Local\Temp\appInsights-node\applicationinsights.log"); // Main file format
                    assert.equal(writeStub.args[1][1], "backupTestMessage\r\n");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("should create multiple backup files", (done) => {
            sandbox.stub(fileHelper, "confirmDirExists").callsFake(async (directory: string) => { });
            sandbox.stub(fileHelper, "accessAsync").callsFake(async (directory: string) => { });
            sandbox.stub(fileHelper, "getShallowFileSize").callsFake(async (path: string) => {
                // Fake file size check
                return 123;
            });
            var writeStub = sandbox.stub(fileHelper, "writeFileAsync");
            var readStub = sandbox.stub(fileHelper, "readFileAsync");
            internalLogger.maxSizeBytes = 122;
            internalLogger["_logToFile"] = true;
            internalLogger.info("backupTestMessage")
                .then(() => {
                    internalLogger.info("backupTestMessage")
                        .then(() => {
                            assert.equal(writeStub.callCount, 4);
                            assert.ok(readStub.calledTwice);
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })

                .catch((error) => {
                    done(error);
                });
        });

        it("should start file cleanup task", () => {
            InternalAzureLogger["_instance"] = null;
            const env = <{ [id: string]: string }>{};
            env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
            process.env = env;
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            internalLogger = InternalAzureLogger.getInstance();
            assert.ok(setIntervalSpy.called);
            assert.ok(internalLogger["_fileCleanupTimer"]);
        });

        it("should remove backup files", (done) => {
            sandbox.stub(fileHelper, "readdirAsync").callsFake(async (path: string) => {
                return ["applicationinsights.log", "123.applicationinsights.log", "456.applicationinsights.log"];
            });
            internalLogger.maxHistory = 0;
            var unlinkStub = sandbox.stub(fileHelper, "unlinkAsync");
            internalLogger["_fileCleanupTask"]()
                .then(() => {
                    assert.ok(unlinkStub.calledTwice, "unlinkStub calledTwice");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("cleanup should keep configured number of backups", (done) => {
            sandbox.stub(fileHelper, "readdirAsync").callsFake(async (path: string) => {
                return ["applicationinsights.log", "123.applicationinsights.log", "456.applicationinsights.log"];
            });
            internalLogger.maxHistory = 1;
            var unlinkStub = sandbox.stub(fileHelper, "unlinkAsync");
            internalLogger["_fileCleanupTask"]()
                .then(() => {
                    assert.ok(unlinkStub.calledOnce, "unlinkStub calledOnce");
                    assert.ok(unlinkStub.args[0][0].toString().indexOf("123.applicationinsights.log") > 0, "Oldest file is deleted");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
