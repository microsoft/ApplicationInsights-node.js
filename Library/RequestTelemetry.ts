import Telemetry = require("./Telemetry")

interface RequestTelemetry extends Telemetry
{
     id: string;
     name: string;
     url: string;
     source: string;
     duration: number;
     resultCode: string;
     success: boolean;
}

export = RequestTelemetry;