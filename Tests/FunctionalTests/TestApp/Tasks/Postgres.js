var Config = require("../Config");
var pg = require('pg');

var ready = false;
var client = null;

function connect() {
    client = new pg.Pool({connectionString: Config.PostgresConnectionString});
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
        setTimeout(() => query(callback), 500);
        return;
    }

    client.query(`SELECT * FROM test_table`, (v, x) => {
        callback()
    });
}


module.exports = {
    query: query
}