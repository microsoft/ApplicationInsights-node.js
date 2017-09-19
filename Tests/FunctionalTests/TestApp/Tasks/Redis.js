var Config = require("../Config");
var redis = require('redis')

var ready = false;
var client = null;

function connect() {
    client = redis.createClient(Config.RedisConnectionString);
    client.on("error", ()=>{
        setTimeout(connect, 100);
    });
    client.on("ready", ()=>{
        ready = true;
    });
}
connect();

function get(callback) {
    if (!ready) {
        setTimeout(() => get(callback), 50);
        return;
    }
    client.get("testkey", () => {
        callback();
    });
}

function set(callback) {
    if (!ready) {
        setTimeout(() => set(callback), 50);
        return;
    }
    client.set("testkey", "testval", () => {
        callback();
    });
}

function set2(callback) {
    if (!ready) {
        setTimeout(() => set2(callback), 50);
        return;
    }
    client.set(["testkey", "testval"], () => {
        callback();
    });
}

function hset(callback) {
    if (!ready) {
        setTimeout(() => hset(callback), 50);
        return;
    }
    client.hset("testkey", "testval", "testval", () => {
        callback();
    });
}

function hkeys(callback) {
    if (!ready) {
        setTimeout(() => hkeys(callback), 50);
        return;
    }
    client.hkeys("testkey", () => {
        callback();
    });
}

module.exports = {
    set: set,
    set2: set2,
    hset: hset,
    hkeys: hkeys
}