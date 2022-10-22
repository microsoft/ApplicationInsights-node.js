import assert = require("assert");
import sinon = require("sinon");

import PrefixHelper = require("../../Library/PrefixHelper");

describe("Library/PrefixHelper", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    let originalPlatform: PropertyDescriptor;

    beforeEach(function() {
        originalEnv = process.env;
        sandbox = sinon.sandbox.create();
        originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      });
    
    afterEach(function() {
        process.env = originalEnv;
        Object.defineProperty(process, 'platform', originalPlatform);
        sandbox.restore();
    });

    describe("#getOsPrefix", () => {
       
        it("should return correct OS(Windows) type", () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32'
              });
           let isWindows = PrefixHelper.isWindows();
           let isLinux = PrefixHelper.isLinux();
           let osPrefix = PrefixHelper.getOsPrefix();
           assert.equal(isWindows, true);
           assert.equal(isLinux, false);
           assert.equal(osPrefix, "w");
        });

        it("should return correct OS(Linux) type", () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux'
              });
            let isWindows = PrefixHelper.isWindows();
            let isLinux = PrefixHelper.isLinux();
            let osPrefix = PrefixHelper.getOsPrefix();
            assert.equal(isWindows, false);
            assert.equal(isLinux, true);
            assert.equal(osPrefix, "l");
         });
       
        it("should return correct OS(unknown) type", () => {
         Object.defineProperty(process, 'platform', {
            value: 'darwin'
          });
           let isWindows = PrefixHelper.isWindows();
           let isLinux = PrefixHelper.isLinux();
           let osPrefix = PrefixHelper.getOsPrefix();
           assert.equal(isWindows, false);
           assert.equal(isLinux, false);
           assert.equal(osPrefix, "u");
        });
    });

    describe("#getResourceProvider", () => {
        it("should return correct RP type (Web App)", () => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["WEBSITE_SITE_NAME"] = "Test Website";
            process.env = newEnv;
            let isWebApp = PrefixHelper.isWebApp();
            let isFunctionApp = PrefixHelper.isFunctionApp();
            let rpPrefix = PrefixHelper.getResourceProvider();
           assert.equal(isWebApp, true);
           assert.equal(isFunctionApp, false);
           assert.equal(rpPrefix, "a");
        });

        it("should return correct RP type (Function App)", () => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "test";
            process.env = newEnv;
            let isWebApp = PrefixHelper.isWebApp();
            let isFunctionApp = PrefixHelper.isFunctionApp();
            let rpPrefix = PrefixHelper.getResourceProvider();
           assert.equal(isWebApp, false);
           assert.equal(isFunctionApp, true);
           assert.equal(rpPrefix, "f");
        });

        it("should return correct RP type (empty env variables)", () => {
            let isWebApp = PrefixHelper.isWebApp();
            let isFunctionApp = PrefixHelper.isFunctionApp();
            let rpPrefix = PrefixHelper.getResourceProvider();
           assert.equal(isWebApp, false);
           assert.equal(isFunctionApp, false);
           assert.equal(rpPrefix, "u");
        });

        it("should return correct RP type (empty env variable values)", () => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "";
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "";
            process.env = newEnv;
            let isWebApp = PrefixHelper.isWebApp();
            let isFunctionApp = PrefixHelper.isFunctionApp();
            let rpPrefix = PrefixHelper.getResourceProvider();
           assert.equal(isWebApp, false);
           assert.equal(isFunctionApp, false);
           assert.equal(rpPrefix, "u");
        });
    });
});
