const assert = require('assert');

describe('module', function () {
    describe('#require', function () {
        it('loads the applicationinsights module', function (done) {
            // TODO(joshgav): do not use `assert`
            assert.doesNotThrow(() => require('../..'));
            done();
        });
    });
});
