// Simple browser bundle for Polkadot.js functionality
// This creates a working implementation without CDN dependencies

// Import the necessary functions and expose them globally
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { hexToU8a } from '@polkadot/util';
import { naclDecrypt, naclEncrypt, randomAsHex } from '@polkadot/util-crypto';

// Expose everything on window object
window.polkadotApi = { ApiPromise, WsProvider };
window.polkadotUtil = { hexToU8a };
window.polkadotUtilCrypto = { randomAsHex, naclEncrypt, naclDecrypt };
window.polkadotExtensionDapp = { web3Enable, web3Accounts, web3FromAddress };

// Also expose directly for easier access
window.ApiPromise = ApiPromise;
window.WsProvider = WsProvider;
window.randomAsHex = randomAsHex;
window.hexToU8a = hexToU8a;
window.naclEncrypt = naclEncrypt;
window.naclDecrypt = naclDecrypt;
window.web3Enable = web3Enable;
window.web3Accounts = web3Accounts;
window.web3FromAddress = web3FromAddress;

console.log('Polkadot.js bundle loaded successfully');
