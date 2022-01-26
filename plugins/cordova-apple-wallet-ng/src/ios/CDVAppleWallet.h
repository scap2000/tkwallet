/**
 * 8/8/2018
 * @author Hatem 
 * @header file
 */
#import "Foundation/Foundation.h"
#import "Cordova/CDV.h"
#import <Cordova/CDVPlugin.h>
#import <PassKit/PassKit.h>

@interface AppleWallet : CDVPlugin

- (void)available:(CDVInvokedUrlCommand*)command;
- (void)checkPairedDevicesBySuffix:(CDVInvokedUrlCommand*)command;
- (void)startAddPaymentPass:(CDVInvokedUrlCommand*)command;
- (void)completeAddPaymentPass:(CDVInvokedUrlCommand*)command;
- (void)graphRequest:(CDVInvokedUrlCommand*)command;

@end
