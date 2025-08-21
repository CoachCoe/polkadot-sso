"use strict";
// Module Configuration
// Defines module dependencies and initialization order
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModuleDependencies = exports.getModuleInitOrder = exports.MODULE_CONFIG = void 0;
exports.MODULE_CONFIG = {
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
const getModuleInitOrder = () => {
    return Object.entries(exports.MODULE_CONFIG)
        .sort(([, a], [, b]) => a.initOrder - b.initOrder)
        .map(([name]) => name);
};
exports.getModuleInitOrder = getModuleInitOrder;
const validateModuleDependencies = () => {
    const errors = [];
    for (const [name, config] of Object.entries(exports.MODULE_CONFIG)) {
        if (!config.enabled)
            continue;
        for (const dep of config.dependencies) {
            if (!exports.MODULE_CONFIG[dep]?.enabled) {
                errors.push(`Module '${name}' depends on disabled module '${dep}'`);
            }
        }
    }
    return errors;
};
exports.validateModuleDependencies = validateModuleDependencies;
//# sourceMappingURL=config.js.map