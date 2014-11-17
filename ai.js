var Microsoft = {};
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        var _InternalLogging = (function () {
            function _InternalLogging() {
            }
            /**
            * This method will throw exceptions in debug mode or attempt to log the error as a console warning.
            */
            _InternalLogging.throwInternal = function (message) {
                if (_InternalLogging.enableDebugExceptions()) {
                    throw message;
                } else {
                    _InternalLogging._warn(message);
                }
            };

            /**
            * This method will write console warnings in debug mode
            */
            _InternalLogging.warnInternal = function (message) {
                if (_InternalLogging.enableDebugExceptions()) {
                    _InternalLogging._warn(message);
                }
            };

            /**
            * This will write a warning to the console
            */
            _InternalLogging._warn = function (message) {
                if (console && typeof console.warn === "function") {
                    console.warn(message);
                } else {
                    try  {
                        console.log(message);
                    } catch (e) {
                        // no op
                    }
                }
            };
            _InternalLogging.enableDebugExceptions = function () {
                return false;
            };
            return _InternalLogging;
        })();
        ApplicationInsights._InternalLogging = _InternalLogging;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        var Util = (function () {
            function Util() {
            }
            /**
            * helper method to set userId and sessionId cookie
            */
            Util.setCookie = function (name, value) {
                Util.document.cookie = name + "=" + value;
            };

            /**
            * helper method to access userId and sessionId cookie
            */
            Util.getCookie = function (name) {
                var value = "";
                if (name && name.length) {
                    var cookieName = name + "=";
                    var cookies = Util.document.cookie.split(';');
                    for (var i = 0; i < cookies.length; i++) {
                        var cookie = cookies[i];
                        cookie = Util.trim(cookie);
                        if (cookie && cookie.indexOf(cookieName) === 0) {
                            value = cookie.substring(cookieName.length, cookies[i].length);
                            break;
                        }
                    }
                }

                return value;
            };

            /**
            * helper method to trim strings (IE8 does not implement String.prototype.trim)
            */
            Util.trim = function (str) {
                return str.replace(/^\s+|\s+$/g, '');
            };

            /**
            * generate GUID
            */
            Util.newGuid = function () {
                var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

                // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
                var oct = "", tmp;
                for (var a = 0; a < 4; a++) {
                    tmp = (4294967296 * Math.random()) | 0;
                    oct += hexValues[tmp & 0xF] + hexValues[tmp >> 4 & 0xF] + hexValues[tmp >> 8 & 0xF] + hexValues[tmp >> 12 & 0xF] + hexValues[tmp >> 16 & 0xF] + hexValues[tmp >> 20 & 0xF] + hexValues[tmp >> 24 & 0xF] + hexValues[tmp >> 28 & 0xF];
                }

                // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
                var clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
                return oct.substr(0, 8) + "-" + oct.substr(9, 4) + "-4" + oct.substr(13, 3) + "-" + clockSequenceHi + oct.substr(16, 3) + "-" + oct.substr(19, 12);
            };

            /**
            * Check if an object is of type Array
            */
            Util.isArray = function (obj) {
                return Object.prototype.toString.call(obj) === '[object Array]';
            };

            /**
            * Check if an object is of type Error
            */
            Util.isError = function (obj) {
                return Object.prototype.toString.call(obj) === '[object Error]';
            };

            /**
            * Convert a date to I.S.O. format in IE8
            */
            Util.toISOStringForIE8 = function (date) {
                if (Date.prototype.toISOString) {
                    return date.toISOString();
                } else {
                    function pad(number) {
                        var r = String(number);
                        if (r.length === 1) {
                            r = '0' + r;
                        }
                        return r;
                    }

                    return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) + 'T' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + '.' + String((date.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + 'Z';
                }
            };

            /**
            * Convert ms to c# time span format
            */
            Util.msToTimeSpan = function (totalms) {
                if (isNaN(totalms) || totalms < 0) {
                    totalms = 0;
                }

                var ms = "" + totalms % 1000;
                var sec = "" + Math.floor(totalms / 1000) % 60;
                var min = "" + Math.floor(totalms / (1000 * 60)) % 60;
                var hour = "" + Math.floor(totalms / (1000 * 60 * 60)) % 24;

                ms = ms.length === 1 ? "00" + ms : ms.length === 2 ? "0" + ms : ms;
                sec = sec.length < 2 ? "0" + sec : sec;
                min = min.length < 2 ? "0" + min : min;
                hour = hour.length < 2 ? "0" + hour : hour;

                return hour + ":" + min + ":" + sec + "." + ms;
            };
            Util.document = typeof document !== "undefined" ? document : {};
            return Util;
        })();
        ApplicationInsights.Util = Util;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="logging.ts" />
/// <reference path="util.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        var Serializer = (function () {
            function Serializer() {
            }
            /**
            * Serializes the current object to a JSON string.
            */
            Serializer.serialize = function (input) {
                var output = Serializer._serializeObject(input, "root");
                return JSON.stringify(output);
            };

            Serializer._serializeObject = function (source, name) {
                var circularReferenceCheck = "__aiCircularRefCheck";
                var output = {};

                if (!source) {
                    ApplicationInsights._InternalLogging.throwInternal("source is null");
                    return output;
                }

                if (source[circularReferenceCheck]) {
                    ApplicationInsights._InternalLogging.throwInternal("Circular reference detected while serializing: '" + name);
                    return output;
                }

                if (!source.aiDataContract) {
                    // special case for measurements/properties
                    if (name === "measurements") {
                        output = Serializer._serializeStringMap(source, "number", name);
                    } else if (name === "properties") {
                        output = Serializer._serializeStringMap(source, "string", name);
                    } else {
                        ApplicationInsights._InternalLogging.warnInternal("Attempting to serialize an object which does not implement ISerializable: " + name);

                        try  {
                            // verify that the object can be stringified
                            JSON.stringify(source);
                            output = source;
                        } catch (e) {
                            // if serialization fails return an empty string
                            ApplicationInsights._InternalLogging.throwInternal(e && typeof e.toString === 'function' ? e.toString() : "Error serializing object");
                        }
                    }

                    return output;
                }

                source[circularReferenceCheck] = true;
                for (var field in source.aiDataContract) {
                    var isRequired = source.aiDataContract[field];
                    var isArray = typeof isRequired !== "boolean";
                    var isPresent = source[field] !== undefined;
                    var isObject = typeof source[field] === "object" && source[field] !== null;

                    if (isRequired && !isPresent && !isArray) {
                        ApplicationInsights._InternalLogging.throwInternal("Missing required field specification: The field '" + field + "' is required but not present on source");

                        continue;
                    }

                    var value;
                    if (isObject) {
                        if (isArray) {
                            // special case; resurse on each object in the source array
                            value = Serializer._serializeArray(source[field], field);
                        } else {
                            // recurse on the source object in this field
                            value = Serializer._serializeObject(source[field], field);
                        }
                    } else {
                        // assign the source field to the output even if undefined or required
                        value = source[field];
                    }

                    // only emit this field if the value is defined
                    if (value !== undefined) {
                        output[field] = value;
                    }
                }

                delete source[circularReferenceCheck];
                return output;
            };

            Serializer._serializeArray = function (sources, name) {
                var output = undefined;

                if (!!sources) {
                    if (!ApplicationInsights.Util.isArray(sources)) {
                        ApplicationInsights._InternalLogging.throwInternal("This field was specified as an array in the contract but the item is not an array.\r\n" + name);
                    } else {
                        output = [];
                        for (var i = 0; i < sources.length; i++) {
                            var source = sources[i];
                            var item = Serializer._serializeObject(source, name + "[" + i + "]");
                            output.push(item);
                        }
                    }
                }

                return output;
            };

            Serializer._serializeStringMap = function (map, expectedType, name) {
                var output = undefined;
                if (map) {
                    output = {};
                    for (var field in map) {
                        var value = map[field];
                        if (typeof value === expectedType) {
                            output[field] = value;
                        } else {
                            output[field] = "invalid field: " + name + ", the value must be of type:" + expectedType;
                            ApplicationInsights._InternalLogging.warnInternal(output[field]);
                        }
                    }
                }

                return output;
            };
            return Serializer;
        })();
        ApplicationInsights.Serializer = Serializer;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="../../logging.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";

                var DataSanitizer = (function () {
                    function DataSanitizer() {
                    }
                    DataSanitizer.sanitizeKeyAndAddUniqueness = function (key, map) {
                        var origLength = key.length;
                        var field = DataSanitizer.sanitizeName(key);

                        // validation truncated the length.  We need to add uniqueness
                        if (field.length !== origLength) {
                            var i = 0;
                            var uniqueField = field.substring(0, DataSanitizer.MAX_NAME_LENGTH - 3) + DataSanitizer.padNumber(i);
                            while (map[uniqueField] !== undefined) {
                                i++;
                                uniqueField = field.substring(0, DataSanitizer.MAX_NAME_LENGTH - 3) + DataSanitizer.padNumber(i);
                            }
                            field = uniqueField;
                        }
                        return field;
                    };

                    DataSanitizer.sanitizeName = function (name) {
                        if (name) {
                            // Remove any leading or trailing whitepace
                            name = name.toString().trim();

                            // Remove illegal chars
                            if (name.search(/[^0-9a-zA-Z-._()\/ ]/g) >= 0) {
                                ApplicationInsights._InternalLogging.warnInternal("name contains illegal characters.  name: " + name);
                                name = name.replace(/[^0-9a-zA-Z-._()\/ ]/g, "_");
                            }

                            // truncate the string to 150 chars
                            if (name.length > DataSanitizer.MAX_NAME_LENGTH) {
                                ApplicationInsights._InternalLogging.warnInternal("name is too long.  name: " + name);
                                name = name.substring(0, DataSanitizer.MAX_NAME_LENGTH);
                            }
                        }

                        return name;
                    };

                    DataSanitizer.sanitizeValue = function (value) {
                        if (value) {
                            if (value.toString().length > DataSanitizer.MAX_VALUE_LENGTH) {
                                ApplicationInsights._InternalLogging.warnInternal("value is too long.  value: " + value);
                                value = value.substring(0, DataSanitizer.MAX_VALUE_LENGTH);
                            }
                        }

                        return value;
                    };

                    DataSanitizer.sanitizeUrl = function (url) {
                        if (url) {
                            if (url.length > DataSanitizer.MAX_URL_LENGTH) {
                                ApplicationInsights._InternalLogging.warnInternal("url is too long, it will be trucated.  url: " + url);
                                url = url.substring(0, DataSanitizer.MAX_URL_LENGTH);
                            }
                        }

                        return url;
                    };

                    DataSanitizer.sanitizeMessage = function (message) {
                        if (message) {
                            if (message.length > DataSanitizer.MAX_MESSAGE_LENGTH) {
                                ApplicationInsights._InternalLogging.warnInternal("message is too long, it will be trucated.  message: " + message);
                                message = message.substring(0, DataSanitizer.MAX_MESSAGE_LENGTH);
                            }
                        }

                        return message;
                    };

                    DataSanitizer.sanitizeException = function (exception) {
                        if (exception) {
                            if (exception.length > DataSanitizer.MAX_EXCEPTION_LENGTH) {
                                ApplicationInsights._InternalLogging.warnInternal("exception is too long, it will be trucated.  exception: " + exception);
                                exception = exception.substring(0, DataSanitizer.MAX_EXCEPTION_LENGTH);
                            }
                        }

                        return exception;
                    };

                    DataSanitizer.sanitizeProperties = function (properties) {
                        if (properties) {
                            var tempProps = {};
                            for (var prop in properties) {
                                prop = DataSanitizer.sanitizeKeyAndAddUniqueness(prop, tempProps);
                                var value = DataSanitizer.sanitizeValue(properties[prop]);
                                tempProps[prop] = value;
                            }
                            properties = tempProps;
                        }

                        return properties;
                    };

                    DataSanitizer.sanitizeMeasurements = function (measurements) {
                        if (measurements) {
                            var tempMeasurements = {};
                            for (var measure in measurements) {
                                var value = measurements[measure];
                                measure = DataSanitizer.sanitizeKeyAndAddUniqueness(measure, tempMeasurements);
                                tempMeasurements[measure] = value;
                            }
                            measurements = tempMeasurements;
                        }

                        return measurements;
                    };

                    DataSanitizer.padNumber = function (num) {
                        var s = "00" + num;
                        return s.substr(s.length - 3);
                    };
                    DataSanitizer.MAX_NAME_LENGTH = 150;

                    DataSanitizer.MAX_VALUE_LENGTH = 1024;

                    DataSanitizer.MAX_URL_LENGTH = 2048;

                    DataSanitizer.MAX_MESSAGE_LENGTH = 32768;

                    DataSanitizer.MAX_EXCEPTION_LENGTH = 32768;
                    return DataSanitizer;
                })();
                Common.DataSanitizer = DataSanitizer;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="DataSanitizer.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";
                var Item = (function () {
                    /**
                    * Constructs a new instance of telemetry data.
                    */
                    function Item(contractExtension, properties, measurements) {
                        this.ver = 1.0;
                        this.properties = Common.DataSanitizer.sanitizeProperties(properties);
                        this.measurements = Common.DataSanitizer.sanitizeMeasurements(measurements);

                        var contract = {
                            ver: true,
                            measurements: false,
                            properties: false
                        };

                        this.aiDataContract = Item.extendContract(contract, contractExtension);
                    }
                    Item.extendContract = function (contract, contractExtension) {
                        if (!contract) {
                            if (contractExtension) {
                                contract = {};
                            }
                        }

                        for (var field in contractExtension) {
                            contract[field] = contractExtension[field];
                        }

                        return contract;
                    };
                    return Item;
                })();
                Common.Item = Item;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="item.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";
                var Data = (function () {
                    /**
                    * Constructs a new instance of telemetry data.
                    */
                    function Data(name, item) {
                        /**
                        * The data contract for serializing this object.
                        */
                        this.aiDataContract = {
                            name: true,
                            item: true
                        };
                        this.name = Common.DataSanitizer.sanitizeName(name);
                        ;
                        this.item = item;
                    }
                    return Data;
                })();
                Common.Data = Data;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";

                var Internal = (function () {
                    /**
                    * Constructs a new instance of the internal telemetry data class.
                    */
                    function Internal() {
                        /**
                        * The data contract for serializing this object.
                        */
                        this.aiDataContract = {
                            sdkVersion: true
                        };
                        this.sdkVersion = ApplicationInsights.Version;
                    }
                    return Internal;
                })();
                Common.Internal = Internal;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="..\Serializer.ts"/>
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var Application = (function () {
                /**
                * Constructs a new isntance of the Application class
                */
                function Application(appUserId) {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        ver: false,
                        id: false
                    };
                    this.id = appUserId;
                }
                return Application;
            })();
            Context.Application = Application;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="..\Serializer.ts"/>
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var Device = (function () {
                /**
                * Constructs a new instance of the Device class
                */
                function Device() {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        type: false,
                        id: true,
                        os: true,
                        osVersion: true,
                        oemName: false,
                        model: false,
                        network: false,
                        resolution: false,
                        locale: true
                    };
                    // don't attempt to fingerprint browsers
                    this.id = "browser";

                    // get os info
                    this.getOsInfo(navigator && navigator.appVersion);

                    //get resolution
                    if (screen && screen.width && screen.height) {
                        this.resolution = screen.width + "X" + screen.height;
                    }

                    //get locale
                    this.locale = (navigator && navigator.browserLanguage) ? navigator.browserLanguage : "unknown";
                }
                Device.prototype.getOsInfo = function (appVersion) {
                    this.os = "unknown";
                    this.osVersion = "unknown";
                    var check = function (str) {
                        return appVersion.indexOf(str) !== -1;
                    };
                    if (appVersion) {
                        if (check("Win")) {
                            // todo: update this with windows '10' user agent signature when it is released
                            this.os = "Windows";
                            if (check("Windows NT 6.3")) {
                                this.osVersion = "8.1";
                            } else if (check("Windows NT 6.2")) {
                                this.osVersion = "8";
                            } else if (check("Windows NT 6.1")) {
                                this.osVersion = "7";
                            } else if (check("Windows NT 6.0")) {
                                this.osVersion = "Vista";
                            } else if (check("Windows NT 5.1")) {
                                this.osVersion = "XP";
                            } else if (check("Windows NT 5.0")) {
                                this.osVersion = "2000";
                            }
                        } else if (check("Mac")) {
                            this.os = "MacOS";
                            if (check("iPad") || check("iPhone") || check("iPod")) {
                                this.osVersion = "iOS";
                            } else {
                                this.osVersion = "OSX";
                            }
                        } else if (check("X11")) {
                            this.os = "UNIX";
                        } else if (check("Linux")) {
                            this.os = "Linux";
                            if (check("Android")) {
                                this.osVersion = "Android";
                            }
                        }
                    }
                };
                return Device;
            })();
            Context.Device = Device;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="..\Serializer.ts"/>
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var Location = (function () {
                function Location() {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        Latitude: false,
                        Longitude: false,
                        IP: false,
                        Continent: false,
                        Country: false,
                        Province: false,
                        City: false
                    };
                }
                return Location;
            })();
            Context.Location = Location;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="..\Serializer.ts"/>
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var Operation = (function () {
                function Operation() {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        id: true
                    };
                    this.id = ApplicationInsights.Util.newGuid();
                }
                return Operation;
            })();
            Context.Operation = Operation;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="../serializer.ts" />
/// <reference path="../util.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var Session = (function () {
                /**
                * Constructs a new isntance of the Session class
                */
                function Session(config) {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        id: true,
                        isFirst: false,
                        isNewSession: false
                    };
                    if (!config) {
                        config = {};
                    }

                    if (!(typeof config.sessionExpirationMs === "function")) {
                        config.sessionExpirationMs = function () {
                            return Session.acquisitionSpan;
                        };
                    }

                    if (!(typeof config.sessionRenewalMs === "function")) {
                        config.sessionRenewalMs = function () {
                            return Session.renewalSpan;
                        };
                    }

                    this.config = config;

                    //get sessionId or create a new one if none exists
                    var cookie = ApplicationInsights.Util.getCookie('ai_session');
                    if (cookie && typeof cookie.split === "function") {
                        var params = cookie.split("|");
                        if (params.length > 0) {
                            this.id = params[0];
                        }

                        if (params.length > 1) {
                            var acq = params[1];
                            this.acquisitionDate = +new Date(acq);
                            this.acquisitionDate = this.acquisitionDate > 0 ? this.acquisitionDate : 0;
                        }

                        if (params.length > 1) {
                            var renewal = params[1];
                            this.renewalDate = +new Date(renewal);
                            this.renewalDate = this.renewalDate > 0 ? this.renewalDate : 0;
                        }
                    }

                    if (!this.id) {
                        this.renew();
                        this.isNewSession = true;
                        this.isFirst = true;
                    }
                }
                Session.prototype.update = function () {
                    var now = +new Date;

                    var acquisitionExpired = now - this.acquisitionDate > this.config.sessionExpirationMs();
                    var renewalExpired = now - this.renewalDate > this.config.sessionRenewalMs();

                    // renew if acquisitionSpan or renewalSpan has ellapsed
                    this.isFirst = undefined;
                    if (acquisitionExpired || renewalExpired) {
                        this.renew();
                        this.isNewSession = true;
                    } else {
                        this.renewalDate = +new Date;
                        this.setCookie(this.id, this.acquisitionDate, this.renewalDate);
                        this.isNewSession = false;
                    }
                };

                Session.prototype.renew = function () {
                    this.id = ApplicationInsights.Util.newGuid();
                    var now = +new Date;
                    this.acquisitionDate = now;
                    this.renewalDate = now;
                    this.setCookie(this.id, this.acquisitionDate, this.renewalDate);
                };

                Session.prototype.setCookie = function (guid, acq, renewal) {
                    var acqStr = ApplicationInsights.Util.toISOStringForIE8(new Date(acq));
                    var renewalStr = ApplicationInsights.Util.toISOStringForIE8(new Date(renewal));
                    var cookie = [guid, acqStr, renewalStr];
                    ApplicationInsights.Util.setCookie('ai_session', cookie.join('|'));
                };
                Session.acquisitionSpan = 24 * 60 * 60 * 1000;
                Session.renewalSpan = 30 * 60 * 1000;
                return Session;
            })();
            Context.Session = Session;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="../serializer.ts" />
/// <reference path="../util.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Context) {
            var User = (function () {
                function User(accountId) {
                    /**
                    * See ISerializable
                    */
                    this.aiDataContract = {
                        id: true,
                        accountId: false
                    };
                    //get userId or create new one if none exists
                    var cookie = ApplicationInsights.Util.getCookie('ai_user');
                    if (cookie) {
                        var params = cookie.split("|");
                        if (params.length > 0) {
                            this.id = params[0];
                        }
                    }

                    if (!this.id) {
                        this.id = ApplicationInsights.Util.newGuid();
                        ApplicationInsights.Util.setCookie('ai_user', this.id);
                    }

                    this.accountId = accountId;
                }
                return User;
            })();
            Context.User = User;
        })(ApplicationInsights.Context || (ApplicationInsights.Context = {}));
        var Context = ApplicationInsights.Context;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="data.ts" />
/// <reference path="internal.ts" />
/// <reference path="../../context/application.ts" />
/// <reference path="../../context/device.ts" />
/// <reference path="../../context/location.ts" />
/// <reference path="../../context/operation.ts" />
/// <reference path="../../context/session.ts" />
/// <reference path="../../context/user.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";

                var Base = (function () {
                    /**
                    * Constructs a new instance of a telemetry object.
                    */
                    function Base(name, data) {
                        this.ver = 1;
                        this.name = Common.DataSanitizer.sanitizeName(name);
                        ;
                        this.data = data;
                        this.time = ApplicationInsights.Util.toISOStringForIE8(new Date());

                        var contract = {
                            ver: true,
                            name: true,
                            time: true,
                            iKey: true,
                            device: false,
                            application: false,
                            user: false,
                            operation: false,
                            location: false,
                            session: false,
                            data: true,
                            internal: false
                        };

                        this.aiDataContract = contract;
                        this.internal = new Common.Internal();
                    }
                    return Base;
                })();
                Common.Base = Base;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="serializer.ts" />
/// <reference path="telemetry/common/base.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        var Sender = (function () {
            /**
            * Constructs a new instance of the Sender class
            */
            function Sender(config) {
                this._buffer = [];
                this._lastSend = 0;
                this._config = config;
                this._sender = null;
                if (typeof XMLHttpRequest != "undefined") {
                    var testXhr = new XMLHttpRequest();
                    if ("withCredentials" in testXhr) {
                        this._sender = this._xhrSender;
                    } else if (typeof XDomainRequest !== "undefined") {
                        this._sender = this._xdrSender; //IE 8 and 9
                    }
                }
            }
            /**
            * Add a telemetry item to the send buffer
            */
            Sender.prototype.send = function (telemetry) {
                var _this = this;
                // if master off switch is set, don't send any data
                if (this._config.disableTelemetry()) {
                    // Do not send/save data
                    return;
                }

                // validate input
                if (!telemetry) {
                    ApplicationInsights._InternalLogging.throwInternal("Cannot send empty telemetry");
                    return;
                }

                // ensure a sender was constructed
                if (!this._sender) {
                    ApplicationInsights._InternalLogging.throwInternal("No sender could be constructed for this environment, payload will be added to buffer." + ApplicationInsights.Serializer.serialize(telemetry));
                    return;
                }

                // check if the incoming payload is too large, truncate if necessary
                var payload = ApplicationInsights.Serializer.serialize(telemetry);
                if (payload.length > this._config.maxPayloadSizeInBytes()) {
                    telemetry = this._truncate(telemetry, payload.length);
                    payload = ApplicationInsights.Serializer.serialize(telemetry);
                }

                // flush if we would exceet the max-size limit by adding this item
                if (this._getSizeInBytes(this._buffer) + payload.length > this._config.maxBatchSizeInBytes()) {
                    this.triggerSend();
                }

                // enqueue the payload
                this._buffer.push(payload);

                // ensure an invocation timeout is set
                if (!this._timeoutHandle) {
                    this._timeoutHandle = setTimeout(function () {
                        _this._timeoutHandle = null;
                        _this.triggerSend();
                    }, this._config.maxBatchInterval());
                }
            };

            Sender.prototype._getSizeInBytes = function (list) {
                var size = 0;
                if (list && list.length) {
                    for (var i = 0; i < list.length; i++) {
                        var item = list[i];
                        if (item && item.length) {
                            size += item.length;
                        }
                    }
                }

                return size;
            };

            Sender.prototype._truncate = function (telemetry, initialSize) {
                if (telemetry && telemetry.data && telemetry.data.item) {
                    var maxSize = this._config.maxPayloadSizeInBytes();
                    telemetry.data.item.properties = { Error: "optional fields truncated because they exceeded: " + maxSize + " bytes" };
                    delete telemetry.data.item.measurements;
                }

                return telemetry;
            };

            /**
            * Immediately sennd buffered data
            */
            Sender.prototype.triggerSend = function () {
                // Send data only if disableTelemetry is false
                if (!this._config.disableTelemetry()) {
                    if (this._buffer.length) {
                        // compose an array of payloads
                        var batch = "[" + this._buffer.join(",") + "]";

                        // invoke send
                        this._sender(batch);
                    }

                    // update lastSend time to enable throttling
                    this._lastSend = +new Date;
                }

                // clear buffer
                this._buffer.length = 0;
                clearTimeout(this._timeoutHandle);
                this._timeoutHandle = null;
            };

            /**
            * Send XMLHttpRequest
            */
            Sender.prototype._xhrSender = function (payload) {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", this._config.endpointUrl(), true);
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.onreadystatechange = function () {
                    return Sender._xhrReadyStateChange(xhr, payload);
                };
                xhr.onerror = function (event) {
                    return Sender._onError(payload, xhr.responseText || xhr.response || "", event);
                };
                xhr.send(payload);
            };

            /**
            * Send XDomainRequest
            */
            Sender.prototype._xdrSender = function (payload) {
                var xdr = new XDomainRequest();
                xdr.onload = function () {
                    return Sender._xdrOnLoad(xdr, payload);
                };
                xdr.onerror = function (event) {
                    return Sender._onError(payload, xdr.responseText || "", event);
                };
                xdr.open('POST', this._config.endpointUrl());
                xdr.send(payload);
            };

            /**
            * xhr state changes
            */
            Sender._xhrReadyStateChange = function (xhr, payload) {
                if (xhr.readyState === 4) {
                    if ((xhr.status < 200 || xhr.status >= 300) && xhr.status !== 0) {
                        Sender._onError(payload, xhr.responseText || xhr.response || "");
                    } else {
                        Sender._onSuccess(payload);
                    }
                }
            };

            /**
            * xdr state changes
            */
            Sender._xdrOnLoad = function (xdr, payload) {
                if (xdr && (xdr.responseText + "" === "200" || xdr.responseText === "")) {
                    Sender._onSuccess(payload);
                } else {
                    Sender._onError(payload, xdr && xdr.responseText || "");
                }
            };

            /**
            * error handler
            */
            Sender._onError = function (payload, message, event) {
                ApplicationInsights._InternalLogging.throwInternal("Failed to send telemetry:\n" + message + "\n\nPayload:\n" + payload);
            };

            /**
            * success handler
            */
            Sender._onSuccess = function (payload) {
                // no-op, used in tests
            };
            return Sender;
        })();
        ApplicationInsights.Sender = Sender;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var Trace = (function (_super) {
                __extends(Trace, _super);
                /**
                * Constructs a new instance of the MetricTelemetry object
                */
                function Trace(message, properties, measurements) {
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.MessageData", (new _MessageData(message, properties, measurements)));
                    _super.call(this, Trace.type, data);
                }
                Trace.type = "Microsoft.ApplicationInsights.Message";
                return Trace;
            })(Telemetry.Common.Base);
            Telemetry.Trace = Trace;

            var _MessageData = (function () {
                function _MessageData(message, properties, measurements) {
                    this.aiDataContract = {
                        ver: true,
                        message: true,
                        measurements: false,
                        properties: false
                    };
                    this.ver = 1;
                    this.message = Telemetry.Common.DataSanitizer.sanitizeMessage(message);
                    this.properties = Telemetry.Common.DataSanitizer.sanitizeProperties(properties);
                    this.measurements = Telemetry.Common.DataSanitizer.sanitizeMeasurements(measurements);
                }
                return _MessageData;
            })();
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="item.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";

                /**
                * Base class for telemetry of an event
                * this is used by Event, PageView, and AJAX
                */
                var EventData = (function (_super) {
                    __extends(EventData, _super);
                    function EventData(name, url, durationMs, properties, measurements) {
                        var contractExtension = {
                            name: false,
                            url: false,
                            duration: false
                        };

                        _super.call(this, contractExtension, properties, measurements);

                        this.url = Common.DataSanitizer.sanitizeUrl(url);
                        ;
                        this.name = Common.DataSanitizer.sanitizeName(name);
                        ;
                        if (!isNaN(durationMs)) {
                            this.duration = ApplicationInsights.Util.msToTimeSpan(durationMs);
                        }
                    }
                    return EventData;
                })(Common.Item);
                Common.EventData = EventData;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
/// <reference path="common/eventdata.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var AjaxCall = (function (_super) {
                __extends(AjaxCall, _super);
                /**
                * Constructs a new instance of the AjaxCallTelemetry object
                */
                function AjaxCall() {
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.AJAXCallData", new _AJAXCallData());

                    _super.call(this, AjaxCall.type, data);
                }
                AjaxCall.type = "Microsoft.ApplicationInsights.AJAXCall";
                return AjaxCall;
            })(Telemetry.Common.Base);
            Telemetry.AjaxCall = AjaxCall;

            var _AJAXCallData = (function (_super) {
                __extends(_AJAXCallData, _super);
                function _AJAXCallData() {
                    _super.call(this, "", "", 0, undefined, undefined);
                    this.ver = 1;
                    this.ajaxURL = "";
                    this.requestSize = "";
                    this.responseSize = "";
                    this.timeToFIrstByte = "";
                    this.timetoLastByte = "";
                    this.callbackDuration = "";
                    this.reponseCode = "";
                    this.success = true;
                    /**
                    * The data contract for serialization
                    */
                    this.aiDataContract = {
                        ver: true,
                        name: true,
                        url: true,
                        duration: true,
                        ajaxURL: true,
                        requestSize: true,
                        responseSize: true,
                        timeToFIrstByte: true,
                        timetoLastByte: true,
                        callbackDuration: true,
                        reponseCode: true,
                        success: true,
                        measurements: false,
                        properties: false
                    };
                }
                return _AJAXCallData;
            })(Telemetry.Common.EventData);
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="Common\Base.ts" />
/// <reference path="..\Serializer.ts"/>
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var Event = (function (_super) {
                __extends(Event, _super);
                /**
                * Constructs a new instance of the EventTelemetry object
                */
                function Event(name, durationMs, properties, measurements) {
                    var item = new Telemetry.Common.EventData(name, undefined, durationMs, properties, measurements);
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.EventData", item);
                    _super.call(this, Event.type, data);
                }
                Event.type = "Microsoft.ApplicationInsights.Event";
                return Event;
            })(Telemetry.Common.Base);
            Telemetry.Event = Event;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
/// <reference path="common/item.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var Exception = (function (_super) {
                __extends(Exception, _super);
                /**
                * Constructs a new isntance of the ExceptionTelemetry object
                */
                function Exception(exceptions, handledAt, properties, measurements) {
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.ExceptionData", new _ExceptionData(exceptions, handledAt, properties, measurements));
                    _super.call(this, Exception.type, data);
                }
                Exception.type = "Microsoft.ApplicationInsights.Exception";
                return Exception;
            })(Telemetry.Common.Base);
            Telemetry.Exception = Exception;

            var _ExceptionData = (function (_super) {
                __extends(_ExceptionData, _super);
                function _ExceptionData(rawException, handledAt, properties, measurements) {
                    var contractExtension = {
                        handledAt: true,
                        exceptions: []
                    };

                    _super.call(this, contractExtension, properties, measurements);

                    this.handledAt = handledAt || "unhandled";
                    this.exceptions = [new _ExceptionDataExceptions(rawException)];
                }
                return _ExceptionData;
            })(Telemetry.Common.Item);

            var _ExceptionDataExceptions = (function () {
                function _ExceptionDataExceptions(exception) {
                    this.aiDataContract = {
                        id: false,
                        outerId: false,
                        typeName: true,
                        message: true,
                        hasFullStack: false,
                        stack: false,
                        parsedStack: []
                    };
                    this.typeName = Telemetry.Common.DataSanitizer.sanitizeName(exception.name);
                    this.message = Telemetry.Common.DataSanitizer.sanitizeMessage(exception.message);
                    this.stack = Telemetry.Common.DataSanitizer.sanitizeException(exception["stack"]);
                    this.parsedStack = this.parseStack(this.stack);
                    this.hasFullStack = typeof this.parsedStack !== "undefined";
                }
                _ExceptionDataExceptions.prototype.parseStack = function (stack) {
                    var parsedStack = undefined;
                    if (typeof stack === "string") {
                        var frames = stack.split('\n');
                        parsedStack = [];
                        var level = 0;

                        // DP Constraint - exception parsed stack must be < 32KB
                        // With the assumption that each frame can be a max of 4KB, we are limiting the amount of frames to 8
                        var maxStackFrames = (frames.length > 8) ? 8 : frames.length;
                        for (var i = 0; i <= maxStackFrames; i++) {
                            var frame = frames[i];
                            if (_ExceptionStackFrame.regex.test(frame)) {
                                parsedStack.push(new _ExceptionStackFrame(frames[i], level++));
                            }
                        }
                    }

                    return parsedStack;
                };
                return _ExceptionDataExceptions;
            })();

            var _ExceptionStackFrame = (function () {
                function _ExceptionStackFrame(frame, level) {
                    this.method = "";
                    this.aiDataContract = {
                        level: true,
                        method: true,
                        assembly: false,
                        fileName: false,
                        line: false
                    };
                    this.level = level;
                    this.method = "unavailable";
                    this.assembly = ApplicationInsights.Util.trim(frame);
                    var matches = frame.match(_ExceptionStackFrame.regex);
                    if (matches && matches.length >= 5) {
                        this.method = ApplicationInsights.Util.trim(matches[2]);
                        this.fileName = ApplicationInsights.Util.trim(matches[4]);
                        this.line = parseInt(matches[5]);
                    }
                }
                _ExceptionStackFrame.regex = /^([\s]+at)?(.*?)(\@|\s\(|\s)([^\(\@\n]+):([0-9]+):([0-9]+)(\)?)$/;
                return _ExceptionStackFrame;
            })();
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var Metric = (function (_super) {
                __extends(Metric, _super);
                /**
                * Constructs a new instance of the MetricTelemetry object
                */
                function Metric(name, value, type, count, min, max, properties, measurements) {
                    var metricData = new _MetricData(name, value, type, count, min, max, properties, measurements);
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.MetricData", metricData);
                    _super.call(this, Metric.type, data);
                }
                Metric.type = "Microsoft.ApplicationInsights.Metric";
                return Metric;
            })(Telemetry.Common.Base);
            Telemetry.Metric = Metric;

            var _MetricData = (function (_super) {
                __extends(_MetricData, _super);
                function _MetricData(name, value, type, count, min, max, properties, measurements) {
                    var contract = {
                        metrics: []
                    };

                    _super.call(this, contract, properties, measurements);
                    this.metrics = [new Telemetry.Common.DataPoint(name, value, type, count, min, max)];
                }
                return _MetricData;
            })(Telemetry.Common.Item);
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var PageView = (function (_super) {
                __extends(PageView, _super);
                /**
                * Constructs a new instance of the PageEventTelemetry object
                */
                function PageView(name, url, durationMs, properties, measurements) {
                    // initialize data
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.PageviewData", new Telemetry.Common.EventData(name, url, durationMs, properties, measurements));
                    _super.call(this, PageView.type, data);
                }
                PageView.type = "Microsoft.ApplicationInsights.Pageview";
                return PageView;
            })(Telemetry.Common.Base);
            Telemetry.PageView = PageView;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
/// <reference path="pageview.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var PageViewPerformance = (function (_super) {
                __extends(PageViewPerformance, _super);
                /**
                * Constructs a new instance of the PageEventTelemetry object
                */
                function PageViewPerformance(name, url, durationMs, properties, measurements) {
                    // initialize data
                    var data = new Telemetry.Common.Data(_PageViewPerformanceData.type, new _PageViewPerformanceData(name, url, durationMs, properties, measurements));
                    _super.call(this, PageViewPerformance.type, data);
                }
                /**
                * Returns undefined if not available, true if ready, false otherwise
                */
                PageViewPerformance.checkPageLoad = function () {
                    var status = undefined;
                    if (typeof window != "undefined" && window.performance && window.performance.timing) {
                        var timing = window.performance.timing;
                        status = timing.domainLookupStart > 0 && timing.navigationStart > 0 && timing.responseStart > 0 && timing.requestStart > 0 && timing.loadEventEnd > 0 && timing.responseEnd > 0 && timing.connectEnd > 0 && timing.domLoading > 0;
                    }

                    return status;
                };

                PageViewPerformance.getDuration = function (start, end) {
                    var duration = 0;
                    if (!(isNaN(start) || isNaN(end) || start === 0 || end === 0)) {
                        duration = Math.max(end - start, 0);
                    }

                    return duration;
                };
                PageViewPerformance.type = "Microsoft.ApplicationInsights.PageviewPerformance";
                return PageViewPerformance;
            })(Telemetry.Common.Base);
            Telemetry.PageViewPerformance = PageViewPerformance;

            var _PageViewPerformanceData = (function (_super) {
                __extends(_PageViewPerformanceData, _super);
                function _PageViewPerformanceData(name, url, durationMs, properties, measurements) {
                    var contractExtension = {
                        perfTotal: false,
                        networkConnect: false,
                        sentRequest: false,
                        receivedResponse: false,
                        domProcessing: false
                    };

                    if (typeof window != "undefined" && window.performance && window.performance.timing) {
                        /*
                        * http://www.w3.org/TR/navigation-timing/#processing-model
                        *  |-navigationStart
                        *  |             |-connectEnd
                        *  |             ||-requestStart
                        *  |             ||             |-responseStart
                        *  |             ||             |              |-responseEnd
                        *  |             ||             |              ||-domLoading
                        *  |             ||             |              ||         |-loadEventEnd
                        *  |---network---||---request---|---response---||---dom---|
                        *  |--------------------------total-----------------------|
                        */
                        var timing = window.performance.timing;
                        var total = PageViewPerformance.getDuration(timing.navigationStart, timing.loadEventEnd);
                        var network = PageViewPerformance.getDuration(timing.navigationStart, timing.connectEnd);
                        var request = PageViewPerformance.getDuration(timing.requestStart, timing.responseStart);
                        var response = PageViewPerformance.getDuration(timing.responseStart, timing.responseEnd);
                        var dom = PageViewPerformance.getDuration(timing.domLoading, timing.loadEventEnd);

                        // use timing data for duration if possible
                        durationMs = total;

                        // convert to timespans
                        this.perfTotal = ApplicationInsights.Util.msToTimeSpan(total);
                        this.networkConnect = ApplicationInsights.Util.msToTimeSpan(network);
                        this.sentRequest = ApplicationInsights.Util.msToTimeSpan(request);
                        this.receivedResponse = ApplicationInsights.Util.msToTimeSpan(response);
                        this.domProcessing = ApplicationInsights.Util.msToTimeSpan(dom);
                    }

                    // this order is important, the contract cannot be extended before calling super()
                    _super.call(this, name, url, durationMs, properties, measurements);
                    this.aiDataContract = Telemetry.Common.Item.extendContract(this.aiDataContract, contractExtension);
                }
                _PageViewPerformanceData.type = "Microsoft.ApplicationInsights.PageViewPerformanceData";
                return _PageViewPerformanceData;
            })(Telemetry.Common.EventData);
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            (function (Common) {
                "use strict";

                /**
                * Base class for telemetry with data
                * this is used by Metric and RemoteDependency
                */
                var DataPoint = (function () {
                    function DataPoint(name, value, type, count, min, max) {
                        this.aiDataContract = {
                            name: true,
                            value: true,
                            type: false,
                            count: false,
                            min: false,
                            max: false
                        };
                        this.name = Common.DataSanitizer.sanitizeName(name);
                        ;
                        this.value = value;
                        if (!type) {
                            type = "M";
                        }
                        if (type !== "M" && type !== "A") {
                            ApplicationInsights._InternalLogging.throwInternal("Invalid type specified '" + type + "', only 'M' or 'A' are allowed. Defaulting to 'M' for single metrics");
                            type = "M";
                        }

                        this.type = type;
                        this.count = count > 0 ? count : undefined;
                        this.min = isNaN(min) || min === null ? undefined : min;
                        this.max = isNaN(max) || max === null ? undefined : max;
                    }
                    return DataPoint;
                })();
                Common.DataPoint = DataPoint;
            })(Telemetry.Common || (Telemetry.Common = {}));
            var Common = Telemetry.Common;
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
/// <reference path="metric.ts" />
/// <reference path="common/datapoint.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var RemoteDependency = (function (_super) {
                __extends(RemoteDependency, _super);
                /**
                * Constructs a new instance of the EventTelemetry object
                */
                function RemoteDependency(dependencyKind, resource, name, value, type, count, min, max) {
                    var data = new Telemetry.Common.Data("Microsoft.ApplicationInsights.RemoteDependencyData", new _RemoteDependencyData(dependencyKind, resource, name, value, type, count, min, max));

                    _super.call(this, RemoteDependency.type, data);
                }
                RemoteDependency.type = "Microsoft.ApplicationInsights.RemoteDependency";
                return RemoteDependency;
            })(Telemetry.Common.Base);
            Telemetry.RemoteDependency = RemoteDependency;

            var _RemoteDependencyData = (function (_super) {
                __extends(_RemoteDependencyData, _super);
                function _RemoteDependencyData(dependencyKind, resource, name, value, type, count, min, max) {
                    _super.call(this, name, value, type, count, min, max);

                    this.ver = 1;
                    this.dependencyKind = dependencyKind;
                    this.resource = resource;
                    this.name = name;

                    var contractExtension = {
                        ver: true,
                        dependencyKind: false,
                        resource: true,
                        measurements: false,
                        properties: false
                    };

                    this.aiDataContract = Telemetry.Common.Item.extendContract(this.aiDataContract, contractExtension);
                }
                return _RemoteDependencyData;
            })(Telemetry.Common.DataPoint);
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="common/base.ts" />
/// <reference path="../serializer.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        (function (Telemetry) {
            var Request = (function (_super) {
                __extends(Request, _super);
                /**
                * Constructs a new instance of the EventTelemetry object
                */
                function Request(name, start, duration, responseCode, success, properties, measurements) {
                    var data = new Telemetry.Common.Data(_RequestData.type, new _RequestData(name, start, duration, responseCode, success, properties, measurements));

                    _super.call(this, Request.type, data);
                }
                Request.type = "Microsoft.ApplicationInsights.Request";
                return Request;
            })(Telemetry.Common.Base);
            Telemetry.Request = Request;

            var _RequestData = (function () {
                function _RequestData(name, start, duration, responseCode, success, properties, measurements) {
                    this.ver = 1;
                    this.name = "";
                    /**
                    * The data contract for serialization
                    */
                    this.aiDataContract = {
                        ver: true,
                        name: true,
                        id: false,
                        startTime: false,
                        duration: false,
                        responseCode: false,
                        success: false,
                        measurements: false,
                        properties: false
                    };
                    this.ver = 1;
                    this.id = ApplicationInsights.Util.newGuid();
                    this.name = Telemetry.Common.DataSanitizer.sanitizeName(name);
                    this.startTime = ApplicationInsights.Util.toISOStringForIE8(new Date(start));
                    this.duration = ApplicationInsights.Util.msToTimeSpan(duration);
                    this.responseCode = responseCode.toString();
                    this.success = success;
                    this.properties = Telemetry.Common.DataSanitizer.sanitizeProperties(properties);
                    this.measurements = Telemetry.Common.DataSanitizer.sanitizeMeasurements(measurements);
                }
                _RequestData.type = "Microsoft.ApplicationInsights.RequestData";
                return _RequestData;
            })();
        })(ApplicationInsights.Telemetry || (ApplicationInsights.Telemetry = {}));
        var Telemetry = ApplicationInsights.Telemetry;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="sender.ts"/>
/// <reference path="telemetry/trace.ts" />
/// <reference path="telemetry/ajaxcall.ts" />
/// <reference path="telemetry/event.ts" />
/// <reference path="telemetry/exception.ts" />
/// <reference path="telemetry/metric.ts" />
/// <reference path="telemetry/pageview.ts" />
/// <reference path="telemetry/pageviewperformance.ts" />
/// <reference path="telemetry/remotedependency.ts" />
/// <reference path="telemetry/request.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        "use strict";

        var TelemetryContext = (function () {
            function TelemetryContext(config) {
                this._config = config;
                this._sender = new ApplicationInsights.Sender(config);
                if (typeof window !== 'undefined') {
                    this.device = new ApplicationInsights.Context.Device();
                    this.application = config.appUserId() && new ApplicationInsights.Context.Application(config.appUserId());
                    this.user = new ApplicationInsights.Context.User(config.accountId());
                    this.operation = new ApplicationInsights.Context.Operation();
                    this.session = new ApplicationInsights.Context.Session(config);
                }
            }
            /**
            * Use Sender.ts to send telemetry object to the endpoint
            */
            TelemetryContext.prototype.track = function (telemetryObject) {
                if (!telemetryObject) {
                    ApplicationInsights._InternalLogging.throwInternal("Telemetry is null");
                } else {
                    // apply context if the user has not specified
                    telemetryObject.iKey = telemetryObject.iKey || this._config.instrumentationKey();
                    telemetryObject.device = telemetryObject.device || this.device;
                    telemetryObject.user = telemetryObject.user || this.user;
                    telemetryObject.session = telemetryObject.session || this.session;
                    telemetryObject.application = telemetryObject.application || this.application;
                    telemetryObject.operation = telemetryObject.operation || this.operation;
                    telemetryObject.location = telemetryObject.location || this.location;

                    // update session context
                    if (telemetryObject.session && typeof telemetryObject.session.update === "function") {
                        telemetryObject.session.update();
                    }

                    this._sender.send(telemetryObject);
                }

                return telemetryObject;
            };
            return TelemetryContext;
        })();
        ApplicationInsights.TelemetryContext = TelemetryContext;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="telemetrycontext.ts" />
/// <reference path="util.ts" />
/// <reference path="logging.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        "use strict";

        ApplicationInsights.Version = "0.11.0.1";

        var AppInsights = (function () {
            function AppInsights(config) {
                var _this = this;
                this.config = config;

                ApplicationInsights._InternalLogging.enableDebugExceptions = function () {
                    return _this.config.enableDebug;
                };
                var configGetters = {
                    instrumentationKey: function () {
                        return _this.config.instrumentationKey;
                    },
                    accountId: function () {
                        return _this.config.accountId;
                    },
                    appUserId: function () {
                        return _this.config.appUserId;
                    },
                    sessionRenewalMs: function () {
                        return _this.config.sessionRenewalMs;
                    },
                    sessionExpirationMs: function () {
                        return _this.config.sessionExpirationMs;
                    },
                    endpointUrl: function () {
                        return _this.config.endpointUrl;
                    },
                    maxPayloadSizeInBytes: function () {
                        return _this.config.maxPayloadSizeInBytes;
                    },
                    maxBatchSizeInBytes: function () {
                        return _this.config.maxBatchSizeInBytes;
                    },
                    maxBatchInterval: function () {
                        return _this.config.maxBatchInterval;
                    },
                    disableTelemetry: function () {
                        return _this.config.disableTelemetry;
                    }
                };

                this.context = new Microsoft.ApplicationInsights.TelemetryContext(configGetters);

                // initialize event timing
                this._eventTracking = new Timing("trackEvent");
                this._eventTracking.action = function (name, url, duration, properties, measurements) {
                    var event = new ApplicationInsights.Telemetry.Event(name, duration, properties, measurements);
                    _this.context.track(event);
                };

                // initialize page view timing
                this._pageTracking = new Timing("trackPageView");
                this._pageTracking.action = function (name, url, duration, properties, measurements) {
                    var pageView = new ApplicationInsights.Telemetry.PageView(name, url, duration, properties, measurements);
                    _this.context.track(pageView);
                };
            }
            AppInsights.prototype.startTrackPage = function (name) {
                if (typeof name !== "string") {
                    name = window.document && window.document.title || "";
                }

                this._pageTracking.start(name);
            };

            AppInsights.prototype.stopTrackPage = function (name, url, properties, measurements) {
                if (typeof name !== "string") {
                    name = window.document && window.document.title || "";
                }

                if (typeof url !== "string") {
                    url = window.location && window.location.href || "";
                }

                this._pageTracking.stop(name, url, properties, measurements);
            };

            AppInsights.prototype.trackPageView = function (name, url, properties, measurements) {
                var _this = this;
                // ensure we have valid values for the required fields
                if (typeof name !== "string") {
                    name = window.document && window.document.title || "";
                }

                if (typeof url !== "string") {
                    url = window.location && window.location.href || "";
                }

                var durationMs = 0;

                // check if timing data is available
                if (ApplicationInsights.Telemetry.PageViewPerformance.checkPageLoad() !== undefined) {
                    // compute current duration (navigation start to now) for the pageViewTelemetry
                    var startTime = window.performance.timing.navigationStart;
                    durationMs = ApplicationInsights.Telemetry.PageViewPerformance.getDuration(startTime, +new Date);

                    // poll for page load completion and send page view performance data when ready
                    var handle = setInterval(function () {
                        // abort this check if we have not finished loading after 1 minute
                        durationMs = ApplicationInsights.Telemetry.PageViewPerformance.getDuration(startTime, +new Date);
                        var timingDataReady = ApplicationInsights.Telemetry.PageViewPerformance.checkPageLoad();
                        var timeoutReached = durationMs > 60000;
                        if (timeoutReached || timingDataReady) {
                            clearInterval(handle);
                            durationMs = ApplicationInsights.Telemetry.PageViewPerformance.getDuration(startTime, +new Date);
                            _this.context.track(new ApplicationInsights.Telemetry.PageViewPerformance(name, url, durationMs, properties, measurements));
                            _this.context._sender.triggerSend();
                        }
                    }, 100);
                }

                // track the initial page view
                this.context.track(new ApplicationInsights.Telemetry.PageView(name, url, durationMs, properties, measurements));
                setTimeout(function () {
                    // fire this event as soon as initial code execution completes in case the user navigates away
                    _this.context._sender.triggerSend();
                }, 100);
            };

            AppInsights.prototype.startTrackEvent = function (name) {
                this._eventTracking.start(name);
            };

            AppInsights.prototype.stopTrackEvent = function (name, properties, measurements) {
                this._eventTracking.stop(name, undefined, properties, measurements);
            };

            AppInsights.prototype.trackEvent = function (name, properties, measurements) {
                this.context.track(new ApplicationInsights.Telemetry.Event(name, null, properties, measurements));
            };

            AppInsights.prototype.trackException = function (exception, handledAt, properties, measurements) {
                if (!ApplicationInsights.Util.isError(exception)) {
                    try  {
                        throw new Error(exception);
                    } catch (error) {
                        exception = error;
                    }
                }

                this.context.track(new ApplicationInsights.Telemetry.Exception(exception, handledAt, properties, measurements));
            };

            AppInsights.prototype.trackMetric = function (name, value, properties, measurements) {
                this.context.track(new ApplicationInsights.Telemetry.Metric(name, value, undefined, undefined, undefined, undefined, properties, measurements));
            };

            AppInsights.prototype.trackTrace = function (message, properties, measurements) {
                message = message || "";
                this.context.track(new ApplicationInsights.Telemetry.Trace(message, properties, measurements));
            };

            AppInsights.prototype._onerror = function (message, url, lineNumber, columnNumber, error) {
                if (!ApplicationInsights.Util.isError(error)) {
                    try  {
                        throw new Error(message);
                    } catch (exception) {
                        error = exception;
                        if (!error["stack"]) {
                            error["stack"] = "@" + url + ":" + lineNumber + ":" + (columnNumber || 0);
                        }
                    }
                }

                this.trackException(error);
            };
            return AppInsights;
        })();
        ApplicationInsights.AppInsights = AppInsights;

        var Timing = (function () {
            function Timing(name) {
                this._name = name;
                this._events = {};
            }
            Timing.prototype.start = function (name) {
                if (typeof this._events[name] === "undefined") {
                    ApplicationInsights._InternalLogging.warnInternal("start" + this._name + " was called more than once for this event without calling stop" + this._name + ". key is '" + name + "'");
                }

                this._events[name] = +new Date;
            };

            Timing.prototype.stop = function (name, url, properties, measurements) {
                var start = this._events[name];
                if (start) {
                    var end = +new Date;
                    var duration = ApplicationInsights.Telemetry.PageViewPerformance.getDuration(start, end);
                    this.action(name, url, duration, properties, measurements);
                } else {
                    ApplicationInsights._InternalLogging.warnInternal("stop" + this._name + " was called without a corresponding start" + this._name + " . Event name is '" + name + "'");
                }

                delete this._events[name];
                this._events[name] = undefined;
            };
            return Timing;
        })();
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));
/// <reference path="appinsights.ts" />
var Microsoft;
(function (Microsoft) {
    (function (ApplicationInsights) {
        "use strict";

        var Initialization = (function () {
            function Initialization(snippet) {
                // initialize the queue and config in case they are undefined
                snippet.queue = snippet.queue || [];
                var config = snippet.config || {};

                // ensure instrumentationKey is specified
                if (config && !config.instrumentationKey) {
                    config = snippet;

                    // check for legacy instrumentation key
                    if (config["iKey"]) {
                        Microsoft.ApplicationInsights.Version = "0.10.0.0";
                        config.instrumentationKey = config["iKey"];
                    } else if (config["applicationInsightsId"]) {
                        Microsoft.ApplicationInsights.Version = "0.7.2.0";
                        config.instrumentationKey = config["applicationInsightsId"];
                    } else {
                        throw new Error("Cannot load Application Insights SDK, no instrumentationKey was provided.");
                    }
                }

                // set default values
                config.endpointUrl = config.endpointUrl || "//dc.services.visualstudio.com/v2/track";
                config.accountId = config.accountId;
                config.appUserId = config.appUserId;
                config.sessionRenewalMs = 30 * 60 * 1000;
                config.sessionExpirationMs = 24 * 60 * 60 * 1000;
                config.maxPayloadSizeInBytes = config.maxPayloadSizeInBytes > 0 ? config.maxPayloadSizeInBytes : 200000;
                config.maxBatchSizeInBytes = config.maxBatchSizeInBytes > 0 ? config.maxBatchSizeInBytes : 1000000;
                config.maxBatchInterval = !isNaN(config.maxBatchInterval) ? config.maxBatchInterval : 15000;
                config.enableDebug = !!config.enableDebug;
                config.autoCollectErrors = typeof config.autoCollectErrors === "boolean" ? config.autoCollectErrors : true;
                config.disableTelemetry = config.disableTelemetry;

                this.snippet = snippet;
                this.config = config;
            }
            // note: these are split into methods to enable unit tests
            Initialization.prototype.loadAppInsights = function () {
                // initialize global instance of appInsights
                var appInsights = new Microsoft.ApplicationInsights.AppInsights(this.config);

                // implement legacy version of trackPageView for 0.10<
                if (this.config["iKey"]) {
                    var originalTrackPageView = appInsights.trackPageView;
                    appInsights.trackPageView = function (pagePath, properties, measurements) {
                        originalTrackPageView.apply(appInsights, [null, pagePath, properties, measurements]);
                    };
                }

                // implement legacy pageView interface if it is present in the snippet
                var legacyPageView = "logPageView";
                if (typeof this.snippet[legacyPageView] === "function") {
                    appInsights[legacyPageView] = function (pagePath, properties, measurements) {
                        appInsights.trackPageView(null, pagePath, properties, measurements);
                    };
                }

                // implement legacy event interface if it is present in the snippet
                var legacyEvent = "logEvent";
                if (typeof this.snippet[legacyEvent] === "function") {
                    appInsights[legacyEvent] = function (name, properties, measurements) {
                        appInsights.trackEvent(name, properties, measurements);
                    };
                }

                return appInsights;
            };

            Initialization.prototype.emptyQueue = function () {
                try  {
                    if (Microsoft.ApplicationInsights.Util.isArray(this.snippet.queue)) {
                        // note: do not check length in the for-loop conditional in case something goes wrong and the stub methods are not overridden.
                        var length = this.snippet.queue.length;
                        for (var i = 0; i < length; i++) {
                            var call = this.snippet.queue[i];
                            call();
                        }

                        this.snippet.queue = undefined;
                        delete this.snippet.queue;
                    }
                } catch (exception) {
                    var message = "Failed to send queued telemetry";
                    if (exception && typeof exception.toString === "function") {
                        message += ": " + exception.toString();
                    }

                    Microsoft.ApplicationInsights._InternalLogging.throwInternal(message);
                }
            };
            return Initialization;
        })();
        ApplicationInsights.Initialization = Initialization;
    })(Microsoft.ApplicationInsights || (Microsoft.ApplicationInsights = {}));
    var ApplicationInsights = Microsoft.ApplicationInsights;
})(Microsoft || (Microsoft = {}));

// only initialize if we are running in a browser that supports JSON serialization (ie7<, node.js, cordova)
if (typeof window !== "undefined" && typeof JSON !== "undefined") {
    // get snippet or initialize to an empty object
    var aiName = "appInsights";
    var snippet = window[aiName] || {};

    // overwrite snippet with full appInsights
    var init = new Microsoft.ApplicationInsights.Initialization(snippet);
    var appInsights = init.loadAppInsights();

    for (var field in appInsights) {
        snippet[field] = appInsights[field];
    }

    init.emptyQueue();
}

module.exports = Microsoft.ApplicationInsights;
