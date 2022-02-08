import { EventData } from "./EventData";

/**
 * An instance of PageView represents a generic action on a page like a button click. It is also the base type for PageView.
 */
export class PageViewData extends EventData {

    /**
     * Schema version
     */
    public ver: number;

    /**
     * Request URL with all query string parameters
     */
    public url: string;

    /**
     * Event name. Keep it low cardinality to allow proper grouping and useful metrics.
     */
    public name: string;

    /**
     * Request duration in format: DD.HH:MM:SS.MMMMMM. For a page view (PageViewData), this is the duration. For a page view with performance information (PageViewPerfData), this is the page load time. Must be less than 1000 days.
     */
    public duration: string;

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
        this.properties = {};
        this.measurements = {};
    }
}