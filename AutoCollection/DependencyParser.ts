import ContractsModule = require('../Library/Contracts');
import RequestParser = require('./RequestParser');
import Client = require('../Library/Client');

abstract class DependencyParser {
    private _rootRequest: RequestParser;
    private _client: Client;

    // A Request in App Insights means an **incoming** HTTP request.
    // A request in Node.js often refers to an **outgoing** HTTP request
    //     because of the `http.request` API and `request` module.
    // To disambiguate we refer to the AI Request as rootRequest.
    get rootRequest () : RequestParser {
        return this._rootRequest;
    }

    set rootRequest ( value: RequestParser ) {
        this._rootRequest = value;
    }

    // only settable in constructor
    get client () : Client {
        return this._client;
    }

    constructor ( rootRequest: RequestParser, client: Client ) {
        this._client = client;
        this._rootRequest = rootRequest;
    }

    public getDependencyData() : ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData> {
        return this._getDependencyData();
    }

    get dependencyData () : ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData> {
        return this._getDependencyData();
    }

    /*
     * Overridden with implementation in derived classes.
     */
    protected abstract _getDependencyData () : ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData>;
}

export = DependencyParser;
