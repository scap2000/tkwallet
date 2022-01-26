import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ActionSheetController, NavController, NavParams } from 'ionic-angular';

import * as _ from 'lodash';

// providers
// pages
import { IABCardProvider, PersistenceProvider } from '../../../../providers';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import { Network } from '../../../../providers/persistence/persistence';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ScanProvider } from '../../../../providers/scan/scan';
import { ThemeProvider } from '../../../../providers/theme/theme';
import { TKCoinAccountProvider } from '../../../../providers/tkcoin-account/tkcoin-account';
import { TKCoinCardProvider } from '../../../../providers/tkcoin-card/tkcoin-card';
import { TKCoinCardPage } from '../tkcoin-card';

@Component({
  selector: 'page-tkcoin-card-intro',
  templateUrl: 'tkcoin-card-intro.html',
  providers: [ScanProvider]
})
export class TKCoinCardIntroPage {
  private scannerHasPermission: boolean;
  public accounts;
  public cardExperimentEnabled: boolean;
  public ready: boolean;
  private network: Network;
  public bitPayIdConnected: boolean;
  constructor(
    private translate: TranslateService,
    private actionSheetCtrl: ActionSheetController,
    private navParams: NavParams,
    private bitPayAccountProvider: TKCoinAccountProvider,
    private popupProvider: PopupProvider,
    private bitPayCardProvider: TKCoinCardProvider,
    private navCtrl: NavController,
    private externalLinkProvider: ExternalLinkProvider,
    private persistenceProvider: PersistenceProvider,
    private iabCardProvider: IABCardProvider,
    private scanProvider: ScanProvider,
    private themeProvider: ThemeProvider
  ) {
    this.scannerHasPermission = false;
    this.updateCapabilities();
    this.persistenceProvider.getCardExperimentFlag().then(status => {
      this.cardExperimentEnabled = status === 'enabled';
    });
    this.persistenceProvider
      .getNetwork()
      .then(network => (this.network = network));
  }

  ionViewWillEnter() {
    if (this.navParams.data.secret) {
      let pairData = {
        secret: this.navParams.data.secret,
        email: this.navParams.data.email,
        otp: this.navParams.data.otp
      };
      let pairingReason = this.translate.instant(
        'add your TKCoin Visa card(s)'
      );
      this.bitPayAccountProvider.pair(
        pairData,
        pairingReason,
        (err: string, paired: boolean, apiContext) => {
          if (err) {
            this.popupProvider.ionicAlert(
              this.translate.instant('Error pairing TKCoin Account'),
              err
            );
            return;
          }
          if (paired) {
            this.bitPayCardProvider.sync(apiContext, (err, cards) => {
              if (err) {
                this.popupProvider.ionicAlert(
                  this.translate.instant('Error updating Debit Cards'),
                  err
                );
                return;
              }

              // Fixes mobile navigation
              setTimeout(() => {
                if (cards[0]) {
                  this.navCtrl
                    .push(
                      TKCoinCardPage,
                      { id: cards[0].id },
                      { animate: false }
                    )
                    .then(() => {
                      let previousView = this.navCtrl.getPrevious();
                      this.navCtrl.removeView(previousView);
                    });
                }
              }, 200);
            });
          }
        }
      );
    }

    this.bitPayAccountProvider.getAccounts((err, accounts) => {
      if (err) {
        this.popupProvider.ionicAlert(this.translate.instant('Error'), err);
        return;
      }
      this.accounts = accounts;
    });

    if (!this.scannerHasPermission) {
      this.authorizeCamera();
    }
  }

  ionViewDidEnter() {
    this.persistenceProvider
      .getTKCoinIdPairingToken(this.network)
      .then(token => (this.bitPayIdConnected = !!token));

    this.iabCardProvider.updateWalletStatus();
    this.bitPayCardProvider.logEvent('legacycard_view_setup', {});
    this.ready = true;
  }

  private updateCapabilities(): void {
    const capabilities = this.scanProvider.getCapabilities();
    this.scannerHasPermission = capabilities.hasPermission;
  }

  private authorizeCamera(): void {
    this.scanProvider
      .initialize() // prompt for authorization by initializing scanner
      .then(() => this.scanProvider.pausePreview()) // release camera resources from scanner
      .then(() => this.updateCapabilities()); // update component state
  }

  public openExchangeRates() {
    // TODO FIX
    let url = 'https://tkcoin.org/exchange-rates';
    this.externalLinkProvider.open(url);
  }

  public bitPayCardInfo() {
    // TODO FIX
    let url = 'https://tkcoin.org/visa/faq';
    this.externalLinkProvider.open(url);
  }

  public async orderTKCoinCard(path?: 'login' | 'createAccount') {
    const root = this.network === 'livenet' ? 'tkcoin.org' : 'test.tkcoin.org';
    let url = `https://${root}/wallet-card?context=${path}`;

    if (this.themeProvider.isDarkModeEnabled()) {
      url += '&darkMode=true';
    }

    if (this.bitPayIdConnected) {
      const user = await this.persistenceProvider.getTKCoinIdUserInfo(
        this.network
      );
      url += `&email=${user.email}`;
    }

    this.iabCardProvider.loadingWrapper(() => {
      this.externalLinkProvider.open(url);
      setTimeout(() => {
        this.navCtrl.pop();
      }, 300);
    });
  }

  public connectTKCoinCard() {
    this.bitPayCardProvider.logEvent('legacycard_connect', {});
    if (this.accounts.length == 0) {
      this.startPairTKCoinAccount();
    } else {
      this.showAccountSelector();
    }
  }

  private startPairTKCoinAccount() {
    this.navCtrl.popToRoot({ animate: false }); // Back to Root
    let url = 'https://tkcoin.org/visa/dashboard/add-to-tkcoin-wallet-confirm';
    this.externalLinkProvider.open(url);
  }

  private showAccountSelector() {
    let options = [];

    _.forEach(this.accounts, account => {
      options.push({
        text:
          (account.givenName || account.familyName) +
          ' (' +
          account.email +
          ')',
        handler: () => {
          this.onAccountSelect(account);
        }
      });
    });

    // Add account
    options.push({
      text: this.translate.instant('Add account'),
      handler: () => {
        this.onAccountSelect();
      }
    });

    // Cancel
    options.push({
      text: this.translate.instant('Cancel'),
      role: 'cancel'
    });

    let actionSheet = this.actionSheetCtrl.create({
      title: this.translate.instant('From TKCoin account'),
      buttons: options
    });
    actionSheet.present();
  }

  private onAccountSelect(account?): void {
    if (_.isUndefined(account)) {
      this.startPairTKCoinAccount();
    } else {
      this.bitPayCardProvider.sync(account.apiContext, err => {
        if (err) {
          this.popupProvider.ionicAlert(this.translate.instant('Error'), err);
          return;
        }
        this.navCtrl.pop();
      });
    }
  }
}
