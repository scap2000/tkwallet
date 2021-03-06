import { Injectable } from '@angular/core';

// Providers
import { BwcProvider } from '../../providers/bwc/bwc';
import { Logger } from '../../providers/logger/logger';

export interface CoinNetwork {
  coin: string;
  network: string;
}
@Injectable()
export class AddressProvider {
  private bitcore;
  private bitcoreCash;
  private bitcoreEdu;
  private bitcoreTik;
  private bitcoreDoge;
  private core;

  constructor(private bwcProvider: BwcProvider, private logger: Logger) {
    this.bitcore = this.bwcProvider.getBitcore();
    this.bitcoreCash = this.bwcProvider.getBitcoreCash();
    this.bitcoreEdu = this.bwcProvider.getBitcoreEdu();
    this.bitcoreTik = this.bwcProvider.getBitcoreTik();
    this.bitcoreDoge = this.bwcProvider.getBitcoreDoge();
    this.core = this.bwcProvider.getCore();
  }

  public translateToCashAddress(addressToTranslate: string): string {
    var addressObj = this.bitcore.Address(addressToTranslate).toObject();
    const cashAdrr = this.bitcoreCash.Address.fromObject(
      addressObj
    ).toCashAddress();
    this.logger.info(`converted: ${addressToTranslate} -> ${cashAdrr}`);
    return cashAdrr;
  }

  public extractAddress(str: string): string {
    const extractedAddress = str.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
    return extractedAddress;
  }

  public getCoinAndNetwork(
    str: string,
    network: string = 'livenet'
  ): CoinNetwork {
    const address = this.extractAddress(str);
    try {
      network = this.bitcore.Address(address).network.name;
      return { coin: 'btc', network };
    } catch (e) {
      try {
        network = this.bitcoreEdu.Address(address).network.name;
        return { coin: 'edu', network };
      } catch (e) {
        try {
          network = this.bitcoreTik.Address(address).network.name;
          return { coin: 'tik', network };
        } catch (e) {
          try {
            network = this.bitcoreCash.Address(address).network.name;
            return { coin: 'bch', network };
          } catch (e) {
            try {
              const isValidEthAddress = this.core.Validation.validateAddress(
                'ETH',
                network,
                address
              );
              if (isValidEthAddress) {
                return { coin: 'eth', network };
              } else {
                throw isValidEthAddress;
              }
            } catch (e) {
              try {
                const isValidXrpAddress = this.core.Validation.validateAddress(
                  'XRP',
                  network,
                  address
                );
                if (isValidXrpAddress) {
                  return { coin: 'xrp', network };
                } else {
                  throw isValidXrpAddress;
                }
              } catch (e) {
                try {
                  network = this.bitcoreDoge.Address(address).network.name;
                  return { coin: 'doge', network };
                } catch (e) {
                  return null;
                }
              }
            }
          }
        }
      }
    }
  }

  public isValid(str: string): boolean {
    if (!str) return false;
    // Check if the input is a valid uri or address
    const URI = this.bitcore.URI;
    const Address = this.bitcore.Address;
    const AddressEdu = this.bitcoreEdu.Address;
    const URIEdu = this.bitcoreEdu.URI;
    const AddressTik = this.bitcoreTik.Address;
    const URITik = this.bitcoreTik.URI;
    const AddressCash = this.bitcoreCash.Address;
    const URICash = this.bitcoreCash.URI;
    const AddressDoge = this.bitcoreDoge.Address;
    const URIDoge = this.bitcoreDoge.URI;
    const { Validation } = this.core;

    // Bip21 uri
    if (URI.isValid(str)) return true;
    if (URICash.isValid(str)) return true;
    if (URIEdu.isValid(str)) return true;
    if (URITik.isValid(str)) return true;
    if (URIDoge.isValid(str)) return true;
    if (Validation.validateUri('ETH', str)) return true;
    if (Validation.validateUri('XRP', str)) return true;

    // Regular Address: try Bitcoin and Bitcoin Cash
    if (Address.isValid(str, 'livenet')) return true;
    if (Address.isValid(str, 'testnet')) return true;
    if (AddressEdu.isValid(str, 'livenet')) return true;
    if (AddressEdu.isValid(str, 'testnet')) return true;
    if (AddressTik.isValid(str, 'livenet')) return true;
    if (AddressTik.isValid(str, 'testnet')) return true;
    if (AddressCash.isValid(str, 'livenet')) return true;
    if (AddressCash.isValid(str, 'testnet')) return true;
    if (AddressDoge.isValid(str, 'livenet')) return true;
    if (AddressDoge.isValid(str, 'testnet')) return true;
    if (Validation.validateAddress('XRP', 'livenet', str)) return true;
    if (Validation.validateAddress('ETH', 'livenet', str)) return true;

    return false;
  }

  public getLegacyBchAddressFormat(addr: string): string {
    const a = this.bitcoreCash.Address(addr).toObject();
    return this.bitcore.Address.fromObject(a).toString();
  }
}
