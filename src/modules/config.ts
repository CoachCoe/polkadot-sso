export interface ModuleConfig {
  name: string;
  dependencies: string[];
  initOrder: number;
  enabled: boolean;
}
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  security: {
    name: 'Security Core',
    dependencies: [],
    initOrder: 1,
    enabled: true,
  },
  sso: {
    name: 'SSO Core',
    dependencies: ['security'],
    initOrder: 2,
    enabled: true,
  },
  storage: {
    name: 'Storage Core',
    dependencies: ['security'],
    initOrder: 3,
    enabled: true,
  },
  credentials: {
    name: 'Credentials Core',
    dependencies: ['security', 'storage'],
    initOrder: 4,
    enabled: true,
  },
  api: {
    name: 'API Gateway',
    dependencies: ['security', 'sso', 'credentials', 'storage'],
    initOrder: 5,
    enabled: true,
  },
};
export const getModuleInitOrder = (): string[] => {
  return Object.entries(MODULE_CONFIG)
    .sort(([, a], [, b]) => a.initOrder - b.initOrder)
    .map(([name]) => name);
};
export const validateModuleDependencies = (): string[] => {
  const errors: string[] = [];
  for (const [name, config] of Object.entries(MODULE_CONFIG)) {
    if (!config.enabled) continue;
    for (const dep of config.dependencies) {
      if (!MODULE_CONFIG[dep]?.enabled) {
        errors.push(`Module '${name}' depends on disabled module '${dep}'`);
      }
    }
  }
  return errors;
};