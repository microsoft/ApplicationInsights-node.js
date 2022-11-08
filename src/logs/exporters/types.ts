/**
 * Exporter sender.
 * @internal
 */
 export interface ISender {
    send(payload: unknown[]): Promise<SenderResult>;
    shutdown(): Promise<void>;
    handlePermanentRedirect(location: string | undefined): void;
}

/**
 * Exporter sender result.
 * @internal
 */
 export type SenderResult = { statusCode: number | undefined; result: string };

 /**
 * Exporter persistent storage.
 * @internal
 */
export interface IPersistentStorage {
    shift(): Promise<unknown>;
    push(value: unknown[]): Promise<boolean>;
}
