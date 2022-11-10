export class Context {
    public keys: any;
    public tags: { [key: string]: string };
    public static DefaultRoleName = "Web";
    public static appVersion: { [path: string]: string } = {};
    public static sdkVersion: string = null;

    constructor(packageJsonPath?: string) {
        this.keys = {};
        this.tags = <{ [key: string]: string }>{};
    }
}
