export declare class Credentials {
    static FIELDS: string[];
    version: number;
    account: number;
    walletPrivKey: any;
    sharedEncryptingKey: any;
    walletId: any;
    walletName: any;
    m: any;
    n: any;
    copayerName: any;
    xPubKey: any;
    requestPubKey: any;
    publicKeyRing: any;
    rootPath: any;
    derivationStrategy: any;
    network: string;
    coin: string;
    use145forBCH: any;
    addressType: string;
    keyId: string;
    token?: string;
    multisigEthInfo?: any;
    externalSource?: boolean;
    constructor();
    static fromDerivedKey(opts: any): any;
    getTokenCredentials(token: {
        name: string;
        symbol: string;
        address: string;
    }): any;
    getMultisigEthCredentials(multisigEthInfo: {
        multisigContractAddress: string;
        walletName: string;
        n: string;
        m: string;
    }): any;
    getRootPath(): any;
    static fromObj(obj: any): any;
    toObj(): {};
    addWalletPrivateKey(walletPrivKey: any): void;
    addWalletInfo(walletId: any, walletName: any, m: any, n: any, copayerName: any, opts: any): void;
    hasWalletInfo(): boolean;
    addPublicKeyRing(publicKeyRing: any): void;
    isComplete(): boolean;
}
//# sourceMappingURL=credentials.d.ts.map