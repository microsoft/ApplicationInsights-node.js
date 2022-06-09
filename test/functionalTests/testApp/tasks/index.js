var Mongo = require("./mongo");
var MySQL = require("./mySQL");
var Bunyan = require("./bunyan");
var Winston = require("./winston");
var Redis = require("./redis");
var Utils = require("./utils");
var Postgres = require("./postgres");
var AzureSdkStorage = require("./azureSDKStorage");
var AzureSdkEventHubs = require("./azureSdkEventHubs");

module.exports = {
    HttpGet: require("./httpGet"),
    AzureSdkEventHubsSend: AzureSdkEventHubs.sendMessage,
    AzureSdkCreate: AzureSdkStorage.createContainer,
    AzureSdkDelete: AzureSdkStorage.deleteContainer,
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
    Timeout: Utils.timeout,
    ThrowError: Utils.throwError
}