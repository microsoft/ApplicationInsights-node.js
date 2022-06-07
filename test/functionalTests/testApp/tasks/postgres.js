var Config = require("../config");
var pg = require('pg');

var ready = false;
var client = null;

function connect() {
    client = new pg.Pool({ connectionString: Config.PostgresConnectionString });
    client.connect((err) => {
        if (err) {
            setTimeout(connect, 500);
            return;
        }
        client.query(`
        CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL,
        data varchar(100) NOT NULL default '',
        PRIMARY KEY  (id)
        );`, () => {
            ready = true;
        });
    });
}
connect();

function query(callback) {
    if (!ready) {
        setTimeout(() => query(callback), 1500);
        return;
    }

    client.query(`SELECT * FROM test_table`, (err, ret) => {
        if (err) {
            console.log("Failed to query postgres." + err);
        }
        callback()
    });
}


module.exports = {
    query: query
}