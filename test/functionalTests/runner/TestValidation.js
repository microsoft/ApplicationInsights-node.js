var Utils } from "./Utils");
var TaskExpectations } from "./TaskExpectations");

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
        const promise = silent ? Promise.resolve() : Utils.Logger.getInstance().enterSubunit("Validating test " + test.path + "...");
        let operationId;
        return promise
            .then(() => {
                if (!correlationId) {
                    // Find request telemetry
                    const requestTelemetry = this._findRequestMatchingPath(test.path);
                    if (!requestTelemetry) {
                        Utils.Logger.getInstance().error("FAILED EXPECTATION - Could not find request telemetry for test!");
                        return false;
                    } else if (!requestTelemetry.tags["ai.operation.id"]) {
                        Utils.Logger.getInstance().error("FAILED EXPECTATION - Could not find operation id in request telemetry!");
                        return false;
                    }

                    correlationId = requestTelemetry.data.baseData.id;
                    operationId = requestTelemetry.tags["ai.operation.id"];
                } else if (!operationId) {
                    operationId = correlationId;
                    const reqTel = this.ingestion.correlatedTelemetry[correlationId];
                    correlationId = reqTel[reqTel.length - 1].data.baseData.id;
                }

                // Work on a copy of the telemetry set
                const dataSet = this.ingestion.correlatedTelemetry[operationId].slice(0);
                let hadFailed = false;

                // Helper fn for validator that runs on all telemetry items
                const baseValidator = (item) => {
                    return item.tags['ai.application.ver'] === "1.0.0" && // version of TestApp
                        item.tags['ai.internal.sdkVersion'].indexOf("node:") === 0; // sdk should always report a version starting with "node:"
                };

                // Helper fn to find item in the datset
                const findItem = (correlationId, type, fn, stepName, childContract) => {
                    const _correlationId = correlationId;
                    if (!type) return true;
                    for (var i = 0; i<dataSet.length; i++) {
                        var item = dataSet[i];
                        try {
                            if (item.data.baseType === type && item.tags['ai.operation.parentId'] === (_correlationId) && baseValidator(item) && fn(item)) {
                                // Remove this item from the dataset so we don't find it twice
                                // The test is successful if we find all items we seek out and
                                // no extras remain
                                dataSet.splice(i, 1);
                                if (childContract) {
                                    return findItem(item.data.baseData.id, childContract.expectedTelemetryType, childContract.telemetryVerifier, stepName, childContract.childContract);
                                }
                                return true;
                            }
                        } catch (e) { }
                    }
                    const telemetry = this.ingestion.telemetry;
                    const correlTelemetry = this.ingestion.correlatedTelemetry;
                    Utils.Logger.getInstance().error("FAILED EXPECTATION - Could not find expected "+type+" child telemetry for rule "+stepName+"!");
                    return false;
                };

                // Find all expected items
                test.steps.forEach((step)=>{
                    const expectation = TaskExpectations[step];
                    const success = findItem(correlationId, expectation.expectedTelemetryType, expectation.telemetryVerifier, step, expectation.childContract);

                    if (!success) {
                        hadFailed = true;
                    }
                });

                // Did we find all of the items in the data set?
                if (dataSet.length > 1){
                    Utils.Logger.getInstance().error("FAILED EXPECTATION - Unexpected child telemetry item(s)!");
                    Utils.Logger.getInstance().error(JSON.stringify(dataSet, null, 2));
                    hadFailed = true;
                }

                // Report test status
                if (!silent) {
                    if (hadFailed) {
                        Utils.Logger.getInstance().error("Test FAILED!");
                    } else {
                        Utils.Logger.getInstance().success("Test PASSED!");
                    }
                }

                return !hadFailed;
            })
            .then((success) => { !silent && Utils.Logger.getInstance().exitSubunit(); return success; });
    }

    validatePerfCounters(perfTypes, expectedEach) {
        let success = true;
        return Utils.Logger.getInstance().enterSubunit("Validating performance counters...")
            .then(() => {
                Utils.Logger.getInstance().info("Expecting "+ expectedEach + " instance(s) each of all " + perfTypes.length + " performance counters");
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
                        Utils.Logger.getInstance().error("FAILED EXPECTATION - " + metricType + " appeared " + count + "times!");
                        success = false;
                    }
                });

                // Report test status
                if (success) {
                    Utils.Logger.getInstance().success("Test PASSED!");
                } else {
                    Utils.Logger.getInstance().error("Test FAILED!");
                }

                return success;
            })
            .then((success) => { Utils.Logger.getInstance().exitSubunit(); return success; });
    }
}
