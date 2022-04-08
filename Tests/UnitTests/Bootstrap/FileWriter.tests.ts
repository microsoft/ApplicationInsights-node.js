import * as assert from "assert";
import * as sinon from "sinon";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { FileWriter, homedir } from "../../../Bootstrap/FileWriter";
import { renameCurrentFile } from "../../../Bootstrap/Helpers/FileHelpers";

describe("FileWriter", () => {
    const filedir = path.join(homedir, "LogFiles/ApplicationInsights/test");
    describe("#constructor()", () => {
        it("should return a ready FileWriter", () => {
            if (parseInt(process.versions.node.split(".")[0]) >= 1) {
                const writer = new FileWriter(filedir, "test.txt");
                assert.deepEqual(writer["_ready"], true);
                assert.deepEqual(fs.existsSync(filedir), true);
            } else {
                assert.ok(true, "skipped");
            }
        })
    });

    describe("#log()", () => {
        it("should not log if the FileWriter is not ready", () => {
            const writer = new FileWriter(filedir, "test.txt");
            const stub = sinon.stub(writer, "_writeFile");
            writer["_ready"] = false;

            assert.ok(stub.notCalled);
            writer.log("foo");
            assert.ok(stub.notCalled);

            stub.restore();
        });
    });

    describe("#error()", () => {
        it("should call log()", () => {
            const writer = new FileWriter(filedir, "test.txt");
            const stub = sinon.stub(writer, "log");

            assert.ok(stub.notCalled);
            writer.error("example");
            assert.ok(stub.calledOnce);
            assert.deepEqual(stub.args[0][0], "example");
            stub.restore();
        });
    });

    describe("#_writeFile()", () => {
        it("should write a new file in custom folder", (done) => {
            const writer = new FileWriter(os.tmpdir(), "tempfile.txt");
            writer.callback = (err) => {
                assert.deepEqual(err, null);
                const content = fs.readFileSync(path.join(os.tmpdir(), "tempfile.txt"), "utf8");
                assert.deepEqual(content, "temp:foo");
                done();
            }
            writer.log("temp:foo");
        });

        it("should write a new file", (done) => {
            const writer = new FileWriter(filedir, "newfile.txt");
            writer.callback = (err) => {
                assert.deepEqual(err, null);
                const content = fs.readFileSync(path.join(filedir, "newfile.txt"), "utf8");
                assert.deepEqual(content, "newfile #1");
                done();
            }
            writer["_writeFile"]("newfile #1");
        });

        it("should overwrite an existing file, if one already exists", (done) => {
            const writer = new FileWriter(filedir, "test.txt");
            writer.callback = (err) => {
                assert.deepEqual(err, null);
                const content = fs.readFileSync(path.join(filedir, "test.txt"), "utf8");
                assert.deepEqual(content, "write #1");
                writer.callback = (err) => {
                    assert.deepEqual(err, null);
                    const content = fs.readFileSync(path.join(filedir, "test.txt"), "utf8");
                    assert.deepEqual(content, "write #2");
                    done();
                }
                writer["_writeFile"]("write #2");
            }
            writer["_writeFile"]("write #1");
        });
    });

    describe("#_appendFile()", () => {
        it("should append the file contents", (done) => {
            let counter = 0;
            try {
                // Try to delete the file we are appending
                fs.unlinkSync(path.join(filedir, "append.txt"));
            } catch (e) { }
            const writer = new FileWriter(filedir, "append.txt", { append: true });
            writer.callback = (err) => {
                if (counter < 3) {
                    counter += 1;
                    writer.log(`line #${counter}`);
                } else {
                    const content = fs.readFileSync(path.join(filedir, "append.txt"), "utf8");
                    assert.deepEqual(content, "line #0\nline #1\nline #2\nline #3\n");
                    done();
                }
            }
            writer.log(`line #${counter}`);
        });
    });

    describe("#_addCloseHandler()", () => {
        it("should add the delete handler when configured to do so", (done) => {
            const writer = new FileWriter(filedir, "test.txt");
            writer.callback = (err) => {
                assert.equal(err, null);
                done();
            }
            writer.log("example");
        });
    });

    describe("#_shouldRenameFile()", () => {
        it("should return true when the date has changed", (done) => {
            try {
                // Try to delete the file we are testing
                fs.unlinkSync(path.join(filedir, "clocktest.txt"));
            } catch (e) { }
            const sandbox = sinon.sandbox.create();
            const clock = sandbox.useFakeTimers(Date.now());
            const writer = new FileWriter(filedir, "clocktest.txt");
            writer.callback = (err) => {
                assert.equal(err, null);
                writer["_shouldRenameFile"]((err1, shouldRename1) => {
                    assert.deepEqual(err1, null);
                    assert.deepEqual(shouldRename1, false);
                    clock.tick(86400000); // 1 day
                    writer["_shouldRenameFile"]((err2, shouldRename2) => {
                        assert.deepEqual(err2, null);
                        assert.deepEqual(shouldRename2, true);
                        clock.restore();
                        sandbox.restore();
                        done();
                    });
                });
            }
            writer.log("message");
        });
    });

    describe("#renameCurrentFile()", () => {
        it("should rename the current file", (done) => {
            const writer = new FileWriter(filedir, "renametest.txt");
            writer.callback = (err) => {
                assert.deepEqual(err, null);
                const birthdate = new Date(fs.statSync(path.join(filedir, "renametest.txt")).birthtime);

                // Rename the file
                renameCurrentFile(filedir, "renametest.txt", (err, renamedfullpath) => {
                    // Assert previously named file no longer exists
                    try {
                        const content = fs.readFileSync(path.join(filedir, "renametest.txt"));
                        assert.ok(false, "File should no longer exist");
                    } catch (e) {
                        assert.deepEqual(e.code, "ENOENT", "File should no longer exist");
                    }

                    // Assert renamed file has identical contents and was renamed properly
                    assert.deepEqual(renamedfullpath, path.join(filedir, `renametest-${birthdate.toISOString().replace(/[T:\.]/g, "_").replace("Z", "")}.txt.old`));
                    const content = fs.readFileSync(renamedfullpath, "utf8");
                    assert.deepEqual(content, "foo");

                    // Cleanup
                    fs.unlinkSync(renamedfullpath);
                    done();
                });
            }
            writer.log("foo"); // create the file
        });
    });
});
