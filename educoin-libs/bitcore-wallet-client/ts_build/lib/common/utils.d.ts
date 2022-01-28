export declare class Utils {
    static getChain(coin: string): string;
    static encryptMessage(message: any, encryptingKey: any): any;
    static decryptMessage(cyphertextJson: any, encryptingKey: any): any;
    static decryptMessageNoThrow(cyphertextJson: any, encryptingKey: any): any;
    static isJsonString(str: any): any;
    static hashMessage(text: any): any;
    static signMessage(message: any, privKey: any): any;
    static verifyMessage(message: Array<string> | string, signature: any, pubKey: any): any;
    static privateKeyToAESKey(privKey: any): any;
    static getCopayerHash(name: any, xPubKey: any, requestPubKey: any): string;
    static getProposalHash(proposalHeader: any): any;
    static getOldHash(toAddress: any, amount: any, message: any, payProUrl: any): string;
    static parseDerivationPath(path: string): {
        _input: string;
        addressIndex: string;
        isChange: boolean;
    };
    static deriveAddress(scriptType: any, publicKeyRing: any, path: any, m: any, network: any, coin: any): {
        address: any;
        path: any;
        publicKeys: any[];
    };
    static xPubToCopayerId(coin: any, xpub: any): any;
    static signRequestPubKey(requestPubKey: any, xPrivKey: any): any;
    static verifyRequestPubKey(requestPubKey: any, signature: any, xPubKey: any): any;
    static formatAmount(satoshis: any, unit: any, opts?: any): any;
    static buildTx(txp: any): any;
}
//# sourceMappingURL=utils.d.ts.map