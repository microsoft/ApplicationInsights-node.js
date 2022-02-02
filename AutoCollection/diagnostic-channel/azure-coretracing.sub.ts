// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { Span } from "@opentelemetry/sdk-trace-base";
import { SpanKind } from "@opentelemetry/api";

import TelemetryClient = require("../../Library/TelemetryClient");
import { StatsbeatInstrumentation } from "../../Declarations/Constants";
import { channel, IStandardEvent, trueFilter } from "diagnostic-channel";

import * as SpanParser from "./SpanParser";
import { AsyncScopeManager } from "../AsyncHooksScopeManager";
import { DependencyTelemetry, RequestTelemetry } from "../../Declarations/Contracts";

let clients: TelemetryClient[] = [];

export const subscriber = (event: IStandardEvent<Span>) => {
    try {
        const span = event.data;
        const telemetry = SpanParser.spanToTelemetryContract(span);
        AsyncScopeManager.with(span, () => {
            clients.forEach((client) => {
                if (span.kind === SpanKind.SERVER || span.kind === SpanKind.CONSUMER) {
                    client.trackRequest(<RequestTelemetry>telemetry);
                } else if (span.kind === SpanKind.CLIENT || span.kind === SpanKind.INTERNAL || span.kind === SpanKind.PRODUCER) {
                    client.trackDependency(<DependencyTelemetry>telemetry);
                }
            });
        });
    }
    catch (err) { { /** ignore errors */ } }
};

export function enable(enabled: boolean, client: TelemetryClient) {
    if (enabled) {
        let clientFound = clients.find(c => c == client);
        if (clientFound) {
            return;
        }
        if (clients.length === 0) {
            channel.subscribe<any>("azure-coretracing", subscriber, trueFilter, (module, version) => {
                let statsbeat = client.getStatsbeat();
                if (statsbeat) {
                    statsbeat.addInstrumentation(StatsbeatInstrumentation.AZURE_CORE_TRACING);
                }
            });

        };
        clients.push(client);
    } else {
        clients = clients.filter((c) => c != client);
        if (clients.length === 0) {
            channel.unsubscribe("azure-coretracing", subscriber);
        }
    }
}
