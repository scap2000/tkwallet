'use strict';

var educore = module.exports;

// module information
educore.version = 'v' + require('./package.json').version;
educore.versionGuard = function(version) {
  if (version !== undefined) {
    var message = 'More than one instance of bitcore-lib-edu found. ' +
      'Please make sure to require bitcore-lib-edu and check that submodules do' +
      ' not also include their own bitcore-lib-edu dependency.';
    throw new Error(message);
  }
};
educore.versionGuard(global._educore);
global._educore = educore.version;

// crypto
educore.crypto = {};
educore.crypto.BN = require('./lib/crypto/bn');
educore.crypto.ECDSA = require('./lib/crypto/ecdsa');
educore.crypto.Hash = require('./lib/crypto/hash');
educore.crypto.Random = require('./lib/crypto/random');
educore.crypto.Point = require('./lib/crypto/point');
educore.crypto.Signature = require('./lib/crypto/signature');

// encoding
educore.encoding = {};
educore.encoding.Base58 = require('./lib/encoding/base58');
educore.encoding.Base58Check = require('./lib/encoding/base58check');
educore.encoding.BufferReader = require('./lib/encoding/bufferreader');
educore.encoding.BufferWriter = require('./lib/encoding/bufferwriter');
educore.encoding.Varint = require('./lib/encoding/varint');

// utilities
educore.util = {};
educore.util.buffer = require('./lib/util/buffer');
educore.util.js = require('./lib/util/js');
educore.util.preconditions = require('./lib/util/preconditions');

// errors thrown by the library
educore.errors = require('./lib/errors');

// main bitcoin library
educore.Address = require('./lib/address');
educore.Block = require('./lib/block');
educore.MerkleBlock = require('./lib/block/merkleblock');
educore.BlockHeader = require('./lib/block/blockheader');
educore.HDPrivateKey = require('./lib/hdprivatekey.js');
educore.HDPublicKey = require('./lib/hdpublickey.js');
educore.Message = require('./lib/message');
educore.Networks = require('./lib/networks');
educore.Opcode = require('./lib/opcode');
educore.PrivateKey = require('./lib/privatekey');
educore.PublicKey = require('./lib/publickey');
educore.Script = require('./lib/script');
educore.Transaction = require('./lib/transaction');
educore.URI = require('./lib/uri');
educore.Unit = require('./lib/unit');

// dependencies, subject to change
educore.deps = {};
educore.deps.bnjs = require('bn.js');
educore.deps.bs58 = require('bs58');
educore.deps.Buffer = Buffer;
educore.deps.elliptic = require('elliptic');
educore.deps._ = require('lodash');

// Internal usage, exposed for testing/advanced tweaking
educore.Transaction.sighash = require('./lib/transaction/sighash');
