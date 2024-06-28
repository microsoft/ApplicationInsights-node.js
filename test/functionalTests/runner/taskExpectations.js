// Keep these expecations in sync with what the tasks are in TestApp

/**
 * expectedTelemetryType = EnvelopeType,
 * telemetryVerifier = fn to validate matching telemetry item
 */
var outputContract = (expectedTelemetryType, telemetryVerifier, childContract) => {
    return {
        expectedTelemetryType: expectedTelemetryType,
        telemetryVerifier: telemetryVerifier,
        childContract: childContract
    };
};

module.exports = {
    "AzureSdkEventHubsSend": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "Azure.EventHubs.send"
                && telemetry.data.baseData.data === "sb://not-a-real-account.servicebus.windows.net/"
                && telemetry.data.baseData.type === "InProc"
                && telemetry.data.baseData.target === "not-a-real-account.servicebus.windows.net"
                && telemetry.data.baseData.resultCode !== ""
        }
    ),
    "AzureSdkCreate": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "Azure.Storage.Blob.ContainerClient-create";
            // TODO: should also have baseData.type === "InProc"
        },
        outputContract(
            "RemoteDependencyData",
            (telemetry) => {
                return telemetry.data.baseData.name === "PUT /newcontainer"
                && telemetry.data.baseData.data === "https://not-a-real-account.blob.core.windows.net/newcontainer?restype=container"
                && telemetry.data.baseData.type === "HTTP"
                && telemetry.data.baseData.target === "not-a-real-account.blob.core.windows.net"
                && telemetry.data.baseData.resultCode !== "";
            }
        )
    ),
    "AzureSdkDelete": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "Azure.Storage.Blob.ContainerClient-delete";
        },
        outputContract(
            "RemoteDependencyData",
            (telemetry) => {
                return telemetry.data.baseData.name === "DELETE /newcontainer"
                && telemetry.data.baseData.data === "https://not-a-real-account.blob.core.windows.net/newcontainer?restype=container"
                && telemetry.data.baseData.type === "HTTP"
                && telemetry.data.baseData.target === "not-a-real-account.blob.core.windows.net"
                && telemetry.data.baseData.resultCode !== "";
            }
        )
    ),
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
            return telemetry.data.baseData.name === "mongodb.insert" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "localhost|testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoInsertMany": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "mongodb.insert" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "localhost|testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoFind": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "mongodb.find" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.data === "{\"testrecord\":\"?\"}" &&
                telemetry.data.baseData.target === "localhost|testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoUpdateOne": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "mongodb.update" &&
                telemetry.data.baseData.success === true &&
                telemetry.data.baseData.target === "localhost|testapp" &&
                telemetry.data.baseData.type === "mongodb";
        }
    ),
    "MongoCreateIndex": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "mongodb.createIndexes" &&
                telemetry.data.baseData.data === "{\"createIndexes\":\"?\",\"indexes\":[{\"name\":\"?\",\"key\":{\"testrecord\":\"?\"}}]}" &&
                telemetry.data.baseData.target === "localhost|testapp" &&
                telemetry.data.baseData.type === "mongodb";
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
            telemetry.data.baseData.severityLevel === "Critical";
        }
    ),
    "BunyanError": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test error" &&
            telemetry.data.baseData.severityLevel === "Error";
        }
    ),
    "BunyanWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test warn" &&
            telemetry.data.baseData.severityLevel === "Warning"
        }
    ),
    "BunyanInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return JSON.parse(telemetry.data.baseData.message).msg === "test info" &&
            telemetry.data.baseData.severityLevel === "Information"
        }
    ),
    "BunyanDebug": outputContract(
        "MessageData",
        (telemetry) => {
            return  JSON.parse(telemetry.data.baseData.message).msg === "test debug" &&
            telemetry.data.baseData.severityLevel === "Verbose";
        }
    ),
    "BunyanTrace": outputContract(
        "MessageData",
        (telemetry) => {
            return  JSON.parse(telemetry.data.baseData.message).msg === "test trace" &&
            telemetry.data.baseData.severityLevel === "Verbose";
        }
    ),
    "ConsoleError": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.error" &&
            telemetry.data.baseData.severityLevel === "Warning";
        }
    ),
    "ConsoleWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.warn" &&
            telemetry.data.baseData.severityLevel === "Warning";
        }
    ),
    "ConsoleInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.info" &&
            telemetry.data.baseData.severityLevel === "Information";
        }
    ),
    "ConsoleLog": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "Test console.log" &&
            telemetry.data.baseData.severityLevel === "Information";
        }
    ),
    "MySQLQuery": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "SELECT" &&
            telemetry.data.baseData.data === "SELECT * FROM 'test_table'" &&
            telemetry.data.baseData.target ==="localhost|testdb" &&
            telemetry.data.baseData.type == "mysql";
        }
    ),
    "RedisGet": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "redis-get" &&
            telemetry.data.baseData.data === "get testkey" &&
            telemetry.data.baseData.target === "localhost"  &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisSet": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "redis-set" &&
            telemetry.data.baseData.data === "set testkey [1 other arguments]" &&
            telemetry.data.baseData.target === "localhost"  &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHset": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "redis-hset" &&
            telemetry.data.baseData.data === "hset testhash testfield [1 other arguments]" &&
            telemetry.data.baseData.target === "localhost"  &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHkeys": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "redis-hkeys" &&
            telemetry.data.baseData.data === "hkeys [1 other arguments]" &&
            telemetry.data.baseData.target === "localhost"  &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "RedisHincrby": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "redis-hincrby" &&
            telemetry.data.baseData.data === "hincrby testhash testfield 1" &&
            telemetry.data.baseData.target === "localhost"  &&
            telemetry.data.baseData.type === "redis";
        }
    ),
    "WinstonError": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test error" &&
            telemetry.data.baseData.severityLevel === "Error";
        }
    ),
    "WinstonWarn": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test warn" &&
            telemetry.data.baseData.severityLevel === "Warning";
        }
    ),
    "WinstonInfo": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test info" &&
            telemetry.data.baseData.severityLevel === "Information";
        }
    ),
    "WinstonVerbose": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test verbose" &&
            telemetry.data.baseData.severityLevel === "Verbose";
        }
    ),
    "WinstonDebug": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test debug" &&
            telemetry.data.baseData.severityLevel === "Verbose";
        }
    ),
    "WinstonSilly": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test silly" &&
            telemetry.data.baseData.severityLevel === "Verbose";
        }
    ),
    "WinstonError2": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test error" &&
            telemetry.data.baseData.severityLevel === "Error";
        }
    ),
    "WinstonWarn2": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test warn" &&
            telemetry.data.baseData.severityLevel === "Warning";
        }
    ),
    "WinstonInfo2": outputContract(
        "MessageData",
        (telemetry) => {
            return telemetry.data.baseData.message === "test info" &&
            telemetry.data.baseData.severityLevel === "Information";
        }
    ),
    "PostgresQuery": outputContract(
        "RemoteDependencyData",
        (telemetry) => {
            return telemetry.data.baseData.name === "pg.query:SELECT" &&
            telemetry.data.baseData.data === "SELECT NOW()" &&
            telemetry.data.baseData.target === "localhost|postgres" &&
            telemetry.data.baseData.type == "postgresql";
        }
    )
}
