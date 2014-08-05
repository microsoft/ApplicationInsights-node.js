/// <reference path="../Scripts/typings/node/node.d.ts" />

var util = require('../Util');
class SessionContext {

    /**
    * The session ID.
    */
    public id: string;

    /**
    * See ISerializable
    */
    public aiDataContract: {} = {
        id: true
    };

    constructor(request, response) {
        if (request && response) {
            this.id = util.getSessionId(request, response);
        }
    }
}

module.exports = SessionContext;