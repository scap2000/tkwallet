'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayProV2 = exports.NetworkMap = void 0;
const superagent = require('superagent');
const query = require('querystring');
const url = require('url');
const Errors = require('./errors');
const dfltTrustedKeys = require('../util/JsonPaymentProtocolKeys.js');
const Bitcore = require('crypto-wallet-core').BitcoreLib;
const _ = require('lodash');
const sha256 = Bitcore.crypto.Hash.sha256;
const BN = Bitcore.crypto.BN;
var Bitcore_ = {
    btc: Bitcore,
    bch: require('crypto-wallet-core').BitcoreLibCash
};
var MAX_FEE_PER_KB = {
    btc: 10000 * 1000,
    bch: 10000 * 1000,
    eth: 1000000000000,
    xrp: 1000000000000,
    doge: 10000 * 1000
};
var NetworkMap;
(function (NetworkMap) {
    NetworkMap["main"] = "livenet";
    NetworkMap["test"] = "testnet";
    NetworkMap["regtest"] = "testnet";
})(NetworkMap = exports.NetworkMap || (exports.NetworkMap = {}));
class PayProV2 {
    constructor(requestOptions = {}, trustedKeys = dfltTrustedKeys) {
        PayProV2.options = Object.assign({}, { agent: false }, requestOptions);
        PayProV2.trustedKeys = trustedKeys;
        if (!PayProV2.trustedKeys || !Object.keys(PayProV2.trustedKeys).length) {
            throw new Error('Invalid constructor, no trusted keys added to agent');
        }
    }
    static _asyncRequest(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let requestOptions = Object.assign({}, PayProV2.options, options);
                requestOptions.headers = Object.assign({}, PayProV2.options.headers, options.headers);
                var r = this.request[requestOptions.method](requestOptions.url);
                _.each(requestOptions.headers, (v, k) => {
                    if (v)
                        r.set(k, v);
                });
                r.agent(requestOptions.agent);
                if (requestOptions.args) {
                    if (requestOptions.method == 'post' || requestOptions.method == 'put') {
                        r.send(requestOptions.args);
                    }
                    else {
                        r.query(requestOptions.args);
                    }
                }
                r.end((err, res) => {
                    if (err) {
                        if (res && res.statusCode !== 200) {
                            if ((res.statusCode == 400 || res.statusCode == 422) &&
                                res.body &&
                                res.body.msg) {
                                return reject(this.getError(res.body.msg));
                            }
                            else if (res.statusCode == 404) {
                                return reject(new Errors.INVOICE_NOT_AVAILABLE());
                            }
                            else if (res.statusCode == 504) {
                                return reject(new Errors.REQUEST_TIMEOUT());
                            }
                            else if (res.statusCode == 500 && res.body && res.body.msg) {
                                return reject(new Error(res.body.msg));
                            }
                            else {
                                return reject(new Errors.INVALID_REQUEST());
                            }
                        }
                        return reject(err);
                    }
                    return resolve({
                        rawBody: res.text,
                        headers: res.headers
                    });
                });
            });
        });
    }
    static getError(errMsg) {
        switch (true) {
            case errMsg.includes('Invoice no longer accepting payments'):
                return new Errors.INVOICE_EXPIRED();
            case errMsg.includes('We were unable to parse your payment.'):
                return new Errors.UNABLE_TO_PARSE_PAYMENT();
            case errMsg.includes('Request must include exactly one'):
                return new Errors.NO_TRASACTION();
            case errMsg.includes('Your transaction was an in an invalid format'):
                return new Errors.INVALID_TX_FORMAT();
            case errMsg.includes('We were unable to parse the transaction you sent'):
                return new Errors.UNABLE_TO_PARSE_TX();
            case errMsg.includes('The transaction you sent does not have any output to the bitcoin address on the invoice'):
                return new Errors.WRONG_ADDRESS();
            case errMsg.includes('The amount on the transaction (X BTC) does'):
                return new Errors.WRONG_AMOUNT();
            case errMsg.includes('Transaction fee (X sat/kb) is below'):
                return new Errors.NOT_ENOUGH_FEE();
            case errMsg.includes('This invoice is priced in BTC, not BCH.'):
                return new Errors.BTC_NOT_BCH();
            case errMsg.includes('	One or more input transactions for your transaction were not found on the blockchain.'):
                return new Errors.INPUT_NOT_FOUND();
            case errMsg.includes('The PayPro request has timed out. Please connect to the internet or try again later.'):
                return new Errors.REQUEST_TIMEOUT();
            case errMsg.includes('One or more input transactions for your transactions are not yet confirmed in at least one block.'):
                return new Errors.UNCONFIRMED_INPUTS_NOT_ACCEPTED();
            default:
                return new Error(errMsg);
        }
    }
    static getPaymentOptions({ paymentUrl, unsafeBypassValidation = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const paymentUrlObject = url.parse(paymentUrl);
            if (paymentUrlObject.protocol !== 'http:' &&
                paymentUrlObject.protocol !== 'https:') {
                let uriQuery = query.decode(paymentUrlObject.query);
                if (!uriQuery.r) {
                    throw new Error('Invalid payment protocol url');
                }
                else {
                    paymentUrl = uriQuery.r;
                }
            }
            const { rawBody, headers } = yield PayProV2._asyncRequest({
                method: 'get',
                url: paymentUrl,
                headers: {
                    Accept: 'application/payment-options',
                    'x-paypro-version': 2,
                    Connection: 'Keep-Alive',
                    'Keep-Alive': 'timeout=30, max=10'
                }
            });
            return yield this.verifyResponse(paymentUrl, rawBody, headers, unsafeBypassValidation);
        });
    }
    static selectPaymentOption({ paymentUrl, chain, currency, payload, unsafeBypassValidation = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let { rawBody, headers } = yield PayProV2._asyncRequest({
                url: paymentUrl,
                method: 'post',
                headers: {
                    'Content-Type': 'application/payment-request',
                    'x-paypro-version': 2,
                    Connection: 'Keep-Alive',
                    'Keep-Alive': 'timeout=30, max=10'
                },
                args: JSON.stringify({
                    chain,
                    currency,
                    payload
                })
            });
            return yield PayProV2.verifyResponse(paymentUrl, rawBody, headers, unsafeBypassValidation);
        });
    }
    static verifyUnsignedPayment({ paymentUrl, chain, currency, unsignedTransactions, unsafeBypassValidation = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let { rawBody, headers } = yield PayProV2._asyncRequest({
                url: paymentUrl,
                method: 'post',
                headers: {
                    'Content-Type': 'application/payment-verification',
                    'x-paypro-version': 2,
                    Connection: 'Keep-Alive',
                    'Keep-Alive': 'timeout=30, max=10'
                },
                args: JSON.stringify({
                    chain,
                    currency,
                    transactions: unsignedTransactions
                })
            });
            return yield this.verifyResponse(paymentUrl, rawBody, headers, unsafeBypassValidation);
        });
    }
    static sendSignedPayment({ paymentUrl, chain, currency, signedTransactions, unsafeBypassValidation = false, bpPartner }) {
        return __awaiter(this, void 0, void 0, function* () {
            let { rawBody, headers } = yield this._asyncRequest({
                url: paymentUrl,
                method: 'post',
                headers: {
                    'Content-Type': 'application/payment',
                    'x-paypro-version': 2,
                    BP_PARTNER: bpPartner.bp_partner,
                    BP_PARTNER_VERSION: bpPartner.bp_partner_version,
                    Connection: 'Keep-Alive',
                    'Keep-Alive': 'timeout=30, max=10'
                },
                args: JSON.stringify({
                    chain,
                    currency,
                    transactions: signedTransactions
                })
            });
            return yield this.verifyResponse(paymentUrl, rawBody, headers, unsafeBypassValidation);
        });
    }
    static verifyResponse(requestUrl, rawBody, headers, unsafeBypassValidation) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!requestUrl) {
                throw new Error('Parameter requestUrl is required');
            }
            if (!rawBody) {
                throw new Error('Parameter rawBody is required');
            }
            if (!headers) {
                throw new Error('Parameter headers is required');
            }
            let responseData;
            try {
                responseData = JSON.parse(rawBody);
            }
            catch (e) {
                throw new Error('Invalid JSON in response body');
            }
            let payProDetails;
            try {
                payProDetails = this.processResponse(responseData);
            }
            catch (e) {
                throw e;
            }
            if (unsafeBypassValidation) {
                return payProDetails;
            }
            const hash = headers.digest.split('=')[1];
            const signature = headers.signature;
            const signatureType = headers['x-signature-type'];
            const identity = headers['x-identity'];
            let host;
            try {
                host = url.parse(requestUrl).hostname;
            }
            catch (e) { }
            if (!host) {
                throw new Error('Invalid requestUrl');
            }
            if (!signatureType) {
                throw new Error('Response missing x-signature-type header');
            }
            if (typeof signatureType !== 'string') {
                throw new Error('Invalid x-signature-type header');
            }
            if (signatureType !== 'ecc') {
                throw new Error(`Unknown signature type ${signatureType}`);
            }
            if (!signature) {
                throw new Error('Response missing signature header');
            }
            if (typeof signature !== 'string') {
                throw new Error('Invalid signature header');
            }
            if (!identity) {
                throw new Error('Response missing x-identity header');
            }
            if (typeof identity !== 'string') {
                throw new Error('Invalid identity header');
            }
            if (!PayProV2.trustedKeys[identity]) {
                throw new Error(`Response signed by unknown key (${identity}), unable to validate`);
            }
            const keyData = PayProV2.trustedKeys[identity];
            const actualHash = sha256(Buffer.from(rawBody, 'utf8')).toString('hex');
            if (hash !== actualHash) {
                throw new Error(`Response body hash does not match digest header. Actual: ${actualHash} Expected: ${hash}`);
            }
            if (!keyData.domains.includes(host)) {
                throw new Error(`The key on the response (${identity}) is not trusted for domain ${host}`);
            }
            const hashbuf = Buffer.from(hash, 'hex');
            const sigbuf = Buffer.from(signature, 'hex');
            let s_r = BN.fromBuffer(sigbuf.slice(0, 32));
            let s_s = BN.fromBuffer(sigbuf.slice(32));
            let pub = Bitcore.PublicKey.fromString(keyData.publicKey);
            let sig = new Bitcore.crypto.Signature(s_r, s_s);
            let valid = Bitcore.crypto.ECDSA.verify(hashbuf, sig, pub);
            if (!valid) {
                throw new Error('Response signature invalid');
            }
            return payProDetails;
        });
    }
    static processResponse(responseData) {
        let payProDetails = {
            payProUrl: responseData.paymentUrl,
            memo: responseData.memo
        };
        payProDetails.verified = true;
        if (responseData.paymentOptions) {
            payProDetails.paymentOptions = responseData.paymentOptions;
            payProDetails.paymentOptions.forEach(option => {
                option.network = NetworkMap[option.network];
            });
        }
        if (responseData.network) {
            payProDetails.network = NetworkMap[responseData.network];
        }
        if (responseData.chain) {
            payProDetails.coin = responseData.chain.toLowerCase();
        }
        if (responseData.expires) {
            try {
                payProDetails.expires = new Date(responseData.expires).toISOString();
            }
            catch (e) {
                throw new Error('Bad expiration');
            }
        }
        if (responseData.instructions) {
            payProDetails.instructions = responseData.instructions;
            payProDetails.instructions.forEach(output => {
                output.toAddress = output.to || output.outputs[0].address;
                output.amount =
                    output.value !== undefined ? output.value : output.outputs[0].amount;
            });
            const { requiredFeeRate, gasPrice } = responseData.instructions[0];
            payProDetails.requiredFeeRate = requiredFeeRate || gasPrice;
            if (payProDetails.requiredFeeRate) {
                if (payProDetails.requiredFeeRate > MAX_FEE_PER_KB[payProDetails.coin]) {
                    throw new Error('Fee rate too high:' + payProDetails.requiredFeeRate);
                }
            }
        }
        return payProDetails;
    }
}
exports.PayProV2 = PayProV2;
PayProV2.options = {
    headers: {},
    args: '',
    agent: false
};
PayProV2.request = superagent;
PayProV2.trustedKeys = dfltTrustedKeys;
//# sourceMappingURL=payproV2.js.map