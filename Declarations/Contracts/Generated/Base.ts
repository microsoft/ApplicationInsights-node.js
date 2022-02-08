
/**
 * Data struct to contain only C section with custom fields.
 */
export class Base {

    /**
     * Name of item (B section) if any. If telemetry data is derived straight from this, this should be null.
     */
    public baseType: string;

    constructor() {
    }
}
