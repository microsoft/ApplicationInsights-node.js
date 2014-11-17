
/*
 * To run these tests:
 *  1) npm install node-mocks-http
 *  2) npm install cookies
 *  3) npm install node-uuid
 *  4) set APPINSIGHTS_INSTRUMENTATION_KEY=<insert_your_instrumentation_key_here>
 *  5) node tests\server.js
 */

class TestHelper {
    private results;
    private tests: Array<() => boolean>;
    public isSuccessfulTestRun;

    //todo: find a good test package for node
    constructor() {
        this.isSuccessfulTestRun = true;
        this.tests = [];
        this.results = "";
    }

    public test(type: string, name: string, action: () => boolean) {
        console.log("executing test: " + type + "_" + name);
        try {
            var result = action();
            this.log(type, name, result ? "pass" : "fail");
        } catch (exception) {
            this.isSuccessfulTestRun = false;
            var stack = new Error()["stack"];
            this.log(type, name, (<Error>exception).message + "<ul>" + stack + "</ul>");
        }
    }

    public getResults() {
        return "<html><head></head><body><ol>" + this.results + "</ol></body>";
    }

    private log(type: string, name: string, result: string) {
        console.log(type + "_" + name);
        var color;
        if (result === "pass") {
            console.log(" - success: " + result);
            color = "#00cc00";
        } else {
            (<any>console)["trace"](" - failure: " + result);
            color = "#cc0000";
        }

        this.results += "<li>" + type + "_" + name + " - <span style = 'background: " + color + ";'>" + result + "</span></li>";
    }
}

module.exports = TestHelper;