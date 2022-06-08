var Config = require("../config");
var pg = require('pg');

var ready = false;
var client = null;

function connect() {
    if (!client) {
        client = new pg.Pool({ connectionString: Config.PostgresConnectionString });
        client.connect((err) => {
            if (!err) {
                ready = true;
            }
        });
    }
}

function query(callback) {
    connect();
    if (!ready) {
        setTimeout(() => query(callback), 1500);
        return;
    }

    client.query("SELECT NOW()", (err, ret) => {
        if (err) {
            console.log("Failed to query postgres." + err);
        }
        callback()
    });
}


module.exports = {
    query: query
}