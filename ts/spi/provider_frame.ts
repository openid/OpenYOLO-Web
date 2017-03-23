/*
 * Copyright 2017 The OpenYOLO for Web Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {sendMessage} from '../protocol/comms';
import {AUTHENTICATION_METHODS, Credential, CredentialHintOptions, CredentialRequestOptions, PrimaryClientConfiguration} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';
import {isOpenYoloMessageFormat} from '../protocol/messages';
import {channelErrorMessage} from '../protocol/post_messages';
import * as msg from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';

import {AncestorOriginVerifier} from './ancestor_origin_verifier';
import {AffiliationProvider, CredentialDataProvider, DisplayCallbacks, InteractionProvider, LocalStateProvider, ProviderConfiguration, WindowLike} from './provider_config';

export class ProviderFrame {
  private clientAuthDomain: string;
  private affiliationProvider: AffiliationProvider;
  private localStateProvider: LocalStateProvider;
  private credentialDataProvider: CredentialDataProvider;
  private interactionProvider: InteractionProvider;
  private requestInProgress = false;

  private closeListener: EventListener;
  private window: WindowLike;

  private proxyLoginCredential: Credential|null = null;

  /**
   * Performs the initial validation of the execution context, and then
   * instantiates a {@link ProviderFrame} instance.
   */
  static async initialize(
      providerConfig: ProviderConfiguration,
      establishTimeoutMs?: number): Promise<ProviderFrame> {
    let secureChannel: SecureChannel|null;
    try {
      // fetch the client configuration, and ensure that the API is explicitly
      // enabled
      let clientConfiguration =
          await providerConfig.clientConfigurationProvider.getConfiguration(
              providerConfig.clientAuthDomain);
      if (!clientConfiguration.apiEnabled) {
        console.info('OpenYOLO API is not enabled for the client origin');
        throw OpenYoloError.apiDisabled();
      }

      // Verify the ancestor frame(s), based on the client configuration and
      // known equivalent http(s) domains.
      let equivalentAuthDomains =
          await providerConfig.affiliationProvider.getEquivalentDomains(
              providerConfig.clientAuthDomain);

      let webAuthDomains = equivalentAuthDomains.filter((origin) => {
        return origin.startsWith('http');
      });

      if (clientConfiguration.allowNestedFrameRequests) {
        await AncestorOriginVerifier.verify(
            providerConfig.window, webAuthDomains);
      } else {
        await AncestorOriginVerifier.verifyOnlyParent(
            providerConfig.window, webAuthDomains);
      }

      // establish a communication channel with the client
      secureChannel = await SecureChannel.providerConnect(
          providerConfig.window,
          [providerConfig.clientAuthDomain],
          providerConfig.clientNonce,
          establishTimeoutMs);

      // success! create the frame manager to handle subsequent requests
      return new ProviderFrame(
          providerConfig,
          secureChannel,
          clientConfiguration,
          equivalentAuthDomains);

    } catch (err) {
      // initialization failed, be courteous and notify the client as this
      // may not actually be their fault. However, don't send the actual
      // root cause to the client in case this leaks sensitive information.

      // TODO(iainmcgin): some messages would be safe to send to the client.
      // we could indicate this within the OpenYoloError type, with a
      // "client safe" flag for messages that cannot contain sensitive
      // information, and that would be useful to the client.
      sendMessage(
          providerConfig.window.parent,
          channelErrorMessage(OpenYoloError.providerInitFailed()));

      if (secureChannel) {
        secureChannel.dispose();
      }

      throw err;
    }
  }

  constructor(
      private providerConfig: ProviderConfiguration,
      private clientChannel: SecureChannel,
      private clientConfig: PrimaryClientConfiguration,
      private equivalentAuthDomains: string[]) {
    // for convenience, we unpack the properties of the frame configuration
    // we need to keep for use in methods
    this.clientAuthDomain = providerConfig.clientAuthDomain;
    this.affiliationProvider = providerConfig.affiliationProvider;
    this.credentialDataProvider = providerConfig.credentialDataProvider;
    this.interactionProvider = providerConfig.interactionProvider;
    this.localStateProvider = providerConfig.localStateProvider;
    this.window = window;

    // start listening for specific request types from the client
    this.registerListeners();

    // if we are in a popup and closed, send a message to the parent
    if (this.window.opener) {
      this.closeListener = (() => this.handleClose());
      this.window.addEventListener('beforeunload', this.closeListener);
    }
  }

  dispose() {
    this.clientChannel.dispose();
    this.interactionProvider.dispose();
    this.window.removeEventListener('beforeunload', this.closeListener);
  }

  private async handleClose() {
    sendMessage(
        this.providerConfig.window.parent,
        channelErrorMessage(OpenYoloError.canceled()));
  }

  private registerListeners() {
    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.wrapBrowser,
        (m) => this.handleWrapBrowserRequest(m.id));

    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.retrieve,
        (m) => this.handleGetCredentialRequest(m.id, m.args));

    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.hint,
        (m) => this.handleHintRequest(m.id, m.args));

    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.hintAvailable,
        (m) => this.handleHintsAvailableRequest(m.id, m.args));

    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.save,
        (m) => this.handleSaveCredentialRequest(m.id, m.args));

    this.addRpcListener(
        msg.RPC_MESSAGE_TYPES.proxy,
        (m) => this.handleProxyLoginRequest(m.id, m.args));

    this.clientChannel.addFallbackListener(
        (ev) => this.handleUnknownMessage(ev));
  }

  // NOTE: TS 2.1.6 appears to have a compiler bug where it does not identify
  // that msg.RpcMessageDataTypes[T] has an id field. TS 2.2.1 does not have
  // this issue, but the angular cli gets confused and fails to compile on
  // the first run. To work around this problem we currently use "any"
  // to bypass the issue.
  // TODO: re-test this with the next release of the angular cli to see if
  // the any wrapping can be removed.
  private addRpcListener<T extends msg.RpcMessageType>(
      type: T,
      messageHandler: (message: msg.RpcMessageDataTypes[T]) => Promise<void>) {
    this.clientChannel.listen<T>(
        type,
        (m: msg.RpcMessageDataTypes[T], type: T, ev: MessageEvent) =>
            this.monitoringListener(type, m, messageHandler));
  }

  private async monitoringListener<T extends msg.RpcMessageType>(
      type: T,
      m: msg.RpcMessageDataTypes[T],
      messageHandler: (message: msg.RpcMessageDataTypes[T]) => Promise<void>) {
    // TODO: a TS compiler bug appears to be causing intermittent problems
    // with resolving RpcMessageDataTypes[T]. Cast to any until this
    // is resolved
    if (!this.recordRequestStart((m as any).id)) {
      return;
    }

    try {
      await messageHandler(m);
    } finally {
      this.recordRequestStop();
    }
  }

  private recordRequestStart(requestId: string) {
    if (!this.requestInProgress) {
      this.requestInProgress = true;
      return true;
    }

    console.error(`Concurrent request ${requestId} received, rejecting`);
    this.clientChannel.send(msg.errorMessage(
        requestId, OpenYoloError.illegalStateError('Concurrent request')));
    return false;
  }

  private recordRequestStop() {
    this.requestInProgress = false;
  }

  private async handleWrapBrowserRequest(requestId: string) {
    this.clientChannel.send(msg.wrapBrowserResultMessage(
        requestId, this.providerConfig.delegateToBrowser));
  }

  private async handleHintRequest(
      requestId: string,
      options: CredentialHintOptions) {
    console.info('Handling hint request');

    let hints = await this.getHints(options);
    if (hints.length < 1) {
      console.info('no hints available');
      this.clientChannel.send(msg.noneAvailableMessage(requestId));
      return;
    }

    // user interaction is required. instruct the interaction provider to show
    // a picker for the available credentials.
    let selectionPromise = this.interactionProvider.showHintPicker(
        hints, options, this.createDisplayCallbacks(requestId));

    // now, wait for selection to occur, and send the selection result to the
    // client
    try {
      console.info('awaiting user selection of hint');
      let selectedHint = await selectionPromise;

      // once selected, we redact the credential of any sensitive details
      selectedHint = this.copyCredential(selectedHint, true);

      // we also change the authentication domain to match that of the
      // requester, as that is where the hint would be used.
      selectedHint.authDomain = this.clientAuthDomain;

      // TODO: if the authentication method is id-and-password, generate
      // a password using the provided password specification

      // TODO: retain the credential hint for a potential automatic save later.

      console.info('Returning selected hint');
      this.clientChannel.send(
          msg.credentialResultMessage(requestId, selectedHint));
    } catch (err) {
      console.info(`Hint selection cancelled: ${err}`);
      this.clientChannel.send(msg.noneAvailableMessage(requestId));
    }
  }

  private async handleHintsAvailableRequest(
      id: string,
      options: CredentialHintOptions) {
    // TODO: implement
    return this.handleUnimplementedRequest(
        id, msg.RPC_MESSAGE_TYPES.hintAvailable);
  }

  private async handleGetCredentialRequest(
      requestId: string,
      options: CredentialRequestOptions) {
    console.info('Handling credential retrieve request');

    let credentials = await this.credentialDataProvider.getAllCredentials(
        this.equivalentAuthDomains, options);

    // filter out the credentials which don't match the request options
    let pertinentCredentials = credentials.filter((credential) => {
      return options.supportedAuthMethods.find(
          (value) => value === credential.authMethod);
    });

    // if no credentials are available, directly respond to the client that
    // this is the case and the request will complete
    if (pertinentCredentials.length < 1) {
      console.info('no credentials available');
      this.clientChannel.send(msg.noneAvailableMessage(requestId));
      return;
    }

    console.info('credentials are available');

    // if a single credential is available, check if auto sign-in is enabled
    // for the client authentication domain. If it is, directly return the
    // credential to the client, and the request will complete.
    if (pertinentCredentials.length === 1) {
      let autoSignInEnabled = await this.localStateProvider.isAutoSignInEnabled(
          this.clientAuthDomain);
      console.log(`single credential, auto sign in = ${autoSignInEnabled}`);
      if (autoSignInEnabled) {
        this.clientChannel.send(msg.credentialResultMessage(
            requestId, this.storeForProxyLogin(pertinentCredentials[0])));
        return;
      }
    }

    // user interaction is required. instruct the interaction provider to show
    // a picker for the available credentials, and concurrently notify the
    // client to show the provider frame.
    console.info('User interaction required to release credential');
    let selectionPromise = this.interactionProvider.showCredentialPicker(
        pertinentCredentials, options, this.createDisplayCallbacks(requestId));

    // now, wait for selection to occur, and send the selection result to the
    // client
    try {
      let selectedCredential = await selectionPromise;
      console.info('Returning selected credential');
      this.clientChannel.send(msg.credentialResultMessage(
          requestId, this.storeForProxyLogin(selectedCredential)));
    } catch (err) {
      console.info(`Credential selection cancelled: ${err}`);
      this.clientChannel.send(msg.noneAvailableMessage(requestId));
    }
  }

  private async handleSaveCredentialRequest(
      id: string,
      credential: Credential) {
    // TODO(iainmcgin): implement
    return this.handleUnimplementedRequest(id, msg.RPC_MESSAGE_TYPES.save);
  }

  private async handleProxyLoginRequest(id: string, credential: Credential) {
    // TODO(iainmcgin): implement
    return this.handleUnimplementedRequest(id, msg.RPC_MESSAGE_TYPES.proxy);
  }

  /**
   * Responds to unknown request types with an error message.
   */
  private async handleUnimplementedRequest(id: string, type: string) {
    console.error(`No implementation for request of type ${type}`);
    this.clientChannel.send(
        msg.errorMessage(id, OpenYoloError.unknownRequest(type)));
  }

  private handleUnknownMessage(ev: MessageEvent): boolean {
    if (!isOpenYoloMessageFormat(ev.data)) {
      console.warn(
          'Message with invalid format received on secure channel, ' +
              'ignoring',
          ev);
      return;
    }

    if (!(ev.data.type in msg.RPC_MESSAGE_TYPES)) {
      console.warn('Non-RPC message received on secure channel, ignoring');
      return;
    }

    let type = (ev.data.type as msg.RpcMessageType);

    if (!msg.RPC_MESSAGE_DATA_VALIDATORS[type](ev.data.data)) {
      console.warn(
          `RPC message of type ${type} contains invalid data, ` +
          'ignoring');
      return;
    }

    let data = (ev.data.data as msg.RpcMessageData<any>);
    // the message is a known, valid, but unhandled RPC message. Send a generic
    // failure message back.
    this.clientChannel.send(
        msg.errorMessage(data.id, OpenYoloError.unknownRequest(type)));
    return;
  }

  /**
   * If direct auth is not permitted for this credential, store it in
   * {@code this.proxyLoginCredential} and return a redacted version of the
   * credential. Otherwise, just an unredacted copy of the credential.
   */
  private storeForProxyLogin(credential: Credential) {
    if (!credential.password ||
        (this.providerConfig.allowDirectAuth &&
         !this.clientConfig.requireProxyLogin)) {
      // this copy will contain the standard fields, but remove any non-
      // standard fields that the data provider implementation may have
      // included but should not be leaked.
      return this.copyCredential(credential, false);
    }

    this.proxyLoginCredential = credential;

    let redactedCopy = this.copyCredential(credential, true);
    redactedCopy.proxiedAuthRequired = true;
    return redactedCopy;
  }

  /**
   * Provides a shallow copy of a credential, optionally redacting sensitive
   * data.
   */
  private copyCredential(credential: Credential, redactSensitive?: boolean):
      Credential {
    let redact = !!redactSensitive;

    let copy:
        Credential = {id: credential.id, authMethod: credential.authMethod};

    if (credential.authDomain) {
      copy.authDomain = credential.authDomain;
    }

    if (credential.displayName) {
      copy.displayName = credential.displayName;
    }

    if (credential.profilePicture) {
      copy.profilePicture = credential.profilePicture;
    }

    if (!redact && 'password' in credential) {
      copy.password = credential.password;
    }

    return copy;
  }

  private createDisplayCallbacks(requestId: string): DisplayCallbacks {
    return {
      requestDisplayOptions: (options: msg.DisplayOptions) => {
        this.clientChannel.send(msg.showProviderMessage(requestId, options));
      }
    };
  }

  /**
   * Creates a list of all hints that are compatible with the specified hint
   * options, ordered from most- to least- frequently used.
   */
  private async getHints(options: CredentialHintOptions):
      Promise<Credential[]> {
    // get all credentials across all domains; from this, we can filter down
    // to the set of credentials
    let allCredentials = await this.credentialDataProvider.getAllHints(options);

    if (allCredentials.length < 1) {
      return [];
    }

    // consolidate credentials into a map based on the credential id, and
    // record the number of credentials with that identifier.
    let credentialsById = ({} as {[key: string]: Credential});
    let credentialCount = ({} as {[key: string]: number});
    let numRetained = 0;
    allCredentials.forEach((credential) => {

      // ignore any credential with an unusable authentication method
      if (options.supportedAuthMethods.indexOf(credential.authMethod) < 0) {
        return;
      }


      if (!(credential.id in credentialsById)) {
        credentialsById[credential.id] = credential;
        credentialCount[credential.id] = 1;
        numRetained++;
        return;
      }

      if (this.completenessScore(credential) >
          this.completenessScore(credentialsById[credential.id])) {
        credentialsById[credential.id] = credential;
      }

      credentialCount[credential.id] += 1;
    });

    // check if there are any credentials left after filtering
    if (numRetained < 1) {
      return [];
    }

    // extract and reorder the credentials from the map into a most- to
    // least-frequently ocurring order.

    let hintCredentials: Credential[] = [];
    for (let credentialId in credentialsById) {
      if (credentialsById.hasOwnProperty(credentialId)) {
        hintCredentials.push(credentialsById[credentialId]);
      }
    }

    return hintCredentials.sort((a, b) => {
      let aCount = credentialCount[a.id];
      let bCount = credentialCount[b.id];
      if (aCount < bCount) {
        return 1;
      } else if (aCount > bCount) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  /**
   * Calculates a "score" for a credential based on how complete the set of
   * information it contains is. This can be used to compare credentials and
   * favor those with more information.
   */
  private completenessScore(credential: Credential): number {
    let score = 0;
    if (credential.authMethod !== AUTHENTICATION_METHODS.ID_AND_PASSWORD) {
      score += 4;
    }

    if (credential.displayName) {
      score += 2;
    }

    if (credential.profilePicture) {
      score += 1;
    }

    return score;
  }
}
