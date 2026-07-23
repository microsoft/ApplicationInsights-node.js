import { ConsoleInstrumentation } from "@opentelemetry/instrumentation-console";
import { InstrumentationOptions } from "../types";

export class AutoCollectLogs {
    private _consoleInstrumentation: ConsoleInstrumentation | undefined;

    public enable(options: InstrumentationOptions) {
        if (options.console?.enabled) {
            // Construct disabled, then enable explicitly. Enabling via the
            // constructor patches console before the instrumentation's field
            // initializers run, which wipes its saved originals and prevents
            // disable() from restoring console.
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
