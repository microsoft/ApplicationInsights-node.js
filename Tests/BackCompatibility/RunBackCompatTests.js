const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function help() {
    console.log(
        "Usage: node RunBackCompatTests.js [PathToAISDK]\n\n"+
        "PathToAISDK must be an absolute path to a tgz archive"+
        " of the compiled AI SDK,\nor an NPM package reference "+
        "(eg. applicationinsights@0.22.0)\n\nA present AI SDK tgz "+
        "in the root repo directory will be used by default");
    return 0;
}

function findDefaultPath() {
    const rootDir = path.resolve(__dirname, "../../");
    const files = fs.readdirSync(rootDir);
    for(let i = 0; i < files.length; i++) {
        const file = path.join(rootDir, files[i]);
        const stat = fs.lstatSync(file);
        if (!stat.isDirectory()) {
            if (file.indexOf("applicationinsights") === rootDir.length + 1 &&
                file.indexOf(".tgz") === file.length - 4) {
                return path.resolve(file);
            }
        }
    }
    return null;
}

function run(cmd, workingDir) {
    const proc = childProcess.spawnSync(cmd, {
        shell: true,
        cwd: workingDir && path.resolve(__dirname, workingDir)
    });
    return {
        code: proc.status,
        output: proc.output.map(v => String.fromCharCode.apply(null, v)).join("")
    }
}

function runLive(cmd, workingDir) {
    const proc = childProcess.spawnSync(cmd, {
        shell: true,
        cwd: workingDir && path.resolve(__dirname, workingDir),
        stdio: 'inherit'
    });
    return {
        code: proc.status,
        output: proc.output.map(v => String.fromCharCode.apply(null, v)).join("")
    }
}

function main() {
    // Find the SDK TGZ archive
    let path = null;
    if (process.argv.length > 2) {
        path = process.argv[2]
        if (path === "-h" || path === "--help") {
            return help();
        }
    } else {
        path = findDefaultPath();
    }
    if (path === null) {
        console.error("Could not find path for AI SDK!");
        help();
        return 1;
    }
    console.log("Using SDK package at " + path);

    // OldTSC
    console.info("Testing compilation in app with TSC 4.0.0 and node 8 types...");
    run("npm uninstall applicationinsights", "./OldTSC");
    if (run("npm install", "./OldTSC").code !== 0) {
        console.error("Could not install OldTSC dependencies!")
        return 1;
    }
    if (run("npm install --no-save " + path, "./OldTSC").code !== 0) {
        console.error("Could not install SDK in OldTSC!");
        return 1;
    }
    if(runLive("npm run build", "./OldTSC").code !== 0) {
        console.error("Test FAILED!")
        return 1;
    }

    // Latest node types
    console.info("Testing compilation in app with TSC 4 and latest node types...");
    run("npm uninstall applicationinsights", "./Node10Types");
    if (run("npm install", "./Node10Types").code !== 0) {
        console.error("Could not install OldTSC dependencies!")
        return 1;
    }
    if (run("npm install --no-save " + path, "./Node10Types").code !== 0) {
        console.error("Could not install SDK in Node10Types!");
        return 1;
    }
    if(runLive("npm run build", "./Node10Types").code !== 0) {
        console.error("Test FAILED!")
        return 1;
    }
    

    return 0;
}


process.exit(main());