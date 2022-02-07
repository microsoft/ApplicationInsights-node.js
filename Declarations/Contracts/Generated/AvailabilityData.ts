// THIS FILE WAS AUTOGENERATED
import Domain } from './Domain');
"use strict";
    
    /**
     * Instances of AvailabilityData represent the result of executing an availability test.
     */
    class AvailabilityData extends Domain
    {
        
        /**
         * Schema version
         */
        public ver: number;
        
        /**
         * Identifier of a test run. Use it to correlate steps of test run and telemetry generated by the service.
         */
        public id: string;
        
        /**
         * Name of the test that these availability results represent.
         */
        public name: string;
        
        /**
         * Duration in format: DD.HH:MM:SS.MMMMMM. Must be less than 1000 days.
         */
        public duration: string;
        
        /**
         * Success flag.
         */
        public success: boolean;
        
        /**
         * Name of the location where the test was run from.
         */
        public runLocation: string;
        
        /**
         * Diagnostic message for the result.
         */
        public message: string;
        
        /**
         * Collection of custom properties.
         */
        public properties: any;
        
        /**
         * Collection of custom measurements.
         */
        public measurements: any;
        
        constructor()
        {
            super();
            
            this.ver = 2;
            this.properties = {};
            this.measurements = {};
        }
    }
export = AvailabilityData;
