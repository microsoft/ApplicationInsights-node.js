import { ConsoleInstrumentation } from "@opentelemetry/instrumentation-console";
import { InstrumentationOptions } from "../types";

export class AutoCollectLogs {
    private _consoleInstrumentation: ConsoleInstrumentation | undefined;

    public enable(options: InstrumentationOptions) {
        // Avoid double-patching console on re-enable.
        this.shutdown();
        if (options.console?.enabled) {
            // Enabling via the constructor would clobber the instrumentation's saved console originals, breaking disable().
            this._consoleInstrumentation = new ConsoleInstrumentation({
                enabled: false,
                logSeverity: options.console.logSendingLevel,
            });
            this._consoleInstrumentation.enable();
        }
    }

    public shutdown() {
        this._consoleInstrumentation?.disable();
        this._consoleInstrumentation = undefined;
    }
}
