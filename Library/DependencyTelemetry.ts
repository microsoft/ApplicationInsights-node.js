import Telemetry = require("./Telemetry")

interface DependencyTelemetry extends Telemetry {
    dependencyTypeName: string;
    target: string;
    name: string;
    data: string;
    duration: number;
    resultCode: string;
    success: boolean;
    dependencyId?:string;
}

export = DependencyTelemetry;