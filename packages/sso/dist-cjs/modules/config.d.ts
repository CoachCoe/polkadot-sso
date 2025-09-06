export interface ModuleConfig {
    name: string;
    dependencies: string[];
    initOrder: number;
    enabled: boolean;
}
export declare const MODULE_CONFIG: Record<string, ModuleConfig>;
export declare const getModuleInitOrder: () => string[];
export declare const validateModuleDependencies: () => string[];
//# sourceMappingURL=config.d.ts.map