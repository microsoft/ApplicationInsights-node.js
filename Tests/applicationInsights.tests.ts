///<reference path='..\Declarations\node\node.d.ts' />
///<reference path='..\Declarations\mocha\mocha.d.ts' />
///<reference path='..\Declarations\sinon\sinon.d.ts' />

import assert = require("assert");
import sinon = require("sinon");

describe('AppInsights', () => {

    var warnSpy;
    before(() => warnSpy = sinon.spy(console, "warn"));
    after(() => warnSpy.restore());

    describe('#setup()', () => {
        var AppInsights;

        beforeEach(() => {
            warnSpy.reset();
            AppInsights = require("../ApplicationInsights");
        });
        
        afterEach(() => AppInsights.instance = undefined);
        after(() => warnSpy.restore());

        it('should not warn if setup is called once', () => {
            AppInsights.setup("key");
            assert.ok(warnSpy.notCalled, "warning was not raised");
        });

        it('should warn if setup is called twice', () => {
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(warnSpy.calledOn, "warning was raised");
        });

        it('should not overwrite default instance if called more than once', () => {
            AppInsights.setup("key");
            var instance = AppInsights.instance;
            AppInsights.setup("key");
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(instance === AppInsights.instance, "instance is not overwritten");
        });
    });

    describe('#start()', () => {
        var AppInsights;

        beforeEach(() => {
            warnSpy.reset();
            AppInsights = require("../ApplicationInsights");
        });

        it('should warn if start is called before setup', () => {
            AppInsights.start();
            assert.ok(warnSpy.calledOn, "warning was raised");
        });

        it('should not warn if start is called after setup', () => {
            AppInsights.setup("key").start();
            assert.ok(warnSpy.notCalled, "warning was not raised");
        });
    });
});