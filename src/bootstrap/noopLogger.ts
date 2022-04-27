import * as DataModel from "./dataModel";
import { FileWriter } from "./fileWriter";

export class NoopLogger implements DataModel.AgentLogger {
  log(message?: any, ...optional: any[]): void {}
  error(message?: any, ...optional: any[]): void {}
}
