var Config = {
    ServerPort: "9099",
    EndpointBaseAddress: "http://localhost:9091",
    MongoConnectionString: "mongodb://localhost:27017/testapp",
    MySqlConnectionString: "mysql://root:dummypw@localhost:3306/testdb",
    RedisConnectionString: "redis://localhost:6379",
    PostgresConnectionString: "pg://postgres@localhost:5432/postgres",
    InstrumentationKey: "TESTIKEY",
    AppInsightsEnabled: true,
    UseAutoCorrelation: true,
    UseAutoRequests: true,
    UseAutoPerformance: true,
    UseAutoExceptions: true,
    UseAutoDependencies: true,
    UseAutoConsole: true,
    UseDiskCaching: false
}

// Allow config overrides from env variables
for (var prop in Config) {
    var env = process.env["njsperfapp_"+prop];
    if (env) {
        var envLower = env.toLowerCase();
        if (envLower === "true") {
            env = true;
        } else if (envLower === "false") {
            env = false;
        }
        Config[prop] = env || Config[prop];
    }
}

module.exports = Config;