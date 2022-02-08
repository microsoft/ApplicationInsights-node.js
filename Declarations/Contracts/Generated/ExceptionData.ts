import { Domain } from "./Domain";
import { ExceptionDetails } from "./ExceptionDetails";
import { SeverityLevel } from "./SeverityLevel";

/**
 * An instance of Exception represents a handled or unhandled exception that occurred during execution of the monitored application.
 */
export class ExceptionData extends Domain {

    /**
     * Schema version
     */
    public ver: number;

    /**
     * Exception chain - list of inner exceptions.
     */
    public exceptions: ExceptionDetails[];

    /**
     * Severity level. Mostly used to indicate exception severity level when it is reported by Logger library.
     */
    public severityLevel: SeverityLevel;

    /**
     * Identifier of where the exception was thrown in code. Used for exceptions grouping. Typically a combination of exception type and a function from the call stack.
     */
    public problemId: string;

    /**
     * Collection of custom properties.
     */
    public properties: any;

    /**
     * Collection of custom measurements.
     */
    public measurements: any;

    constructor() {
        super();

        this.ver = 2;
        this.exceptions = [];
        this.properties = {};
        this.measurements = {};
    }
}