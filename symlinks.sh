cd node_modules
ln -s ../educoin-libs/secp256k1 .
ln -s ../educoin-libs/bitauth .
ln -s ../educoin-libs/bitcore-lib-edu .
ln -s ../educoin-libs/bitcore-lib-tik .
ln -s ../educoin-libs/bitcore-wallet-client .
cd -
cp educoin-libs/GoogleService-Info.plist platforms/ios/TKCoin/Resources/Resources/
cp educoin-libs/google-services.json platforms/android/app/
