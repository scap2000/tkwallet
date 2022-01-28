"use strict";
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
exports.Verifier = void 0;
const _ = __importStar(require("lodash"));
const common_1 = require("./common");
var $ = require('preconditions').singleton();
const crypto_wallet_core_1 = require("crypto-wallet-core");
var Bitcore = crypto_wallet_core_1.BitcoreLib;
var BCHAddress = crypto_wallet_core_1.BitcoreLibCash.Address;
var log = require('./log');
class Verifier {
    static checkAddress(credentials, address) {
        $.checkState(credentials.isComplete(), 'Failed state: credentials at <checkAddress>');
        var local = common_1.Utils.deriveAddress(address.type || credentials.addressType, credentials.publicKeyRing, address.path, credentials.m, credentials.network, credentials.coin);
        return ((local.address == address.address &&
            _.difference(local.publicKeys, address.publicKeys).length === 0) || credentials.coin === 'edu' || credentials.coin === 'tik');
    }
    static checkCopayers(credentials, copayers) {
        $.checkState(credentials.walletPrivKey, 'Failed state: credentials at <checkCopayers>');
        var walletPubKey = Bitcore.PrivateKey.fromString(credentials.walletPrivKey)
            .toPublicKey()
            .toString();
        if (copayers.length != credentials.n) {
            log.error('Missing public keys in server response');
            return false;
        }
        var uniq = [];
        var error;
        _.each(copayers, copayer => {
            if (error)
                return;
            if (uniq[copayers.xPubKey]++) {
                log.error('Repeated public keys in server response');
                error = true;
            }
            if (!(copayer.encryptedName || copayer.name) ||
                !copayer.xPubKey ||
                !copayer.requestPubKey ||
                !copayer.signature) {
                log.error('Missing copayer fields in server response');
                error = true;
            }
            else {
                var hash = common_1.Utils.getCopayerHash(copayer.encryptedName || copayer.name, copayer.xPubKey, copayer.requestPubKey);
                if (!common_1.Utils.verifyMessage(hash, copayer.signature, walletPubKey)) {
                    log.error('Invalid signatures in server response');
                    error = true;
                }
            }
        });
        if (error)
            return false;
        if (!_.includes(_.map(copayers, 'xPubKey'), credentials.xPubKey)) {
            log.error('Server response does not contains our public keys');
            return false;
        }
        return true;
    }
    static checkProposalCreation(args, txp, encryptingKey) {
        var strEqual = (str1, str2) => {
            return (!str1 && !str2) || str1 === str2;
        };
        if (txp.outputs.length != args.outputs.length)
            return false;
        for (var i = 0; i < txp.outputs.length; i++) {
            var o1 = txp.outputs[i];
            var o2 = args.outputs[i];
            if (!strEqual(o1.toAddress, o2.toAddress))
                return false;
            if (!strEqual(o1.script, o2.script))
                return false;
            if (o1.amount != o2.amount)
                return false;
            var decryptedMessage = null;
            try {
                decryptedMessage = common_1.Utils.decryptMessage(o2.message, encryptingKey);
            }
            catch (e) {
                return false;
            }
            if (!strEqual(o1.message, decryptedMessage))
                return false;
        }
        var changeAddress;
        if (txp.changeAddress) {
            changeAddress = txp.changeAddress.address;
        }
        if (args.changeAddress && !strEqual(changeAddress, args.changeAddress))
            return false;
        if (_.isNumber(args.feePerKb) && txp.feePerKb != args.feePerKb)
            return false;
        if (!strEqual(txp.payProUrl, args.payProUrl))
            return false;
        var decryptedMessage = null;
        try {
            decryptedMessage = common_1.Utils.decryptMessage(args.message, encryptingKey);
        }
        catch (e) {
            return false;
        }
        if (!strEqual(txp.message, decryptedMessage))
            return false;
        if ((args.customData || txp.customData) &&
            !_.isEqual(txp.customData, args.customData))
            return false;
        return true;
    }
    static checkTxProposalSignature(credentials, txp) {
        $.checkArgument(txp.creatorId);
        $.checkState(credentials.isComplete(), 'Failed state: credentials at checkTxProposalSignature');
        var creatorKeys = _.find(credentials.publicKeyRing, item => {
            if (common_1.Utils.xPubToCopayerId(txp.coin || 'btc', item.xPubKey) === txp.creatorId)
                return true;
        });
        if (!creatorKeys)
            return false;
        var creatorSigningPubKey;
        if (txp.proposalSignaturePubKey) {
            if (!common_1.Utils.verifyRequestPubKey(txp.proposalSignaturePubKey, txp.proposalSignaturePubKeySig, creatorKeys.xPubKey))
                return false;
            creatorSigningPubKey = txp.proposalSignaturePubKey;
        }
        else {
            creatorSigningPubKey = creatorKeys.requestPubKey;
        }
        if (!creatorSigningPubKey)
            return false;
        var hash;
        if (parseInt(txp.version) >= 3) {
            var t = common_1.Utils.buildTx(txp);
            hash = t.uncheckedSerialize();
        }
        else {
            throw new Error('Transaction proposal not supported');
        }
        log.debug('Regenerating & verifying tx proposal hash -> Hash: ', hash, ' Signature: ', txp.proposalSignature);
        if (!common_1.Utils.verifyMessage(hash, txp.proposalSignature, creatorSigningPubKey))
            return false;
        if (common_1.Constants.UTXO_COINS.includes(txp.coin) &&
            !this.checkAddress(credentials, txp.changeAddress))
            return false;
        return true;
    }
    static checkPaypro(txp, payproOpts) {
        var toAddress, amount, feeRate;
        if (parseInt(txp.version) >= 3) {
            toAddress = txp.outputs[0].toAddress;
            amount = txp.amount;
            if (txp.feePerKb) {
                feeRate = txp.feePerKb / 1024;
            }
        }
        else {
            toAddress = txp.toAddress;
            amount = txp.amount;
        }
        if (amount != _.sumBy(payproOpts.instructions, 'amount'))
            return false;
        if (txp.coin == 'btc' && toAddress != payproOpts.instructions[0].toAddress)
            return false;
        if (txp.coin == 'bch' &&
            new BCHAddress(toAddress).toString() !=
                new BCHAddress(payproOpts.instructions[0].toAddress).toString())
            return false;
        return true;
    }
    static checkTxProposal(credentials, txp, opts) {
        opts = opts || {};
        if (!this.checkTxProposalSignature(credentials, txp))
            return false;
        if (opts.paypro && !this.checkPaypro(txp, opts.paypro))
            return false;
        return true;
    }
}
exports.Verifier = Verifier;
//# sourceMappingURL=verifier.js.map