/// <reference path="../Scripts/typings/node/node.d.ts" />

var os = require("os");

class DeviceContext {

    /**
    * The type for the current device.
    */
    public type: string;

    /**
    * A device unique ID.
    */
    public id: string;

    /**
    * The operating system name and version.
    */
    public os: string;

    /**
    * The operating system name and version.
    */
    public osVersion: string;

    /**
    * The device OEM for the current device.
    */
    public oemName: string;

    /**
    * The device model for the current device.
    */
    public model: string;

    /**
    * The IANA interface type for the internet connected network adapter.
    */
    public network: number;

    /**
    * The application screen resolution.
    */
    public resolution: string;

    /**
    * The current display language of the operating system.
    */
    public locale: string;

/**
    * See ISerializable
    */
    public aiDataContract = {
        type: true,
        id: true,
        os: true,
        osVersion: true,
        oemName: false,
        model: false,
        network: false,
        resolution: false,
        locale: true,
    }

    constructor(request) {
        this.id = request ? request.headers["host"] : "";
        this.os = os.type() + " " + os.release();
        this.osVersion = this.os;
        this.locale = request ? (request.headers["accept-language"] || "en-US") : "";
        this.type = "server";
    }
}

module.exports = DeviceContext;