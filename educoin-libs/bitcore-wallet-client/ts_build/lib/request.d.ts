export declare class Request {
    baseUrl: any;
    session: any;
    r: any;
    credentials: any;
    supportStaffWalletId: any;
    timeout: any;
    constructor(url?: any, opts?: any);
    setCredentials(credentials: any): void;
    getHeaders(method: any, url: any, args: any): {
        'x-client-version': string;
    };
    static _signRequest(method: any, url: any, args: any, privKey: any): any;
    doRequest(method: any, url: any, args: any, useSession: any, cb: any): void;
    static _parseError(body: any): any;
    post(url: any, args: any, cb: any): void;
    put(url: any, args: any, cb: any): void;
    get(url: any, cb: any): void;
    getWithLogin(url: any, cb: any): void;
    _login(cb: any): void;
    logout(cb: any): void;
    doRequestWithLogin(method: any, url: any, args: any, cb: any): void;
    doLogin(cb: any): void;
    delete(url: any, cb: any): void;
}
//# sourceMappingURL=request.d.ts.map