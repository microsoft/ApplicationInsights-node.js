// Helper script to orchestrate starting Functional Tests
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
let perfMode = false;

function help() {
    console.log(
        "Usage: node RunFunctionalTests.js [PathToAISDK]\n\n"+
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


function runAsync(cmd, workingDir) {
    const proc = childProcess.spawn(cmd, [], {
        shell: true,
        cwd: workingDir && path.resolve(__dirname, workingDir)
    });
    return proc;
}

function startDocker() {
    const tasks =  [
        run("docker run -d -p 27017:27017 --name ainjsmongo --health-cmd 'mongosh --eval \"db.stats()\" || mongo --eval \"db.stats()\"' --health-interval=10s --health-timeout=5s --health-retries=5 mongo:4.4"),
        run("docker run -e MYSQL_ROOT_PASSWORD=dummypw -e MYSQL_DATABASE=testdb -d -p 33060:3306 --name ainjsmysql --health-cmd 'mysqladmin ping -h localhost -u root -pdummypw' --health-interval=10s --health-timeout=5s --health-retries=5 mysql:5.7"),
        run("docker run -d -p 63790:6379 --name ainjsredis --health-cmd 'redis-cli ping' --health-interval=10s --health-timeout=5s --health-retries=5 redis:6-alpine"),
        run("docker run -e POSTGRES_PASSWORD=dummypw -d -p 54320:5432 --name ainjspostgres --health-cmd 'pg_isready -U postgres -d postgres' --health-interval=10s --health-timeout=10s --health-retries=10 postgres:13-alpine")
    ];

    for(let i = 0; i < tasks.length; i++) {
        if (tasks[i].code !== 0) {
            console.error("Failed to start container!");
            console.error(tasks[i].output);
            return false;
        }
    }
    
    return true;
}

function waitForContainers() {
    console.log("Waiting for containers to initialize...");
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("Waiting for container health checks to pass...");
            
            const maxRetries = 60; // 60 attempts, 2 seconds each = 120 seconds max
            let retries = 0;
            
            const checkHealth = () => {
                const healthCheck = run("docker ps --filter 'name=ainjs' --format 'table {{.Names}}\\t{{.Status}}'");
                if (healthCheck.code === 0) {
                    console.log("Container status:");
                    console.log(healthCheck.output);
                    
                    // Check if all containers are healthy (not just running)
                    const output = healthCheck.output;
                    const hasUnhealthy = output.includes("(health: starting)") || 
                                       output.includes("(unhealthy)") || 
                                       !output.includes("(healthy)");
                    
                    if (!hasUnhealthy) {
                        console.log("All containers are healthy");
                        resolve();
                        return;
                    } else if (retries >= maxRetries) {
                        console.log("Max retries reached, checking individual containers...");
                        // Try direct health checks as fallback
                        const directChecks = [
                            run("docker exec ainjspostgres pg_isready -U postgres -d postgres"),
                            run("docker exec ainjsmysql mysqladmin ping -h localhost -u root -pdummypw"),
                            run("docker exec ainjsredis redis-cli ping"),
                            run("docker exec ainjsmongo mongosh --eval 'db.runCommand(\"ping\")' || docker exec ainjsmongo mongo --eval 'db.runCommand(\"ping\")'")
                        ];
                        
                        let allHealthy = true;
                        directChecks.forEach((check, index) => {
                            if (check.code !== 0) {
                                console.log(`Direct health check failed for container ${index}`);
                                allHealthy = false;
                            }
                        });
                        
                        if (allHealthy) {
                            console.log("Direct health checks passed");
                        } else {
                            console.log("Some direct health checks failed, but proceeding anyway");
                        }
                        resolve();
                        return;
                    }
                }
                
                retries++;
                if (retries < maxRetries) {
                    console.log(`Health check attempt ${retries}/${maxRetries}...`);
                    setTimeout(checkHealth, 2000);
                } else {
                    console.log("Max retries reached, proceeding anyway");
                    resolve();
                }
            };
            
            checkHealth();
        }, 5000); // Initial 5 second wait
    });
}

function cleanUpDocker() {
    run("docker stop ainjsmongo");
    run("docker stop ainjsmysql");
    run("docker stop ainjsredis");
    run("docker stop ainjspostgres");

    run("docker rm ainjsmongo");
    run("docker rm ainjsmysql");
    run("docker rm ainjsredis");
    run("docker rm ainjspostgres");
}

async function main() {
    // Find the SDK TGZ archive
    let path = null;
    if (process.argv.length > 2) {
        path = process.argv[2]
        if (path === "-h" || path === "--help") {
            return help();
        }
        if (process.argv.indexOf("-perfmode") !== -1) {
            perfMode = true;
        }
    }
    if (path === null || path.indexOf("-") === 0) {
        path = findDefaultPath();
    }
    if (path === null) {
        console.error("Could not find path for AI SDK!");
        help();
        return 1;
    }
    console.log("Using SDK package at " + path);

    // Validate docker is present on the box
    if (run("docker --version").code !== 0) {
        console.error("Docker not installed!");
        return 1;
    }

    // Prepare docker
    console.log("Spinning up Docker containers...");
    cleanUpDocker(); // Just in case the script failed in a previous run
    if (!startDocker()) {
        console.error("Could not spin up containers!");
        return 1;
    }
    
    // Wait for containers to be ready
    await waitForContainers();

    // Prepare runner and testapp
    console.log("Installing Runner and TestApp dependencies...");
    if (run("npm install", "./Runner").code !== 0 || run("npm install", "./TestApp").code !== 0) {
        console.error("Could not install dependencies!");
        return 1;
    }
    console.log("Installing " + path);
    run("npm uninstall applicationinsights", "./TestApp");
    if (run("npm install --no-save " + path, "./TestApp").code !== 0) {
        console.error("Could not install SDK!");
        return 1;
    }

    // Run tests
    console.log("Running functional tests...");
    console.log("=======================\n");
    
    // Start TestApp with output visible for debugging
    console.log("Starting TestApp...");
    const testApp = runAsync("node --use_strict Main.js", "./TestApp");
    
    // Add event listeners to capture TestApp output
    testApp.stdout.on('data', (data) => {
        console.log('TestApp:', data.toString().trim());
    });
    
    testApp.stderr.on('data', (data) => {
        console.error('TestApp Error:', data.toString().trim());
    });
    
    // Give TestApp time to start up
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const runnerStatus = runLive("node --use_strict Main.js" + (perfMode ? " -perfmode": ""), "./Runner").code;
    console.log("\n=======================");

    // Clean up
    console.log("Killing TestApp...");
    testApp.kill();

    console.log("Spinning down and deleting Docker containers...");
    cleanUpDocker();

    return runnerStatus;
}


main().then(code => {
    process.exit(code);
}).catch(error => {
    console.error("Error in main function:", error);
    process.exit(1);
});
