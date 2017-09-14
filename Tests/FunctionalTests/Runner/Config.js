var Config = {
    RunnerPort: "9091",
    TestAppAddress: "http://localhost:9099",
    InstrumentationKey: "743e9ee1-1c7b-42c1-b41c-9cac8ea659e8",
    WaitTime: 20 * 1000,
    PerfCounterFrequency: 60 * 1000,
    StressTestTime: 1.2 * 60 * 1000
}

// Allow config overrides from env variables
for (var prop in Config) {
    var env = process.env["njsperfrunner_"+prop];
    Config[prop] = env || Config[prop];
}

module.exports = Config;