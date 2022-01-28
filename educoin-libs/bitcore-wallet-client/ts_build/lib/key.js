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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _xPrivKey, _xPrivKeyEncrypted, _version, _mnemonic, _mnemonicEncrypted, _mnemonicHasPassphrase;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Key = void 0;
var $ = require('preconditions').singleton();
const crypto_wallet_core_1 = require("crypto-wallet-core");
const _ = __importStar(require("lodash"));
require("source-map-support/register");
const common_1 = require("./common");
const credentials_1 = require("./credentials");
var Bitcore = crypto_wallet_core_1.BitcoreLib;
var Mnemonic = require('bitcore-mnemonic');
var sjcl = require('sjcl');
var log = require('./log');
const async = require('async');
const Uuid = require('uuid');
var Errors = require('./errors');
const wordsForLang = {
    en: Mnemonic.Words.ENGLISH,
    es: Mnemonic.Words.SPANISH,
    ja: Mnemonic.Words.JAPANESE,
    zh: Mnemonic.Words.CHINESE,
    fr: Mnemonic.Words.FRENCH,
    it: Mnemonic.Words.ITALIAN
};
const NETWORK = 'livenet';
class Key {
    constructor(opts = { seedType: 'new' }) {
        _xPrivKey.set(this, void 0);
        _xPrivKeyEncrypted.set(this, void 0);
        _version.set(this, void 0);
        _mnemonic.set(this, void 0);
        _mnemonicEncrypted.set(this, void 0);
        _mnemonicHasPassphrase.set(this, void 0);
        this.toObj = function () {
            const ret = {
                xPrivKey: __classPrivateFieldGet(this, _xPrivKey),
                xPrivKeyEncrypted: __classPrivateFieldGet(this, _xPrivKeyEncrypted),
                mnemonic: __classPrivateFieldGet(this, _mnemonic),
                mnemonicEncrypted: __classPrivateFieldGet(this, _mnemonicEncrypted),
                version: __classPrivateFieldGet(this, _version),
                mnemonicHasPassphrase: __classPrivateFieldGet(this, _mnemonicHasPassphrase),
                fingerPrint: this.fingerPrint,
                compliantDerivation: this.compliantDerivation,
                BIP45: this.BIP45,
                use0forBCH: this.use0forBCH,
                use44forMultisig: this.use44forMultisig,
                id: this.id
            };
            return _.clone(ret);
        };
        this.isPrivKeyEncrypted = function () {
            return !!__classPrivateFieldGet(this, _xPrivKeyEncrypted) && !__classPrivateFieldGet(this, _xPrivKey);
        };
        this.checkPassword = function (password) {
            if (this.isPrivKeyEncrypted()) {
                try {
                    sjcl.decrypt(password, __classPrivateFieldGet(this, _xPrivKeyEncrypted));
                }
                catch (ex) {
                    return false;
                }
                return true;
            }
            return null;
        };
        this.get = function (password) {
            let keys = {};
            let fingerPrintUpdated = false;
            if (this.isPrivKeyEncrypted()) {
                $.checkArgument(password, 'Private keys are encrypted, a password is needed');
                try {
                    keys.xPrivKey = sjcl.decrypt(password, __classPrivateFieldGet(this, _xPrivKeyEncrypted));
                    if (!this.fingerPrint) {
                        let xpriv = new Bitcore.HDPrivateKey(keys.xPrivKey);
                        this.fingerPrint = xpriv.fingerPrint.toString('hex');
                        fingerPrintUpdated = true;
                    }
                    if (__classPrivateFieldGet(this, _mnemonicEncrypted)) {
                        keys.mnemonic = sjcl.decrypt(password, __classPrivateFieldGet(this, _mnemonicEncrypted));
                    }
                }
                catch (ex) {
                    throw new Error('Could not decrypt');
                }
            }
            else {
                keys.xPrivKey = __classPrivateFieldGet(this, _xPrivKey);
                keys.mnemonic = __classPrivateFieldGet(this, _mnemonic);
                if (fingerPrintUpdated) {
                    keys.fingerPrintUpdated = true;
                }
            }
            keys.mnemonicHasPassphrase = __classPrivateFieldGet(this, _mnemonicHasPassphrase) || false;
            return keys;
        };
        this.encrypt = function (password, opts) {
            if (__classPrivateFieldGet(this, _xPrivKeyEncrypted))
                throw new Error('Private key already encrypted');
            if (!__classPrivateFieldGet(this, _xPrivKey))
                throw new Error('No private key to encrypt');
            __classPrivateFieldSet(this, _xPrivKeyEncrypted, sjcl.encrypt(password, __classPrivateFieldGet(this, _xPrivKey), opts));
            if (!__classPrivateFieldGet(this, _xPrivKeyEncrypted))
                throw new Error('Could not encrypt');
            if (__classPrivateFieldGet(this, _mnemonic))
                __classPrivateFieldSet(this, _mnemonicEncrypted, sjcl.encrypt(password, __classPrivateFieldGet(this, _mnemonic), opts));
            __classPrivateFieldSet(this, _xPrivKey, null);
            __classPrivateFieldSet(this, _mnemonic, null);
        };
        this.decrypt = function (password) {
            if (!__classPrivateFieldGet(this, _xPrivKeyEncrypted))
                throw new Error('Private key is not encrypted');
            try {
                __classPrivateFieldSet(this, _xPrivKey, sjcl.decrypt(password, __classPrivateFieldGet(this, _xPrivKeyEncrypted)));
                if (__classPrivateFieldGet(this, _mnemonicEncrypted)) {
                    __classPrivateFieldSet(this, _mnemonic, sjcl.decrypt(password, __classPrivateFieldGet(this, _mnemonicEncrypted)));
                }
                __classPrivateFieldSet(this, _xPrivKeyEncrypted, null);
                __classPrivateFieldSet(this, _mnemonicEncrypted, null);
            }
            catch (ex) {
                log.error('error decrypting:', ex);
                throw new Error('Could not decrypt');
            }
        };
        this.derive = function (password, path) {
            $.checkArgument(path, 'no path at derive()');
            var xPrivKey = new Bitcore.HDPrivateKey(this.get(password).xPrivKey, NETWORK);
            var deriveFn = this.compliantDerivation
                ? _.bind(xPrivKey.deriveChild, xPrivKey)
                : _.bind(xPrivKey.deriveNonCompliantChild, xPrivKey);
            return deriveFn(path);
        };
        this._checkCoin = function (coin) {
            if (!_.includes(common_1.Constants.COINS, coin))
                throw new Error('Invalid coin');
        };
        this._checkNetwork = function (network) {
            if (!_.includes(['livenet', 'testnet'], network))
                throw new Error('Invalid network');
        };
        this.getBaseAddressDerivationPath = function (opts) {
            $.checkArgument(opts, 'Need to provide options');
            $.checkArgument(opts.n >= 1, 'n need to be >=1');
            let purpose = opts.n == 1 || this.use44forMultisig ? '44' : '48';
            var coinCode = '0';
            if (opts.network == 'testnet' && common_1.Constants.UTXO_COINS.includes(opts.coin)) {
                coinCode = '1';
            }
            else if (opts.coin == 'bch') {
                if (this.use0forBCH) {
                    coinCode = '0';
                }
                else {
                    coinCode = '145';
                }
            }
            else if (opts.coin == 'btc') {
                coinCode = '0';
            }
            else if (opts.coin == 'edu') {
                coinCode = '199';
            }
            else if (opts.coin == 'tik') {
                coinCode = '299';
            }
            else if (opts.coin == 'eth') {
                coinCode = '60';
            }
            else if (opts.coin == 'xrp') {
                coinCode = '144';
            }
            else if (opts.coin == 'doge') {
                coinCode = '3';
            }
            else {
                throw new Error('unknown coin: ' + opts.coin);
            }
            return 'm/' + purpose + "'/" + coinCode + "'/" + opts.account + "'";
        };
        this.createCredentials = function (password, opts) {
            opts = opts || {};
            if (password)
                $.shouldBeString(password, 'provide password');
            this._checkCoin(opts.coin);
            this._checkNetwork(opts.network);
            $.shouldBeNumber(opts.account, 'Invalid account');
            $.shouldBeNumber(opts.n, 'Invalid n');
            $.shouldBeUndefined(opts.useLegacyCoinType);
            $.shouldBeUndefined(opts.useLegacyPurpose);
            let path = this.getBaseAddressDerivationPath(opts);
            let xPrivKey = this.derive(password, path);
            let requestPrivKey = this.derive(password, common_1.Constants.PATHS.REQUEST_KEY).privateKey.toString();
            if (opts.network == 'testnet') {
                let x = xPrivKey.toObject();
                x.network = 'testnet';
                delete x.xprivkey;
                delete x.checksum;
                x.privateKey = _.padStart(x.privateKey, 64, '0');
                xPrivKey = new Bitcore.HDPrivateKey(x);
            }
            return credentials_1.Credentials.fromDerivedKey({
                xPubKey: xPrivKey.hdPublicKey.toString(),
                coin: opts.coin,
                network: opts.network,
                account: opts.account,
                n: opts.n,
                rootPath: path,
                keyId: this.id,
                requestPrivKey,
                addressType: opts.addressType,
                walletPrivKey: opts.walletPrivKey
            });
        };
        this.createAccess = function (password, opts) {
            opts = opts || {};
            $.shouldBeString(opts.path);
            var requestPrivKey = new Bitcore.PrivateKey(opts.requestPrivKey || null);
            var requestPubKey = requestPrivKey.toPublicKey().toString();
            var xPriv = this.derive(password, opts.path);
            var signature = common_1.Utils.signRequestPubKey(requestPubKey, xPriv);
            requestPrivKey = requestPrivKey.toString();
            return {
                signature,
                requestPrivKey
            };
        };
        this.sign = function (rootPath, txp, password, cb) {
            $.shouldBeString(rootPath);
            if (this.isPrivKeyEncrypted() && !password) {
                return cb(new Errors.ENCRYPTED_PRIVATE_KEY());
            }
            var privs = [];
            var derived = {};
            var derived = this.derive(password, rootPath);
            var xpriv = new Bitcore.HDPrivateKey(derived);
            var t = common_1.Utils.buildTx(txp);
            if (common_1.Constants.UTXO_COINS.includes(txp.coin)) {
                _.each(txp.inputs, function (i) {
                    $.checkState(i.path, 'Input derivation path not available (signing transaction)');
                    if (!derived[i.path]) {
                        derived[i.path] = xpriv.deriveChild(i.path).privateKey;
                        privs.push(derived[i.path]);
                    }
                });
                var signatures = _.map(privs, function (priv, i) {
                    return t.getSignatures(priv, undefined, txp.signingMethod);
                });
                signatures = _.map(_.sortBy(_.flatten(signatures), 'inputIndex'), function (s) {
                    return s.signature.toDER(txp.signingMethod).toString('hex');
                });
                return signatures;
            }
            else {
                let tx = t.uncheckedSerialize();
                tx = typeof tx === 'string' ? [tx] : tx;
                const chain = common_1.Utils.getChain(txp.coin);
                const txArray = _.isArray(tx) ? tx : [tx];
                const isChange = false;
                const addressIndex = 0;
                const { privKey, pubKey } = crypto_wallet_core_1.Deriver.derivePrivateKey(chain, txp.network, derived, addressIndex, isChange);
                let signatures = [];
                for (const rawTx of txArray) {
                    const signed = crypto_wallet_core_1.Transactions.getSignature({
                        chain,
                        tx: rawTx,
                        key: { privKey, pubKey }
                    });
                    signatures.push(signed);
                }
                return signatures;
            }
        };
        __classPrivateFieldSet(this, _version, 1);
        this.id = Uuid.v4();
        this.use0forBCH = opts.useLegacyCoinType;
        this.use44forMultisig = opts.useLegacyPurpose;
        this.compliantDerivation = !opts.nonCompliantDerivation;
        let x = opts.seedData;
        switch (opts.seedType) {
            case 'new':
                if (opts.language && !wordsForLang[opts.language])
                    throw new Error('Unsupported language');
                let m = new Mnemonic(wordsForLang[opts.language]);
                while (!Mnemonic.isValid(m.toString())) {
                    m = new Mnemonic(wordsForLang[opts.language]);
                }
                this.setFromMnemonic(m, opts);
                break;
            case 'mnemonic':
                $.checkArgument(x, 'Need to provide opts.seedData');
                $.checkArgument(_.isString(x), 'sourceData need to be a string');
                this.setFromMnemonic(new Mnemonic(x), opts);
                break;
            case 'extendedPrivateKey':
                $.checkArgument(x, 'Need to provide opts.seedData');
                let xpriv;
                try {
                    xpriv = new Bitcore.HDPrivateKey(x);
                }
                catch (e) {
                    throw new Error('Invalid argument');
                }
                this.fingerPrint = xpriv.fingerPrint.toString('hex');
                if (opts.password) {
                    __classPrivateFieldSet(this, _xPrivKeyEncrypted, sjcl.encrypt(opts.password, xpriv.toString(), opts));
                    if (!__classPrivateFieldGet(this, _xPrivKeyEncrypted))
                        throw new Error('Could not encrypt');
                }
                else {
                    __classPrivateFieldSet(this, _xPrivKey, xpriv.toString());
                }
                __classPrivateFieldSet(this, _mnemonic, null);
                __classPrivateFieldSet(this, _mnemonicHasPassphrase, null);
                break;
            case 'object':
                $.shouldBeObject(x, 'Need to provide an object at opts.seedData');
                $.shouldBeUndefined(opts.password, 'opts.password not allowed when source is object');
                if (__classPrivateFieldGet(this, _version) != x.version) {
                    throw new Error('Bad Key version');
                }
                __classPrivateFieldSet(this, _xPrivKey, x.xPrivKey);
                __classPrivateFieldSet(this, _xPrivKeyEncrypted, x.xPrivKeyEncrypted);
                __classPrivateFieldSet(this, _mnemonic, x.mnemonic);
                __classPrivateFieldSet(this, _mnemonicEncrypted, x.mnemonicEncrypted);
                __classPrivateFieldSet(this, _mnemonicHasPassphrase, x.mnemonicHasPassphrase);
                __classPrivateFieldSet(this, _version, x.version);
                this.fingerPrint = x.fingerPrint;
                this.compliantDerivation = x.compliantDerivation;
                this.BIP45 = x.BIP45;
                this.id = x.id;
                this.use0forBCH = x.use0forBCH;
                this.use44forMultisig = x.use44forMultisig;
                $.checkState(__classPrivateFieldGet(this, _xPrivKey) || __classPrivateFieldGet(this, _xPrivKeyEncrypted), 'Failed state:  #xPrivKey || #xPrivKeyEncrypted at Key constructor');
                break;
            case 'objectV1':
                this.use0forBCH = false;
                this.use44forMultisig = false;
                this.compliantDerivation = true;
                this.id = Uuid.v4();
                if (!_.isUndefined(x.compliantDerivation))
                    this.compliantDerivation = x.compliantDerivation;
                if (!_.isUndefined(x.id))
                    this.id = x.id;
                __classPrivateFieldSet(this, _xPrivKey, x.xPrivKey);
                __classPrivateFieldSet(this, _xPrivKeyEncrypted, x.xPrivKeyEncrypted);
                __classPrivateFieldSet(this, _mnemonic, x.mnemonic);
                __classPrivateFieldSet(this, _mnemonicEncrypted, x.mnemonicEncrypted);
                __classPrivateFieldSet(this, _mnemonicHasPassphrase, x.mnemonicHasPassphrase);
                __classPrivateFieldSet(this, _version, x.version || 1);
                this.fingerPrint = x.fingerPrint;
                this.use44forMultisig = x.n > 1 ? true : false;
                this.use0forBCH = x.use145forBCH
                    ? false
                    : x.coin == 'bch'
                        ? true
                        : false;
                this.BIP45 = x.derivationStrategy == 'BIP45';
                break;
            default:
                throw new Error('Unknown seed source: ' + opts.seedType);
        }
    }
    static match(a, b) {
        return a.id == b.id || a.fingerPrint == b.fingerPrint;
    }
    setFromMnemonic(m, opts) {
        const xpriv = m.toHDPrivateKey(opts.passphrase, NETWORK);
        this.fingerPrint = xpriv.fingerPrint.toString('hex');
        if (opts.password) {
            __classPrivateFieldSet(this, _xPrivKeyEncrypted, sjcl.encrypt(opts.password, xpriv.toString(), opts.sjclOpts));
            if (!__classPrivateFieldGet(this, _xPrivKeyEncrypted))
                throw new Error('Could not encrypt');
            __classPrivateFieldSet(this, _mnemonicEncrypted, sjcl.encrypt(opts.password, m.phrase, opts.sjclOpts));
            if (!__classPrivateFieldGet(this, _mnemonicEncrypted))
                throw new Error('Could not encrypt');
        }
        else {
            __classPrivateFieldSet(this, _xPrivKey, xpriv.toString());
            __classPrivateFieldSet(this, _mnemonic, m.phrase);
            __classPrivateFieldSet(this, _mnemonicHasPassphrase, !!opts.passphrase);
        }
    }
}
exports.Key = Key;
_xPrivKey = new WeakMap(), _xPrivKeyEncrypted = new WeakMap(), _version = new WeakMap(), _mnemonic = new WeakMap(), _mnemonicEncrypted = new WeakMap(), _mnemonicHasPassphrase = new WeakMap();
//# sourceMappingURL=key.js.map