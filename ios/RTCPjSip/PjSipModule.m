#import "PjSipEndpoint.h"
#import "PjSipModule.h"

#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUtils.h>

@interface PjSipModule ()

@end

@implementation PjSipModule

@synthesize bridge = _bridge;

- (dispatch_queue_t)methodQueue {
    // TODO: Use special thread may be ?
    // return dispatch_queue_create("com.carusto.PJSipMdule", DISPATCH_QUEUE_SERIAL);
    return dispatch_get_main_queue();
}

- (instancetype)init {
    self = [super init];
    return self;
}

+ (BOOL)requiresMainQueueSetup{
    return YES;
}

RCT_EXPORT_METHOD(start: (NSDictionary *) config resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [PjSipEndpoint instance].bridge = self.bridge;
    
    NSDictionary *result = [[PjSipEndpoint instance] start: config];
    
    resolve(result);
}

RCT_EXPORT_METHOD(reset:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] reset];
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(updateStunServers: (int) accountId stunServerList:(NSArray *) stunServerList resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] updateStunServers:accountId stunServerList:stunServerList];
    
    resolve(@TRUE);
}

#pragma mark - Account Actions

RCT_EXPORT_METHOD(createAccount: (NSDictionary *) config resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipAccount *account = [[PjSipEndpoint instance] createAccount:config];
    
    resolve([account toJsonDictionary]);
}

RCT_EXPORT_METHOD(handleIpChange:(RCTPromiseResolveBlock) resolve rejecter:(RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] handleIpChange];
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(registerAccount: (int) accountId renew:(BOOL) renew resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    @try {
        PjSipEndpoint* endpoint = [PjSipEndpoint instance];
        PjSipAccount *account = [endpoint findAccount:accountId];
        
        [account register:renew];
        
        resolve(@TRUE);
    }
    @catch (NSException * e) {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:e.userInfo];

        reject(e.name, e.reason, error);
    }
}

RCT_EXPORT_METHOD(deleteAccount: (int) accountId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] deleteAccount:accountId];
    
    resolve(@TRUE);
}

#pragma mark - Call Actions

RCT_EXPORT_METHOD(makeCall: (int) accountId destination: (NSString *) destination callSettings:(NSDictionary*) callSettings msgData:(NSDictionary*) msgData resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    @try {
        PjSipEndpoint* endpoint = [PjSipEndpoint instance];
        PjSipAccount *account = [endpoint findAccount:accountId];
        PjSipCall *call = [endpoint makeCall:account destination:destination callSettings:callSettings msgData:msgData];
        
        // TODO: Remove this function
        // Automatically put other calls on hold.
        [endpoint pauseParallelCalls:call];
        
        resolve([call toJsonDictionary:endpoint.isSpeaker]);
    }
    @catch (NSException * e) {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:e.userInfo];

        reject(e.name, e.reason, error);
    }
}

RCT_EXPORT_METHOD(hangupCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call hangup];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(declineCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call decline];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(answerCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipEndpoint* endpoint = [PjSipEndpoint instance];
    PjSipCall *call = [endpoint findCall:callId];
    
    if (call) {
        [call answer];
        
        // Automatically put other calls on hold.
        [endpoint pauseParallelCalls:call];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(holdCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipEndpoint* endpoint = [PjSipEndpoint instance];
    PjSipCall *call = [endpoint findCall:callId];
    
    if (call) {
        [call hold];
        [endpoint emmitCallChanged:call];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(unholdCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipEndpoint* endpoint = [PjSipEndpoint instance];
    PjSipCall *call = [endpoint findCall:callId];
    
    if (call) {
        [call unhold];
        [endpoint emmitCallChanged:call];
        
        // Automatically put other calls on hold.
        [endpoint pauseParallelCalls:call];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(muteCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipEndpoint* endpoint = [PjSipEndpoint instance];
    PjSipCall *call = [endpoint findCall:callId];
    
    if (call) {
        [call mute];
        [endpoint emmitCallChanged:call];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(unMuteCall: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipEndpoint* endpoint = [PjSipEndpoint instance];
    PjSipCall *call = [endpoint findCall:callId];
    
    if (call) {
        [call unmute];
        [endpoint emmitCallChanged:call];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(xferCall: (int) callId destination: (NSString *) destination resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call xfer:destination];
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(xferReplacesCall: (int) callId destinationCallId: (int) destinationCallId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call xferReplaces:destinationCallId];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(redirectCall: (int) callId destination: (NSString *) destination resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call redirect:destination];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(dtmfCall: (int) callId digits: (NSString *) digits resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    PjSipCall *call = [[PjSipEndpoint instance] findCall:callId];
    
    if (call) {
        [call dtmf:digits];
        
        resolve(@TRUE);
    } else {
        NSError *error = [NSError errorWithDomain:@"com.firmafon.Phon" code:0 userInfo:@{}];

        reject(@"no_call", @"Call not found", error);
    }
}

RCT_EXPORT_METHOD(useSpeaker: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] useSpeaker];
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(useEarpiece: (int) callId resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] useEarpiece];
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(activateAudioSession:(RCTPromiseResolveBlock) resolve rejecter:(RCTPromiseRejectBlock) reject) {
    pjsua_set_no_snd_dev();
    pj_status_t status;
    status = pjsua_set_snd_dev(PJMEDIA_AUD_DEFAULT_CAPTURE_DEV, PJMEDIA_AUD_DEFAULT_PLAYBACK_DEV);
    
    if (status != PJ_SUCCESS) {
        NSLog(@"Failed to active audio session");
    }
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(deactivateAudioSession:(RCTPromiseResolveBlock) resolve rejecter:(RCTPromiseRejectBlock) reject) {
    pjsua_set_no_snd_dev();
    
    resolve(@TRUE);
}

#pragma mark - Settings

RCT_EXPORT_METHOD(changeOrientation: (NSString*) orientation resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] changeOrientation:orientation];
    
    resolve(@TRUE);
}

RCT_EXPORT_METHOD(changeCodecSettings: (NSDictionary*) codecSettings resolver:(RCTPromiseResolveBlock) resolve rejecter: (RCTPromiseRejectBlock) reject) {
    [[PjSipEndpoint instance] changeCodecSettings:codecSettings];
    
    resolve(@TRUE);
}

RCT_EXPORT_MODULE();

@end
