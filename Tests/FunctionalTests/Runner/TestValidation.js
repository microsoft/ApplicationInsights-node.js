var Utils = require("./Utils");
var TaskExpectations = require("./TaskExpectations");

module.exports.TestValidation = class TestValidation {
    constructor(ingestion) {
        this.ingestion = ingestion;
        this.countFailed = 0;
    }

    _findRequestMatchingPath(path) {
        const requestData = this.ingestion.telemetry["RequestData"];
        if (!requestData) {
            return null;
        }
        for (let i = 0; i < requestData.length; i++) {
            let telemetry = requestData[i];
            if (telemetry.data.baseData.name == "GET " + path) {
                return telemetry;
            }
        }
        return null;
    }

    validateTest(test, correlationId, silent) {
        const promise = silent ? Promise.resolve() : Utils.Logging.enterSubunit("Validating test " + test.path + "...");
        return promise
            .then(() => {
                if (!correlationId) {
                    // Find request telemetry
                    const requestTelemetry = this._findRequestMatchingPath(test.path);
                    if (!requestTelemetry) {
                        Utils.Logging.error("FAILED EXPECTATION - Could not find request telemetry for test!");
                        return false;
                    } else if (!requestTelemetry.tags["ai.operation.id"]) {
                        Utils.Logging.error("FAILED EXPECTATION - Could not find operation id in request telemetry!");
                        return false;
                    }

                    correlationId = requestTelemetry.tags["ai.operation.id"];
                }

                // Work on a copy of the telemetry set
                const dataSet = this.ingestion.correlatedTelemetry[correlationId].slice(0);
                let hadFailed = false;

                // Helper fn to find item in the datset
                const findItem = (type, fn) => {
                    if (!type) return true;
                    for (var i = 0; i<dataSet.length; i++) {
                        var item = dataSet[i];
                        if (item.data.baseType === type && fn(item)) {
                            // Remove this item from the dataset so we don't find it twice
                            // The test is successful if we find all items we seek out and
                            // no extras remain
                            dataSet.splice(i, 1);
                            return true;
                        }
                    }
                    const telemetry = this.ingestion.telemetry;
                    const correlTelemetry = this.ingestion.correlatedTelemetry;
                    Utils.Logging.error("FAILED EXPECTATION - Could not find expected "+type+" child telemetry!");
                    return false;
                }

                // Find all expected items
                test.steps.forEach((step)=>{
                    const expectation = TaskExpectations[step];
                    const success = findItem(expectation.expectedTelemetryType, expectation.telemetryVerifier);

                    if (!success) {
                        hadFailed = true;
                    }
                });

                // Did we find all of the items in the data set?
                if (dataSet.length > 1 ){
                    Utils.Logging.error("FAILED EXPECTATION - Unexpected child telemetry item(s)!");
                    hadFailed = true;
                }

                // Report test status
                if (!silent) {
                    if (hadFailed) {
                        Utils.Logging.error("Test FAILED!");
                    } else {
                        Utils.Logging.success("Test PASSED!");
                    }
                }

                return !hadFailed;
            })
            .then((success) => { !silent && Utils.Logging.exitSubunit(); return success; });
    }

    validatePerfCounters(perfTypes, expectedEach) {
        let success = true;
        return Utils.Logging.enterSubunit("Validating performance counters...")
            .then(() => {
                Utils.Logging.info("Expecting "+ expectedEach + " instance(s) each of all " + perfTypes.length + " performance counters");
                const metricTelemetry = this.ingestion.telemetry["MetricData"];
                perfTypes.forEach((metricType) => {
                    let count = 0;
                    if (metricTelemetry) {
                        for (let i = 0; i<metricTelemetry.length; i++) {
                            const telemetry = metricTelemetry[i];
                            if (telemetry && telemetry.data.baseData.metrics[0].name === metricType) {
                                count++;
                            }
                        }
                    }
                    if (count < expectedEach) {
                        Utils.Logging.error("FAILED EXPECTATION - " + metricType + " appeared " + count + "times!");
                        success = false;
                    }
                });
                
                // Report test status
                if (success) {
                    Utils.Logging.success("Test PASSED!");
                } else {
                    Utils.Logging.error("Test FAILED!");
                }

                return success;
            })
            .then((success) => { Utils.Logging.exitSubunit(); return success; });
    }
}


