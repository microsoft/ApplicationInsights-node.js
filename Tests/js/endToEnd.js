const assert = require('assert');
const sinon = require('sinon');

// Special embedded test cases for testing if app can close
if (process.argv.indexOf('embeddedTestCase-AppTerminates1') > -1) {
    var appInsights = require('../..');
    appInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
    return;
} else if (process.argv.indexOf('embeddedTestCase-AppTerminates2') > -1) {
    var appInsights = require('../..');
    appInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
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
            this.timeout(10000);
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
            this.timeout(10000);
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
            appInsights.setup('1aa11111-bbbb-1ccc-8ddd-eeeeffff3333').start();
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
        var UNCAUGHT_EXCEPTION = 'uncaughtException';
        var UNCAUGHT_EXCEPTION_MONITOR = 'uncaughtExceptionMonitor';
        var exitStub;
        var mochaListener;

        var getLegacyHandler = function() {
            return process.listeners(UNCAUGHT_EXCEPTION)[0];
        }

        var getMonitorHandler = function() {
            return process.listeners(UNCAUGHT_EXCEPTION_MONITOR)[0];
        }

        before(function() {
            mochaListener = process.listeners(UNCAUGHT_EXCEPTION).pop();
            process.removeListener(UNCAUGHT_EXCEPTION, mochaListener);
            exitStub = sinon.stub(process, 'exit');
        });

        beforeEach(function() {
            exitStub.reset();
        });

        after(function() {
            process.addListener(UNCAUGHT_EXCEPTION, mochaListener);
            exitStub.restore();
        });

        it('should crash on uncaught exceptions', function () {
            var appInsights = require('../../');
            appInsights.setup('1aa11111-bbbb-1ccc-8ddd-eeeeffff3333').setAutoCollectExceptions(true).start();
            assert.ok(appInsights.defaultClient);
            var handler;
            if (handler = getLegacyHandler()) {
                handler(new Error('legacy error'));
                assert.equal(exitStub.callCount, 1, 'Legacy handler rethrows when no handlers exist');
            } else if (handler = getMonitorHandler()) {
                handler(new Error('monitor handler'));
                assert.equal(exitStub.callCount, 0, 'Monitor handler does not cause the throw');
            } else {
                assert.ok(false, 'No handler found');
            }
            appInsights.defaultClient.flush();
            appInsights.dispose();
        });

        it('should not crash on uncaught exceptions if multiple handlers exist', function () {
            var appInsights = require('../../');
            appInsights.setup('1aa11111-bbbb-1ccc-8ddd-eeeeffff3333').setAutoCollectExceptions(true).start();
            process.addListener(UNCAUGHT_EXCEPTION, function() {});
            assert.ok(appInsights.defaultClient);

            assert.doesNotThrow(function() {
                var handler = getMonitorHandler() || getLegacyHandler();
                handler(new Error('existing handler error'));
                assert.equal(exitStub.callCount, 0, 'Handler does not rethrow when other handles exist');
            });

            appInsights.defaultClient.flush();
            appInsights.dispose();
            process.removeAllListeners(UNCAUGHT_EXCEPTION);
        });
    });
});
