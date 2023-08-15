import ContextTagKeys = require("../shared/util/contextTagKeys");

export class Context {
    public keys: ContextTagKeys;
    public tags: { [key: string]: string };
    public static DefaultRoleName = "Web";
    public static appVersion: { [path: string]: string } = {};
    public static sdkVersion: string = null;

    constructor(packageJsonPath?: string) {
        this.keys = new ContextTagKeys();
        this.tags = <{ [key: string]: string }>{};
    }
}
