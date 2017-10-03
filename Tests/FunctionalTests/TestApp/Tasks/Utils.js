module.exports = {
    throwError: (cb) => {throw new Error("Native error");},
    timeout: (cb) => setTimeout(cb, 300),
    consoleLog: (cb) => {console.log("Test console.log"); cb();},
    consoleWarn: (cb) => {console.warn("Test console.warn"); cb();},
    consoleError: (cb) => {console.error("Test console.error"); cb();},
    consoleInfo: (cb) => {console.info("Test console.info"); cb();},
    consoleAssert: (cb) => {console.assert(false, "Test console.assert"); cb();}
}