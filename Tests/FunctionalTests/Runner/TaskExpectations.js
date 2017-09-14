// Keep these expecations in sync with what the tasks are in TestApp

/** 
 * expectedTelemetryType = EnvelopeType,
 * telemetryVerifier = fn to validate matching telemetry item
 */
var outputContract = (expectedTelemetryType, telemetryVerifier) => {
    return {
        expectedTelemetryType: expectedTelemetryType,
        telemetryVerifier: telemetryVerifier
    };
};

module.exports = {
    "HttpGet": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "GET /" &&
                telemetry.data.baseData.success === true;
        }
    ),
    "MongoInsert": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "insert" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "AITrackDep": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "Manual dependency" &&
            telemetry.data.baseData.success === true &&
            telemetry.data.baseData.type === "Manual" &&
            telemetry.data.baseData.duration === '00:00:00.200';
        }
    ),
    "AITrackTrace": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Manual track trace";
        }
    ),
    "AITrackExc": outputContract(
        "ExceptionData",
        (telemetry) => {
            return telemetry.data.baseData.exceptions[0].message === "Manual track error";
        }
    ),
    "Timeout": outputContract(
        null,
        null
    ),
    "ThrowError": outputContract(
        "ExceptionData",
        (telemetry) => {
            return telemetry.data.baseData.exceptions[0].message === "Native error";
        }
    )
}