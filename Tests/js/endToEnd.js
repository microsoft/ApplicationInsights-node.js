const assert = require('assert');

// Special embedded test cases for testing if app can close
if (process.argv.indexOf('embeddedTestCase-AppTerminates1') > -1) {
    var appInsights = require('../..');
    appInsights.setup("iKey").start();
    return;
} else if (process.argv.indexOf('embeddedTestCase-AppTerminates2') > -1) {
    var appInsights = require('../..');
    appInsights.setup("iKey").start();
    appInsights.defaultClient.trackEvent({name: 'testEvent'});
    appInsights.defaultClient.flush();
    return;
}

describe('module', function () {
    describe('#require', function () {
        it('loads the applicationinsights module', function (done) {
            assert.doesNotThrow(function() { return require('../..') });
            done();
        });
    });
    describe('applicationinsights', function() {
        if (/^0\.(([0-9]\.)|(10\.))/.test(process.versions.node)) {
            // These tests aren't valid in Node 0.10
            return;
        }
        it('does not prevent the app from terminating if started', function (done) {
            this.timeout(5000);
            var testCase = require('child_process').fork(__filename, ['embeddedTestCase-AppTerminates1']);
            var timer = setTimeout(function(){
                assert(false, "App failed to terminate!");
                testCase.kill();
                done();
            }, 5000);
            testCase.on("close", function() {
                clearTimeout(timer);
                done();
            });

        });
        it('does not prevent the app from terminating if started and called track and flush', function (done) {
            this.timeout(5000);
            var testCase = require('child_process').fork(__filename, ['embeddedTestCase-AppTerminates2']);
            var timer = setTimeout(function(){
                assert(false, "App failed to terminate!");
                testCase.kill();
                done();
            }, 5000);
            testCase.on("close", function() {
                clearTimeout(timer);
                done();
            });
        });
    });

    describe('rejected promises', function () {
        it('should not crash on rejected promises containing no callstack', function () {
            var appInsights = require('../../');
            appInsights.setup('ikey').start();
            assert.ok(appInsights.defaultClient);
            assert.doesNotThrow(function () {
                if (typeof Promise !== 'undefined') {
                    Promise.reject();
                }
            });
            appInsights.defaultClient.flush();
            appInsights.dispose();
        });
    });

    describe('uncaught exceptions', function() {
        var uncaughtException = 'uncaughtException'
        var mochaListener;

        before(function() {
            mochaListener = process.listeners(uncaughtException).pop();
            process.removeListener(uncaughtException, mochaListener);
        });

        after(function() {
            process.addListener(uncaughtException, mochaListener);
        });

        it('should crash on uncaught exceptions', function () {
            var appInsights = require('../../');
            appInsights.setup('ikey').setAutoCollectExceptions(true).start();
            assert.ok(appInsights.defaultClient);
            assert.throws(function () {
                process.listeners(uncaughtException)[0](new Error());
            });
            appInsights.defaultClient.flush();
            appInsights.dispose();
        });

        it('should not crash on uncaught exceptions if multiple handlers exist', function () {
            var appInsights = require('../../');
            appInsights.setup('ikey').setAutoCollectExceptions(true).start();
            process.addListener(uncaughtException, () => {});
            assert.ok(appInsights.defaultClient);

            assert.doesNotThrow(function() {
                process.listeners(uncaughtException)[0](new Error());
            });

            appInsights.defaultClient.flush();
            appInsights.dispose();
            process.removeAllListeners(uncaughtException);
        });
    });
});
