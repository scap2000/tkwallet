import { ChangeDetectorRef, Component } from '@angular/core';

// providers
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import {
  ActionSheetProvider,
  Logger,
  PersistenceProvider,
  PopupProvider,
  TKCoinIdProvider
} from '../../../providers';
import { InAppBrowserProvider } from '../../../providers/in-app-browser/in-app-browser';

@Component({
  selector: 'tkcoin-id',
  templateUrl: 'tkcoin-id.html'
})
export class TKCoinIdPage {
  public userBasicInfo;
  public network;
  public originalBitpayIdSettings: string;
  public tkcoinIdSettings = this.getDefaultTKCoinIdSettings();

  constructor(
    private events: Events,
    private logger: Logger,
    private navParams: NavParams,
    private bitPayIdProvider: TKCoinIdProvider,
    private navCtrl: NavController,
    private popupProvider: PopupProvider,
    private persistenceProvider: PersistenceProvider,
    private actionSheetProvider: ActionSheetProvider,
    private changeDetectorRef: ChangeDetectorRef,
    private translate: TranslateService,
    private iab: InAppBrowserProvider
  ) {}

  async ionViewDidLoad() {
    this.userBasicInfo = this.navParams.data;
    this.changeDetectorRef.detectChanges();
    this.network = this.bitPayIdProvider.getEnvironment().network;
    this.tkcoinIdSettings =
      (await this.persistenceProvider.getTKCoinIdSettings(this.network)) ||
      this.getDefaultTKCoinIdSettings();
    this.originalBitpayIdSettings = JSON.stringify(this.tkcoinIdSettings);
    this.logger.info('Loaded: TKCoinID page');
  }

  ionViewWillLeave() {
    const settingsChanged =
      this.originalBitpayIdSettings !== JSON.stringify(this.tkcoinIdSettings);
    if (settingsChanged) {
      this.events.publish('TKCoinId/SettingsChanged');
    }
  }

  getDefaultTKCoinIdSettings() {
    return {
      syncGiftCardPurchases: false
    };
  }

  async onSettingsChange() {
    await this.persistenceProvider.setTKCoinIdSettings(
      this.network,
      this.tkcoinIdSettings
    );
  }

  disconnectTKCoinID() {
    this.popupProvider
      .ionicConfirm(
        this.translate.instant('Disconnect TKCoin ID'),
        this.translate.instant(
          'Are you sure you would like to disconnect your TKCoin ID?'
        )
      )
      .then(res => {
        if (res) {
          this.bitPayIdProvider.disconnectTKCoinID(
            () => {
              const infoSheet = this.actionSheetProvider.createInfoSheet(
                'in-app-notification',
                {
                  title: 'TKCoin ID',
                  body: this.translate.instant(
                    'TKCoin ID successfully disconnected.'
                  )
                }
              );
              this.iab.refs.card.executeScript(
                {
                  code: `window.postMessage(${JSON.stringify({
                    message: 'bitPayIdDisconnected'
                  })}, '*')`
                },
                () => {
                  infoSheet.present();
                  setTimeout(() => {
                    this.navCtrl.popToRoot();
                  }, 400);
                }
              );
              this.events.publish('TKCoinId/Disconnected');
              this.events.publish('CardAdvertisementUpdate', {
                status: 'disconnected'
              });
            },
            err => {
              this.logger.log(err);
            }
          );
        }
      });
  }
}
