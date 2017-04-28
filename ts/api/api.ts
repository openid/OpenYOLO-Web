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

import {Credential, CredentialHintOptions, CredentialRequestOptions, ProxyLoginResponse} from '../protocol/data';
import {RENDER_MODES, RenderMode} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';
import {SecureChannel} from '../protocol/secure_channel';
import {generateId, sha256} from '../protocol/utils';

import {CredentialRequest} from './credential_request';
import {CredentialSave} from './credential_save';
import {HintAvailableRequest} from './hint_available_request';
import {HintRequest} from './hint_request';
import {ProviderFrameElement} from './provider_frame_elem';
import {ProxyLogin} from './proxy_login';
import {WrapBrowserRequest} from './wrap_browser_request';

// re-export all the data types
export * from '../protocol/data';
export {OpenYoloError, ERROR_TYPES} from '../protocol/errors';
import {respondToHandshake} from './verify';
import {PreloadRequest, PRELOAD_REQUEST} from '../protocol/preload_request';

const MOBILE_USER_AGENT_REGEX = /android|iphone|ipod|iemobile/i;

export const DEFAULT_REQUEST_TIMEOUT = 3000;

/**
 * Provides a mechanism for credential exchange between the current origin and
 * the user's credential provider (e.g. Smart Lock for Passwords).
 */
export interface OpenYoloApi {
  /**
   * Requests the credential provider whether hints are available or not for the
   * current user.
   *
   * @param options
   *     Describes the types of credentials that are supported by the origin.
   * @return
   *     A promise that resolves with true if at least one hint is available,
   *     and resolves with false if none are available. The promise will not
   *     reject: if an error happen, it should resolve with false.
   */
  hintsAvailable(options: CredentialHintOptions): Promise<boolean>;

  /**
   * Attempts to retrieve a sign-up hint that can be used to create a new
   * user account.
   *
   * @param options
   *     Describes the types of credentials that are supported by the origin,
   *     and customization properties for the display of any UI pertaining to
   *     releasing this credential.
   * @return
   *     A promise for a credential hint. The promise will be rejected if the
   *     user cancels the hint selection process.
   */
  hint(options: CredentialHintOptions): Promise<Credential>;

  /**
   * Attempts to retrieve a credential for the current origin.
   *
   * @param options
   *     Describes the types of credentials that are supported by the origin.
   * @return
   *     A promise for the credential, which will be rejected if there are no
   *     credentials available or the user refuses to release the credential.
   *     Otherwise, the promise will resolve with a credential that the app
   *     can use.
   */
  retrieve(options: CredentialRequestOptions): Promise<Credential>;

  /**
   * Attempts to save the provided credential, which will update or create
   * a credential as necessary.
   *
   * @param credential
   *     The credential to be stored.
   * @return
   *     A promise for the completion of the operation. The promise will always
   *     resolve, and does not indicate whether the credential was actually
   *     saved.
   */
  save(credential: Credential): Promise<void>;

  /**
   * Prevents the automatic release of a credential from the retrieve operation.
   * This should be invoked when the user signs out, in order to prevent an
   * automatic sign-in loop.
   *
   * @return
   *     A promise for the completion of notifying the provider to disable
   *     automatic sign-in.
   */
  disableAutoSignIn(): Promise<void>;

  /**
   * Dispatches a credential to the origin's declared authentication system,
   * via the credential provider.
   *
   * This method *may* not be implemented for the launch if time does not permit
   * even if it would be better to have it in the first version.
   *
   * @param credential
   *    The credential to be dispatched.
   * @return
   *    A promise for the response data from the authentication system.
   */
  proxyLogin(credential: Credential): Promise<ProxyLoginResponse>;
}

/**
 * Provides access to the user's preferred credential provider, in order to
 * retrieve credentials.
 */
class OpenYoloApiImpl implements OpenYoloApi {
  static async create(
      providerUrlBase: string,
      renderMode?: RenderMode,
      preloadRequest?: PreloadRequest): Promise<OpenYoloApiImpl> {
    let instanceId = generateId();
    let instanceIdHash = await sha256(instanceId);

    if (!renderMode || !(renderMode in RENDER_MODES)) {
      let isMobile = navigator.userAgent.match(MOBILE_USER_AGENT_REGEX);
      let isNested = window.parent !== window;
      if (isNested) {
        renderMode = RENDER_MODES.fullScreen;
      } else if (isMobile) {
        renderMode = RENDER_MODES.bottomSheet;
      } else {
        renderMode = RENDER_MODES.navPopout;
      }
    }

    let frameManager = new ProviderFrameElement(
        document,
        instanceIdHash,
        window.location.origin,
        renderMode,
        providerUrlBase,
        preloadRequest);

    // TODO: the timeout must be split across multiple operations; might be
    // better to race two promises to make this easier.

    let channel = await SecureChannel.clientConnect(
        window, frameManager.getContentWindow(), instanceId, instanceIdHash);

    let request = new WrapBrowserRequest(frameManager, channel);
    let wrapBrowser = await request.dispatch();

    return new OpenYoloApiImpl(frameManager, channel, wrapBrowser);
  }

  private disposed: boolean = false;

  constructor(
      private frameManager: ProviderFrameElement,
      private channel: SecureChannel,
      private wrapBrowser: boolean) {}

  async hintsAvailable(options: CredentialHintOptions, timeoutMs?: number):
      Promise<boolean> {
    this.checkNotDisposed();
    let request = new HintAvailableRequest(this.frameManager, this.channel);
    return request.dispatch(options, timeoutMs);
  }

  async hint(options: CredentialHintOptions, timeoutMs?: number):
      Promise<Credential> {
    this.checkNotDisposed();
    let request = new HintRequest(this.frameManager, this.channel);
    return request.dispatch(options);
  }

  async retrieve(options: CredentialRequestOptions): Promise<Credential> {
    this.checkNotDisposed();
    if (this.wrapBrowser) {
      return this.retrieveUsingBrowser(options);
    } else {
      return this.retrieveUsingChannel(options);
    }
  }

  private async retrieveUsingBrowser(options: CredentialRequestOptions):
      Promise<Credential> {
    // TODO: implement
    return Promise.reject('not implemented');
  }

  private retrieveUsingChannel(options: CredentialRequestOptions):
      Promise<Credential> {
    let request = new CredentialRequest(this.frameManager, this.channel);
    return request.dispatch(options);
  }

  async save(credential: Credential): Promise<void> {
    this.checkNotDisposed();
    if (this.wrapBrowser) {
      this.saveUsingBrowser(credential);
    } else {
      this.saveUsingChannel(credential);
    }
  }

  private async saveUsingBrowser(credential: Credential) {
    // TODO: implement
    return Promise.reject('not implemented');
  }

  private async saveUsingChannel(credential: Credential) {
    let request = new CredentialSave(this.frameManager, this.channel);
    return request.dispatch(credential);
  }

  async disableAutoSignIn(): Promise<void> {
    this.checkNotDisposed();
    if (this.wrapBrowser) {
      this.disableAutoSignInUsingBrowser();
    } else {
      this.disableAutoSignInUsingChannel();
    }
    return null;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.channel.dispose();
    this.frameManager.dispose();
  }

  private checkNotDisposed() {
    if (this.disposed) {
      throw OpenYoloError.clientDisposed();
    }
  }

  private async disableAutoSignInUsingBrowser() {
    Promise.reject('not implemented');
  }

  private async disableAutoSignInUsingChannel() {
    Promise.reject('not implemented');
  }

  async proxyLogin(credential: Credential): Promise<ProxyLoginResponse> {
    if (this.wrapBrowser) {
      this.proxyLoginUsingBrowser();
    } else {
      return this.proxyLoginUsingChannel(credential);
    }
  }

  private async proxyLoginUsingBrowser() {
    return Promise.reject('not implemented');
  }

  private async proxyLoginUsingChannel(credential: Credential) {
    let request = new ProxyLogin(this.frameManager, this.channel);
    return request.dispatch(credential);
  }
}

export interface OnDemandOpenYoloApi extends OpenYoloApi {
  setProviderUrlBase(providerUrlBase: string): void;
  setRenderMode(renderMode: string): void;
  reset(): void;
}

/**
 * Wraps a promise for a CredentialsApiImpl, which is initialized on the first
 * usage of the API. This allows an implementation of CredentialsApi to be
 * directly exported from the module as a constant, without triggering
 * immediate instantiation when the module is loaded.
 */
class InitializeOnDemandApi implements OnDemandOpenYoloApi {
  private providerUrlBase: string = 'https://provider.openyolo.org';
  private implPromise: Promise<OpenYoloApiImpl> = null;
  private renderMode: RenderMode|null = null;

  constructor() {
    // register the handler for ping verification automatically on module load
    respondToHandshake(window);
  }

  setProviderUrlBase(providerUrlBase: string) {
    this.providerUrlBase = providerUrlBase;
    this.reset();
  }

  setRenderMode(renderMode: RenderMode|null) {
    this.renderMode = renderMode;
    this.reset();
  }

  reset() {
    if (!this.implPromise) {
      return;
    }

    let promise = this.implPromise;
    this.implPromise = null;

    promise.then((impl: OpenYoloApiImpl) => {
      impl.dispose();
    });
  }

  private init(preloadRequest?: PreloadRequest) {
    if (!this.implPromise) {
      this.implPromise = OpenYoloApiImpl.create(
          this.providerUrlBase, this.renderMode, preloadRequest);
    }
    return this.implPromise;
  }

  async hintsAvailable(options: CredentialHintOptions): Promise<boolean> {
    return (await this.init()).hintsAvailable(options);
  }

  async hint(options: CredentialHintOptions): Promise<Credential> {
    return (await this.init({type: PRELOAD_REQUEST.hint, options}))
        .hint(options);
  }

  async retrieve(options: CredentialRequestOptions): Promise<Credential> {
    return (await this.init({type: PRELOAD_REQUEST.retrieve, options}))
        .retrieve(options);
  }

  async save(credential: Credential): Promise<void> {
    return (await this.init()).save(credential);
  }

  async disableAutoSignIn(): Promise<void> {
    return (await this.init()).disableAutoSignIn();
  }

  async proxyLogin(credential: Credential): Promise<ProxyLoginResponse> {
    return (await this.init()).proxyLogin(credential);
  }
}

export const openyolo: OnDemandOpenYoloApi = new InitializeOnDemandApi();
