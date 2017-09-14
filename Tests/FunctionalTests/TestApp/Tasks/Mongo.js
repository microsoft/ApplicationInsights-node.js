var Config = require("../Config");
var mongo = require('mongodb').MongoClient;

var ready = false;
var db = null;

function connect() {
    mongo.connect(Config.MongoConnectionString, function(err, _db) {
        if (!err) {
            db = _db;
            ready = true;
        } else {
            setTimeout(connect, 100);
        }
    });
}
connect();

function insert(callback) {
    if (!ready && !err) {
        setTimeout(() => insert(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.insertMany([{a : 1}, {a : 2}, {a : 3}], function(err, result) {
        callback();
    });
}

module.exports = {
    insert: insert
}