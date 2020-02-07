import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export interface StatusContract {
    AgentInitializedSuccessfully: boolean;
    Reason?: string;
    SDKPresent: boolean;
    AppType: string;
    MachineName: string;
    PID: string;
    SdkVersion: string;
    Ikey: string;
}

const _APP_TYPE = "node.js";
const _HOME_DIR: string = os.homedir ? os.homedir() :( process.env[(process.platform == "win32") ? "USERPROFILE" : "HOME"]);
const _FILE_PATH = `${_HOME_DIR}/LogFiles/ApplicationInsights/status/`;
const _FILE_NAME = `status_${os.hostname()}_${process.pid}.json`;
export const FULL_PATH = _FILE_PATH + _FILE_NAME;

function readPackageVersion() {
    let packageJsonPath = path.resolve(__dirname, "../package.json");
    try {
        let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        if (packageJson && typeof packageJson.version === "string") {
            return packageJson.version;
        }
    } catch (e) {}
    return "unknown";
}

/**
 * Zero dependencies: recursive mkdir
 */
function mkDirByPathSync(targetDir: string, { isRelativeToScript = false } = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : "";
    const baseDir = isRelativeToScript ? __dirname : ".";

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            // Don"t try recreate homedir
            if (curDir.length > _HOME_DIR.length) {
                fs.mkdirSync(curDir);
            }
        } catch (err) {
            if (err.code === "EEXIST") { // curDir already exists!
            return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === "ENOENT") { // Throw the original parentDir error on curDir `ENOENT` failure.
            throw new Error(`EACCES: permission denied, mkdir "${parentDir}"`);
            }

            const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
            throw err; // Throw if it"s just the last created dir.
            }
        }
        return curDir;

    }, initDir);
}

export function isNodeVersionCompatible() {
  const majVer = process.versions.node.split(".")[0];
  return parseInt(majVer) >= 1;
}

export const DEFAULT_STATUS: StatusContract = {
    AgentInitializedSuccessfully: false,
    SDKPresent: false,
    Ikey: null,
    AppType: _APP_TYPE,
    SdkVersion: readPackageVersion(),
    MachineName: os.hostname(),
    PID: String(process.pid)
}

export function makeStatusDirs(filepath = _FILE_PATH) {
    try {
        return mkDirByPathSync(filepath.replace(/\\/g, path.sep).replace(/\//g, path.sep));
    } catch (e) {
        console.error("Error creating Application Insights status folder", e);
    }
}

export function writeFile(data: StatusContract, cb?: Function) {
    fs.open(FULL_PATH, "w", (err, fid) => {
        if (err) return;
        fs.writeFile(FULL_PATH, JSON.stringify(data, null, 2), { encoding: "utf8" }, (err) => {
            if (err) {
                console.error("Error writing Application Insights status file", err);
            } else if (cb && typeof cb === "function") {
                cb(err);
            }
        });
    });
}

export function addCloseHandler() {
    process.on("exit", () => { try {
        fs.unlinkSync(FULL_PATH);
    } catch (err) { }});
}
