import 'source-map-support/register';
export declare class Key {
    private;
    id: any;
    use0forBCH: boolean;
    use44forMultisig: boolean;
    compliantDerivation: boolean;
    BIP45: boolean;
    fingerPrint: string;
    constructor(opts?: {
        seedType: string;
        seedData?: any;
        passphrase?: string;
        password?: string;
        sjclOpts?: any;
        use0forBCH?: boolean;
        useLegacyPurpose?: boolean;
        useLegacyCoinType?: boolean;
        nonCompliantDerivation?: boolean;
        language?: string;
    });
    static match(a: any, b: any): boolean;
    private setFromMnemonic;
    toObj: () => {
        xPrivKey: any;
        xPrivKeyEncrypted: any;
        mnemonic: any;
        mnemonicEncrypted: any;
        version: any;
        mnemonicHasPassphrase: any;
        fingerPrint: any;
        compliantDerivation: any;
        BIP45: any;
        use0forBCH: any;
        use44forMultisig: any;
        id: any;
    };
    isPrivKeyEncrypted: () => boolean;
    checkPassword: (password: any) => boolean;
    get: (password: any) => any;
    encrypt: (password: any, opts: any) => void;
    decrypt: (password: any) => void;
    derive: (password: any, path: any) => any;
    _checkCoin: (coin: any) => void;
    _checkNetwork: (network: any) => void;
    getBaseAddressDerivationPath: (opts: any) => string;
    createCredentials: (password: any, opts: any) => any;
    createAccess: (password: any, opts: any) => {
        signature: any;
        requestPrivKey: any;
    };
    sign: (rootPath: any, txp: any, password: any, cb: any) => any;
}
//# sourceMappingURL=key.d.ts.map