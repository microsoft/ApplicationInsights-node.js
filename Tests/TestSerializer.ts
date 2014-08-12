var Logging = {
    throwInternal: (string) => null,
    warnInternal: (string) => null
}

module Microsoft.ApplicationInsights {

    export interface ISerializable {
        /**
         * The set of fields for a serializeable object. 
         * This defines the serialization order and a value of true/false
         * for each field defines whether the field is required or not.
         */
        aiDataContract: any;
    }

    export class Serializer {

        /**
         * Serializes the current object to a JSON string.
         */
        public static serialize(input: ISerializable): string {
            var output = Serializer.serializeObject(input, "root");
            return JSON.stringify(output);
        }

        private static serializeObject(source: ISerializable, name: string): any {
            var circularReferenceCheck = "__aiCircularRefCheck";
            var output = {};

            if (!source) {
                Logging.throwInternal("source is null");
                return output;
            }

            if (source[circularReferenceCheck]) {
                Logging.throwInternal("Circular reference detected while serializing: '" + name);
                return output;
            }

            if (!source.aiDataContract) {
                Logging.warnInternal("Attempting to serialize an object which does not implement ISerializable: " + name);

                try {
                    // verify that the object can be stringified
                    JSON.stringify(source);
                    output = source;
                } catch (e) {
                    // if serialization fails return an empty string
                    Logging.throwInternal(e && typeof e.toString === 'function' ? e.toString() : "Error serializing object");
                }

                return output;
            }

            source[circularReferenceCheck] = true;
            for (var field in source.aiDataContract) {
                var isRequired = source.aiDataContract[field];
                var isArray = typeof isRequired !== "boolean";
                var isPresent = source[field] !== undefined;
                var isObject = typeof source[field] === "object" && source[field] !== null;

                if (isRequired && !isPresent) {
                    Logging.throwInternal("Missing required field specification: The field '" + field + "' is required but not present on source");

                    // If not in debug mode, continue and hope the error is permissible
                    continue;
                }

                if (isObject) {
                    if (isArray) {
                        // special case; resurse on each object in the source array
                        output[field] = Serializer.serializeArray(source[field], field);
                    } else {
                        // recurse on the source object in this field
                        output[field] = Serializer.serializeObject(source[field], field);
                    }
                } else {
                    // assign the source field to the output even if undefined or required
                    output[field] = source[field];
                }
            }

            delete source[circularReferenceCheck];
            return output;
        }

        private static serializeArray(sources: Array<ISerializable>, name: string): Array<any> {
            var output = undefined;

            if (!!sources) {
                output = [];
                for (var i = 0; i < sources.length; i++) {
                    var source = sources[i];
                    var item = Serializer.serializeObject(source, name + "[" + i + "]");
                    output.push(item);
                }
            }

            return output;
        }
    }
}

module.exports =
{
    Serializer: Microsoft.ApplicationInsights.Serializer,
}
