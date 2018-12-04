import React, {DeviceEventEmitter, NativeModules} from 'react-native';
import {EventEmitter} from 'events'

import Call from './Call'
import Message from './Message'
import Account from './Account'

/**
 * SIP headers object, where each key is a header name and value is a header value.
 * Example:
 * {
 *   "X-Custom-Header": "Test Header Value",
 *   "X-Custom-ID": "Awesome Header"
 * }
 *
 * @typedef {Object} PjSipHdrList
 */

/**
 * An additional information to be sent with outgoing SIP message.
 * It can (optionally) be specified for example
 * with #Endpoint.makeCall(), #Endpoint.answerCall(), #Endpoint.hangupCall(),
 * #Endpoint.holdCall() and many more.
 *
 * @typedef {Object} PjSipMsgData
 * @property {String} target_uri - Indicates whether the Courage component is present.
 * @property {PjSipHdrList} hdr_list - Additional message headers as linked list.
 * @property {String} content_type - MIME type of optional message body.
 * @property {String} msg_body - MIME type of optional message body.
 */

/**
 * An additional information to be sent with outgoing SIP message.
 * It can (optionally) be specified for example
 * with #Endpoint.makeCall(), #Endpoint.answerCall(), #Endpoint.hangupCall(),
 * #Endpoint.holdCall() and many more.
 *
 * @typedef {Object} PjSipCallSetttings
 * @property {number} flag - Bitmask of #pjsua_call_flag constants.
 * @property {number} req_keyframe_method - This flag controls what methods to request keyframe are allowed on the call.
 * @property {number} aud_cnt - Number of simultaneous active audio streams for this call. Setting this to zero will disable audio in this call.
 * @property {number} vid_cnt - Number of simultaneous active video streams for this call. Setting this to zero will disable video in this call.
 */



export default class Endpoint extends EventEmitter {

    constructor() {
        super();

        // Subscribe to Accounts events
        DeviceEventEmitter.addListener('pjSipRegistrationChanged', this._onRegistrationChanged.bind(this));

        // Subscribe to Calls events
        DeviceEventEmitter.addListener('pjSipCallReceived', this._onCallReceived.bind(this));
        DeviceEventEmitter.addListener('pjSipCallChanged', this._onCallChanged.bind(this));
        DeviceEventEmitter.addListener('pjSipCallTerminated', this._onCallTerminated.bind(this));
        DeviceEventEmitter.addListener('pjSipCallScreenLocked', this._onCallScreenLocked.bind(this));
        DeviceEventEmitter.addListener('pjSipMessageReceived', this._onMessageReceived.bind(this));
        DeviceEventEmitter.addListener('pjSipConnectivityChanged', this._onConnectivityChanged.bind(this));
    }

    /**
     * Returns a Promise that will be resolved once PjSip module is initialized.
     * Do not call any function while library is not initialized.
     *
     * @returns {Promise}
     */
    start(configuration) {
      return NativeModules.PjSipModule.start(configuration)
        .then(data => {
          let accounts = [];
          let calls = [];

          if (data.hasOwnProperty('accounts')) {
            for (let d of data['accounts']) {
              accounts.push(new Account(d));
            }
          }

          if (data.hasOwnProperty('calls')) {
            for (let d of data['calls']) {
              calls.push(new Call(d));
            }
          }

          let extra = {};

          for (let key in data) {
            if (data.hasOwnProperty(key) && key != "accounts" && key != "calls") {
              extra[key] = data[key];
            }
          }

          return {
            accounts,
            calls,
            ...extra
          }
        })
    }

    updateStunServers(accountId, stunServerList) {
        return new Promise(function(resolve, reject) {
            NativeModules.PjSipModule.updateStunServers(accountId, stunServerList, (successful, data) => {
                if (successful) {
                    resolve(data);
                } else {
                    reject(data);
                }
            })
        })
    }

    /**
     * @param configuration
     * @returns {Promise}
     */
    changeNetworkConfiguration(configuration) {
      return NativeModules.PjSipModule.changeNetworkConfiguration(configuration)
    }

    /**
     * @param configuration
     * @returns {Promise}
     */
    changeServiceConfiguration(configuration) {
      return NativeModules.PjSipModule.changeServiceConfiguration(configuration)
    }

    /**
     * Add a new account. If registration is configured for this account, this function would also start the
     * SIP registration session with the SIP registrar server. This SIP registration session will be maintained
     * internally by the library, and application doesn't need to do anything to maintain the registration session.
     *
     * An example configuration:
     * {
     *   name: "John Doe",
     *   username: "100",
     *   domain: "pbx.com",
     *   password: "XXXXXX",
     *
     *   proxy: "192.168.100.1:5060", // default disabled.
     *   transport: "TCP", // default TCP
     *   regServer: "pbx.com", // default taken from domain
     *   regTimeout: 300, // default 300
     * }
     *
     * @param {Object} configuration
     * @returns {Promise}
     */
    createAccount(configuration) {
      return NativeModules.PjSipModule.createAccount(configuration)
    }

    replaceAccount(account, configuration) {
      throw new Error("Not implemented");
    }

    /**
     * Update registration or perform unregistration.
     * If registration is configured for this account, then initial SIP REGISTER will be sent when the account is added.
     * Application normally only need to call this function if it wants to manually update the registration or to unregister from the server.
     *
     * @param {Account} account
     * @param bool renew If renew argument is zero, this will start unregistration process.
     * @returns {Promise}
     */
    registerAccount(account, renew = true) {
      return NativeModules.PjSipModule.registerAccount(account.getId())
    }

    /**
     * Delete an account. This will unregister the account from the SIP server, if necessary, and terminate server side presence subscriptions associated with this account.
     *
     * @param {Account} account
     * @returns {Promise}
     */
    deleteAccount(account) {
      return NativeModules.PjSipModule.deleteAccount(account.getId())
    }

    /**
     * Make an outgoing call to the specified URI.
     * Available call settings:
     * - audioCount - Number of simultaneous active audio streams for this call. Setting this to zero will disable audio in this call.
     * - videoCount - Number of simultaneous active video streams for this call. Setting this to zero will disable video in this call.
     * -
     *
     * @param account {Account}
     * @param destination {String} Destination SIP URI.
     * @param callSettings {PjSipCallSetttings} Outgoing call settings.
     * @param msgSettings {PjSipMsgData} Outgoing call additional information to be sent with outgoing SIP message.
     */
    makeCall(account, destination, callSettings, msgData) {
      destination = this._normalize(account, destination);

      return NativeModules.PjSipModule.makeCall(account.getId(), destination, callSettings, msgData)
    }

    /**
     * Send response to incoming INVITE request.
     *
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    answerCall(call) {
      return NativeModules.PjSipModule.answerCall(call.getId())
    }

    /**
     * Hangup call by using method that is appropriate according to the call state.
     *
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    hangupCall(call) {
      // TODO: Add possibility to pass code and reason for hangup.
      return NativeModules.PjSipModule.hangupCall(call.getId())
    }

    /**
     * Hangup call by using Decline (603) method.
     *
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    declineCall(call) {
      return NativeModules.PjSipModule.declineCall(call.getId())
    }

    /**
     * Put the specified call on hold. This will send re-INVITE with the appropriate SDP to inform remote that the call is being put on hold.
     *
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    holdCall(call) {
      return NativeModules.PjSipModule.holdCall(call.getId())
    }

    /**
     * Release the specified call from hold. This will send re-INVITE with the appropriate SDP to inform remote that the call is resumed.
     *
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    unholdCall(call) {
      return NativeModules.PjSipModule.unholdCall(call.getId())
    }

    /**
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    muteCall(call) {
      return NativeModules.PjSipModule.muteCall(call.getId())
    }

    /**
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    unMuteCall(call) {
      return NativeModules.PjSipModule.unMuteCall(call.getId())
    }

    /**
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    useSpeaker(call) {
      return NativeModules.PjSipModule.useSpeaker(call.getId())
    }

    /**
     * @param call {Call} Call instance
     * @returns {Promise}
     */
    useEarpiece(call) {
      return NativeModules.PjSipModule.useEarpiece(call.getId())
    }

    /**
     * Initiate call transfer to the specified address.
     * This function will send REFER request to instruct remote call party to initiate a new INVITE session to the specified destination/target.
     *
     * @param account {Account} Account associated with call.
     * @param call {Call} The call to be transferred.
     * @param destination URI of new target to be contacted. The URI may be in name address or addr-spec format.
     * @returns {Promise}
     */
    xferCall(account, call, destination) {
      destination = this._normalize(account, destination);

      return NativeModules.PjSipModule.xferCall(call.getId(), destination)
    }

    /**
     * Initiate attended call transfer.
     * This function will send REFER request to instruct remote call party to initiate new INVITE session to the URL of destCall.
     * The party at destCall then should "replace" the call with us with the new call from the REFER recipient.
     *
     * @param call {Call} The call to be transferred.
     * @param destCall {Call} The call to be transferred.
     * @returns {Promise}
     */
    xferReplacesCall(call, destCall) {
      return NativeModules.PjSipModule.xferReplacesCall(call.getId(), destCall.getId())
    }

    /**
     * Redirect (forward) specified call to destination.
     * This function will send response to INVITE to instruct remote call party to redirect incoming call to the specified destination/target.
     *
     * @param account {Account} Account associated with call.
     * @param call {Call} The call to be transferred.
     * @param destination URI of new target to be contacted. The URI may be in name address or addr-spec format.
     * @returns {Promise}
     */
    redirectCall(account, call, destination) {
      destination = this._normalize(account, destination);

      return NativeModules.PjSipModule.redirectCall(call.getId(), destination)
    }

    /**
     * Send DTMF digits to remote using RFC 2833 payload formats.
     *
     * @param call {Call} Call instance
     * @param digits {String} DTMF string digits to be sent as described on RFC 2833 section 3.10.
     * @returns {Promise}
     */
    dtmfCall(call, digits) {
      return NativeModules.PjSipModule.dtmfCall(call.getId(), digits)
    }

    activateAudioSession() {
      return NativeModules.PjSipModule.activateAudioSession()
    }

    deactivateAudioSession() {
      return NativeModules.PjSipModule.deactivateAudioSession()
    }

    changeOrientation(orientation) {
      const orientations = [
        'PJMEDIA_ORIENT_UNKNOWN',
        'PJMEDIA_ORIENT_ROTATE_90DEG',
        'PJMEDIA_ORIENT_ROTATE_270DEG',
        'PJMEDIA_ORIENT_ROTATE_180DEG',
        'PJMEDIA_ORIENT_NATURAL'
      ]

      if (orientations.indexOf(orientation) === -1) {
        throw new Error(`Invalid ${JSON.stringify(orientation)} device orientation, but expected ${orientations.join(", ")} values`)
      }

      return NativeModules.PjSipModule.changeOrientation(orientation)
    }

    changeCodecSettings(codecSettings) {
      return NativeModules.PjSipModule.changeCodecSettings(codecSettings)
    }

    /**
     * @fires Endpoint#connectivity_changed
     * @private
     * @param data {Object}
     */
    _onConnectivityChanged(data) {
        /**
         * Fires when registration status has changed.
         *
         * @event Endpoint#connectivity_changed
         * @property {Account} account
         */
        this.emit("connectivity_changed", new Account(data));
    }

    /**
     * @fires Endpoint#registration_changed
     * @private
     * @param data {Object}
     */
    _onRegistrationChanged(data) {
        /**
         * Fires when registration status has changed.
         *
         * @event Endpoint#registration_changed
         * @property {Account} account
         */
        this.emit("registration_changed", new Account(data));
    }

    /**
     * @fires Endpoint#call_received
     * @private
     * @param data {Object}
     */
    _onCallReceived(data) {
        /**
         * TODO
         *
         * @event Endpoint#call_received
         * @property {Call} call
         */
        this.emit("call_received", new Call(data));
    }

    /**
     * @fires Endpoint#call_changed
     * @private
     * @param data {Object}
     */
    _onCallChanged(data) {
        /**
         * TODO
         *
         * @event Endpoint#call_changed
         * @property {Call} call
         */
        this.emit("call_changed", new Call(data));
    }

    /**
     * @fires Endpoint#call_terminated
     * @private
     * @param data {Object}
     */
    _onCallTerminated(data) {
        /**
         * TODO
         *
         * @event Endpoint#call_terminated
         * @property {Call} call
         */
        this.emit("call_terminated", new Call(data));
    }

    /**
     * @fires Endpoint#call_screen_locked
     * @private
     * @param lock bool
     */
    _onCallScreenLocked(lock) {
        /**
         * TODO
         *
         * @event Endpoint#call_screen_locked
         * @property bool lock
         */
        this.emit("call_screen_locked", lock);
    }

    /**
     * @fires Endpoint#message_received
     * @private
     * @param data {Object}
     */
    _onMessageReceived(data) {
        /**
         * TODO
         *
         * @event Endpoint#message_received
         * @property {Message} message
         */
        this.emit("message_received", new Message(data));
    }

    /**
     * @fires Endpoint#connectivity_changed
     * @private
     * @param available bool
     */
    _onConnectivityChanged(available) {
        /**
         * @event Endpoint#connectivity_changed
         * @property bool available True if connectivity matches current Network settings, otherwise false.
         */
        this.emit("connectivity_changed", available);
    }

    /**
     * Normalize Destination URI
     *
     * @param account
     * @param destination {string}
     * @returns {string}
     * @private
     */
    _normalize(account, destination) {
        if (!destination.startsWith("sip:")) {
            let realm = account.getRegServer();

            if (!realm) {
                realm = account.getDomain();
                let s = realm.indexOf(":");

                if (s > 0) {
                    realm = realm.substr(0, s + 1);
                }
            }

            destination = "sip:" + destination + "@" + realm;
        }

        return destination;
    }
    // setUaConfig(UaConfig value)
    // setMaxCalls
    // setUserAgent
    // setNatTypeInSdp

    // setLogConfig(LogConfig value)
    // setLevel
}
