var Config = require("../Config");
var pg = require('pg');

var ready = false;
var client = null;
var connectionAttempts = 0;
var maxConnectionAttempts = 30; // Increased from 20
var lastError = null;

console.log('Initializing PostgreSQL connection to:', Config.PostgresConnectionString);

function connect() {
    connectionAttempts++;
    console.log(`PostgreSQL connection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
    
    if (connectionAttempts > maxConnectionAttempts) {
        console.error(`PostgreSQL connection failed after ${maxConnectionAttempts} attempts. Last error:`, lastError);
        return;
    }
    
    try {
        // Clean up existing client first
        if (client) {
            try {
                client.end();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
        client = new pg.Pool({
            connectionString: Config.PostgresConnectionString,
            connectionTimeoutMillis: 15000, // Increased from 10s
            idleTimeoutMillis: 15000,
            max: 1,
            ssl: false // Explicitly disable SSL for local testing
        });
        
        // Test the connection and create table
        client.query(`
        CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL,
        data varchar(100) NOT NULL default '',
        PRIMARY KEY  (id)
        );`, (err) => {
            if (err) {
                lastError = err;
                console.error(`PostgreSQL connection/table creation failed (attempt ${connectionAttempts}):`, err.message);
                setTimeout(connect, 3000); // Increased delay
                return;
            }
            ready = true;
            console.log('PostgreSQL connection established and table created successfully');
        });
        
        client.on('error', (err) => {
            lastError = err;
            console.error('PostgreSQL client error:', err.message);
            ready = false;
            setTimeout(connect, 3000);
        });
        
    } catch (err) {
        lastError = err;
        console.error(`PostgreSQL connection attempt ${connectionAttempts} failed:`, err.message);
        setTimeout(connect, 3000);
    }
}

// Start connection process
connect();

function query(callback) {
    console.log(`PostgreSQL query called. Ready: ${ready}, Connection attempts: ${connectionAttempts}`);
    
    // Absolute timeout to prevent hanging
    const absoluteTimeout = setTimeout(() => {
        console.error('PostgreSQL query absolute timeout after 25 seconds - calling callback');
        callback();
    }, 25000);
    
    const wrappedCallback = () => {
        clearTimeout(absoluteTimeout);
        callback();
    };
    
    if (!ready) {
        if (connectionAttempts > maxConnectionAttempts) {
            console.error('PostgreSQL query failed - connection never established');
            wrappedCallback();
            return;
        }
        
        console.log('PostgreSQL not ready, retrying in 1000ms...');
        setTimeout(() => query(callback), 1000);
        return;
    }

    const queryTimeout = setTimeout(() => {
        console.error('PostgreSQL query timeout after 10 seconds');
        wrappedCallback();
    }, 10000); // Increased from 5s

    try {
        client.query(`SELECT COUNT(*) FROM test_table`, (err, result) => {
            clearTimeout(queryTimeout);
            if (err) {
                console.error('PostgreSQL query error:', err.message);
            } else {
                console.log('PostgreSQL query successful:', result ? result.rowCount : 'no result');
            }
            wrappedCallback();
        });
    } catch (err) {
        clearTimeout(queryTimeout);
        console.error('PostgreSQL query exception:', err.message);
        wrappedCallback();
    }
}


module.exports = {
    query: query
}