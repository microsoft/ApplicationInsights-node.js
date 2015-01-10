///<reference path="../Scripts/typings/async/async.d.ts" />

import async = require("async");

class TestHelper {
    public results;
    public isSuccessfulTestRun;
    private tests: Array<(any, TestResult) => void>;

    constructor() {
        this.isSuccessfulTestRun = true;
        this.tests = [];
        this.results = "";
    }

    public registerTestAsync(type: string, name: string, action: (callback: (any, TestResult) => void) => void) {
        this.tests.push((callback: (any, TestResult) => void) => {
            try {
                action(callback);
            } catch (exception) {
                callback(null, {
                    type: type,
                    name: name + " -- " + exception.name + " " + exception.message,
                    result: false
                });
            }
        });
    }

    public registerTest(type: string, name: string, action: () => boolean) {
        this.tests.push((callback: (any, TestResult) => void) => {
            var result;
            try {
                result = action();
            } catch (exception) {
                name += " -- " + exception.name + " " + exception.message;
                result = false;
            }

            callback(null, {
                type: type,
                name: name,
                result: result
            });
        });
    }

    public run(callback: (TestHelper) => void) {
        var self = this;
        async.series(this.tests, (error, results: TestHelper.TestResult[]) => {
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                if(!result.result) {
                    this.isSuccessfulTestRun = false;
                }
                this.log(result);
            }

            callback(self);
        });
    }

    public getResults() {
        return "<html><head></head><body><ol>" + this.results + "</ol></body>";
    }

    private log(result: TestHelper.TestResult) {
        console.log(result.type + ": " + result.name);
        var color;
        if (result.result) {
            console.log(" - success: " + result);
            color = "#00cc00";
        } else {
            (<any>console)["trace"](" - failure: " + result);
            color = "#cc0000";
        }

        var resultStr = result.result ? "pass" : "fail";
        this.results += "<li>" + result.type + ": " + result.name + " - <span style = 'background: " + color + ";'>" + resultStr + "</span></li>";
    }
}

module TestHelper {
    export interface TestResult {
        type: string;
        name: string;
        result: boolean;
    }
    
    export interface Tests {
        register: () => void;
    }
}

export = TestHelper