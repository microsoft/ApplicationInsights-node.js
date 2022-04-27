import * as os from "os";
import * as fs from "fs";
import * as path from "path";

import { Resource } from "@opentelemetry/resources";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../declarations/constants";
import { Logger } from "./logging";
import { KnownContextTagKeys } from "../declarations/generated";

export class Context {
  public tags: { [key: string]: string };
  public defaultRoleName: string = "Web";
  public appVersion: { [path: string]: string } = {};
  public sdkVersion: string = null;

  private _resource: Resource;

  constructor(resource?: Resource, packageJsonPath?: string) {
    this._resource = resource ? resource : Resource.EMPTY;
    this.tags = <{ [key: string]: string }>{};
    this._loadApplicationContext(packageJsonPath);
    this._loadDeviceContext();
    this._loadInternalContext();
  }

  public getResource(): Resource {
    return this._resource;
  }

  private _loadApplicationContext(packageJsonPath?: string) {
    // note: this should return the host package.json
    packageJsonPath = packageJsonPath || path.resolve(__dirname, "../../../../package.json");

    if (!this.appVersion[packageJsonPath]) {
      this.appVersion[packageJsonPath] = "unknown";
      try {
        let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        if (packageJson && typeof packageJson.version === "string") {
          this.appVersion[packageJsonPath] = packageJson.version;
        }
      } catch (exception) {
        Logger.info("unable to read app version: ", exception);
      }
    }

    this.tags[KnownContextTagKeys.AiApplicationVer] = this.appVersion[packageJsonPath];
  }

  private _loadDeviceContext() {
    this.tags[KnownContextTagKeys.AiDeviceId] = "";
    this.tags[KnownContextTagKeys.AiCloudRoleInstance] = os && os.hostname();
    this.tags[KnownContextTagKeys.AiDeviceOsVersion] = os && os.type() + " " + os.release();
    this.tags[KnownContextTagKeys.AiCloudRole] = this.defaultRoleName;

    // not yet supported tags
    this.tags["ai.device.osArchitecture"] = os && os.arch();
    this.tags["ai.device.osPlatform"] = os && os.platform();
  }

  private _loadInternalContext() {
    this.sdkVersion = APPLICATION_INSIGHTS_SDK_VERSION;
    this.tags[KnownContextTagKeys.AiInternalSdkVersion] = "node:" + this.sdkVersion;
  }
}
