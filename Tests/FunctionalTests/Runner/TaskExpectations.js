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
    "MongoInsertMany": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "insert" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoFind": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "find" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoUpdateOne": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "update" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoCreateIndex": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "createIndexes" &&
                telemetry.data.baseData.data === "createIndexes" &&
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
    ),
    "BunyanFatal": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test fatal" &&
            telemetry.data.baseData.severityLevel === 4;
        }
    ),
    "BunyanError": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test error" &&
            telemetry.data.baseData.severityLevel === 3;
        }
    ),
    "BunyanWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test warn" &&
            telemetry.data.baseData.severityLevel === 2
        }
    ),
    "BunyanInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test info" &&
            telemetry.data.baseData.severityLevel === 1
        }
    ),
    "BunyanDebug": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test debug" &&
            telemetry.data.baseData.severityLevel === 0;
        }
    ),
    "BunyanTrace": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test trace" &&
            telemetry.data.baseData.severityLevel === 0;
        }
    ),
    "ConsoleError": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.error" &&
            telemetry.data.baseData.severityLevel === 2;
        }
    ),
    "ConsoleWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.warn" &&
            telemetry.data.baseData.severityLevel === 2;
        }
    ),
    "ConsoleInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.info" &&
            telemetry.data.baseData.severityLevel === 1;
        }
    ),
    "ConsoleLog": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.log" &&
            telemetry.data.baseData.severityLevel === 1;
        }
    ),
    "ConsoleAssert": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message.indexOf("AssertionError: Test console.assert") === 0 &&
            telemetry.data.baseData.severityLevel === 2;
        }
    ),
    "MySQLQuery": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "SELECT * FROM 'test_table'" &&
            telemetry.data.baseData.data === "SELECT * FROM 'test_table'" &&
            telemetry.data.baseData.target.indexOf(":3306") > -1 &&
            telemetry.data.baseData.type == "mysql";
        }
    ),
    "RedisSet": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "set" &&
            telemetry.data.baseData.data === "set" &&
            telemetry.data.baseData.target.indexOf(":6379") > -1 &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisSet2": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "set" &&
            telemetry.data.baseData.data === "set" &&
            telemetry.data.baseData.target.indexOf(":6379") > -1 &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHset": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "hset" &&
            telemetry.data.baseData.data === "hset" &&
            telemetry.data.baseData.target.indexOf(":6379") > -1 &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHkeys": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "hkeys" &&
            telemetry.data.baseData.data === "hkeys" &&
            telemetry.data.baseData.target.indexOf(":6379") > -1 &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHincrby": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "hincrby" &&
            telemetry.data.baseData.data === "hincrby" &&
            telemetry.data.baseData.target.indexOf(":6379") > -1 &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "WinstonError": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonVerbose": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonDebug": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonSilly": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonError2": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonWarn2": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    ),
    "WinstonInfo2": outputContract(
        "MessageData",
        (telemetry) => {
            return false;
        }
    )
}