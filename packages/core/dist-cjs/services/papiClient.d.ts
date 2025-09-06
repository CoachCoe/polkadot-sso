export interface PapiClientConfig {
    chain: 'polkadot' | 'kusama';
    endpoint?: string;
    useLightClient?: boolean;
}
export declare class PapiClientService {
    private client;
    private config;
    private isConnected;
    constructor(config: PapiClientConfig);
    connect(): Promise<void>;
    private connectLightClient;
    private connectWebSocket;
    private getDefaultEndpoint;
    disconnect(): Promise<void>;
    getClient(): any;
    getLatestBlock(): Promise<any>;
    getAccountInfo(address: string): Promise<any>;
    getBalance(address: string): Promise<any>;
    submitTransaction(tx: any): Promise<string>;
    isHealthy(): boolean;
}
export declare const createPapiClient: (config: PapiClientConfig) => PapiClientService;
//# sourceMappingURL=papiClient.d.ts.map