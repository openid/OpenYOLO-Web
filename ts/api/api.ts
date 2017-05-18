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
import {PRELOAD_REQUEST, PreloadRequest} from '../protocol/preload_request';
import {SecureChannel} from '../protocol/secure_channel';
import {generateId, sha256} from '../protocol/utils';

import {CredentialRequest} from './credential_request';
import {CredentialSave} from './credential_save';
import {HintAvailableRequest} from './hint_available_request';
import {HintRequest} from './hint_request';
import {ProviderFrameElement} from './provider_frame_elem';
import {ProxyLogin} from './proxy_login';
import {respondToHandshake} from './verify';
import {WrapBrowserRequest} from './wrap_browser_request';

// re-export all the data types
export * from '../protocol/data';
export {OpenYoloError, ERROR_TYPES} from '../protocol/errors';

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
 * Defines the different timeouts for every request.
 */
const DEFAULT_TIMEOUTS: {[key: string]: number} = {
  credentialRequest: 3000,
  credentialSave: 3000,
  hintAvailableRequest: 1000,
  hintRequest: 3000,
  proxyLogin: 10000,
  wrapBrowserRequest: 1000
};

/**
 * Sanitzes the input for renderMode, selecting the default one if invalid.
 */
function verifyOrDetectRenderMode(renderMode?: RenderMode): RenderMode {
  if (renderMode in RENDER_MODES) {
    return renderMode;
  }
  const isNested = window.parent !== window;
  if (isNested) {
    return RENDER_MODES.fullScreen;
  }
  const isMobile = navigator.userAgent.match(MOBILE_USER_AGENT_REGEX);
  if (isMobile) {
    return RENDER_MODES.bottomSheet;
  } else {
    return RENDER_MODES.navPopout;
  }
}

/**
 * Provides access to the user's preferred credential provider, in order to
 * retrieve credentials.
 */
class OpenYoloApiImpl implements OpenYoloApi {
  static async create(
      providerUrlBase: string,
      renderMode?: RenderMode,
      areTimeoutsDisabled?: boolean,
      preloadRequest?: PreloadRequest): Promise<OpenYoloApiImpl> {
    // Sanitize input.
    renderMode = verifyOrDetectRenderMode(renderMode);

    const instanceId = generateId();
    const instanceIdHash = await sha256(instanceId);
    const frameManager = new ProviderFrameElement(
        document,
        instanceIdHash,
        window.location.origin,
        renderMode,
        providerUrlBase,
        preloadRequest);

    let channel: SecureChannel|null = null;
    if (areTimeoutsDisabled) {
      channel = await SecureChannel.clientConnectNoTimeout(
          window, frameManager.getContentWindow(), instanceId, instanceIdHash);
    } else {
      channel = await SecureChannel.clientConnect(
          window, frameManager.getContentWindow(), instanceId, instanceIdHash);
    }

    // Check whether the client should wrap the browser's navigator.credentials.
    const request = new WrapBrowserRequest(frameManager, channel);
    const timeoutMs =
        areTimeoutsDisabled ? undefined : DEFAULT_TIMEOUTS.wrapBrowserRequest;
    const wrapBrowser =
        await request.dispatch(undefined, timeoutMs).catch((error) => {
          // Ignore errors.
          return false;
        });

    return new OpenYoloApiImpl(
        frameManager, channel, wrapBrowser, areTimeoutsDisabled);
  }

  private disposed: boolean = false;

  constructor(
      private frameManager: ProviderFrameElement,
      private channel: SecureChannel,
      private wrapBrowser: boolean,
      private areTimeoutsDisabled: boolean) {}

  async hintsAvailable(options: CredentialHintOptions): Promise<boolean> {
    this.checkNotDisposed();
    const request = new HintAvailableRequest(this.frameManager, this.channel);
    const timeoutMs = this.areTimeoutsDisabled ?
        undefined :
        DEFAULT_TIMEOUTS.hintAvailableRequest;
    return request.dispatch(options, timeoutMs).catch((error) => {
      // Ignore errors.
      return false;
    });
  }

  async hint(options: CredentialHintOptions): Promise<Credential> {
    this.checkNotDisposed();
    const request = new HintRequest(this.frameManager, this.channel);
    const timeoutMs =
        this.areTimeoutsDisabled ? undefined : DEFAULT_TIMEOUTS.hintRequest;
    return request.dispatch(options, timeoutMs);
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
    const request = new CredentialRequest(this.frameManager, this.channel);
    const timeoutMs = this.areTimeoutsDisabled ?
        undefined :
        DEFAULT_TIMEOUTS.credentialRequest;
    return request.dispatch(options, timeoutMs);
  }

  async save(credential: Credential): Promise<void> {
    this.checkNotDisposed();
    if (this.wrapBrowser) {
      return this.saveUsingBrowser(credential);
    } else {
      return this.saveUsingChannel(credential);
    }
  }

  private async saveUsingBrowser(credential: Credential) {
    // TODO: implement
    return Promise.reject('not implemented');
  }

  private async saveUsingChannel(credential: Credential) {
    let request = new CredentialSave(this.frameManager, this.channel);
    const timeoutMs =
        this.areTimeoutsDisabled ? undefined : DEFAULT_TIMEOUTS.credentialSave;
    return request.dispatch(credential, timeoutMs);
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
    const timeoutMs =
        this.areTimeoutsDisabled ? undefined : DEFAULT_TIMEOUTS.proxyLogin;
    return request.dispatch(credential, timeoutMs);
  }
}

export interface OnDemandOpenYoloApi extends OpenYoloApi {
  setProviderUrlBase(providerUrlBase: string): void;
  setRenderMode(renderMode: string): void;
  setTimeoutsEnabled(enable: boolean): void;
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
  private areTimeoutsDisabled: boolean = false;

  constructor() {
    // Register the handler for ping verification automatically on module load.
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

  setTimeoutsEnabled(enable: boolean) {
    this.areTimeoutsDisabled = !enable;
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
          this.providerUrlBase,
          this.renderMode,
          this.areTimeoutsDisabled,
          preloadRequest);
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

// Export the public methods.
const windowAsAny = window as any;
windowAsAny['openyolo'] = openyolo;
InitializeOnDemandApi.prototype['setProviderUrlBase'] =
    InitializeOnDemandApi.prototype.setProviderUrlBase;
InitializeOnDemandApi.prototype['setRenderMode'] =
    InitializeOnDemandApi.prototype.setRenderMode;
InitializeOnDemandApi.prototype['hintsAvailable'] =
    InitializeOnDemandApi.prototype.hintsAvailable;
InitializeOnDemandApi.prototype['hint'] = InitializeOnDemandApi.prototype.hint;
InitializeOnDemandApi.prototype['retrieve'] =
    InitializeOnDemandApi.prototype.retrieve;
InitializeOnDemandApi.prototype['save'] = InitializeOnDemandApi.prototype.save;
InitializeOnDemandApi.prototype['disableAutoSignIn'] =
    InitializeOnDemandApi.prototype.disableAutoSignIn;
InitializeOnDemandApi.prototype['proxyLogin'] =
    InitializeOnDemandApi.prototype.proxyLogin;