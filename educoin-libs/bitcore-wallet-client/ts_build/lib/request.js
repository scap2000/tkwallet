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
exports.Request = void 0;
const _ = __importStar(require("lodash"));
const common_1 = require("./common");
const request = require('superagent');
const async = require('async');
const Package = require('../../package.json');
var log = require('./log');
const util = require('util');
var Errors = require('./errors');
class Request {
    constructor(url, opts) {
        this.baseUrl = url;
        this.r = opts.r || request;
        this.supportStaffWalletId = opts.supportStaffWalletId;
        this.session = null;
        this.credentials = null;
    }
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    getHeaders(method, url, args) {
        var headers = {
            'x-client-version': 'bwc-' + Package.version
        };
        if (this.supportStaffWalletId) {
            headers['x-wallet-id'] = this.supportStaffWalletId;
        }
        return headers;
    }
    static _signRequest(method, url, args, privKey) {
        var message = [method.toLowerCase(), url, JSON.stringify(args)].join('|');
        return common_1.Utils.signMessage(message, privKey);
    }
    doRequest(method, url, args, useSession, cb) {
        var headers = this.getHeaders(method, url, args);
        if (this.credentials) {
            headers['x-identity'] = this.credentials.copayerId;
            if (useSession && this.session) {
                headers['x-session'] = this.session;
            }
            else {
                var reqSignature;
                var key = args._requestPrivKey || this.credentials.requestPrivKey;
                if (key) {
                    delete args['_requestPrivKey'];
                    reqSignature = Request._signRequest(method, url, args, key);
                }
                headers['x-signature'] = reqSignature;
            }
        }
        var r = this.r[method](this.baseUrl + url);
        r.accept('json');
        _.each(headers, (v, k) => {
            if (v)
                r.set(k, v);
        });
        if (args) {
            if (method == 'post' || method == 'put') {
                r.send(args);
            }
            else {
                r.query(args);
            }
        }
        r.timeout(this.timeout);
        r.end((err, res) => {
            if (!res) {
                return cb(new Errors.CONNECTION_ERROR());
            }
            if (res.body)
                log.debug(util.inspect(res.body, {
                    depth: 10
                }));
            if (res.status !== 200) {
                if (res.status === 503)
                    return cb(new Errors.MAINTENANCE_ERROR());
                if (res.status === 404)
                    return cb(new Errors.NOT_FOUND());
                if (!res.status)
                    return cb(new Errors.CONNECTION_ERROR());
                log.error('HTTP Error:' + res.status);
                if (!res.body)
                    return cb(new Error(res.status));
                return cb(Request._parseError(res.body));
            }
            if (res.body === '{"error":"read ECONNRESET"}')
                return cb(new Errors.ECONNRESET_ERROR(JSON.parse(res.body)));
            return cb(null, res.body, res.header);
        });
    }
    static _parseError(body) {
        if (!body)
            return;
        if (_.isString(body)) {
            try {
                body = JSON.parse(body);
            }
            catch (e) {
                body = {
                    error: body
                };
            }
        }
        var ret;
        if (body.code) {
            if (Errors[body.code]) {
                ret = new Errors[body.code]();
                if (body.message)
                    ret.message = body.message;
            }
            else {
                ret = new Error(body.code +
                    ': ' +
                    (_.isObject(body.message)
                        ? JSON.stringify(body.message)
                        : body.message));
            }
        }
        else {
            ret = new Error(body.error || JSON.stringify(body));
        }
        log.error(ret);
        return ret;
    }
    post(url, args, cb) {
        args = args || {};
        return this.doRequest('post', url, args, false, cb);
    }
    put(url, args, cb) {
        args = args || {};
        return this.doRequest('put', url, args, false, cb);
    }
    get(url, cb) {
        url += url.indexOf('?') > 0 ? '&' : '?';
        url += 'r=' + _.random(10000, 99999);
        return this.doRequest('get', url, {}, false, cb);
    }
    getWithLogin(url, cb) {
        url += url.indexOf('?') > 0 ? '&' : '?';
        url += 'r=' + _.random(10000, 99999);
        return this.doRequestWithLogin('get', url, {}, cb);
    }
    _login(cb) {
        this.post('/v1/login', {}, cb);
    }
    logout(cb) {
        this.post('/v1/logout', {}, cb);
    }
    doRequestWithLogin(method, url, args, cb) {
        async.waterfall([
            next => {
                if (this.session)
                    return next();
                this.doLogin(next);
            },
            next => {
                this.doRequest(method, url, args, true, (err, body, header) => {
                    if (err && err instanceof Errors.NOT_AUTHORIZED) {
                        this.doLogin(err => {
                            if (err)
                                return next(err);
                            return this.doRequest(method, url, args, true, next);
                        });
                    }
                    next(null, body, header);
                });
            }
        ], cb);
    }
    doLogin(cb) {
        this._login((err, s) => {
            if (err)
                return cb(err);
            if (!s)
                return cb(new Errors.NOT_AUTHORIZED());
            this.session = s;
            cb();
        });
    }
    delete(url, cb) {
        return this.doRequest('delete', url, {}, false, cb);
    }
}
exports.Request = Request;
//# sourceMappingURL=request.js.map