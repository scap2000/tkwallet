'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
const CWC = __importStar(require("crypto-wallet-core"));
exports.Constants = {
    SCRIPT_TYPES: {
        P2SH: 'P2SH',
        P2PKH: 'P2PKH',
        P2WPKH: 'P2WPKH',
        P2WSH: 'P2WSH'
    },
    DERIVATION_STRATEGIES: {
        BIP44: 'BIP44',
        BIP45: 'BIP45',
        BIP48: 'BIP48'
    },
    PATHS: {
        SINGLE_ADDRESS: 'm/0/0',
        REQUEST_KEY: "m/1'/0",
        REQUEST_KEY_AUTH: 'm/2'
    },
    BIP45_SHARED_INDEX: 0x80000000 - 1,
    COINS: [
        'btc',
        'edu',
        'tik',
        'bch',
        'eth',
        'xrp',
        'doge',
        'usdc',
        'pax',
        'gusd',
        'busd',
        'dai',
        'wbtc'
    ],
    ERC20: ['usdc', 'pax', 'gusd', 'busd', 'dai', 'wbtc'],
    UTXO_COINS: ['btc', 'edu', 'tik', 'bch', 'doge'],
    TOKEN_OPTS: CWC.Constants.TOKEN_OPTS,
    UNITS: CWC.Constants.UNITS
};
//# sourceMappingURL=constants.js.map