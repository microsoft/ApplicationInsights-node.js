var Config = require("../Config");
var pg = require('pg');

var ready = false;
var client = null;
var connectionAttempts = 0;
var maxConnectionAttempts = 20;

function connect() {
    connectionAttempts++;
    console.log(`PostgreSQL connection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
    
    if (connectionAttempts > maxConnectionAttempts) {
        console.error('PostgreSQL connection failed after maximum attempts');
        return;
    }
    
    try {
        client = new pg.Pool({
            connectionString: Config.PostgresConnectionString,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 10000,
            max: 1
        });
        
        // Test the connection and create table
        client.query(`
        CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL,
        data varchar(100) NOT NULL default '',
        PRIMARY KEY  (id)
        );`, (err) => {
            if (err) {
                console.error('PostgreSQL connection/table creation failed:', err.message);
                setTimeout(connect, 2000);
                return;
            }
            ready = true;
            console.log('PostgreSQL connection established and table created');
        });
        
        client.on('error', (err) => {
            console.error('PostgreSQL client error:', err.message);
            ready = false;
            setTimeout(connect, 2000);
        });
        
    } catch (err) {
        console.error('PostgreSQL connection attempt failed:', err.message);
        setTimeout(connect, 2000);
    }
}
connect();

function query(callback) {
    if (!ready) {
        setTimeout(() => query(callback), 500);
        return;
    }

    const queryTimeout = setTimeout(() => {
        console.error('PostgreSQL query timeout');
        callback();
    }, 5000);

    client.query(`SELECT * FROM test_table`, (err, result) => {
        clearTimeout(queryTimeout);
        if (err) {
            console.error('PostgreSQL query error:', err.message);
        }
        callback();
    });
}


module.exports = {
    query: query
}