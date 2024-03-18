var Config = {
    RunnerPort: "9091",
    TestAppAddress: "https://localhost:9099",
    WaitTime: 100 * 1000,
    PerfCounterFrequency: 60 * 1000,
    StressTestTime: 1.2 * 60 * 1000
}

// Allow config overrides from env variables
for (var prop in Config) {
    var env = process.env["njsperfrunner_"+prop];
    Config[prop] = env || Config[prop];
}

module.exports = Config;
