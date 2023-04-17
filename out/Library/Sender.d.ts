import AuthorizationHandler = require("./AuthorizationHandler");
import Config = require("./Config");
import Contracts = require("../Declarations/Contracts");
import Statsbeat = require("../AutoCollection/Statsbeat");
declare class Sender {
    private static TAG;
    static WAIT_BETWEEN_RESEND: number;
    static MAX_BYTES_ON_DISK: number;
    static MAX_CONNECTION_FAILURES_BEFORE_WARN: number;
    static CLEANUP_TIMEOUT: number;
    static FILE_RETEMPTION_PERIOD: number;
    static TEMPDIR_PREFIX: string;
    static HTTP_TIMEOUT: number;
    private _config;
    private _isStatsbeatSender;
    private _shutdownStatsbeat;
    private _failedToIngestCounter;
    private _statsbeatHasReachedIngestionAtLeastOnce;
    private _statsbeat;
    private _onSuccess;
    private _onError;
    private _getAuthorizationHandler;
    private _enableDiskRetryMode;
    private _numConsecutiveFailures;
    private _numConsecutiveRedirects;
    private _resendTimer;
    private _fileCleanupTimer;
    private _redirectedHost;
    private _tempDir;
    private _requestTimedOut;
    protected _resendInterval: number;
    protected _maxBytesOnDisk: number;
    constructor(config: Config, getAuthorizationHandler?: (config: Config) => AuthorizationHandler, onSuccess?: (response: string) => void, onError?: (error: Error) => void, statsbeat?: Statsbeat, isStatsbeatSender?: boolean, shutdownStatsbeat?: () => void);
    /**
    * Enable or disable offline mode
    */
    setDiskRetryMode(value: boolean, resendInterval?: number, maxBytesOnDisk?: number): void;
    send(envelopes: Contracts.EnvelopeTelemetry[], callback?: (v: string) => void): Promise<void>;
    saveOnCrash(envelopes: Contracts.EnvelopeTelemetry[]): void;
    private _isRetriable;
    private _logInfo;
    private _logWarn;
    private _statsbeatFailedToIngest;
    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    private _storeToDisk;
    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    private _storeToDiskSync;
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _sendFirstFileOnDisk;
    private _onErrorHelper;
    private _fileCleanupTask;
}
export = Sender;
