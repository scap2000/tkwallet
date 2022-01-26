'use strict';

const builder = require('electron-builder');

builder
  .build({
    mac: ['mas'],
    linux: ['snap'],
    win: ['appx'],
    config: {
      appId: 'org.tkcoin.wallet.desktop',
      productName: 'TKCoin',
      afterPack: './electron/afterPack.js',
      files: [
        './electron/main.js',
        './package.json',
        './www/**/*',
        './build',
        '!./node_modules/.cache/',
        '!./**/*.map'
      ],
      protocols: {
        name: 'URL protocol schemes',
        schemes: [
          'bitcoin',
          'bitcoincash',
          'bchtest',
          'ethereum',
          'ripple',
          'dogecoin',
          'tkcoin'
        ]
      },
      mac: {
        category: 'public.app-category.finance',
        icon: 'resources/tkcoin/mac/app.icns',
        gatekeeperAssess: false,
        hardenedRuntime: false,
        artifactName: 'TKCoin',
        darkModeSupport: true,
        identity: 'TKCoin, Org. (884JRH5R93)',
        provisioningProfile: './tkcoin-embedded.provisionprofile',
        extendInfo: {
          NSCameraUsageDescription:
            'Scan a Bitcoin Address directly to your Wallet and send funds to it'
        },
        target: ['mas']
      },
      mas: {
        artifactName: 'TKCoin.pkg',
        identity: 'TKCoin, Org. (884JRH5R93)',
        entitlements: './tkcoin-entitlements.mas.plist',
        entitlementsInherit: 'entitlements.mas.inherit.plist'
      },
      dmg: {
        artifactName: 'TKCoin.dmg',
        contents: [
          {
            x: 120,
            y: 180
          },
          {
            x: 380,
            y: 180,
            type: 'link',
            path: '/Applications'
          }
        ],
        background: 'resources/tkcoin/mac/dmg-background.tiff',
        icon: 'resources/tkcoin/mac/volume-icon.icns'
      },
      win: {
        target: ['appx'],
        icon: 'resources/tkcoin/windows/icon.ico',
        artifactName: 'TKCoin.appx'
      },
      appx: {
        identityName: '18C7659D.TKCoinforWindows',
        publisher: 'CN=F89609D1-EB3E-45FD-A58A-C2E3895FCE7B',
        publisherDisplayName: 'TKCoin Org.',
        applicationId: 'TKCoinforWindows',
        displayName: 'TKCoin for Windows',
        languages: ['en-US', 'es', 'fr']
      },
      linux: {
        target: ['snap'],
        artifactName: 'TKCoin-linux.snap'
      }
    }
  })
  .then(() => {
    // handle result
    console.log('Build OK!');
  })
  .catch(error => {
    // handle error
    console.log(error);
  });
