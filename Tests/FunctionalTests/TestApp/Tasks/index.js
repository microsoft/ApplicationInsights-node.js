var AISDK = require("./AISDK");
var Mongo = require("./Mongo");
var MySQL = require("./MySQL");
var Bunyan = require("./Bunyan");
var Winston = require("./Winston");
var Redis = require("./Redis");
var Utils = require("./Utils");
var Postgres = require("./Postgres");
var AzureSDK = require("./AzureSDK");

module.exports = {
    HttpGet: require("./HttpGet"),
    MongoInsert: Mongo.insert,
    MongoInsertMany: Mongo.insertMany,
    MongoFind: Mongo.find,
    MongoUpdateOne: Mongo.updateOne,
    MongoCreateIndex: Mongo.createIndex,
    BunyanFatal: Bunyan.fatal,
    BunyanError: Bunyan.error,
    BunyanWarn: Bunyan.warn,
    BunyanInfo: Bunyan.info,
    BunyanDebug: Bunyan.debug,
    BunyanTrace: Bunyan.trace,
    ConsoleError: Utils.consoleError,
    ConsoleWarn: Utils.consoleWarn,
    ConsoleInfo: Utils.consoleInfo,
    ConsoleLog: Utils.consoleLog,
    ConsoleAssert: Utils.consoleAssert,
    MySQLQuery: MySQL.query,
    RedisGet: Redis.get,
    RedisSet: Redis.set,
    RedisSet2: Redis.set2,
    RedisHset: Redis.hset,
    RedisHkeys: Redis.hkeys,
    RedisHincrby: Redis.hincrby,
    WinstonError: Winston.error,
    WinstonWarn: Winston.warn,
    WinstonInfo: Winston.info,
    WinstonVerbose: Winston.verbose,
    WinstonDebug: Winston.debug,
    WinstonSilly: Winston.silly,
    WinstonError2: Winston.error2,
    WinstonWarn2: Winston.warn2,
    WinstonInfo2: Winston.info2,
    PostgresQuery: Postgres.query,
    AITrackDep: AISDK.trackDependency,
    AITrackTrace: AISDK.trackTrace,
    AITrackExc: AISDK.trackException,
    Timeout: Utils.timeout,
    ThrowError: Utils.throwError
}

// Run azure sdk tests for nodejs 8+ (but not 8.0.0)
var version = process.versions.node.split(".");
if (parseInt(version[0]) > 8 || (parseInt(version[0]) === 8 && (parseInt(version[1]) > 0 || parseInt(version[2]) > 0))) {
    module.exports = {
        ...module.exports,
        AzureSdkCreate: AzureSDK.createContainer,
        AzureSdkDelete: AzureSDK.deleteContainer,
    }
}
