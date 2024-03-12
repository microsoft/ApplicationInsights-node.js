import { Attributes } from "@opentelemetry/api";
import { Util } from "./util";

export function attributeSerialization(attributesToParse: any): Attributes {
    const attributes: Attributes = {};
    for (const [key, value] of Object.entries(attributesToParse)) {
        // Serialize Error objects as strings to avoid serialization errors
        if (value?.constructor.name === "Error") {
            attributes[key] = Util.getInstance().stringify(
                {
                    name: (value as Error).name,
                    message: (value as Error).message,
                    stack: (value as Error).stack
                }
            );
        } else {
            (attributes as any)[key] = typeof value === 'object'
            ? Util.getInstance().stringify(value)
            : value;
        }
    }
    return attributes;
}
