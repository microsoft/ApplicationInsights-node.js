module.exports = {
    throwError: (cb) => {throw new Error("Native error");},
    timeout: (cb) => setTimeout(cb, 300)
}