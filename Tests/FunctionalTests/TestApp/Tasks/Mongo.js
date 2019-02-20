var Config = require("../Config");
var mongo = require('mongodb').MongoClient;

var ready = false;
var db = null;

function connect() {
    mongo.connect(Config.MongoConnectionString, function(err, _client) {
        if (!err) {
            var _db = _client.db(Config.MongoDbName);
            var collection = _db.collection('testCollection');
            collection.insert({testrecord: true}, function(err, result) {
                db = _db;
                ready = true;
            });
        } else {
            setTimeout(connect, 100);
        }
    });
}
connect();

function insertMany(callback) {
    if (!ready) {
        setTimeout(() => insertMany(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.insertMany([{a : 1}, {a : 2}, {a : 3}], function(err, result) {
        callback();
    });
}

function insert(callback) {
    if (!ready) {
        setTimeout(() => insert(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.insert({a : 1}, function(err, result) {
        callback();
    });
}

function find(callback) {
    if (!ready) {
        setTimeout(() => find(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.find({testrecord: true}).toArray(function(err, result) {
        callback();
    });
}

function updateOne(callback) {
    if (!ready) {
        setTimeout(() => updateOne(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.updateOne({testrecord : true}, {$set: {updated: true}}, function(err, result) {
        callback();
    });
}

function createIndex(callback) {
    if (!ready) {
        setTimeout(() => createIndex(callback), 50);
        return;
    }
    var collection = db.collection('testCollection');
    collection.createIndex({testrecord : true}, null, function(err, result) {
        callback();
    });
}


module.exports = {
    insertMany: insertMany,
    insert: insert,
    find: find,
    updateOne: updateOne,
    createIndex: createIndex
}