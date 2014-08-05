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

    constructor(config) {
        if (config.application && config.application){
            if (config.application.id) {
                this.id = config.applicaiton.id;
            }
            if (config.application.ver) {
                this.ver = config.applicaiton.ver;
            }
        }
    }
}

module.exports = ApplicationContext;