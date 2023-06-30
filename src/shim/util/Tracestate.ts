/**
 * Helper class to manage parsing and strict-validation of tracestate header. W3C tracestate spec
 * is documented at https://www.w3.org/TR/trace-context/#header-value
 * @class Tracestate
 */
class Tracestate {
    public static strict = true;

    public fieldmap: string[] = [];

    // if true, performs strict tracestate header checking, else just passes it along
    constructor(id?: string) {
        if (!id) {
            return;
        }
        this.fieldmap = this.parseHeader(id);
    }

    public toString(): string {
        const fieldarr = this.fieldmap;

        if (!fieldarr || fieldarr.length === 0) {
            return null;
        }

        return fieldarr.join(", ");
    }

    private static validateKeyChars(key: string): boolean {
        const keyParts = key.split("@");
        if (keyParts.length === 2) {
            // Parse for tenant@vendor format
            const tenant = keyParts[0].trim();
            const vendor = keyParts[1].trim();
            const tenantValid = Boolean(tenant.match(/^[\ ]?[a-z0-9\*\-\_/]{1,241}$/));
            const vendorValid = Boolean(vendor.match(/^[\ ]?[a-z0-9\*\-\_/]{1,14}$/));
            return tenantValid && vendorValid;
        } else if (keyParts.length === 1) {
            // Parse for standard key format
            return Boolean(key.match(/^[\ ]?[a-z0-9\*\-\_/]{1,256}$/));
        }

        return false;
    }

    private parseHeader(id: string): string[] {
        const res: string[] = [];
        const keydeduper: {[key: string]: boolean} = {};
        const parts = id.split(",");
        if (parts.length > 32) { return null; }
        for (const rawPart of parts) {
            const part = rawPart.trim(); // trim out whitespace
            if (part.length === 0) {
                continue; // Discard empty pairs, but keep the rest of this tracestate
            }

            const pair = part.split("=");
            // pair should contain exactly one "="
            if (pair.length !== 2) {
                return null; // invalid pair: discard entire tracestate
            }

            // Validate length and charset of this key
            if (!Tracestate.validateKeyChars(pair[0])) {
                return null;
            }

            // Assert uniqueness of this key
            if (keydeduper[pair[0]]) {
                return null; // duplicate key: discard entire tracestate
            } 
                keydeduper[pair[0]] = true
            

            // All checks passed -- add this part
            res.push(part);
        }

        return res;
    }
}

export = Tracestate;
