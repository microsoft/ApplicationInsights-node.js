var Config = require("../Config");
var pg = require('pg');

var ready = false;
var client = null;

function connect() {
    client = new pg.Pool({connectionString: Config.PostgresConnectionString});
    
    // Test the connection and create table
    client.query(`
    CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL,
    data varchar(100) NOT NULL default '',
    PRIMARY KEY  (id)
    );`, (err) => {
        if (err) {
            console.error('PostgreSQL connection/table creation failed:', err);
            setTimeout(connect, 1000);
            return;
        }
        ready = true;
        console.log('PostgreSQL connection established and table created');
    });
}
connect();

function query(callback) {
    if (!ready) {
        setTimeout(() => query(callback), 500);
        return;
    }

    client.query(`SELECT * FROM test_table`, (err, result) => {
        if (err) {
            console.error('PostgreSQL query error:', err);
        }
        callback();
    });
}


module.exports = {
    query: query
}