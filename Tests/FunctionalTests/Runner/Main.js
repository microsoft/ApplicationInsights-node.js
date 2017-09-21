var fs = require('fs');
var os = require('os');

var Config = require("./Config");
var Ingestion = new (require("./Ingestion"))();
var TestSequence = require("./TestSequence.json");
var Utils = require("./Utils");
var AppConnector = require("./AppConnector");

var successfulRun = true;
let startTime = null;

let perfMode = process.argv.indexOf("-perfmode") !== -1;

// Helpers
const runTestSequence = (index) => {
    const testIndex = index || 0;
    if (testIndex == 0) {
        Utils.Logging.enterSubunit("Triggering runs for each test sequence");
    }
    if (TestSequence.length == testIndex) {
        const waitTime = Config.WaitTime;
        Utils.Logging.exitSubunit();
        Utils.Logging.info("Waiting " + waitTime + "ms for telemetry...");
        return new Promise((resolve, reject) => setTimeout(resolve, waitTime));
    } else {
        // Underscores indicate internal sequences
        if (TestSequence[testIndex].path.indexOf("/_") === 0) {
            return runTestSequence(testIndex + 1);
        }
        return AppConnector.runTest(TestSequence[testIndex].path).then(() => runTestSequence(testIndex + 1));
    }
};
const validateTestSequence = (index) => {
    const testIndex = index || 0;
    if (testIndex == 0) {
        Utils.Logging.enterSubunit("Validating telemetry reported for all steps of each test sequence");
    }
    if (TestSequence.length == testIndex) {
       Utils.Logging.exitSubunit();
       return Promise.resolve(true);
    } else {
        // Underscores indicate internal sequences
        if (TestSequence[testIndex].path.indexOf("/_") === 0) {
            return validateTestSequence(testIndex + 1);
        }
        return Ingestion.testValidator.validateTest(TestSequence[testIndex]).then((success)=>{
            if (!success) {
                successfulRun = false;
            }
            return validateTestSequence(testIndex + 1);
        });
    }
};
const runAndValidateLongTest = () => {
    Utils.Logging.enterSubunit("Performing parallel requests test sequence for " + Config.StressTestTime + "ms");
    
    // Find stress test
    let testSequence = null;
    for (let i = 0; i < TestSequence.length; i++) {
        let sequence = TestSequence[i];
        if (sequence.path === "/_longRunTest") {
            testSequence = sequence;
            break;
        }
    }

    // Don't continue if we don't have one
    if (!testSequence) {
        Utils.Logging.info("No parallel test sequence defined. Skipping.");
        Utils.Logging.exitSubunit();
        return Promise.resolve(false);
    } else if (!successfulRun) {
        Utils.Logging.info("Standard tests failed. Skipping.");
        Utils.Logging.exitSubunit();
        return Promise.resolve(false);
    }

    const startStressTime = new Date();
    let attemptCounter = 0;

    const stressLoop = () => {
        const elapsed = new Date() - startStressTime;
        if (elapsed > Config.StressTestTime) {
            return Promise.resolve(true);
        }

        attemptCounter++;
        return AppConnector.runTest(testSequence.path, true).then(stressLoop);
    };

    const waitForTelemetry = () => {
        const waitTime = Config.WaitTime;
        Utils.Logging.info("Waiting " + waitTime + "ms for telemetry...");
        return new Promise((resolve, reject) => setTimeout(resolve, waitTime));
    }

    // Run 10 stress loops in parallel
    // This is for higher load and to test correlation under non-sequential tasks
    const stressLoops = [stressLoop(),stressLoop(),stressLoop(),stressLoop(),stressLoop(),
        stressLoop(),stressLoop(),stressLoop(),stressLoop(),stressLoop()];    

    return Promise.all(stressLoops).then((success) => {
        if (!success) {
            throw new Error("Could not complete stress test!");
            return Promise.resolve(false);
        }
    }).then(waitForTelemetry).then(()=>{
        Utils.Logging.enterSubunit("Expecting " + attemptCounter + " requests and all associated nested telemetry");

        // Get all request item operation ids
        const stressTelemetry = Ingestion.telemetry["RequestData"].filter((v) => {
            return v.data.baseData.name == "GET " + testSequence.path;
        });
        const distinctOpIds = Array.from(new Set(stressTelemetry.map(item => item.tags["ai.operation.id"])));

        // Validate number of operations
        if (distinctOpIds.length != attemptCounter) {
            Utils.Logging.error("FAILED EXPECTATION - " + distinctOpIds.length + " distinct operations instead of " + attemptCounter + "!");
            successfulRun = false;
            Utils.Logging.exitSubunit();
            Utils.Logging.exitSubunit();
            return Promise.resolve(false);
        }

        const validationLoop = (i) => {
            if (i >= distinctOpIds.length) {
                Utils.Logging.success("Test PASSED!");
                return true;
            }
            return Ingestion.testValidator.validateTest(testSequence, distinctOpIds[i], true).then(res => {
                if (!res) {
                    successfulRun = false;
                    Utils.Logging.error("Test FAILED on item "+i+"!");
                    return false;
                } else {
                    return validationLoop(i + 1);
                }
            });
        }

        return validationLoop(0).then(()=>{
            Utils.Logging.exitSubunit();
            Utils.Logging.exitSubunit();
        });
    });
}
const validatePerfCounters = () => {
    const perfTypes = ["\\Processor(_Total)\\% Processor Time", 
        "\\Process(??APP_WIN32_PROC??)\\% Processor Time", 
        "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
        "\\Memory\\Available Bytes",
        "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
        "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time"
    ];
    const expectedEach = Math.floor((new Date() - startTime) / Config.PerfCounterFrequency);
    return Ingestion.testValidator.validatePerfCounters(perfTypes, expectedEach).then((success) => {
        if (!success) {
            successfulRun = false;
        }
        return success;
    });
};
const getCPU = () => {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for(let i = 0, len = cpus.length; i < len; i++) {
        let cpu = cpus[i];

        for(let type in cpu.times) {
            totalTick += cpu.times[type];
        }     
        
        totalIdle += cpu.times.idle;
    
        return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
    }
}


// Main runner
Ingestion.enable();
if (!perfMode) {
    AppConnector.startConnection(TestSequence)
        .then(() => { startTime = new Date(); })
        .then(runTestSequence)
        .then(validateTestSequence)
        .then(runAndValidateLongTest)
        .then(validatePerfCounters)
        .then(AppConnector.closeConnection)
        .then(() => {
            Ingestion.disable();
            Utils.Logging.info("Test run done!");

            if (successfulRun) {
                Utils.Logging.success("All tests PASSED!");
            } else {
                Utils.Logging.error("At least one test FAILED!");
            }
            process.exit(successfulRun ? 0: 1);
        })
        .catch((e) => {
            Utils.Logging.error("Error thrown!");
            Utils.Logging.error(e.stack || e);
            process.exit(1);
        });
} else {
    AppConnector.startConnection(TestSequence);
    let lastCPU = getCPU();
    setTimeout(()=>{
        let newCPU = getCPU();
        let idleDifference = endMeasure.idle - startMeasure.idle;
        let totalDifference = endMeasure.total - startMeasure.total;
        Utils.Logging.info("Telemetry Items: " + Ingestion.telemetryCount);
        Utils.Logging.info("CPU Usage: " + (100 - ~~(100 * idleDifference / totalDifference)) + "%");
        lastCPU = newCPU;
    }, 30 * 1000);
}