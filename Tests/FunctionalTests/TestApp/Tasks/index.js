var AISDK = require("./AISDK");
var Mongo = require("./Mongo");
var Utils = require("./Utils");

module.exports = {
    HttpGet: require("./HttpGet"),
    MongoInsert: Mongo.insert,
    AITrackDep: AISDK.trackDependency,
    AITrackTrace: AISDK.trackTrace,
    AITrackExc: AISDK.trackException,
    Timeout: Utils.timeout,
    ThrowError: Utils.throwError
}