import { InstrumentationOptions } from "../types";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectLogs {

    public enable(options: InstrumentationOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(options.console);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(options.winston);
    }

    public shutdown() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").dispose();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").dispose();
    }
}
