/// <reference path="../Scripts/typings/node/node.d.ts" />

class LocationContext {

    /**
    * GPS latitude
    */
    public latitude: string;

    /**
    * GPS longitude
    */
    public longitude: string;

    /**
    * Client IP address for reverse lookup
    */
    public IP: string;

    /**
    * Developer override for Region geo location
    */
    public continent: string;

    /**
    * Developer override for Country geo location
    */
    public country: string;

    /**
    * Developer override for Province geo location
    */
    public province: string;

    /**
    * Developer override for City geo location
    */
    public city: string;

    /**
    * See ISerializable
    */
    public aiDataContract: {} = {
        Latitude: false,
        Longitude: false,
        IP: false,
        Continent: false,
        Country: false,
        Province: false,
        City: false,
    };

    constructor(request) {
        if (request) {
            if(request.headers) {
            this.IP = (request.headers['x-forwarded-for'] || '').split(',')[0]
                || request.connection? request.connection.remoteAddress : null;
        }}
    }
}

module.exports = LocationContext;