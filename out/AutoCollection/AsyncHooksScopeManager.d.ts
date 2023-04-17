import { Span } from "@opentelemetry/sdk-trace-base";
export declare class OpenTelemetryScopeManagerWrapper {
    private _activeSymbol;
    active(): any;
    with(span: Span, fn: () => any): any;
    bind<T>(target: T): T;
    enable(): this;
    disable(): this;
    private static _spanToContext;
}
export declare const AsyncScopeManager: OpenTelemetryScopeManagerWrapper;
