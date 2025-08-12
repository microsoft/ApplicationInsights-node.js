var Config = {
    RunnerPort: "9091",
    TestAppAddress: "http://localhost:9099",
    WaitTime: 15 * 1000, // Reduced from 20s to 15s
    PerfCounterFrequency: 60 * 1000,
    StressTestTime: 0.5 * 60 * 1000 // Reduced from 1.2 minutes to 0.5 minutes
}

// Allow config overrides from env variables
for (var prop in Config) {
    var env = process.env["njsperfrunner_"+prop];
    Config[prop] = env || Config[prop];
}

// Special handling for CI environments
if (process.env.CI || process.env.GITHUB_ACTIONS) {
    Config.WaitTime = 10 * 1000; // Even shorter wait in CI
    Config.StressTestTime = 0.25 * 60 * 1000; // Shorter stress test in CI
}

module.exports = Config;
