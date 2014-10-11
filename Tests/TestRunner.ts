class TestRunner {
    private results;
    public isSuccessfulTestRun;

    //todo: find a good test package for node
    constructor() {
        this.isSuccessfulTestRun = true;
        this.results = "";
    }

    public test(name: string, action: () => void) {
        console.log("executing test: " + name);
        try {
            action();
            this.log(name, "pass");
        } catch (exception) {
            this.isSuccessfulTestRun = false;
            var stack = new Error()["stack"];
            this.log(name, (<Error>exception).message + "<ul>" + stack + "</ul>");
        }
    }

    public getResults() {
        return "<html><head></head><body><ol>" + this.results + "</ol></body>";
    }
    
    private log(name:string, result: string) {
        console.log(name);
        var color;
        if (result === "pass") {
            console.log(" - success: " + result);
            color = "00cc00";
        } else {
            (<any>console)["trace"](" - failure: " + result);
            color = "cc0000";
        }

        this.results += "<li>" + name + " - <span style = 'background: " + color + ";'>" + result + "</span></li>";
    }
}

module.exports = TestRunner;