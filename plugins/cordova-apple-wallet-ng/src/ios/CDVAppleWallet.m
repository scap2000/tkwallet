/**
 * 8/8/2018
 * @author Hatem 
 * @implementation file
 */

#import "CDVAppleWallet.h"
#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>
#import <WatchConnectivity/WatchConnectivity.h>
#import "AppDelegate.h"

typedef void (^completedPaymentProcessHandler)(PKAddPaymentPassRequest *request);

@interface AppleWallet()<PKAddPaymentPassViewControllerDelegate>

@property (nonatomic, assign) BOOL isRequestIssued;
@property (nonatomic, assign) BOOL isRequestIssuedSuccess;
@property (nonatomic, strong) completedPaymentProcessHandler completionHandler;
@property (nonatomic, strong) NSString* stringFromData;
@property (nonatomic, copy) NSString* transactionCallbackId;
@property (nonatomic, copy) NSString* completionCallbackId;
@property (nonatomic, retain) UIViewController* addPaymentPassModal;


@end


@implementation AppleWallet


+ (BOOL)canAddPaymentPass 
{
    return [PKAddPaymentPassViewController canAddPaymentPass];
}


- (void)available:(CDVInvokedUrlCommand*)command
{
    CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:[AppleWallet canAddPaymentPass]];
    [self.commandDelegate sendPluginResult:commandResult callbackId:command.callbackId];
}

// Plugin Method - check paired devices By Suffix
- (void) checkPairedDevicesBySuffix:(CDVInvokedUrlCommand *)command 
{
    NSString * suffix = [command.arguments objectAtIndex:0];
    NSMutableDictionary* dictionary = [[NSMutableDictionary alloc] init];
    [dictionary setObject:@"False" forKey:@"isInWallet"];
    [dictionary setObject:@"False" forKey:@"isInWatch"];
    [dictionary setObject:@"" forKey:@"FPANID"];
    PKPassLibrary *passLib = [[PKPassLibrary alloc] init];

    // find if credit/debit card is exist in any pass container e.g. iPad
    for (PKPaymentPass *pass in [passLib passesOfType:PKPassTypePayment]){
        if ([pass.primaryAccountNumberSuffix isEqualToString:suffix]) {
            [dictionary setObject:@"True" forKey:@"isInWallet"];
            [dictionary setObject:pass.primaryAccountIdentifier forKey:@"FPANID"];
            break;
        }
    }
    
    // find if credit/debit card is exist in any remote pass container e.g. iWatch
    for (PKPaymentPass *remotePass in [passLib remotePaymentPasses]){
        if([remotePass.primaryAccountNumberSuffix isEqualToString:suffix]){
            [dictionary setObject:@"True" forKey:@"isInWatch"];
            [dictionary setObject:remotePass.primaryAccountIdentifier forKey:@"FPANID"];
            break;
        }
    }
    
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:dictionary];
    [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}


- (void)startAddPaymentPass:(CDVInvokedUrlCommand*)command 
{
    NSLog(@"LOG start startAddPaymentPass");
    CDVPluginResult* pluginResult;
    NSArray* arguments = command.arguments;

    self.transactionCallbackId = nil;
    self.completionCallbackId = nil;

    if ([arguments count] != 1){
        pluginResult =[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"incorrect number of arguments"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    } else {
        // Options
        NSDictionary* options = [arguments objectAtIndex:0]; 
        
        // Force ECC_V2 encryption scheme
        PKAddPaymentPassRequestConfiguration* configuration = [[PKAddPaymentPassRequestConfiguration alloc] initWithEncryptionScheme:PKEncryptionSchemeECC_V2];
        
        // The name of the person the card is issued to
        configuration.cardholderName = [options objectForKey:@"cardholderName"];

        // Last 4/5 digits of PAN. The last four or five digits of the PAN. Presented to the user with dots prepended to indicate that it is a suffix. 
        configuration.primaryAccountSuffix = [options objectForKey:@"primaryAccountSuffix"];

        // A short description of the card.
        configuration.localizedDescription = [options objectForKey:@"localizedDescription"];

        // Filters the device and attached devices that already have this card provisioned. No filter is applied if the parameter is omitted
        configuration.primaryAccountIdentifier = @""; 
        
        
        // Filters the networks shown in the introduction view to this single network.
       NSString* paymentNetwork = [options objectForKey:@"paymentNetwork"];
       if([[paymentNetwork uppercaseString] isEqualToString:@"VISA"]) {
           configuration.paymentNetwork = PKPaymentNetworkVisa;
       }
       if([[paymentNetwork uppercaseString] isEqualToString:@"MASTERCARD"]) {
           configuration.paymentNetwork = PKPaymentNetworkMasterCard;
       }
    
        // Present view controller
        self.addPaymentPassModal = [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:configuration delegate:self];
        
        if(!self.addPaymentPassModal) {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Can not init PKAddPaymentPassViewController"];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        } else {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_NO_RESULT];
            [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
            self.transactionCallbackId = command.callbackId;
            [self.viewController presentViewController:self.addPaymentPassModal animated:YES completion:^{
                [self.commandDelegate sendPluginResult:pluginResult callbackId:self.transactionCallbackId];
                }
             ];
        }

    }
}


- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
                                    didFinishAddingPaymentPass:(PKPaymentPass *)pass
                                    error:(NSError *)error
{
    NSLog(@"didFinishAddingPaymentPass");
    [controller dismissViewControllerAnimated:YES completion:nil];
    
    // return with error if exists
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.localizedDescription];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.transactionCallbackId];
}



-(void) graphRequest:(CDVInvokedUrlCommand *)command
{

    NSArray<NSString *> * headers = [command.arguments objectAtIndex:0];
    NSData *reqData = [[command.arguments objectAtIndex:1] dataUsingEncoding:NSUTF8StringEncoding];
    NSString *sig = headers[0];
    NSString *pub = headers[1];

    NSLog(@" %@", reqData);
    NSError *error;
    if (error) {
        NSLog(@" serialization error%@", error);
    }

    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration defaultSessionConfiguration];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:configuration];
    NSURL *url = [NSURL URLWithString:@"https://bitpay.com/api/v2/graphql"];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData timeoutInterval:20.0];

    [request addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [request addValue: sig forHTTPHeaderField:@"x-signature"];
    [request addValue: pub forHTTPHeaderField:@"x-identity"];
    [request setHTTPMethod:@"POST"];
    [request setHTTPBody:reqData];

    NSURLSessionDataTask *postDataTask = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (data == nil) {
            CDVPluginResult *commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"MDES-cd data nil"];
            [commandResult setKeepCallback:[NSNumber numberWithBool:YES]];
            [self.commandDelegate sendPluginResult:commandResult callbackId:command.callbackId];
            return;
        }

        NSString *res = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        NSLog(@"mdes %@", res);


        NSDictionary* json = [NSJSONSerialization JSONObjectWithData:data options:kNilOptions error:&error];

        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:json];
        [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];

    }];

    [postDataTask resume];

}


- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
                                    generateRequestWithCertificateChain:(NSArray<NSData *> *)certificates
                                    nonce:(NSData *)nonce
                                    nonceSignature:(NSData *)nonceSignature
                                    completionHandler:(void (^)(PKAddPaymentPassRequest *request))handler
{
    NSLog(@"LOG addPaymentPassViewController generateRequestWithCertificateChain");
    
    // save completion handler
    self.completionHandler = handler;
    // NSLog(@"%@", NSStringFromClass([self.completionHandler class]));
    

    // the leaf certificate will be the first element of that array and the sub-CA certificate will follow.
    NSString *certificateOfIndexZeroString = [certificates[0] base64EncodedStringWithOptions:0];
    NSString *certificateOfIndexOneString = [certificates[1] base64EncodedStringWithOptions:0];
    NSString *nonceString = [nonce base64EncodedStringWithOptions:0];
    NSString *nonceSignatureString = [nonceSignature base64EncodedStringWithOptions:0];
    
    NSDictionary* dictionary = @{ @"data" :
                                      @{
                                          @"certificateLeaf" : certificateOfIndexZeroString,
                                          @"certificateSubCA" : certificateOfIndexOneString,
                                          @"nonce" : nonceString,
                                          @"nonceSignature" : nonceSignatureString,
                                          }
                                  };
    
//    NSLog(@"Gamal- certificates[0]: %@", certificates[0]);
//    NSLog(@"Gamal- certificates[1]: %@", certificates[1]);
//    NSLog(@"Gamal- nonce: %@", nonce);
//    NSLog(@"Gamal- nonceSignature: %@", nonceSignature);
    
    // Upcall with the data
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:dictionary];
    [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.transactionCallbackId];

}


- (void) completeAddPaymentPass:(CDVInvokedUrlCommand *)command
{
    NSLog(@"LOG completeAddPaymentPass");
    CDVPluginResult *commandResult;

    // Here to return a reasonable message after completeAddPaymentPass callback
    if (self.isRequestIssued == true){
        if (self.isRequestIssuedSuccess == false){
            // Upcall with the data error
            commandResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"error"];
        }else{
            // Upcall with the data success
            commandResult= [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"success"];
        }
        [commandResult setKeepCallback:[NSNumber numberWithBool:YES]];
        [self.commandDelegate sendPluginResult:commandResult callbackId:self.completionCallbackId];
        return;
    }

    // CDVPluginResult* pluginResult;
    NSArray* arguments = command.arguments;
    if ([arguments count] != 1){
        // pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"incorrect number of arguments"];
        // [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    } else {
        PKAddPaymentPassRequest* request = [[PKAddPaymentPassRequest alloc] init];
                NSDictionary* options = [arguments objectAtIndex:0];

                NSString* activationData = [options objectForKey:@"activationData"];
                NSString* encryptedPassData = [options objectForKey:@"encryptedPassData"];
                NSString* wrappedKey = [options objectForKey:@"wrappedKey"];
                NSString* ephemeralPublicKey = [options objectForKey:@"ephemeralPublicKey"];

                request.activationData = [[NSData alloc] initWithBase64EncodedString:activationData options:0]; //[activationData dataUsingEncoding:NSUTF8StringEncoding];
                request.encryptedPassData = [[NSData alloc] initWithBase64EncodedString:encryptedPassData options:0];
                if (wrappedKey) {
                    request.wrappedKey = [[NSData alloc] initWithBase64EncodedString:wrappedKey options:0];
                }
                if (ephemeralPublicKey) {
                    request.ephemeralPublicKey = [[NSData alloc] initWithBase64EncodedString:ephemeralPublicKey options:0];
                }

                // Issue request
                self.completionHandler(request);
                self.completionCallbackId = command.callbackId;
                self.isRequestIssued = true;
    }
}

- (NSData *)HexToNSData:(NSString *)hexString
{
    hexString = [hexString stringByReplacingOccurrencesOfString:@" " withString:@""];
    NSMutableData *commandToSend= [[NSMutableData alloc] init];
    unsigned char whole_byte;
    char byte_chars[3] = {'\0','\0','\0'};
    int i;
    for (i=0; i < [hexString length]/2; i++) {
        byte_chars[0] = [hexString characterAtIndex:i*2];
        byte_chars[1] = [hexString characterAtIndex:i*2+1];
        whole_byte = strtol(byte_chars, NULL, 16);
        [commandToSend appendBytes:&whole_byte length:1];
    }
    NSLog(@"%@", commandToSend);
    return commandToSend;
}

@end
