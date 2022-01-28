'use strict';
export const Defaults = {
  DEFAULT_FEE_PER_KB: 10000,
  MIN_FEE_PER_KB: 0,
  MAX_FEE_PER_KB: 1000000,
  MAX_TX_FEE(coin) {
    switch (coin) {
      case 'btc':
        return 0.5e8;
      case 'edu':
        return 0.5e8;
      case 'tik':
        return 0.5e8;
      case 'doge':
        return 10e8;
      default:
        return 1e8;
    }
  }
};
