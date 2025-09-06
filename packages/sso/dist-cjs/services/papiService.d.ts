export interface PapiServiceConfig {
    chain: 'polkadot' | 'kusama';
    endpoint?: string;
}
export declare class PapiService {
    private client;
    private config;
    private isConnected;
    constructor(config: PapiServiceConfig);
    connect(): Promise<void>;
    private getDefaultEndpoint;
    disconnect(): Promise<void>;
    getClient(): any;
    getAccountInfo(address: string): Promise<any>;
    getBalance(address: string): Promise<bigint>;
    getLatestBlock(): Promise<any>;
    submitTransaction(tx: any): Promise<string>;
    getChainProperties(): Promise<any>;
    getRuntimeVersion(): Promise<any>;
    isHealthy(): boolean;
}
export declare const createPapiService: (config: PapiServiceConfig) => PapiService;
//# sourceMappingURL=papiService.d.ts.map