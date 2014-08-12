var util = require('../Util');
class UserContext{
    /**
    * The user ID.
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
            this.id = util.getUserId(request, response);
        }
    }
}

module.exports = UserContext;