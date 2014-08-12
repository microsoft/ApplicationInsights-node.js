class TestRunner {

    //todo: find a good test package for node
    public static test(name: string, action: () => void) {
        console.log("executing test: " + name);
        try {
            var result = action();
            console.log(" - success: " + result);
        } catch (exception) {
            console.log(" - failure: " + (<Error>exception).message);
        }
    }
}

module.exports = TestRunner;