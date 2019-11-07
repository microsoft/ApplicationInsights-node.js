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

    describe('rejected promises', () => {
        it('should not crash on rejected promises containing no callstack', () => {
            var appInsights = require('../../');
            appInsights.setup("ikey").start();
            assert.ok(appInsights.defaultClient);
            assert.doesNotThrow(() => {
                Promise.reject();
            });
            appInsights.defaultClient.flush();
            appInsights.dispose();
        });
    });
});
