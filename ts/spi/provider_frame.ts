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

import {PrimaryClientConfiguration} from '../protocol/client_config';
import {sendMessage} from '../protocol/comms';
import {AUTHENTICATION_METHODS, OpenYoloCredential, OpenYoloCredentialHintOptions, OpenYoloCredentialRequestOptions} from '../protocol/data';
import {OpenYoloInternalError} from '../protocol/errors';
import {isOpenYoloMessageFormat} from '../protocol/messages';
import {channelErrorMessage} from '../protocol/post_messages';
import * as msg from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {CancellablePromise} from '../protocol/utils';

import {AncestorOriginVerifier} from './ancestor_origin_verifier';
import {AffiliationProvider, CredentialDataProvider, DisplayCallbacks, InteractionProvider, LocalStateProvider, ProviderConfiguration, WindowLike} from './provider_config';

/**
 * Handles request from the client.
 *
 * TODO: break down this class. It is untestable. Each request handler should
 * live in a separate class/function to abstract the messaging layer and to
 * allow testing more thoroughly the different paths.
 */
export class ProviderFrame {
  private clientAuthDomain: string;
  private affiliationProvider: AffiliationProvider;
  private localStateProvider: LocalStateProvider;
  private credentialDataProvider: CredentialDataProvider;
  private interactionProvider: InteractionProvider;
  private requestInProgress = false;
  // represents a potential cancellable operation
  private cancellable: CancellablePromise<never>|null = null;

  private closeListener: EventListener;
  private window: WindowLike;

  private proxyLoginCredential: OpenYoloCredential|null = null;

  /**
   * Performs the initial validation of the execution context, and then
   * instantiates a {@link ProviderFrame} instance.
   */
  static async initialize(providerConfig: ProviderConfiguration):
      Promise<ProviderFrame> {
    try {
      // fetch the client configuration, and ensure that the API is explicitly
      // enabled
      let clientConfiguration =
          await providerConfig.clientConfigurationProvider.getConfiguration(
              providerConfig.clientAuthDomain);
      if (!clientConfiguration || !clientConfiguration.apiEnabled) {
        throw OpenYoloInternalError.apiDisabled();
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
      let secureChannel = await SecureChannel.providerConnect(
          providerConfig.window,
          [providerConfig.clientAuthDomain],
          providerConfig.clientNonce);

      // success! create the frame manager to handle subsequent requests
      return new ProviderFrame(
          providerConfig,
          secureChannel,
          clientConfiguration,
          equivalentAuthDomains);

    } catch (err) {
      // initialization failed, be courteous and notify the client as this
      // may not actually be their fault.
      if (err instanceof OpenYoloInternalError) {
        sendMessage(
            providerConfig.window.parent,
            channelErrorMessage(err.toExposedError()));
      } else {
        sendMessage(
            providerConfig.window.parent,
            channelErrorMessage(
                OpenYoloInternalError.providerInitializationFailed()
                    .toExposedError()));
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
        channelErrorMessage(
            OpenYoloInternalError.userCanceled().toExposedError()));
  }

  private registerListeners() {
    this.addRpcListener(
        msg.RpcMessageType.disableAutoSignIn,
        (m) => this.handleDisableAutoSignInRequest(m.id));

    this.addRpcListener(
        msg.RpcMessageType.retrieve,
        (m) => this.handleGetCredentialRequest(m.id, m.args));

    this.addRpcListener(
        msg.RpcMessageType.hint, (m) => this.handleHintRequest(m.id, m.args));

    this.addRpcListener(
        msg.RpcMessageType.hintAvailable,
        (m) => this.handleHintAvailableRequest(m.id, m.args));

    this.addRpcListener(
        msg.RpcMessageType.save,
        (m) => this.handleSaveCredentialRequest(m.id, m.args));

    this.addRpcListener(
        msg.RpcMessageType.proxy,
        (m) => this.handleProxyLoginRequest(m.id, m.args));

    this.addRpcListener(
        msg.RpcMessageType.cancelLastOperation,
        (m) => this.handleCancelLastOperation(m.id));

    this.clientChannel.addFallbackListener((ev) => {
      this.handleUnknownMessage(ev);
      return false;
    });
  }

  private addRpcListener<T extends msg.RpcMessageType>(
      type: T,
      messageHandler: (message: msg.RpcMessageData<T>) => Promise<void>) {
    this.clientChannel.listen<T>(
        type,
        (m: msg.RpcMessageData<T>, type: T, ev: MessageEvent) =>
            this.monitoringListener(type, m, messageHandler));
  }

  private async monitoringListener<T extends msg.RpcMessageType>(
      type: T,
      m: msg.RpcMessageData<T>,
      messageHandler: (message: msg.RpcMessageData<T>) => Promise<void>) {
    if (!this.recordRequestStart(type, m.id)) {
      return;
    }

    try {
      await messageHandler(m);
    } catch (error) {
      if (error && error === CancellablePromise.CANCELLED_ERROR) {
        // reset cancellable promise, for the next set of requests
        this.cancellable = null;
        this.clientChannel.send(msg.errorMessage(
            m.id, OpenYoloInternalError.operationCanceled().toExposedError()));
      } else {
        throw error;
      }
    } finally {
      this.recordRequestStop();
    }
  }

  private recordRequestStart<T extends msg.RpcMessageType>(
      requestType: T,
      requestId: string) {
    // Cancel last operation requests should not be recorded.
    if (requestType === 'cancelLastOperation') {
      // allow cancelLastOperation even if its a concurrent request
      return true;
    }

    if (!this.requestInProgress) {
      this.requestInProgress = true;
      return true;
    }

    this.clientChannel.send(msg.errorMessage(
        requestId,
        OpenYoloInternalError.illegalConcurrentRequestError()
            .toExposedError()));
    return false;
  }

  private recordRequestStop() {
    this.requestInProgress = false;
  }

  private async handleDisableAutoSignInRequest(requestId: string) {
    try {
      await this.localStateProvider.setAutoSignInEnabled(
          this.providerConfig.clientAuthDomain, false);
    } catch (e) {
      console.error('Failed to disable auto sign in.');
    }
    this.clientChannel.send(msg.disableAutoSignInResultMessage(requestId));
  }

  private async handleHintRequest(
      requestId: string,
      options: OpenYoloCredentialHintOptions) {
    try {
      let hints = await this.cancellablePromise(this.getHints(options));
      if (hints.length < 1) {
        this.clientChannel.send(msg.errorMessage(
            requestId,
            OpenYoloInternalError.noCredentialsAvailable().toExposedError()));
        return;
      }

      // user interaction is required. instruct the interaction provider to show
      // a picker for the available credentials.
      let selectionPromise = this.interactionProvider.showHintPicker(
          hints, options, this.createDisplayCallbacks(requestId));


      // now, wait for selection to occur, and send the selection result to the
      // client
      let selectedHint = await this.cancellablePromise(selectionPromise);

      // once selected we want to set auto sign in enabled to true again
      await this.cancellablePromise(
          this.localStateProvider.setAutoSignInEnabled(
              this.providerConfig.clientAuthDomain, true));

      // once selected, we redact the credential of any sensitive details
      selectedHint = this.copyCredential(selectedHint, true);

      // we also change the authentication domain to match that of the
      // requester, as that is where the hint would be used.
      selectedHint.authDomain = this.clientAuthDomain;

      // TODO: if the authentication method is id-and-password, generate
      // a password using the provided password specification

      // TODO: retain the credential hint for a potential automatic save later.

      this.clientChannel.send(
          msg.credentialResultMessage(requestId, selectedHint));
    } catch (err) {
      this.handleWellKnownErrors(err);
      if (err instanceof OpenYoloInternalError) {
        this.clientChannel.send(
            msg.errorMessage(requestId, err.toExposedError()));
      } else {
        this.clientChannel.send(msg.errorMessage(
            requestId,
            OpenYoloInternalError.requestFailed('Implementation error.')
                .toExposedError()));
      }
    }
  }

  private async handleHintAvailableRequest(
      id: string,
      options: OpenYoloCredentialHintOptions) {
    try {
      const hints = await this.cancellablePromise(this.getHints(options));
      this.clientChannel.send(
          msg.hintAvailableResponseMessage(id, hints.length > 0));
    } catch (err) {
      this.handleWellKnownErrors(err);
      if (err instanceof OpenYoloInternalError) {
        this.clientChannel.send(msg.errorMessage(id, err.toExposedError()));
      } else {
        this.clientChannel.send(msg.errorMessage(
            id,
            OpenYoloInternalError.requestFailed('Implementation error.')
                .toExposedError()));
      }
    }
  }

  private async handleGetCredentialRequest(
      requestId: string,
      options: OpenYoloCredentialRequestOptions) {
    try {
      let credentials = await this.cancellablePromise(
          this.credentialDataProvider.getAllCredentials(
              this.equivalentAuthDomains, options));

      // filter out the credentials which don't match the request options
      let pertinentCredentials =
          credentials.filter((credential: OpenYoloCredential) => {
            return options.supportedAuthMethods.find(
                (value) => value === credential.authMethod);
          });

      // if no credentials are available, directly respond to the client that
      // this is the case and the request will complete
      if (pertinentCredentials.length < 1) {
        this.clientChannel.send(msg.errorMessage(
            requestId,
            OpenYoloInternalError.noCredentialsAvailable().toExposedError()));
        return;
      }


      // if a single credential is available, check if auto sign-in is enabled
      // for the client authentication domain. If it is, directly return the
      // credential to the client, and the request will complete.
      if (pertinentCredentials.length === 1) {
        let autoSignInEnabled =
            await this.localStateProvider.isAutoSignInEnabled(
                this.clientAuthDomain);
        if (autoSignInEnabled) {
          const credential = pertinentCredentials[0];
          // Display the auto sign in screen and send the message.
          await this.cancellablePromise(this.interactionProvider.showAutoSignIn(
              credential, this.createDisplayCallbacks(requestId)));
          this.clientChannel.send(msg.credentialResultMessage(
              requestId, this.storeForProxyLogin(credential)));
          return;
        }
      }

      // user interaction is required. instruct the interaction provider to show
      // a picker for the available credentials, and concurrently notify the
      // client to show the provider frame.
      let selectionPromise = this.interactionProvider.showCredentialPicker(
          pertinentCredentials,
          options,
          this.createDisplayCallbacks(requestId));

      // now, wait for selection to occur, and send the selection result to the
      // client
      let selectedCredential = await this.cancellablePromise(selectionPromise);

      // once selected we want to set auto sign in enabled to true again
      await this.cancellablePromise(
          this.localStateProvider.setAutoSignInEnabled(
              this.providerConfig.clientAuthDomain, true));

      this.clientChannel.send(msg.credentialResultMessage(
          requestId, this.storeForProxyLogin(selectedCredential)));
    } catch (err) {
      this.handleWellKnownErrors(err);
      if (err instanceof OpenYoloInternalError) {
        this.clientChannel.send(
            msg.errorMessage(requestId, err.toExposedError()));
      } else {
        this.clientChannel.send(msg.errorMessage(
            requestId,
            OpenYoloInternalError.requestFailed('Implementation error.')
                .toExposedError()));
      }
    }
  }

  private async handleSaveCredentialRequest(
      id: string,
      credential: OpenYoloCredential) {
    // TODO(iainmcgin): implement
    return this.handleUnimplementedRequest(id, msg.RpcMessageType.save);
  }

  private async handleProxyLoginRequest(
      id: string,
      credential: OpenYoloCredential) {
    // TODO(iainmcgin): implement
    return this.handleUnimplementedRequest(id, msg.RpcMessageType.proxy);
  }

  private async handleCancelLastOperation(id: string) {
    if (!this.requestInProgress || this.cancellable === null) {
      // no request in progress
      console.warn('No pending request to cancel.');
    } else {
      try {
        this.cancellable.cancel();
      } finally {
        // cancel any pending UI
        this.interactionProvider.dispose();
      }
    }
    this.clientChannel.send(msg.cancelLastOperationResultMessage(id));
  }

  /**
   * Responds to unknown request types with an error message.
   */
  private async handleUnimplementedRequest(id: string, type: string) {
    this.clientChannel.send(msg.errorMessage(
        id, OpenYoloInternalError.unknownRequest(type).toExposedError()));
  }

  private handleUnknownMessage(ev: MessageEvent) {
    if (!isOpenYoloMessageFormat(ev.data)) {
      return;
    }
    if (msg.RPC_MESSAGE_TYPES.indexOf(ev.data.type) === -1) {
      return;
    }

    const type = (ev.data.type as msg.RpcMessageType);

    if (!msg.RPC_MESSAGE_DATA_VALIDATORS[type](ev.data.data)) {
      return;
    }

    const data = (ev.data.data as msg.RpcMessageData<any>);
    // the message is a known, valid, but unhandled RPC message. Send a generic
    // failure message back.
    this.clientChannel.send(msg.errorMessage(
        data.id, OpenYoloInternalError.unknownRequest(type).toExposedError()));
    return;
  }

  /**
   * If direct auth is not permitted for this credential, store it in
   * {@code this.proxyLoginCredential} and return a redacted version of the
   * credential. Otherwise, just an unredacted copy of the credential.
   */
  private storeForProxyLogin(credential: OpenYoloCredential) {
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
  private copyCredential(
      credential: OpenYoloCredential,
      redactSensitive?: boolean): OpenYoloCredential {
    let redact = !!redactSensitive;

    let copy: OpenYoloCredential = {
      id: credential.id,
      authMethod: credential.authMethod
    };

    if (credential.authDomain) {
      copy.authDomain = credential.authDomain;
    }

    if (credential.displayName) {
      copy.displayName = credential.displayName;
    }

    if (credential.profilePicture) {
      copy.profilePicture = credential.profilePicture;
    }

    if (credential.exchangeToken) {
      copy.exchangeToken = credential.exchangeToken;
    }

    if (credential.idToken) {
      copy.idToken = credential.idToken;
    }

    if (!redact && 'password' in credential) {
      copy.password = credential.password;
    }

    return copy;
  }

  private createDisplayCallbacks(requestId: string): DisplayCallbacks {
    return {
      requestDisplayOptions: (options: msg.DisplayOptions): Promise<void> => {
        return this.clientChannel.sendAndWaitAck(
            msg.showProviderMessage(requestId, options));
      }
    };
  }

  /**
   * Creates a list of all hints that are compatible with the specified hint
   * options, ordered from most- to least- frequently used.
   */
  private async getHints(options: OpenYoloCredentialHintOptions):
      Promise<OpenYoloCredential[]> {
    // get all credentials across all domains; from this, we can filter down
    // to the set of credentials
    let allCredentials = await this.cancellablePromise(
        this.credentialDataProvider.getAllHints(options));

    if (allCredentials.length < 1) {
      return [];
    }

    // consolidate credentials into a map based on the credential id, and
    // record the number of credentials with that identifier.
    let credentialsById = ({} as {[key: string]: OpenYoloCredential});
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

    let hintCredentials: OpenYoloCredential[] = [];
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
  private completenessScore(credential: OpenYoloCredential): number {
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

  private cancellablePromise<T>(producer: Promise<T>): Promise<T> {
    // creates a new cancellable promise if and only if one does not already
    // exist for the provider frame. This should get reset only when a cancel
    // signal has already been caught.
    if (!this.cancellable) {
      this.cancellable = new CancellablePromise();
    }
    return Promise.race([this.cancellable.promise, producer]) as Promise<T>;
  }

  private handleWellKnownErrors(error: Error) {
    // we must let well known errors bubble up, so they
    // are caught by the monitoring handler.
    if (error === CancellablePromise.CANCELLED_ERROR) {
      throw error;
    }
  }
}
