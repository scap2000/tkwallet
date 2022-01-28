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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const CWC = __importStar(require("crypto-wallet-core"));
const events_1 = require("events");
const lodash_1 = __importDefault(require("lodash"));
const sjcl_1 = __importDefault(require("sjcl"));
const common_1 = require("./common");
const credentials_1 = require("./credentials");
const key_1 = require("./key");
const paypro_1 = require("./paypro");
const payproV2_1 = require("./payproV2");
const request_1 = require("./request");
const verifier_1 = require("./verifier");
var $ = require('preconditions').singleton();
var util = require('util');
var async = require('async');
var events = require('events');
var Bitcore = CWC.BitcoreLib;
var Bitcore_ = {
    btc: CWC.BitcoreLib,
    bch: CWC.BitcoreLibCash,
    eth: CWC.BitcoreLib,
    xrp: CWC.BitcoreLib,
    doge: CWC.BitcoreLibDoge,
    edu: CWC.BitcoreLibEdu,
    tik: CWC.BitcoreLibTik
};
var Mnemonic = require('bitcore-mnemonic');
var url = require('url');
var querystring = require('querystring');
var log = require('./log');
const Errors = require('./errors');
var BASE_URL = 'http://localhost:3232/bws/api';
class API extends events_1.EventEmitter {
    constructor(opts) {
        super();
        opts = opts || {};
        this.doNotVerifyPayPro = opts.doNotVerifyPayPro;
        this.timeout = opts.timeout || 50000;
        this.logLevel = opts.logLevel || 'silent';
        this.supportStaffWalletId = opts.supportStaffWalletId;
        this.bp_partner = opts.bp_partner;
        this.bp_partner_version = opts.bp_partner_version;
        this.request = new request_1.Request(opts.baseUrl || BASE_URL, {
            r: opts.request,
            supportStaffWalletId: opts.supportStaffWalletId
        });
        log.setLevel(this.logLevel);
    }
    initNotifications(cb) {
        log.warn('DEPRECATED: use initialize() instead.');
        this.initialize({}, cb);
    }
    initialize(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <initialize()>');
        this.notificationIncludeOwn = !!opts.notificationIncludeOwn;
        this._initNotifications(opts);
        return cb();
    }
    dispose(cb) {
        this._disposeNotifications();
        this.request.logout(cb);
    }
    _fetchLatestNotifications(interval, cb) {
        cb = cb || function () { };
        var opts = {
            lastNotificationId: this.lastNotificationId,
            includeOwn: this.notificationIncludeOwn
        };
        if (!this.lastNotificationId) {
            opts.timeSpan = interval + 1;
        }
        this.getNotifications(opts, (err, notifications) => {
            if (err) {
                log.warn('Error receiving notifications.');
                log.debug(err);
                return cb(err);
            }
            if (notifications.length > 0) {
                this.lastNotificationId = lodash_1.default.last(notifications).id;
            }
            lodash_1.default.each(notifications, notification => {
                this.emit('notification', notification);
            });
            return cb();
        });
    }
    _initNotifications(opts) {
        opts = opts || {};
        var interval = opts.notificationIntervalSeconds || 5;
        this.notificationsIntervalId = setInterval(() => {
            this._fetchLatestNotifications(interval, err => {
                if (err) {
                    if (err instanceof Errors.NOT_FOUND ||
                        err instanceof Errors.NOT_AUTHORIZED) {
                        this._disposeNotifications();
                    }
                }
            });
        }, interval * 1000);
    }
    _disposeNotifications() {
        if (this.notificationsIntervalId) {
            clearInterval(this.notificationsIntervalId);
            this.notificationsIntervalId = null;
        }
    }
    setNotificationsInterval(notificationIntervalSeconds) {
        this._disposeNotifications();
        if (notificationIntervalSeconds > 0) {
            this._initNotifications({
                notificationIntervalSeconds
            });
        }
    }
    getRootPath() {
        return this.credentials.getRootPath();
    }
    static _encryptMessage(message, encryptingKey) {
        if (!message)
            return null;
        return common_1.Utils.encryptMessage(message, encryptingKey);
    }
    _processTxNotes(notes) {
        if (!notes)
            return;
        var encryptingKey = this.credentials.sharedEncryptingKey;
        lodash_1.default.each([].concat(notes), note => {
            note.encryptedBody = note.body;
            note.body = common_1.Utils.decryptMessageNoThrow(note.body, encryptingKey);
            note.encryptedEditedByName = note.editedByName;
            note.editedByName = common_1.Utils.decryptMessageNoThrow(note.editedByName, encryptingKey);
        });
    }
    _processTxps(txps) {
        if (!txps)
            return;
        var encryptingKey = this.credentials.sharedEncryptingKey;
        lodash_1.default.each([].concat(txps), txp => {
            txp.encryptedMessage = txp.message;
            txp.message =
                common_1.Utils.decryptMessageNoThrow(txp.message, encryptingKey) || null;
            txp.creatorName = common_1.Utils.decryptMessageNoThrow(txp.creatorName, encryptingKey);
            lodash_1.default.each(txp.actions, action => {
                action.copayerName = common_1.Utils.decryptMessageNoThrow(action.copayerName, encryptingKey);
                action.comment = common_1.Utils.decryptMessageNoThrow(action.comment, encryptingKey);
            });
            lodash_1.default.each(txp.outputs, output => {
                output.encryptedMessage = output.message;
                output.message =
                    common_1.Utils.decryptMessageNoThrow(output.message, encryptingKey) || null;
            });
            txp.hasUnconfirmedInputs = lodash_1.default.some(txp.inputs, input => {
                return input.confirmations == 0;
            });
            this._processTxNotes(txp.note);
        });
    }
    validateKeyDerivation(opts, cb) {
        var _deviceValidated;
        opts = opts || {};
        var c = this.credentials;
        var testMessageSigning = (xpriv, xpub) => {
            var nonHardenedPath = 'm/0/0';
            var message = 'Lorem ipsum dolor sit amet, ne amet urbanitas percipitur vim, libris disputando his ne, et facer suavitate qui. Ei quidam laoreet sea. Cu pro dico aliquip gubergren, in mundi postea usu. Ad labitur posidonium interesset duo, est et doctus molestie adipiscing.';
            var priv = xpriv.deriveChild(nonHardenedPath).privateKey;
            var signature = common_1.Utils.signMessage(message, priv);
            var pub = xpub.deriveChild(nonHardenedPath).publicKey;
            return common_1.Utils.verifyMessage(message, signature, pub);
        };
        var testHardcodedKeys = () => {
            var words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            var xpriv = Mnemonic(words).toHDPrivateKey();
            if (xpriv.toString() !=
                'xprv9s21ZrQH143K3GJpoapnV8SFfukcVBSfeCficPSGfubmSFDxo1kuHnLisriDvSnRRuL2Qrg5ggqHKNVpxR86QEC8w35uxmGoggxtQTPvfUu')
                return false;
            xpriv = xpriv.deriveChild("m/44'/0'/0'");
            if (xpriv.toString() !=
                'xprv9xpXFhFpqdQK3TmytPBqXtGSwS3DLjojFhTGht8gwAAii8py5X6pxeBnQ6ehJiyJ6nDjWGJfZ95WxByFXVkDxHXrqu53WCRGypk2ttuqncb')
                return false;
            var xpub = Bitcore.HDPublicKey.fromString('xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj');
            return testMessageSigning(xpriv, xpub);
        };
        var testLiveKeys = () => {
            var words;
            try {
                words = c.getMnemonic();
            }
            catch (ex) { }
            var xpriv;
            if (words && (!c.mnemonicHasPassphrase || opts.passphrase)) {
                var m = new Mnemonic(words);
                xpriv = m.toHDPrivateKey(opts.passphrase, c.network);
            }
            if (!xpriv) {
                xpriv = new Bitcore.HDPrivateKey(c.xPrivKey);
            }
            xpriv = xpriv.deriveChild(c.getBaseAddressDerivationPath());
            var xpub = new Bitcore.HDPublicKey(c.xPubKey);
            return testMessageSigning(xpriv, xpub);
        };
        var hardcodedOk = true;
        if (!_deviceValidated && !opts.skipDeviceValidation) {
            hardcodedOk = testHardcodedKeys();
            _deviceValidated = true;
        }
        this.keyDerivationOk = hardcodedOk;
        return cb(null, this.keyDerivationOk);
    }
    toObj() {
        $.checkState(this.credentials, 'Failed state: this.credentials at <toObj()>');
        return this.credentials.toObj();
    }
    toString(opts) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <toString()>');
        $.checkArgument(!this.noSign, 'no Sign not supported');
        $.checkArgument(!this.password, 'password not supported');
        opts = opts || {};
        var output;
        output = JSON.stringify(this.toObj());
        return output;
    }
    fromObj(credentials) {
        $.checkArgument(lodash_1.default.isObject(credentials), 'Argument should be an object');
        try {
            credentials = credentials_1.Credentials.fromObj(credentials);
            this.credentials = credentials;
        }
        catch (ex) {
            log.warn(`Error importing wallet: ${ex}`);
            if (ex.toString().match(/Obsolete/)) {
                throw new Errors.OBSOLETE_BACKUP();
            }
            else {
                throw new Errors.INVALID_BACKUP();
            }
        }
        this.request.setCredentials(this.credentials);
    }
    fromString(credentials) {
        if (lodash_1.default.isObject(credentials)) {
            log.warn('WARN: Please use fromObj instead of fromString when importing strings');
            return this.fromObj(credentials);
        }
        let c;
        try {
            c = JSON.parse(credentials);
        }
        catch (ex) {
            log.warn(`Error importing wallet: ${ex}`);
            throw new Errors.INVALID_BACKUP();
        }
        return this.fromObj(c);
    }
    decryptBIP38PrivateKey(encryptedPrivateKeyBase58, passphrase, opts, cb) {
        var Bip38 = require('bip38');
        var bip38 = new Bip38();
        var privateKeyWif;
        try {
            privateKeyWif = bip38.decrypt(encryptedPrivateKeyBase58, passphrase);
        }
        catch (ex) {
            return cb(new Error('Could not decrypt BIP38 private key' + ex));
        }
        var privateKey = new Bitcore.PrivateKey(privateKeyWif);
        var address = privateKey.publicKey.toAddress().toString();
        var addrBuff = Buffer.from(address, 'ascii');
        var actualChecksum = Bitcore.crypto.Hash.sha256sha256(addrBuff)
            .toString('hex')
            .substring(0, 8);
        var expectedChecksum = Bitcore.encoding.Base58Check.decode(encryptedPrivateKeyBase58)
            .toString('hex')
            .substring(6, 14);
        if (actualChecksum != expectedChecksum)
            return cb(new Error('Incorrect passphrase'));
        return cb(null, privateKeyWif);
    }
    getBalanceFromPrivateKey(privateKey, coin, cb) {
        if (lodash_1.default.isFunction(coin)) {
            cb = coin;
            coin = 'btc';
        }
        var B = Bitcore_[coin];
        var privateKey = new B.PrivateKey(privateKey);
        var address = privateKey.publicKey.toAddress().toString(true);
        this.getUtxos({
            addresses: address
        }, (err, utxos) => {
            if (err)
                return cb(err);
            return cb(null, lodash_1.default.sumBy(utxos, 'satoshis'));
        });
    }
    buildTxFromPrivateKey(privateKey, destinationAddress, opts, cb) {
        opts = opts || {};
        var coin = opts.coin || 'btc';
        var signingMethod = opts.signingMethod || 'ecdsa';
        if (!lodash_1.default.includes(common_1.Constants.COINS, coin))
            return cb(new Error('Invalid coin'));
        if (coin == 'eth')
            return cb(new Error('ETH not supported for this action'));
        var B = Bitcore_[coin];
        var privateKey = B.PrivateKey(privateKey);
        var address = privateKey.publicKey.toAddress().toString(true);
        async.waterfall([
            next => {
                this.getUtxos({
                    addresses: address
                }, (err, utxos) => {
                    return next(err, utxos);
                });
            },
            (utxos, next) => {
                if (!lodash_1.default.isArray(utxos) || utxos.length == 0)
                    return next(new Error('No utxos found'));
                var fee = opts.fee || 10000;
                var amount = lodash_1.default.sumBy(utxos, 'satoshis') - fee;
                if (amount <= 0)
                    return next(new Errors.INSUFFICIENT_FUNDS());
                var tx;
                try {
                    var toAddress = B.Address.fromString(destinationAddress);
                    tx = new B.Transaction()
                        .from(utxos)
                        .to(toAddress, amount)
                        .fee(fee)
                        .sign(privateKey, undefined, signingMethod);
                    tx.serialize();
                }
                catch (ex) {
                    log.error('Could not build transaction from private key', ex);
                    return next(new Errors.COULD_NOT_BUILD_TRANSACTION());
                }
                return next(null, tx);
            }
        ], cb);
    }
    openWallet(opts, cb) {
        if (lodash_1.default.isFunction(opts)) {
            cb = opts;
        }
        opts = opts || {};
        $.checkState(this.credentials, 'Failed state: this.credentials at <openWallet()>');
        if (this.credentials.isComplete() && this.credentials.hasWalletInfo())
            return cb(null, true);
        var qs = [];
        qs.push('includeExtendedInfo=1');
        qs.push('serverMessageArray=1');
        this.request.get('/v3/wallets/?' + qs.join('&'), (err, ret) => {
            if (err)
                return cb(err);
            var wallet = ret.wallet;
            this._processStatus(ret);
            if (!this.credentials.hasWalletInfo()) {
                var me = lodash_1.default.find(wallet.copayers, {
                    id: this.credentials.copayerId
                });
                if (!me)
                    return cb(new Error('Copayer not in wallet'));
                try {
                    this.credentials.addWalletInfo(wallet.id, wallet.name, wallet.m, wallet.n, me["name"], opts);
                }
                catch (e) {
                    if (e.message) {
                        log.info('Trying credentials...', e.message);
                    }
                    if (e.message && e.message.match(/Bad\snr/)) {
                        return cb(new Errors.WALLET_DOES_NOT_EXIST());
                    }
                    throw e;
                }
            }
            if (wallet.status != 'complete')
                return cb(null, ret);
            if (this.credentials.walletPrivKey) {
                if (!verifier_1.Verifier.checkCopayers(this.credentials, wallet.copayers)) {
                    return cb(new Errors.SERVER_COMPROMISED());
                }
            }
            else {
                log.warn('Could not verify copayers key (missing wallet Private Key)');
            }
            this.credentials.addPublicKeyRing(this._extractPublicKeyRing(wallet.copayers));
            this.emit('walletCompleted', wallet);
            return cb(null, ret);
        });
    }
    static _buildSecret(walletId, walletPrivKey, coin, network) {
        if (lodash_1.default.isString(walletPrivKey)) {
            walletPrivKey = Bitcore.PrivateKey.fromString(walletPrivKey);
        }
        var widHex = Buffer.from(walletId.replace(/-/g, ''), 'hex');
        var widBase58 = new Bitcore.encoding.Base58(widHex).toString();
        return (lodash_1.default.padEnd(widBase58, 22, '0') +
            walletPrivKey.toWIF() +
            (network == 'testnet' ? 'T' : 'L') +
            coin);
    }
    static parseSecret(secret) {
        $.checkArgument(secret);
        var split = (str, indexes) => {
            var parts = [];
            indexes.push(str.length);
            var i = 0;
            while (i < indexes.length) {
                parts.push(str.substring(i == 0 ? 0 : indexes[i - 1], indexes[i]));
                i++;
            }
            return parts;
        };
        try {
            var secretSplit = split(secret, [22, 74, 75]);
            var widBase58 = secretSplit[0].replace(/0/g, '');
            var widHex = Bitcore.encoding.Base58.decode(widBase58).toString('hex');
            var walletId = split(widHex, [8, 12, 16, 20]).join('-');
            var walletPrivKey = Bitcore.PrivateKey.fromString(secretSplit[1]);
            var networkChar = secretSplit[2];
            var coin = secretSplit[3] || 'btc';
            return {
                walletId,
                walletPrivKey,
                coin,
                network: networkChar == 'T' ? 'testnet' : 'livenet'
            };
        }
        catch (ex) {
            throw new Error('Invalid secret');
        }
    }
    static getRawTx(txp) {
        var t = common_1.Utils.buildTx(txp);
        return t.uncheckedSerialize();
    }
    _getCurrentSignatures(txp) {
        var acceptedActions = lodash_1.default.filter(txp.actions, {
            type: 'accept'
        });
        return lodash_1.default.map(acceptedActions, x => {
            return {
                signatures: x["signatures"],
                xpub: x["xpub"]
            };
        });
    }
    _addSignaturesToBitcoreTxBitcoin(txp, t, signatures, xpub) {
        $.checkState(txp.coin, 'Failed state: txp.coin undefined at _addSignaturesToBitcoreTxBitcoin');
        $.checkState(txp.signingMethod, 'Failed state: txp.signingMethod undefined at _addSignaturesToBitcoreTxBitcoin');
        const bitcore = Bitcore_[txp.coin];
        if (signatures.length != txp.inputs.length)
            throw new Error('Number of signatures does not match number of inputs');
        let i = 0;
        const x = new bitcore.HDPublicKey(xpub);
        lodash_1.default.each(signatures, signatureHex => {
            try {
                const signature = bitcore.crypto.Signature.fromString(signatureHex);
                const pub = x.deriveChild(txp.inputPaths[i]).publicKey;
                const s = {
                    inputIndex: i,
                    signature,
                    sigtype: bitcore.crypto.Signature.SIGHASH_ALL |
                        bitcore.crypto.Signature.SIGHASH_FORKID,
                    publicKey: pub
                };
                t.inputs[i].addSignature(t, s, txp.signingMethod);
                i++;
            }
            catch (e) { }
        });
        if (i != txp.inputs.length)
            throw new Error('Wrong signatures');
    }
    _addSignaturesToBitcoreTx(txp, t, signatures, xpub) {
        const { coin, network } = txp;
        const chain = common_1.Utils.getChain(coin);
        switch (chain) {
            case 'XRP':
            case 'ETH':
                const unsignedTxs = t.uncheckedSerialize();
                const signedTxs = [];
                for (let index = 0; index < signatures.length; index++) {
                    const signed = CWC.Transactions.applySignature({
                        chain,
                        tx: unsignedTxs[index],
                        signature: signatures[index]
                    });
                    signedTxs.push(signed);
                    t.id = CWC.Transactions.getHash({ tx: signed, chain, network });
                }
                t.uncheckedSerialize = () => signedTxs;
                t.serialize = () => signedTxs;
                break;
            default:
                return this._addSignaturesToBitcoreTxBitcoin(txp, t, signatures, xpub);
        }
    }
    _applyAllSignatures(txp, t) {
        $.checkState(txp.status == 'accepted', 'Failed state: txp.status at _applyAllSignatures');
        var sigs = this._getCurrentSignatures(txp);
        lodash_1.default.each(sigs, x => {
            this._addSignaturesToBitcoreTx(txp, t, x.signatures, x.xpub);
        });
    }
    _doJoinWallet(walletId, walletPrivKey, xPubKey, requestPubKey, copayerName, opts, cb) {
        $.shouldBeFunction(cb);
        opts = opts || {};
        opts.customData = opts.customData || {};
        opts.customData.walletPrivKey = walletPrivKey.toString();
        var encCustomData = common_1.Utils.encryptMessage(JSON.stringify(opts.customData), this.credentials.personalEncryptingKey);
        var encCopayerName = common_1.Utils.encryptMessage(copayerName, this.credentials.sharedEncryptingKey);
        var args = {
            walletId,
            coin: opts.coin,
            name: encCopayerName,
            xPubKey,
            requestPubKey,
            customData: encCustomData
        };
        if (opts.dryRun)
            args.dryRun = true;
        if (lodash_1.default.isBoolean(opts.supportBIP44AndP2PKH))
            args.supportBIP44AndP2PKH = opts.supportBIP44AndP2PKH;
        var hash = common_1.Utils.getCopayerHash(args.name, args.xPubKey, args.requestPubKey);
        args.copayerSignature = common_1.Utils.signMessage(hash, walletPrivKey);
        var url = '/v2/wallets/' + walletId + '/copayers';
        this.request.post(url, args, (err, body) => {
            if (err)
                return cb(err);
            this._processWallet(body.wallet);
            return cb(null, body.wallet);
        });
    }
    isComplete() {
        return this.credentials && this.credentials.isComplete();
    }
    _extractPublicKeyRing(copayers) {
        return lodash_1.default.map(copayers, copayer => {
            var pkr = lodash_1.default.pick(copayer, ['xPubKey', 'requestPubKey']);
            pkr.copayerName = copayer.name;
            return pkr;
        });
    }
    getFeeLevels(coin, network, cb) {
        $.checkArgument(coin || lodash_1.default.includes(common_1.Constants.COINS, coin));
        $.checkArgument(network || lodash_1.default.includes(['livenet', 'testnet'], network));
        const chain = common_1.Utils.getChain(coin).toLowerCase();
        this.request.get('/v2/feelevels/?coin=' +
            (chain || 'btc') +
            '&network=' +
            (network || 'livenet'), (err, result) => {
            if (err)
                return cb(err);
            return cb(err, result);
        });
    }
    clearCache(cb) {
        this.request.post('/v1/clearcache/', {}, (err, res) => {
            return cb(err, res);
        });
    }
    getVersion(cb) {
        this.request.get('/v1/version/', cb);
    }
    _checkKeyDerivation() {
        var isInvalid = this.keyDerivationOk === false;
        if (isInvalid) {
            log.error('Key derivation for this device is not working as expected');
        }
        return !isInvalid;
    }
    createWallet(walletName, copayerName, m, n, opts, cb) {
        if (!this._checkKeyDerivation())
            return cb(new Error('Cannot create new wallet'));
        if (opts)
            $.shouldBeObject(opts);
        opts = opts || {};
        var coin = opts.coin || 'btc';
        if (!lodash_1.default.includes(common_1.Constants.COINS, coin))
            return cb(new Error('Invalid coin'));
        var network = opts.network || 'livenet';
        if (!lodash_1.default.includes(['testnet', 'livenet'], network))
            return cb(new Error('Invalid network'));
        if (!this.credentials) {
            return cb(new Error('Import credentials first with setCredentials()'));
        }
        if (coin != this.credentials.coin) {
            return cb(new Error('Existing keys were created for a different coin'));
        }
        if (network != this.credentials.network) {
            return cb(new Error('Existing keys were created for a different network'));
        }
        var walletPrivKey = opts.walletPrivKey || new Bitcore.PrivateKey();
        var c = this.credentials;
        c.addWalletPrivateKey(walletPrivKey.toString());
        var encWalletName = common_1.Utils.encryptMessage(walletName, c.sharedEncryptingKey);
        var args = {
            name: encWalletName,
            m,
            n,
            pubKey: new Bitcore.PrivateKey(walletPrivKey).toPublicKey().toString(),
            coin,
            network,
            singleAddress: !!opts.singleAddress,
            id: opts.id,
            usePurpose48: n > 1,
            useNativeSegwit: !!opts.useNativeSegwit
        };
        this.request.post('/v2/wallets/', args, (err, res) => {
            if (err)
                return cb(err);
            var walletId = res.walletId;
            c.addWalletInfo(walletId, walletName, m, n, copayerName, {
                useNativeSegwit: opts.useNativeSegwit
            });
            var secret = API._buildSecret(c.walletId, c.walletPrivKey, c.coin, c.network);
            this._doJoinWallet(walletId, walletPrivKey, c.xPubKey, c.requestPubKey, copayerName, {
                coin
            }, (err, wallet) => {
                if (err)
                    return cb(err);
                return cb(null, n > 1 ? secret : null);
            });
        });
    }
    joinWallet(secret, copayerName, opts, cb) {
        if (!cb) {
            cb = opts;
            opts = {};
            log.warn('DEPRECATED WARN: joinWallet should receive 4 parameters.');
        }
        if (!this._checkKeyDerivation())
            return cb(new Error('Cannot join wallet'));
        opts = opts || {};
        var coin = opts.coin || 'btc';
        if (!lodash_1.default.includes(common_1.Constants.COINS, coin))
            return cb(new Error('Invalid coin'));
        try {
            var secretData = API.parseSecret(secret);
        }
        catch (ex) {
            return cb(ex);
        }
        if (!this.credentials) {
            return cb(new Error('Import credentials first with setCredentials()'));
        }
        this.credentials.addWalletPrivateKey(secretData.walletPrivKey.toString());
        this._doJoinWallet(secretData.walletId, secretData.walletPrivKey, this.credentials.xPubKey, this.credentials.requestPubKey, copayerName, {
            coin,
            dryRun: !!opts.dryRun
        }, (err, wallet) => {
            if (err)
                return cb(err);
            if (!opts.dryRun) {
                this.credentials.addWalletInfo(wallet.id, wallet.name, wallet.m, wallet.n, copayerName, {
                    useNativeSegwit: wallet.addressType === common_1.Constants.SCRIPT_TYPES.P2WSH,
                    allowOverwrite: true
                });
            }
            return cb(null, wallet);
        });
    }
    recreateWallet(cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <recreateWallet()>');
        $.checkState(this.credentials.isComplete());
        $.checkState(this.credentials.walletPrivKey);
        this.getStatus({
            includeExtendedInfo: true
        }, err => {
            if (!err) {
                log.info('Wallet is already created');
                return cb();
            }
            var c = this.credentials;
            var walletPrivKey = Bitcore.PrivateKey.fromString(c.walletPrivKey);
            var walletId = c.walletId;
            var supportBIP44AndP2PKH = c.derivationStrategy != common_1.Constants.DERIVATION_STRATEGIES.BIP45;
            var encWalletName = common_1.Utils.encryptMessage(c.walletName || 'recovered wallet', c.sharedEncryptingKey);
            var coin = c.coin;
            var args = {
                name: encWalletName,
                m: c.m,
                n: c.n,
                pubKey: walletPrivKey.toPublicKey().toString(),
                coin: c.coin,
                network: c.network,
                id: walletId,
                supportBIP44AndP2PKH
            };
            this.request.post('/v2/wallets/', args, (err, body) => {
                if (err) {
                    log.info('openWallet error' + err);
                    return cb(new Errors.WALLET_DOES_NOT_EXIST());
                }
                if (!walletId) {
                    walletId = body.walletId;
                }
                var i = 1;
                async.each(this.credentials.publicKeyRing, (item, next) => {
                    var name = item.copayerName || 'copayer ' + i++;
                    this._doJoinWallet(walletId, walletPrivKey, item.xPubKey, item.requestPubKey, name, {
                        coin: c.coin,
                        supportBIP44AndP2PKH
                    }, err => {
                        if (err && err instanceof Errors.COPAYER_IN_WALLET)
                            return next();
                        return next(err);
                    });
                }, cb);
            });
        });
    }
    _processWallet(wallet) {
        var encryptingKey = this.credentials.sharedEncryptingKey;
        var name = common_1.Utils.decryptMessageNoThrow(wallet.name, encryptingKey);
        if (name != wallet.name) {
            wallet.encryptedName = wallet.name;
        }
        wallet.name = name;
        lodash_1.default.each(wallet.copayers, copayer => {
            var name = common_1.Utils.decryptMessageNoThrow(copayer.name, encryptingKey);
            if (name != copayer.name) {
                copayer.encryptedName = copayer.name;
            }
            copayer.name = name;
            lodash_1.default.each(copayer.requestPubKeys, access => {
                if (!access.name)
                    return;
                var name = common_1.Utils.decryptMessageNoThrow(access.name, encryptingKey);
                if (name != access.name) {
                    access.encryptedName = access.name;
                }
                access.name = name;
            });
        });
    }
    _processStatus(status) {
        var processCustomData = data => {
            var copayers = data.wallet.copayers;
            if (!copayers)
                return;
            var me = lodash_1.default.find(copayers, {
                id: this.credentials.copayerId
            });
            if (!me || !me["customData"])
                return;
            var customData;
            try {
                customData = JSON.parse(common_1.Utils.decryptMessage(me["customData"], this.credentials.personalEncryptingKey));
            }
            catch (e) {
                log.warn('Could not decrypt customData:', me["customData"]);
            }
            if (!customData)
                return;
            data.customData = customData;
            if (!this.credentials.walletPrivKey && customData.walletPrivKey)
                this.credentials.addWalletPrivateKey(customData.walletPrivKey);
        };
        processCustomData(status);
        this._processWallet(status.wallet);
        this._processTxps(status.pendingTxps);
    }
    getNotifications(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getNotifications()>');
        opts = opts || {};
        var url = '/v1/notifications/';
        if (opts.lastNotificationId) {
            url += '?notificationId=' + opts.lastNotificationId;
        }
        else if (opts.timeSpan) {
            url += '?timeSpan=' + opts.timeSpan;
        }
        this.request.getWithLogin(url, (err, result) => {
            if (err)
                return cb(err);
            var notifications = lodash_1.default.filter(result, notification => {
                return (opts.includeOwn ||
                    notification.creatorId != this.credentials.copayerId);
            });
            return cb(null, notifications);
        });
    }
    getStatus(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getStatus()>');
        if (!cb) {
            cb = opts;
            opts = {};
            log.warn('DEPRECATED WARN: getStatus should receive 2 parameters.');
        }
        opts = opts || {};
        var qs = [];
        qs.push('includeExtendedInfo=' + (opts.includeExtendedInfo ? '1' : '0'));
        qs.push('twoStep=' + (opts.twoStep ? '1' : '0'));
        qs.push('serverMessageArray=1');
        if (opts.tokenAddress) {
            qs.push('tokenAddress=' + opts.tokenAddress);
        }
        if (opts.multisigContractAddress) {
            qs.push('multisigContractAddress=' + opts.multisigContractAddress);
            qs.push('network=' + this.credentials.network);
        }
        this.request.get('/v3/wallets/?' + qs.join('&'), (err, result) => {
            if (err)
                return cb(err);
            if (result.wallet.status == 'pending') {
                var c = this.credentials;
                result.wallet.secret = API._buildSecret(c.walletId, c.walletPrivKey, c.coin, c.network);
            }
            this._processStatus(result);
            return cb(err, result);
        });
    }
    getPreferences(cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getPreferences()>');
        $.checkArgument(cb);
        this.request.get('/v1/preferences/', (err, preferences) => {
            if (err)
                return cb(err);
            return cb(null, preferences);
        });
    }
    savePreferences(preferences, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <savePreferences()>');
        $.checkArgument(cb);
        this.request.put('/v1/preferences/', preferences, cb);
    }
    fetchPayPro(opts, cb) {
        $.checkArgument(opts).checkArgument(opts.payProUrl);
        paypro_1.PayPro.get({
            url: opts.payProUrl,
            coin: this.credentials.coin || 'btc',
            network: this.credentials.network || 'livenet',
            request: this.request
        }, (err, paypro) => {
            if (err)
                return cb(err);
            return cb(null, paypro);
        });
    }
    getUtxos(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getUtxos()>');
        opts = opts || {};
        var url = '/v1/utxos/';
        if (opts.addresses) {
            url +=
                '?' +
                    querystring.stringify({
                        addresses: [].concat(opts.addresses).join(',')
                    });
        }
        this.request.get(url, cb);
    }
    getCoinsForTx(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getCoinsForTx()>');
        opts = opts || {};
        var url = '/v1/txcoins/';
        url +=
            '?' +
                querystring.stringify({
                    coin: opts.coin,
                    network: opts.network,
                    txId: opts.txId
                });
        this.request.get(url, cb);
    }
    _getCreateTxProposalArgs(opts) {
        var args = lodash_1.default.cloneDeep(opts);
        args.message =
            API._encryptMessage(opts.message, this.credentials.sharedEncryptingKey) ||
                null;
        args.payProUrl = opts.payProUrl || null;
        lodash_1.default.each(args.outputs, o => {
            o.message =
                API._encryptMessage(o.message, this.credentials.sharedEncryptingKey) ||
                    null;
        });
        return args;
    }
    createTxProposal(opts, cb, baseUrl) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <createTxProposal()>');
        $.checkState(this.credentials.sharedEncryptingKey);
        $.checkArgument(opts);
        if (!opts.signingMethod && this.credentials.coin == 'bch') {
            opts.signingMethod = 'schnorr';
        }
        var args = this._getCreateTxProposalArgs(opts);
        baseUrl = baseUrl || '/v3/txproposals/';
        this.request.post(baseUrl, args, (err, txp) => {
            if (err)
                return cb(err);
            this._processTxps(txp);
            if (!verifier_1.Verifier.checkProposalCreation(args, txp, this.credentials.sharedEncryptingKey)) {
                return cb(new Errors.SERVER_COMPROMISED());
            }
            return cb(null, txp);
        });
    }
    publishTxProposal(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <publishTxProposal()>');
        $.checkArgument(opts).checkArgument(opts.txp);
        $.checkState(parseInt(opts.txp.version) >= 3);
        var t = common_1.Utils.buildTx(opts.txp);
        var hash = t.uncheckedSerialize();
        var args = {
            proposalSignature: common_1.Utils.signMessage(hash, this.credentials.requestPrivKey)
        };
        var url = '/v2/txproposals/' + opts.txp.id + '/publish/';
        this.request.post(url, args, (err, txp) => {
            if (err)
                return cb(err);
            this._processTxps(txp);
            return cb(null, txp);
        });
    }
    createAddress(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <createAddress()>');
        if (!cb) {
            cb = opts;
            opts = {};
            log.warn('DEPRECATED WARN: createAddress should receive 2 parameters.');
        }
        if (!this._checkKeyDerivation())
            return cb(new Error('Cannot create new address for this wallet'));
        opts = opts || {};
        this.request.post('/v4/addresses/', opts, (err, address) => {
            if (err)
                return cb(err);
            if (!verifier_1.Verifier.checkAddress(this.credentials, address)) {
                return cb(new Errors.SERVER_COMPROMISED());
            }
            return cb(null, address);
        });
    }
    getMainAddresses(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete());
        opts = opts || {};
        var args = [];
        if (opts.limit)
            args.push('limit=' + opts.limit);
        if (opts.reverse)
            args.push('reverse=1');
        var qs = '';
        if (args.length > 0) {
            qs = '?' + args.join('&');
        }
        var url = '/v1/addresses/' + qs;
        this.request.get(url, (err, addresses) => {
            if (err)
                return cb(err);
            if (!opts.doNotVerify) {
                var fake = lodash_1.default.some(addresses, address => {
                    return !verifier_1.Verifier.checkAddress(this.credentials, address);
                });
                if (fake)
                    return cb(new Errors.SERVER_COMPROMISED());
            }
            return cb(null, addresses);
        });
    }
    getBalance(opts, cb) {
        if (!cb) {
            cb = opts;
            opts = {};
            log.warn('DEPRECATED WARN: getBalance should receive 2 parameters.');
        }
        opts = opts || {};
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getBalance()>');
        var args = [];
        if (opts.coin) {
            if (!lodash_1.default.includes(common_1.Constants.COINS, opts.coin))
                return cb(new Error('Invalid coin'));
            args.push('coin=' + opts.coin);
        }
        if (opts.tokenAddress) {
            args.push('tokenAddress=' + opts.tokenAddress);
        }
        if (opts.multisigContractAddress) {
            args.push('multisigContractAddress=' + opts.multisigContractAddress);
        }
        var qs = '';
        if (args.length > 0) {
            qs = '?' + args.join('&');
        }
        var url = '/v1/balance/' + qs;
        this.request.get(url, cb);
    }
    getTxProposals(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getTxProposals()>');
        this.request.get('/v2/txproposals/', (err, txps) => {
            if (err)
                return cb(err);
            this._processTxps(txps);
            async.every(txps, (txp, acb) => {
                if (opts.doNotVerify)
                    return acb(true);
                this.getPayProV2(txp)
                    .then(paypro => {
                    var isLegit = verifier_1.Verifier.checkTxProposal(this.credentials, txp, {
                        paypro
                    });
                    return acb(isLegit);
                })
                    .catch(err => {
                    return acb(err);
                });
            }, isLegit => {
                if (!isLegit)
                    return cb(new Errors.SERVER_COMPROMISED());
                var result;
                if (opts.forAirGapped) {
                    result = {
                        txps: JSON.parse(JSON.stringify(txps)),
                        encryptedPkr: opts.doNotEncryptPkr
                            ? null
                            : common_1.Utils.encryptMessage(JSON.stringify(this.credentials.publicKeyRing), this.credentials.personalEncryptingKey),
                        unencryptedPkr: opts.doNotEncryptPkr
                            ? JSON.stringify(this.credentials.publicKeyRing)
                            : null,
                        m: this.credentials.m,
                        n: this.credentials.n
                    };
                }
                else {
                    result = txps;
                }
                return cb(null, result);
            });
        });
    }
    getPayPro(txp, cb) {
        if (!txp.payProUrl || this.doNotVerifyPayPro)
            return cb();
        paypro_1.PayPro.get({
            url: txp.payProUrl,
            coin: txp.coin || 'btc',
            network: txp.network || 'livenet',
            request: this.request
        }, (err, paypro) => {
            if (err)
                return cb(new Error('Could not fetch invoice:' + (err.message ? err.message : err)));
            return cb(null, paypro);
        });
    }
    getPayProV2(txp) {
        if (!txp.payProUrl || this.doNotVerifyPayPro)
            return Promise.resolve();
        const chain = common_1.Utils.getChain(txp.coin);
        const currency = txp.coin.toUpperCase();
        const payload = {
            address: txp.from
        };
        return payproV2_1.PayProV2.selectPaymentOption({
            paymentUrl: txp.payProUrl,
            chain,
            currency,
            payload
        });
    }
    pushSignatures(txp, signatures, cb, base) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <pushSignatures()>');
        $.checkArgument(txp.creatorId);
        if (lodash_1.default.isEmpty(signatures)) {
            return cb('No signatures to push. Sign the transaction with Key first');
        }
        this.getPayProV2(txp)
            .then(paypro => {
            var isLegit = verifier_1.Verifier.checkTxProposal(this.credentials, txp, {
                paypro
            });
            if (!isLegit)
                return cb(new Errors.SERVER_COMPROMISED());
            let defaultBase = '/v2/txproposals/';
            base = base || defaultBase;
            let url = base + txp.id + '/signatures/';
            var args = {
                signatures
            };
            this.request.post(url, args, (err, txp) => {
                if (err)
                    return cb(err);
                this._processTxps(txp);
                return cb(null, txp);
            });
        })
            .catch(err => {
            return cb(err);
        });
    }
    createAdvertisement(opts, cb) {
        var url = '/v1/advertisements/';
        let args = opts;
        this.request.post(url, args, (err, createdAd) => {
            if (err) {
                return cb(err);
            }
            return cb(null, createdAd);
        });
    }
    getAdvertisements(opts, cb) {
        var url = '/v1/advertisements/';
        if (opts.testing === true) {
            url = '/v1/advertisements/' + '?testing=true';
        }
        this.request.get(url, (err, ads) => {
            if (err) {
                return cb(err);
            }
            return cb(null, ads);
        });
    }
    getAdvertisementsByCountry(opts, cb) {
        var url = '/v1/advertisements/country/' + opts.country;
        this.request.get(url, (err, ads) => {
            if (err) {
                return cb(err);
            }
            return cb(null, ads);
        });
    }
    getAdvertisement(opts, cb) {
        var url = '/v1/advertisements/' + opts.adId;
        this.request.get(url, (err, body) => {
            if (err) {
                return cb(err);
            }
            return cb(null, body);
        });
    }
    activateAdvertisement(opts, cb) {
        var url = '/v1/advertisements/' + opts.adId + '/activate';
        let args = opts;
        this.request.post(url, args, (err, body) => {
            if (err) {
                return cb(err);
            }
            return cb(null, body);
        });
    }
    deactivateAdvertisement(opts, cb) {
        var url = '/v1/advertisements/' + opts.adId + '/deactivate';
        let args = opts;
        this.request.post(url, args, (err, body) => {
            if (err) {
                return cb(err);
            }
            return cb(null, body);
        });
    }
    deleteAdvertisement(opts, cb) {
        var url = '/v1/advertisements/' + opts.adId;
        this.request.delete(url, (err, body) => {
            if (err) {
                return cb(err);
            }
            return cb(null, body);
        });
    }
    signTxProposalFromAirGapped(txp, encryptedPkr, m, n, password) {
        throw new Error('signTxProposalFromAirGapped not yet implemented in v9.0.0');
    }
    static signTxProposalFromAirGapped(key, txp, unencryptedPkr, m, n, opts, cb) {
        opts = opts || {};
        var coin = opts.coin || 'btc';
        if (!lodash_1.default.includes(common_1.Constants.COINS, coin))
            return cb(new Error('Invalid coin'));
        var publicKeyRing = JSON.parse(unencryptedPkr);
        if (!lodash_1.default.isArray(publicKeyRing) || publicKeyRing.length != n) {
            throw new Error('Invalid public key ring');
        }
        var newClient = new API({
            baseUrl: 'https://bws.example.com/bws/api'
        });
        if (key.slice(0, 4) === 'xprv' || key.slice(0, 4) === 'tprv') {
            if (key.slice(0, 4) === 'xprv' && txp.network == 'testnet')
                throw new Error('testnet HD keys must start with tprv');
            if (key.slice(0, 4) === 'tprv' && txp.network == 'livenet')
                throw new Error('livenet HD keys must start with xprv');
            newClient.seedFromExtendedPrivateKey(key, {
                coin,
                account: opts.account,
                derivationStrategy: opts.derivationStrategy
            });
        }
        else {
            newClient.seedFromMnemonic(key, {
                coin,
                network: txp.network,
                passphrase: opts.passphrase,
                account: opts.account,
                derivationStrategy: opts.derivationStrategy
            });
        }
        newClient.credentials.m = m;
        newClient.credentials.n = n;
        newClient.credentials.addressType = txp.addressType;
        newClient.credentials.addPublicKeyRing(publicKeyRing);
        if (!verifier_1.Verifier.checkTxProposalSignature(newClient.credentials, txp))
            throw new Error('Fake transaction proposal');
        return newClient._signTxp(txp);
    }
    rejectTxProposal(txp, reason, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <rejectTxProposal()>');
        $.checkArgument(cb);
        var url = '/v1/txproposals/' + txp.id + '/rejections/';
        var args = {
            reason: API._encryptMessage(reason, this.credentials.sharedEncryptingKey) || ''
        };
        this.request.post(url, args, (err, txp) => {
            if (err)
                return cb(err);
            this._processTxps(txp);
            return cb(null, txp);
        });
    }
    broadcastRawTx(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <broadcastRawTx()>');
        $.checkArgument(cb);
        opts = opts || {};
        var url = '/v1/broadcast_raw/';
        this.request.post(url, opts, (err, txid) => {
            if (err)
                return cb(err);
            return cb(null, txid);
        });
    }
    _doBroadcast(txp, cb) {
        var url = '/v1/txproposals/' + txp.id + '/broadcast/';
        this.request.post(url, {}, (err, txp) => {
            if (err)
                return cb(err);
            this._processTxps(txp);
            return cb(null, txp);
        });
    }
    broadcastTxProposal(txp, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <broadcastTxProposal()>');
        this.getPayProV2(txp)
            .then(paypro => {
            if (paypro) {
                var t_unsigned = common_1.Utils.buildTx(txp);
                var t = lodash_1.default.cloneDeep(t_unsigned);
                this._applyAllSignatures(txp, t);
                const chain = common_1.Utils.getChain(txp.coin);
                const currency = txp.coin.toUpperCase();
                const rawTxUnsigned = t_unsigned.uncheckedSerialize();
                const serializedTx = t.serialize({
                    disableSmallFees: true,
                    disableLargeFees: true,
                    disableDustOutputs: true
                });
                const unsignedTransactions = [];
                const signedTransactions = [];
                const unserializedTxs = typeof rawTxUnsigned === 'string' ? [rawTxUnsigned] : rawTxUnsigned;
                const serializedTxs = typeof serializedTx === 'string' ? [serializedTx] : serializedTx;
                const weightedSize = [];
                let isBtcSegwit = txp.coin == 'btc' &&
                    (txp.addressType == 'P2WSH' || txp.addressType == 'P2WPKH');
                let i = 0;
                for (const unsigned of unserializedTxs) {
                    let size;
                    if (isBtcSegwit) {
                        size = Math.floor((txp.fee / txp.feePerKb) * 1000) - 10;
                    }
                    else {
                        size = serializedTxs[i].length / 2;
                    }
                    unsignedTransactions.push({
                        tx: unsigned,
                        weightedSize: size
                    });
                    weightedSize.push(size);
                    i++;
                }
                i = 0;
                for (const signed of serializedTxs) {
                    signedTransactions.push({
                        tx: signed,
                        weightedSize: weightedSize[i++]
                    });
                }
                payproV2_1.PayProV2.verifyUnsignedPayment({
                    paymentUrl: txp.payProUrl,
                    chain,
                    currency,
                    unsignedTransactions
                })
                    .then(() => {
                    payproV2_1.PayProV2.sendSignedPayment({
                        paymentUrl: txp.payProUrl,
                        chain,
                        currency,
                        signedTransactions,
                        bpPartner: {
                            bp_partner: this.bp_partner,
                            bp_partner_version: this.bp_partner_version
                        }
                    })
                        .then(payProDetails => {
                        if (payProDetails.memo) {
                            log.debug('Merchant memo:', payProDetails.memo);
                        }
                        return cb(null, txp, payProDetails.memo);
                    })
                        .catch(err => {
                        return cb(err);
                    });
                })
                    .catch(err => {
                    return cb(err);
                });
            }
            else {
                this._doBroadcast(txp, cb);
            }
        })
            .catch(err => {
            return cb(err);
        });
    }
    removeTxProposal(txp, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <removeTxProposal()>');
        var url = '/v1/txproposals/' + txp.id;
        this.request.delete(url, err => {
            return cb(err);
        });
    }
    getTxHistory(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getTxHistory()>');
        var args = [];
        if (opts) {
            if (opts.skip)
                args.push('skip=' + opts.skip);
            if (opts.limit)
                args.push('limit=' + opts.limit);
            if (opts.tokenAddress)
                args.push('tokenAddress=' + opts.tokenAddress);
            if (opts.multisigContractAddress)
                args.push('multisigContractAddress=' + opts.multisigContractAddress);
            if (opts.includeExtendedInfo)
                args.push('includeExtendedInfo=1');
        }
        var qs = '';
        if (args.length > 0) {
            qs = '?' + args.join('&');
        }
        var url = '/v1/txhistory/' + qs;
        this.request.get(url, (err, txs) => {
            if (err)
                return cb(err);
            this._processTxps(txs);
            return cb(null, txs);
        });
    }
    getTx(id, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <getTx()>');
        var url = '/v1/txproposals/' + id;
        this.request.get(url, (err, txp) => {
            if (err)
                return cb(err);
            this._processTxps(txp);
            return cb(null, txp);
        });
    }
    startScan(opts, cb) {
        $.checkState(this.credentials && this.credentials.isComplete(), 'Failed state: this.credentials at <startScan()>');
        var args = {
            includeCopayerBranches: opts.includeCopayerBranches
        };
        this.request.post('/v1/addresses/scan', args, err => {
            return cb(err);
        });
    }
    addAccess(opts, cb) {
        $.checkState(this.credentials, 'Failed state: no this.credentials at <addAccess()>');
        $.shouldBeString(opts.requestPrivKey, 'Failed state: no requestPrivKey at addAccess() ');
        $.shouldBeString(opts.signature, 'Failed state: no signature at addAccess()');
        opts = opts || {};
        var requestPubKey = new Bitcore.PrivateKey(opts.requestPrivKey)
            .toPublicKey()
            .toString();
        var copayerId = this.credentials.copayerId;
        var encCopayerName = opts.name
            ? common_1.Utils.encryptMessage(opts.name, this.credentials.sharedEncryptingKey)
            : null;
        var opts2 = {
            copayerId,
            requestPubKey,
            signature: opts.signature,
            name: encCopayerName,
            restrictions: opts.restrictions
        };
        this.request.put('/v1/copayers/' + copayerId + '/', opts2, (err, res) => {
            if (err)
                return cb(err);
            return cb(null, res.wallet, opts.requestPrivKey);
        });
    }
    getTxNote(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getTxNote()>');
        opts = opts || {};
        this.request.get('/v1/txnotes/' + opts.txid + '/', (err, note) => {
            if (err)
                return cb(err);
            this._processTxNotes(note);
            return cb(null, note);
        });
    }
    editTxNote(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <editTxNote()>');
        opts = opts || {};
        if (opts.body) {
            opts.body = API._encryptMessage(opts.body, this.credentials.sharedEncryptingKey);
        }
        this.request.put('/v1/txnotes/' + opts.txid + '/', opts, (err, note) => {
            if (err)
                return cb(err);
            this._processTxNotes(note);
            return cb(null, note);
        });
    }
    getTxNotes(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getTxNotes()>');
        opts = opts || {};
        var args = [];
        if (lodash_1.default.isNumber(opts.minTs)) {
            args.push('minTs=' + opts.minTs);
        }
        var qs = '';
        if (args.length > 0) {
            qs = '?' + args.join('&');
        }
        this.request.get('/v1/txnotes/' + qs, (err, notes) => {
            if (err)
                return cb(err);
            this._processTxNotes(notes);
            return cb(null, notes);
        });
    }
    getFiatRate(opts, cb) {
        $.checkArgument(cb);
        var opts = opts || {};
        var args = [];
        if (opts.ts)
            args.push('ts=' + opts.ts);
        if (opts.coin)
            args.push('coin=' + opts.coin);
        var qs = '';
        if (args.length > 0) {
            qs = '?' + args.join('&');
        }
        this.request.get('/v1/fiatrates/' + opts.code + '/' + qs, (err, rates) => {
            if (err)
                return cb(err);
            return cb(null, rates);
        });
    }
    pushNotificationsSubscribe(opts, cb) {
        var url = '/v1/pushnotifications/subscriptions/';
        this.request.post(url, opts, (err, response) => {
            if (err)
                return cb(err);
            return cb(null, response);
        });
    }
    pushNotificationsUnsubscribe(token, cb) {
        var url = '/v2/pushnotifications/subscriptions/' + token;
        this.request.delete(url, cb);
    }
    txConfirmationSubscribe(opts, cb) {
        var url = '/v1/txconfirmations/';
        this.request.post(url, opts, (err, response) => {
            if (err)
                return cb(err);
            return cb(null, response);
        });
    }
    txConfirmationUnsubscribe(txid, cb) {
        var url = '/v1/txconfirmations/' + txid;
        this.request.delete(url, cb);
    }
    getSendMaxInfo(opts, cb) {
        var args = [];
        opts = opts || {};
        if (opts.feeLevel)
            args.push('feeLevel=' + opts.feeLevel);
        if (opts.feePerKb != null)
            args.push('feePerKb=' + opts.feePerKb);
        if (opts.excludeUnconfirmedUtxos)
            args.push('excludeUnconfirmedUtxos=1');
        if (opts.returnInputs)
            args.push('returnInputs=1');
        var qs = '';
        if (args.length > 0)
            qs = '?' + args.join('&');
        var url = '/v1/sendmaxinfo/' + qs;
        this.request.get(url, (err, result) => {
            if (err)
                return cb(err);
            return cb(null, result);
        });
    }
    getEstimateGas(opts, cb) {
        var url = '/v3/estimateGas/';
        this.request.post(url, opts, (err, gasLimit) => {
            if (err)
                return cb(err);
            return cb(null, gasLimit);
        });
    }
    getMultisigContractInstantiationInfo(opts, cb) {
        var url = '/v1/ethmultisig/';
        opts.network = this.credentials.network;
        this.request.post(url, opts, (err, contractInstantiationInfo) => {
            if (err)
                return cb(err);
            return cb(null, contractInstantiationInfo);
        });
    }
    getMultisigContractInfo(opts, cb) {
        var url = '/v1/ethmultisig/info';
        opts.network = this.credentials.network;
        this.request.post(url, opts, (err, contractInfo) => {
            if (err)
                return cb(err);
            return cb(null, contractInfo);
        });
    }
    getStatusByIdentifier(opts, cb) {
        $.checkState(this.credentials, 'Failed state: this.credentials at <getStatusByIdentifier()>');
        opts = opts || {};
        var qs = [];
        qs.push('includeExtendedInfo=' + (opts.includeExtendedInfo ? '1' : '0'));
        qs.push('walletCheck=' + (opts.walletCheck ? '1' : '0'));
        this.request.get('/v1/wallets/' + opts.identifier + '?' + qs.join('&'), (err, result) => {
            if (err || !result || !result.wallet)
                return cb(err);
            if (result.wallet.status == 'pending') {
                var c = this.credentials;
                result.wallet.secret = API._buildSecret(c.walletId, c.walletPrivKey, c.coin, c.network);
            }
            this._processStatus(result);
            return cb(err, result);
        });
    }
    _oldCopayDecrypt(username, password, blob) {
        var SEP1 = '@#$';
        var SEP2 = '%^#@';
        var decrypted;
        try {
            var passphrase = username + SEP1 + password;
            decrypted = sjcl_1.default.decrypt(passphrase, blob);
        }
        catch (e) {
            passphrase = username + SEP2 + password;
            try {
                decrypted = sjcl_1.default.decrypt(passphrase, blob);
            }
            catch (e) {
                log.debug(e);
            }
        }
        if (!decrypted)
            return null;
        var ret;
        try {
            ret = JSON.parse(decrypted);
        }
        catch (e) { }
        return ret;
    }
    getWalletIdsFromOldCopay(username, password, blob) {
        var p = this._oldCopayDecrypt(username, password, blob);
        if (!p)
            return null;
        var ids = p.walletIds.concat(lodash_1.default.keys(p.focusedTimestamps));
        return lodash_1.default.uniq(ids);
    }
    static upgradeCredentialsV1(x) {
        $.shouldBeObject(x);
        if (!lodash_1.default.isUndefined(x.version) ||
            (!x.xPrivKey && !x.xPrivKeyEncrypted && !x.xPubKey)) {
            throw new Error('Could not recognize old version');
        }
        let k;
        if (x.xPrivKey || x.xPrivKeyEncrypted) {
            k = new key_1.Key({ seedData: x, seedType: 'objectV1' });
        }
        else {
            k = false;
        }
        let obsoleteFields = {
            version: true,
            xPrivKey: true,
            xPrivKeyEncrypted: true,
            hwInfo: true,
            entropySourcePath: true,
            mnemonic: true,
            mnemonicEncrypted: true
        };
        var c = new credentials_1.Credentials();
        lodash_1.default.each(credentials_1.Credentials.FIELDS, i => {
            if (!obsoleteFields[i]) {
                c[i] = x[i];
            }
        });
        if (c.externalSource) {
            throw new Error('External Wallets are no longer supported');
        }
        c.coin = c.coin || 'btc';
        c.addressType = c.addressType || common_1.Constants.SCRIPT_TYPES.P2SH;
        c.account = c.account || 0;
        c.rootPath = c.getRootPath();
        c.keyId = k.id;
        return { key: k, credentials: c };
    }
    static upgradeMultipleCredentialsV1(oldCredentials) {
        let newKeys = [], newCrededentials = [];
        lodash_1.default.each(oldCredentials, credentials => {
            let migrated;
            if (!credentials.version || credentials.version < 2) {
                log.info('About to migrate : ' + credentials.walletId);
                migrated = API.upgradeCredentialsV1(credentials);
                newCrededentials.push(migrated.credentials);
                if (migrated.key) {
                    log.info(`Wallet ${credentials.walletId} key's extracted`);
                    newKeys.push(migrated.key);
                }
                else {
                    log.info(`READ-ONLY Wallet ${credentials.walletId} migrated`);
                }
            }
        });
        if (newKeys.length > 0) {
            let credGroups = lodash_1.default.groupBy(newCrededentials, x => {
                $.checkState(x.xPubKey, 'Failed state: no xPubKey at credentials!');
                let xpub = new Bitcore.HDPublicKey(x.xPubKey);
                let fingerPrint = xpub.fingerPrint.toString('hex');
                return fingerPrint;
            });
            if (lodash_1.default.keys(credGroups).length < newCrededentials.length) {
                log.info('Found some wallets using the SAME key. Merging...');
                let uniqIds = {};
                lodash_1.default.each(lodash_1.default.values(credGroups), credList => {
                    let toKeep = credList.shift();
                    if (!toKeep.keyId)
                        return;
                    uniqIds[toKeep.keyId] = true;
                    if (!credList.length)
                        return;
                    log.info(`Merging ${credList.length} keys to ${toKeep.keyId}`);
                    lodash_1.default.each(credList, x => {
                        log.info(`\t${x.keyId} is now ${toKeep.keyId}`);
                        x.keyId = toKeep.keyId;
                    });
                });
                newKeys = lodash_1.default.filter(newKeys, x => uniqIds[x.id]);
            }
        }
        return {
            keys: newKeys,
            credentials: newCrededentials
        };
    }
    static serverAssistedImport(opts, clientOpts, callback) {
        $.checkArgument(opts.words || opts.xPrivKey, 'provide opts.words or opts.xPrivKey');
        let copayerIdAlreadyTested = {};
        var checkCredentials = (key, opts, icb) => {
            let c = key.createCredentials(null, {
                coin: opts.coin,
                network: opts.network,
                account: opts.account,
                n: opts.n
            });
            if (copayerIdAlreadyTested[c.copayerId + ':' + opts.n]) {
                return icb();
            }
            else {
                copayerIdAlreadyTested[c.copayerId + ':' + opts.n] = true;
            }
            let client = clientOpts.clientFactory
                ? clientOpts.clientFactory()
                : new API(clientOpts);
            client.fromString(c);
            client.openWallet({}, (err, status) => {
                if (!err) {
                    if (opts.coin == 'btc' &&
                        (status.wallet.addressType == 'P2WPKH' ||
                            status.wallet.addressType == 'P2WSH')) {
                        client.credentials.addressType =
                            status.wallet.n == 1
                                ? common_1.Constants.SCRIPT_TYPES.P2WPKH
                                : common_1.Constants.SCRIPT_TYPES.P2WSH;
                    }
                    let clients = [client];
                    const tokenAddresses = status.preferences.tokenAddresses;
                    if (!lodash_1.default.isEmpty(tokenAddresses)) {
                        lodash_1.default.each(tokenAddresses, t => {
                            const token = common_1.Constants.TOKEN_OPTS[t];
                            if (!token) {
                                log.warn(`Token ${t} unknown`);
                                return;
                            }
                            log.info(`Importing token: ${token.name}`);
                            const tokenCredentials = client.credentials.getTokenCredentials(token);
                            let tokenClient = lodash_1.default.cloneDeep(client);
                            tokenClient.credentials = tokenCredentials;
                            clients.push(tokenClient);
                        });
                    }
                    const multisigEthInfo = status.preferences.multisigEthInfo;
                    if (!lodash_1.default.isEmpty(multisigEthInfo)) {
                        lodash_1.default.each(multisigEthInfo, info => {
                            log.info(`Importing multisig wallet. Address: ${info.multisigContractAddress} - m: ${info.m} - n: ${info.n}`);
                            const multisigEthCredentials = client.credentials.getMultisigEthCredentials({
                                walletName: info.walletName,
                                multisigContractAddress: info.multisigContractAddress,
                                n: info.n,
                                m: info.m
                            });
                            let multisigEthClient = lodash_1.default.cloneDeep(client);
                            multisigEthClient.credentials = multisigEthCredentials;
                            clients.push(multisigEthClient);
                            const tokenAddresses = info.tokenAddresses;
                            if (!lodash_1.default.isEmpty(tokenAddresses)) {
                                lodash_1.default.each(tokenAddresses, t => {
                                    const token = common_1.Constants.TOKEN_OPTS[t];
                                    if (!token) {
                                        log.warn(`Token ${t} unknown`);
                                        return;
                                    }
                                    log.info(`Importing multisig token: ${token.name}`);
                                    const tokenCredentials = multisigEthClient.credentials.getTokenCredentials(token);
                                    let tokenClient = lodash_1.default.cloneDeep(multisigEthClient);
                                    tokenClient.credentials = tokenCredentials;
                                    clients.push(tokenClient);
                                });
                            }
                        });
                    }
                    return icb(null, clients);
                }
                if (err instanceof Errors.NOT_AUTHORIZED ||
                    err instanceof Errors.WALLET_DOES_NOT_EXIST) {
                    return icb();
                }
                return icb(err);
            });
        };
        var checkKey = (key, cb) => {
            let opts = [
                ['btc', 'livenet'],
                ['edu', 'livenet'],
                ['tik', 'livenet'],
                ['bch', 'livenet'],
                ['eth', 'livenet'],
                ['eth', 'testnet'],
                ['xrp', 'livenet'],
                ['xrp', 'testnet'],
                ['doge', 'livenet'],
                ['doge', 'testnet'],
                ['btc', 'livenet', true],
                ['edu', 'livenet', true],
                ['tik', 'livenet', true],
                ['bch', 'livenet', true]
            ];
            if (key.use44forMultisig) {
                opts = opts.filter(x => {
                    return x[2];
                });
            }
            if (key.use0forBCH) {
                opts = opts.filter(x => {
                    return x[0] == 'bch';
                });
            }
            if (!key.nonCompliantDerivation) {
                let testnet = lodash_1.default.cloneDeep(opts);
                testnet.forEach(x => {
                    x[1] = 'testnet';
                });
                opts = opts.concat(testnet);
            }
            else {
                opts = opts.filter(x => {
                    return x[0] == 'btc';
                });
            }
            let clients = [];
            async.eachSeries(opts, (x, next) => {
                let optsObj = {
                    coin: x[0],
                    network: x[1],
                    account: 0,
                    n: x[2] ? 2 : 1
                };
                checkCredentials(key, optsObj, (err, iclients) => {
                    if (err)
                        return next(err);
                    if (lodash_1.default.isEmpty(iclients))
                        return next();
                    clients = clients.concat(iclients);
                    if (key.use0forBCH ||
                        !key.compliantDerivation ||
                        key.use44forMultisig ||
                        key.BIP45)
                        return next();
                    let cont = true, account = 1;
                    async.whilst(() => {
                        return cont;
                    }, icb => {
                        optsObj.account = account++;
                        checkCredentials(key, optsObj, (err, iclients) => {
                            if (err)
                                return icb(err);
                            cont = !lodash_1.default.isEmpty(iclients);
                            if (cont) {
                                clients = clients.concat(iclients);
                            }
                            return icb();
                        });
                    }, err => {
                        return next(err);
                    });
                });
            }, err => {
                if (err)
                    return cb(err);
                return cb(null, clients);
            });
        };
        let sets = [
            {
                nonCompliantDerivation: false,
                useLegacyCoinType: false,
                useLegacyPurpose: false
            },
            {
                nonCompliantDerivation: false,
                useLegacyCoinType: true,
                useLegacyPurpose: false
            },
            {
                nonCompliantDerivation: false,
                useLegacyCoinType: false,
                useLegacyPurpose: true
            },
            {
                nonCompliantDerivation: false,
                useLegacyCoinType: true,
                useLegacyPurpose: true
            },
            {
                nonCompliantDerivation: true,
                useLegacyPurpose: true
            }
        ];
        let s, resultingClients = [], k;
        async.whilst(() => {
            if (!lodash_1.default.isEmpty(resultingClients))
                return false;
            s = sets.shift();
            if (!s)
                return false;
            try {
                if (opts.words) {
                    if (opts.passphrase) {
                        s.passphrase = opts.passphrase;
                    }
                    k = new key_1.Key(Object.assign({ seedData: opts.words, seedType: 'mnemonic' }, s));
                }
                else {
                    k = new key_1.Key(Object.assign({ seedData: opts.xPrivKey, seedType: 'extendedPrivateKey' }, s));
                }
            }
            catch (e) {
                log.info('Backup error:', e);
                return callback(new Errors.INVALID_BACKUP());
            }
            return true;
        }, icb => {
            checkKey(k, (err, clients) => {
                if (err)
                    return icb(err);
                if (clients && clients.length) {
                    resultingClients = clients;
                }
                return icb();
            });
        }, err => {
            if (err)
                return callback(err);
            if (lodash_1.default.isEmpty(resultingClients))
                k = null;
            return callback(null, k, resultingClients);
        });
    }
    simplexGetQuote(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/simplex/quote', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    simplexPaymentRequest(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/simplex/paymentRequest', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    simplexGetEvents(data) {
        return new Promise((resolve, reject) => {
            let qs = [];
            qs.push('env=' + data.env);
            this.request.get('/v1/service/simplex/events/?' + qs.join('&'), (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    wyreWalletOrderQuotation(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/wyre/walletOrderQuotation', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    wyreWalletOrderReservation(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/wyre/walletOrderReservation', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    changellyGetPairsParams(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/changelly/getPairsParams', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    changellyGetFixRateForAmount(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/changelly/getFixRateForAmount', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    changellyCreateFixTransaction(data) {
        return new Promise((resolve, reject) => {
            this.request.post('/v1/service/changelly/createFixTransaction', data, (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
}
exports.API = API;
API.PayProV2 = payproV2_1.PayProV2;
API.PayPro = paypro_1.PayPro;
API.Key = key_1.Key;
API.Verifier = verifier_1.Verifier;
API.Core = CWC;
API.Utils = common_1.Utils;
API.sjcl = sjcl_1.default;
API.errors = Errors;
API.Bitcore = CWC.BitcoreLib;
API.BitcoreCash = CWC.BitcoreLibCash;
API.BitcoreDoge = CWC.BitcoreLibDoge;
API.BitcoreEdu = CWC.BitcoreLibEdu;
API.BitcoreTik = CWC.BitcoreLibTik;
API.privateKeyEncryptionOpts = {
    iter: 10000
};
//# sourceMappingURL=api.js.map