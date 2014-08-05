/// <reference path="../Scripts/typings/node/node.d.ts" />

class ApplicationContext {
    /**
    * The application version.
    */
    public ver: string;

    /**
    * component id
    */
    public id: string;

    /**
    * See ISerializable
    */
    public aiDataContract: {} = {
        ver: false,
        id: false,
    };

    constructor(cid: string) {
        if (cid && cid != "") {
            this.id = cid;
        }
    }
}

module.exports = ApplicationContext;