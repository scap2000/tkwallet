# Custom URL scheme NG

Launch your app by a link like this: `mycoolapp://`

Supports up to 8 scheme.

## 1. Description

This plugin allows you to start your app by calling it with a URL like `mycoolapp://path?foo=bar`

* Supports up to 8 scheme
* Compatible with [Cordova Plugman](https://github.com/apache/cordova-plugman)

### iOS specifics

* Forget about [using config.xml to define a URL scheme](https://build.phonegap.com/docs/config-xml#url_schemes). This plugin adds 2 essential enhancements:
  - Uniform URL scheme with Android (for which there is no option to define a URL scheme via PhoneGap configuration at all).
  - You still need to wire up the Javascript to handle incoming events. This plugin assists you with that.
* Tested on iOS 10+.

### Android specifics
* Unlike iOS, there is no way to use config.xml to define a scheme for your app. Now there is.
* Tested on Android 6+.

## 2. Installation

### Automatically (CLI / Plugman)

LaunchMyApp is compatible with [Cordova Plugman](https://github.com/apache/cordova-plugman).
Replace `mycoolapp` by a nice scheme you want to have your app listen to:

Latest release on npm:
```
$ cordova plugin add cordova-plugin-customurlscheme-ng --variable URL_SCHEME=mycoolapp SECOND_URL_SCHEME=othercoolapp THIRD_URL_SCHEME=supercoolapp FOURTH_URL_SCHEME=amazingcoolapp FIFTH_URL_SCHEME=amazingcoolapptwo SIXTH_URL_SCHEME=amazingcoolappthree SEVENTH_URL_SCHEME=amazingcoolappseven EIGHTH_URL_SCHEME=amazingcoolappeight
```

Bleeding edge master version from Github:
```
$ cordova plugin add https://github.com/cmgustavo/Custom-URL-scheme.git --variable URL_SCHEME=mycoolapp SECOND_URL_SCHEME=othercoolapp THIRD_URL_SCHEME=supercoolapp FOURTH_URL_SCHEME=amazingcoolapp FIFTH_URL_SCHEME=amazingcoolapptwo SIXTH_URL_SCHEME=amazingcoolappthree SEVENTH_URL_SCHEME=amazingcoolappseven EIGHTH_URL_SCHEME=amazingcoolappeight
```
(Note that the Phonegap CLI didn't support `--variable` before version 3.6.3, so please use the Cordova CLI as shown above in case you're on an older version)

The LaunchMyApp.js file is brought in automatically.

Note for iOS: there was a bug in CLI which caused an error in your `*-Info.plist`.
Please manually remove the blank line and whitespace (if any) from `NSMainNibFile` and `NSMainNibFile~ipad` (or your app won't start at all).

## 3. Usage

1a\. Your app can be launched by linking to it like this from a website or an email for example (all of these will work):
```html
<a href="mycoolapp://">Open my app</a>
<a href="mycoolapp://somepath">Open my app</a>
<a href="mycoolapp://somepath?foo=bar">Open my app</a>
<a href="mycoolapp://?foo=bar">Open my app</a>
```

`mycoolapp` is the value of URL_SCHEME you used while installing this plugin.

1b\. If you're trying to open your app from another PhoneGap app, use the InAppBrowser plugin and launch the receiving app like this, to avoid a 'protocol not supported' error:
```html
<button onclick="window.open('mycoolapp://', '_system')">Open the other app</button>
```

2\. When your app is launched by a URL, you probably want to do something based on the path and parameters in the URL. For that, you could implement the (optional) `handleOpenURL(url)` method, which receives the URL that was used to launch your app.
```javascript
function handleOpenURL(url) {
  console.log("received url: " + url);
}
```

If you want to alert the URL for testing the plugin, at least on iOS you need to wrap it in a timeout like this:
```javascript
function handleOpenURL(url) {
  setTimeout(function() {
    alert("received url: " + url);
  }, 0);
}
```
A more useful implementation would mean parsing the URL, saving any params to sessionStorage and redirecting the app to the correct page inside your app.
All this happens before the first page is loaded.

### iOS Usage
A common method of deeplinking is to give the user the URL of a webpage (for instance http://linker.myapp.com/pathfoo) that opens the app if installed or the app store if not. This can be done in the following ways, depending on the desired UX:

1. The page content has a button that says "Install app" and when clicked opens the app store by doing `location.href = 'itms-apps://itunes.apple.com/us/app/mycoolapp/idfoo'`. On page load, do `location.href = 'mycoolapp://pathfoo'`. If the user has the app, they will see a dialog that says `Open in "mycoolapp"? [Cancel] [Open]`. If the user does not have the app, they will see an alert that says `Cannot Open Page: Safari cannot open the page because the address is invalid`. Once they dismiss the alert, they see the button that opens the app store, and they tap it.
2. The page has two buttons: one that opens the app, and one that opens the app store.
3. On page load, open a Universal Link using [cordova-universal-links-plugin](https://github.com/nordnet/cordova-universal-links-plugin). (A Universal Link either opens the app or the app store.) Then fall back to one of the above methods if Univeral Links is not supported.

You can also use a service that provides pages that do #3 for you, such as [Branch](https://branch.io/).

### CSP - or: `handleOpenURL` doesn't work
The Whitelist plugin will prevent inline JS from executing, unless you whitelist the url scheme. Please see [this SO issue](http://stackoverflow.com/questions/34257097/using-handleopenurl-with-custom-url-scheme-in-cordova/34281420#34281420) for details.

### Meteor / getLastIntent (Android only)
When running a [meteor](meteor.com) app in the cordova environment, `handleOpenURL` doesn't get called after a cold start, because cordova resets the javascript world during startup and our timer waiting for `handleOpenURL` gets vanished (see [#98](https://github.com/EddyVerbruggen/Custom-URL-scheme/issues/98)). To get the intent by which the app was started in a meteor cordova app you need to ask for it from the meteor side with `getLastIntent` like this.
```javascript
Meteor.startup(function() {
  if (Meteor.isCordova) {
    window.plugins.launchmyapp.getLastIntent(function(url) {
      if (intent.indexOf('mycoolapp://' > -1)) {
        console.log("received url: " + url);
      } else {
        return console.log("ignore intent: " + url);
      }
    }, function(error) {
      return console.log("no intent received");
    });
    return;
  }
});
```

## 4. URL Scheme hints
Please choose a URL_SCHEME which which complies to these restrictions:
- Don't use an already registered scheme (like `fb`, `twitter`, `comgooglemaps`, etc).
- Use only lowercase characters.
- Don't use a dash `-` because on Android it will become underscore `_`.
- Use only 1 word (no spaces).

TIP: test your scheme by installing the app on a device or simulator and typing yourscheme:// in the browser URL bar, or create a test HTML page with a link to your app to impress your buddies.


## 5. License

[The MIT License (MIT)](http://www.opensource.org/licenses/mit-license.html)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
