'use strict';

var tikcore = module.exports;

// module information
tikcore.version = 'v' + require('./package.json').version;
tikcore.versionGuard = function(version) {
  if (version !== undefined) {
    var message = 'More than one instance of bitcore-lib-edu found. ' +
      'Please make sure to require bitcore-lib-edu and check that submodules do' +
      ' not also include their own bitcore-lib-edu dependency.';
    throw new Error(message);
  }
};
tikcore.versionGuard(global._tikcore);
global._tikcore = tikcore.version;

// crypto
tikcore.crypto = {};
tikcore.crypto.BN = require('./lib/crypto/bn');
tikcore.crypto.ECDSA = require('./lib/crypto/ecdsa');
tikcore.crypto.Hash = require('./lib/crypto/hash');
tikcore.crypto.Random = require('./lib/crypto/random');
tikcore.crypto.Point = require('./lib/crypto/point');
tikcore.crypto.Signature = require('./lib/crypto/signature');

// encoding
tikcore.encoding = {};
tikcore.encoding.Base58 = require('./lib/encoding/base58');
tikcore.encoding.Base58Check = require('./lib/encoding/base58check');
tikcore.encoding.BufferReader = require('./lib/encoding/bufferreader');
tikcore.encoding.BufferWriter = require('./lib/encoding/bufferwriter');
tikcore.encoding.Varint = require('./lib/encoding/varint');

// utilities
tikcore.util = {};
tikcore.util.buffer = require('./lib/util/buffer');
tikcore.util.js = require('./lib/util/js');
tikcore.util.preconditions = require('./lib/util/preconditions');

// errors thrown by the library
tikcore.errors = require('./lib/errors');

// main bitcoin library
tikcore.Address = require('./lib/address');
tikcore.Block = require('./lib/block');
tikcore.MerkleBlock = require('./lib/block/merkleblock');
tikcore.BlockHeader = require('./lib/block/blockheader');
tikcore.HDPrivateKey = require('./lib/hdprivatekey.js');
tikcore.HDPublicKey = require('./lib/hdpublickey.js');
tikcore.Message = require('./lib/message');
tikcore.Networks = require('./lib/networks');
tikcore.Opcode = require('./lib/opcode');
tikcore.PrivateKey = require('./lib/privatekey');
tikcore.PublicKey = require('./lib/publickey');
tikcore.Script = require('./lib/script');
tikcore.Transaction = require('./lib/transaction');
tikcore.URI = require('./lib/uri');
tikcore.Unit = require('./lib/unit');

// dependencies, subject to change
tikcore.deps = {};
tikcore.deps.bnjs = require('bn.js');
tikcore.deps.bs58 = require('bs58');
tikcore.deps.Buffer = Buffer;
tikcore.deps.elliptic = require('elliptic');
tikcore.deps._ = require('lodash');

// Internal usage, exposed for testing/advanced tweaking
tikcore.Transaction.sighash = require('./lib/transaction/sighash');
