import { InstrumentationOptions } from "../types";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectLogs {

    public enable(options: InstrumentationOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(options.console);
    }

    public shutdown() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").dispose();
    }
}
