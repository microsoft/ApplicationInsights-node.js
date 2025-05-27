import { InstrumentationOptions } from "../types";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectLogs {

    public enable(options: InstrumentationOptions) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("./diagnostic-channel/console.sub").enable(options.console);
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("../../out/src/logs/diagnostic-channel/console.sub").enable(options.console);
        }
    }

    public shutdown() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("./diagnostic-channel/console.sub").dispose();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("../../out/src/logs/diagnostic-channel/console.sub").dispose();
        }
    }
}
