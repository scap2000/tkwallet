export declare enum NetworkMap {
    main = "livenet",
    test = "testnet",
    regtest = "testnet"
}
export declare class PayProV2 {
    static options: {
        headers?: any;
        args?: string;
        agent?: boolean;
    };
    static request: any;
    static trustedKeys: any;
    constructor(requestOptions?: {}, trustedKeys?: any);
    static _asyncRequest(options: any): Promise<{
        rawBody: string;
        headers: object;
    }>;
    static getError(errMsg: string): Error;
    static getPaymentOptions({ paymentUrl, unsafeBypassValidation }: {
        paymentUrl: any;
        unsafeBypassValidation?: boolean;
    }): Promise<any>;
    static selectPaymentOption({ paymentUrl, chain, currency, payload, unsafeBypassValidation }: {
        paymentUrl: any;
        chain: any;
        currency: any;
        payload: any;
        unsafeBypassValidation?: boolean;
    }): Promise<any>;
    static verifyUnsignedPayment({ paymentUrl, chain, currency, unsignedTransactions, unsafeBypassValidation }: {
        paymentUrl: any;
        chain: any;
        currency: any;
        unsignedTransactions: any;
        unsafeBypassValidation?: boolean;
    }): Promise<any>;
    static sendSignedPayment({ paymentUrl, chain, currency, signedTransactions, unsafeBypassValidation, bpPartner }: {
        paymentUrl: any;
        chain: any;
        currency: any;
        signedTransactions: any;
        unsafeBypassValidation?: boolean;
        bpPartner: any;
    }): Promise<any>;
    static verifyResponse(requestUrl: any, rawBody: any, headers: any, unsafeBypassValidation: any): Promise<any>;
    static processResponse(responseData: any): any;
}
//# sourceMappingURL=payproV2.d.ts.map