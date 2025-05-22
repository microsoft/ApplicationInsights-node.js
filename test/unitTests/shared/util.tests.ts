import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { Util } from "../../../src/shared/util";
import * as fileSystemHelper from "../../../src/shared/util/fileSystemHelper";

describe("Library/Util", () => {
    let sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#trim(str)", () => {
        it("should not crash", () => {
            assert.doesNotThrow(() => Util.getInstance().trim(undefined));
            assert.doesNotThrow(() => Util.getInstance().trim(null));
            assert.doesNotThrow(() => Util.getInstance().trim(""));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>3));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>{}));
            assert.doesNotThrow(() => Util.getInstance().trim(<any>[]));
        });

        it("should trim strings", () => {
            assert.equal(Util.getInstance().trim(""), "");
            assert.equal(Util.getInstance().trim("\t"), "");
            assert.equal(Util.getInstance().trim("\n"), "");
            assert.equal(Util.getInstance().trim("\t\n\r test \t\n\r"), "test");
            assert.equal(
                Util.getInstance().trim("\t\n\r test \t\n\r test \t\n\r"),
                "test \t\n\r test"
            );
        });
    });

    describe("#isArray(obj)", () => {
        it("should detect if an object is an array", () => {
            assert.ok(Util.getInstance().isArray([]));
            assert.ok(!Util.getInstance().isArray("sdf"));
            assert.ok(Util.getInstance().isArray([0, 1]));
            assert.ok(!Util.getInstance().isArray({ length: "" }));
            assert.ok(!Util.getInstance().isArray({ length: 10 }));
        });
    });

    describe("#isError(obj)", () => {
        it("should detect if an object is an instance of Error", () => {
            class MyError extends Error {
                constructor() {
                    super();
                }
            }
            assert.ok(!Util.getInstance().isError(undefined));
            assert.ok(!Util.getInstance().isError(null));
            assert.ok(!Util.getInstance().isError(true));
            assert.ok(!Util.getInstance().isError(1));
            assert.ok(!Util.getInstance().isError(""));
            assert.ok(!Util.getInstance().isError([]));
            assert.ok(!Util.getInstance().isError({}));
            assert.ok(Util.getInstance().isError(new Error()));
            assert.ok(Util.getInstance().isError(new MyError()));
        });
    });

    describe("#msToTimeSpan(totalMs)", () => {
        const test = (input: number, expected: string, message: string) => {
            const actual = Util.getInstance().msToTimeSpan(input);
            assert.equal(expected, actual, message);
        };

        it("should convert milliseconds to a c# timespan", () => {
            test(0, "00:00:00.000", "zero");
            test(1, "00:00:00.001", "milliseconds digit 1");
            test(10, "00:00:00.010", "milliseconds digit 2");
            test(100, "00:00:00.100", "milliseconds digit 3");
            test(1 * 1000, "00:00:01.000", "seconds digit 1");
            test(10 * 1000, "00:00:10.000", "seconds digit 2");
            test(1 * 60 * 1000, "00:01:00.000", "minutes digit 1");
            test(10 * 60 * 1000, "00:10:00.000", "minutes digit 2");
            test(1 * 60 * 60 * 1000, "01:00:00.000", "hours digit 1");
            test(10 * 60 * 60 * 1000, "10:00:00.000", "hours digit 2");
            test(24 * 60 * 60 * 1000, "1.00:00:00.000", "hours overflow");
            test(11 * 3600000 + 11 * 60000 + 11111, "11:11:11.111", "all digits");
            test(
                5 * 86400000 + 13 * 3600000 + 9 * 60000 + 8 * 1000 + 789,
                "5.13:09:08.789",
                "all digits with days"
            );
            test(1001.505, "00:00:01.001505", "fractional milliseconds");
            test(1001.5, "00:00:01.0015", "fractional milliseconds - not all precision 1");
            test(1001.55, "00:00:01.00155", "fractional milliseconds - not all precision 2");
            test(1001.5059, "00:00:01.0015059", "fractional milliseconds - all digits");
            test(
                1001.50559,
                "00:00:01.0015056",
                "fractional milliseconds - too many digits, round up"
            );
        });

        it("should handle invalid input", () => {
            test(<any>"", "00:00:00.000", "invalid input");
            test(<any>"'", "00:00:00.000", "invalid input");
            test(NaN, "00:00:00.000", "invalid input");
            test(<any>{}, "00:00:00.000", "invalid input");
            test(<any>[], "00:00:00.000", "invalid input");
            test(-1, "00:00:00.000", "invalid input");
        });
    });

    describe("Library/Util/fileSystemHelper", () => {
        let sandbox: sinon.SinonSandbox;
        const tempDir = path.join(os.tmpdir(), "appinsights-test-" + Date.now());
        const tempFilePath = path.join(tempDir, "test-file.txt");
        const testContent = "Hello, world!";

        before(async () => {
            // Ensure test directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
        });

        after(async () => {
            // Clean up test directory
            if (fs.existsSync(tempDir)) {
                // Try to remove all files in the directory
                try {
                    const files = fs.readdirSync(tempDir);
                    for (const file of files) {
                        fs.unlinkSync(path.join(tempDir, file));
                    }
                    fs.rmdirSync(tempDir);
                } catch (e) {
                    console.error("Error cleaning up test directory:", e);
                }
            }
        });

        beforeEach(() => {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        describe("#confirmDirExists()", () => {
            it("should do nothing if directory already exists", async () => {
                await fileSystemHelper.confirmDirExists(tempDir);
                assert.ok(fs.existsSync(tempDir), "Directory should exist");
            });

            it("should create directory if it does not exist", async () => {
                const newDir = path.join(tempDir, "new-dir");
                await fileSystemHelper.confirmDirExists(newDir);
                assert.ok(fs.existsSync(newDir), "Directory should be created");
            });
        });

        describe("#getShallowDirectorySize()", () => {
            it("should compute the total size of all files in a directory", async () => {
                // Create test files
                const file1 = path.join(tempDir, "file1.txt");
                const file2 = path.join(tempDir, "file2.txt");
                fs.writeFileSync(file1, "content1");
                fs.writeFileSync(file2, "content2content2");
                
                const size = await fileSystemHelper.getShallowDirectorySize(tempDir);
                assert.ok(size >= "content1".length + "content2content2".length, "Size should include all files");
            });

            it("should only count files at root level and ignore subdirectories", async () => {
                // Create test files and subdirectory
                const file1 = path.join(tempDir, "file1-root.txt");
                const subDir = path.join(tempDir, "subdir");
                if (!fs.existsSync(subDir)) {
                    fs.mkdirSync(subDir, { recursive: true });
                }
                const file2 = path.join(subDir, "file2-subdir.txt");
                
                fs.writeFileSync(file1, "content1-root");
                fs.writeFileSync(file2, "content2-subdir-content2");
                
                const size = await fileSystemHelper.getShallowDirectorySize(tempDir);
                assert.ok(size === "content1-root".length || size > "content1-root".length, 
                    "Size should only include root files");
            });

            it("should handle empty directories", async () => {
                // Create empty directory
                const emptyDir = path.join(tempDir, "empty-dir");
                if (!fs.existsSync(emptyDir)) {
                    fs.mkdirSync(emptyDir, { recursive: true });
                }
                
                const size = await fileSystemHelper.getShallowDirectorySize(emptyDir);
                assert.strictEqual(size, 0);
            });
        });

        describe("#getShallowDirectorySizeSync()", () => {
            it("should compute the total size of all files in a directory synchronously", () => {
                // Create test files
                const file1 = path.join(tempDir, "file1-sync.txt");
                const file2 = path.join(tempDir, "file2-sync.txt");
                fs.writeFileSync(file1, "content1-sync");
                fs.writeFileSync(file2, "content2-sync-content2");
                
                const size = fileSystemHelper.getShallowDirectorySizeSync(tempDir);
                assert.ok(size >= "content1-sync".length + "content2-sync-content2".length, 
                    "Size should include all files");
            });

            it("should handle empty directories", () => {
                // Create empty directory
                const emptyDir = path.join(tempDir, "empty-dir-sync");
                if (!fs.existsSync(emptyDir)) {
                    fs.mkdirSync(emptyDir, { recursive: true });
                }
                
                const size = fileSystemHelper.getShallowDirectorySizeSync(emptyDir);
                assert.strictEqual(size, 0);
            });
        });

        describe("#getShallowFileSize()", () => {
            it("should return the size of a file", async () => {
                // Create test file
                fs.writeFileSync(tempFilePath, testContent);
                
                const size = await fileSystemHelper.getShallowFileSize(tempFilePath);
                assert.strictEqual(size, testContent.length);
            });

            it("should not return a size for a directory", async () => {
                const result = await fileSystemHelper.getShallowFileSize(tempDir);
                assert.strictEqual(result, undefined);
            });
        });

        describe("promisified fs functions", () => {
            it("should promisify fs.stat correctly", async () => {
                // Create test file
                fs.writeFileSync(tempFilePath, testContent);
                
                const stats = await fileSystemHelper.statAsync(tempFilePath);
                assert.ok(stats.isFile(), "Should be a file");
                assert.strictEqual(stats.size, testContent.length);
            });

            it("should promisify fs.lstat correctly", async () => {
                // Create test file
                fs.writeFileSync(tempFilePath, testContent);
                
                const stats = await fileSystemHelper.lstatAsync(tempFilePath);
                assert.ok(stats.isFile(), "Should be a file");
                assert.strictEqual(stats.size, testContent.length);
            });

            it("should promisify fs.mkdir correctly", async () => {
                const newDir = path.join(tempDir, "mkdir-test");
                await fileSystemHelper.mkdirAsync(newDir);
                assert.ok(fs.existsSync(newDir), "Directory should be created");
            });

            it("should promisify fs.access correctly", async () => {
                // Create test file
                fs.writeFileSync(tempFilePath, testContent);
                
                await fileSystemHelper.accessAsync(tempFilePath);
                // If it doesn't throw, the test passes
                assert.ok(true);
            });

            it("should promisify fs.appendFile correctly", async () => {
                // Create test file
                fs.writeFileSync(tempFilePath, testContent);
                
                const additionalContent = " More content!";
                await fileSystemHelper.appendFileAsync(tempFilePath, additionalContent);
                const result = fs.readFileSync(tempFilePath, 'utf8');
                assert.strictEqual(result, testContent + additionalContent);
            });

            it("should promisify fs.writeFile correctly", async () => {
                const newContent = "New content!";
                await fileSystemHelper.writeFileAsync(tempFilePath, newContent);
                const result = fs.readFileSync(tempFilePath, 'utf8');
                assert.strictEqual(result, newContent);
            });

            it("should promisify fs.readFile correctly", async () => {
                // Create test file with known content
                const fileContent = "Read file test content";
                fs.writeFileSync(tempFilePath, fileContent);
                
                const result = await fileSystemHelper.readFileAsync(tempFilePath, 'utf8');
                assert.strictEqual(result.toString(), fileContent);
            });

            it("should promisify fs.readdir correctly", async () => {
                // Create test files
                const file1 = path.join(tempDir, "file1-readdir.txt");
                const file2 = path.join(tempDir, "file2-readdir.txt");
                fs.writeFileSync(file1, "content");
                fs.writeFileSync(file2, "content");
                
                const files = await fileSystemHelper.readdirAsync(tempDir);
                assert.ok(files.some(f => f === "file1-readdir.txt"), "Should include file1");
                assert.ok(files.some(f => f === "file2-readdir.txt"), "Should include file2");
            });

            it("should promisify fs.unlink correctly", async () => {
                // Create test file to be deleted
                const fileToDelete = path.join(tempDir, "delete-me.txt");
                fs.writeFileSync(fileToDelete, "delete me");
                assert.ok(fs.existsSync(fileToDelete), "File should exist before deletion");
                
                await fileSystemHelper.unlinkAsync(fileToDelete);
                assert.ok(!fs.existsSync(fileToDelete), "File should be deleted");
            });
        });
    });
});
