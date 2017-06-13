/**
 * Base class for helpers that read data from HTTP requst/response objects and convert them
 * into the telemetry contract objects.
 */
abstract class RequestParser {
    protected method: string;
    protected url: string;
    protected startTime: number;
    protected duration: number;
    protected statusCode: number;
    protected properties: { [key: string]: string };

    /**
     * Gets a url parsed out from request options
     */
    public getUrl(): string {
        return this.url;
    }

    protected RequestParser() {
        this.startTime = +new Date();
    }

    protected _setStatus(status: number, error: Error | string, properties: { [key: string]: string }) {
        let endTime = +new Date();
        this.duration = endTime - this.startTime;
        this.statusCode = status;

        if (error) {
            if(!properties) {
                properties = <{[key: string]: string}>{};
            }

            if (typeof error === "string") {
                properties["error"] = error;
            } else if (error instanceof Error) {
                properties["error"] = error.message;
            } else if (typeof error === "object") {
                for (var key in <any>error) {
                    properties[key] = (<any>error)[key] && (<any>error)[key].toString && (<any>error)[key].toString();
                }
            }
        }

        this.properties = properties;
    }

    protected _isSuccess() {
        return (0 < this.statusCode) && (this.statusCode < 400);
    }
}

export = RequestParser;
