'use strict'

import ContractsModule = require('../Library/Contracts');
import RequestParser = require('./RequestParser');
import Client = require('../Library/Client');

abstract class DependencyParser {
    private _rootRequest: RequestParser;
    private _client: Client;

    // unfortunately request means an **incoming** request in App Insights
    // but also is often used to refer to **outgoing** HTTP calls in Node
    // because of the `http.request` API.

    get rootRequest () : RequestParser | null {
        // if we don't have one we don't want to accidentally manipulate it
        // in children so we create a new empty object
        return this._rootRequest;
    }

    // could be situations where we can't find our root at first
    // but we can later so allow setting
    set rootRequest ( value: RequestParser | null ) {
        this._rootRequest = value;
    }

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

    protected abstract _getDependencyData () : ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData>;
}

export = DependencyParser;
