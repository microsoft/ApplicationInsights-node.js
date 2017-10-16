var Config = require("../Config");
var mysql = require('mysql');

var ready = false;
var connection = null;

function connect() {
    connection = mysql.createConnection(Config.MySqlConnectionString);
    connection.connect((err) => {
        if (!err) {
            connection.query(`
CREATE TABLE IF NOT EXISTS 'test_table' (
'id' int(11) NOT NULL auto_increment,
'data' varchar(100) NOT NULL default '',
PRIMARY KEY  ('id')
);`, (err) => {
                    if (!err) {
                        ready = true;
                    } else {
                        setTimeout(connect, 1500);
                    }
                });
        } else {
            setTimeout(connect, 500);
        }
    });
}
connect();

function query(callback) {
    if (!ready) {
        setTimeout(() => query(callback), 500);
        return;
    }

    connection.query(`SELECT * FROM 'test_table'`, () => callback());
}


module.exports = {
    query: query
}