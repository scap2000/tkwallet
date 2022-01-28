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
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
function format(message, args) {
    return message
        .replace('{0}', args[0])
        .replace('{1}', args[1])
        .replace('{2}', args[2]);
}
var traverseNode = function (parent, errorDefinition) {
    var NodeError = function () {
        if (_.isString(errorDefinition.message)) {
            this.message = format(errorDefinition.message, arguments);
        }
        else if (_.isFunction(errorDefinition.message)) {
            this.message = errorDefinition.message.apply(null, arguments);
        }
        else {
            throw new Error('Invalid error definition for ' + errorDefinition.name);
        }
        this.stack = this.message + '\n' + new Error().stack;
    };
    NodeError.prototype = Object.create(parent.prototype);
    NodeError.prototype.name = parent.prototype.name + errorDefinition.name;
    parent[errorDefinition.name] = NodeError;
    if (errorDefinition.errors) {
        childDefinitions(NodeError, errorDefinition.errors);
    }
    return NodeError;
};
var childDefinitions = function (parent, childDefinitions) {
    _.each(childDefinitions, function (childDefinition) {
        traverseNode(parent, childDefinition);
    });
};
var traverseRoot = function (parent, errorsDefinition) {
    childDefinitions(parent, errorsDefinition);
    return parent;
};
var bwc = {};
bwc.Error = function () {
    this.message = 'Internal error';
    this.stack = this.message + '\n' + new Error().stack;
};
bwc.Error.prototype = Object.create(Error.prototype);
bwc.Error.prototype.name = 'bwc.Error';
var data = require('./spec');
traverseRoot(bwc.Error, data);
module.exports = bwc.Error;
module.exports.extend = function (spec) {
    return traverseNode(bwc.Error, spec);
};
//# sourceMappingURL=index.js.map