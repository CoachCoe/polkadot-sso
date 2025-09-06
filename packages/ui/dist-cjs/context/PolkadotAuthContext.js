"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotAuthContext = void 0;
exports.usePolkadotAuthContext = usePolkadotAuthContext;
const react_1 = require("react");
const PolkadotAuthContext = (0, react_1.createContext)(null);
exports.PolkadotAuthContext = PolkadotAuthContext;
function usePolkadotAuthContext() {
    const context = (0, react_1.useContext)(PolkadotAuthContext);
    if (!context) {
        throw new Error('usePolkadotAuthContext must be used within a PolkadotAuthProvider');
    }
    return context;
}
//# sourceMappingURL=PolkadotAuthContext.js.map