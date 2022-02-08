var Config } from "../Config");
var redis } from 'redis')

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
    client.hset("testhash", "testfield", 1, () => {
        callback();
    });
}

function hincrby(callback) {
    if (!ready) {
        setTimeout(() => hincrby(callback), 50);
        return;
    }
    client.hincrby("testhash", "testfield", 1, () => {
        callback();
    });
}

function hkeys(callback) {
    if (!ready) {
        setTimeout(() => hkeys(callback), 50);
        return;
    }
    client.hkeys("testhash", () => {
        callback();
    });
}

module.exports = {
    get: get,
    set: set,
    set2: set2,
    hset: hset,
    hkeys: hkeys,
    hincrby: hincrby
}