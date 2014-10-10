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

    constructor() {
        var azureAppSettingPrefix = "APPSETTING_";
        var appIdEnvVariable = "APPINSIGHTS_APPLICATION_ID";
        var appVersionEnvVariable = "APPINSIGHTS_APPLICATION_VERSION";
        var id = process.env[appIdEnvVariable] || process.env[azureAppSettingPrefix + appIdEnvVariable];
        if (typeof id === "string") {
            this.id = id;
        }

        var ver = process.env[appVersionEnvVariable] || process.env[azureAppSettingPrefix + appVersionEnvVariable];
        if (typeof ver === "string") {
            this.ver = ver;
        }
    }
}

module.exports = ApplicationContext;