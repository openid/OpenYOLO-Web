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

import {OYCredential, OYCredentialHintOptions, OYCredentialRequestOptions, OYProxyLoginResponse} from '../protocol/data';
import {RenderMode} from '../protocol/data';
import {OYInternalError} from '../protocol/errors';
import {PreloadRequest, PreloadRequestType} from '../protocol/preload_request';
import {SecureChannel} from '../protocol/secure_channel';
import {generateId, sha256, startTimeoutRacer, TimeoutRacer} from '../protocol/utils';

import {CancelLastOperationRequest} from './cancel_last_operation_request';
import {CredentialRequest} from './credential_request';
import {CredentialSave} from './credential_save';
import {DisableAutoSignIn} from './disable_auto_sign_in';
import {HintAvailableRequest} from './hint_available_request';
import {HintRequest} from './hint_request';
import {ProviderFrameElement} from './provider_frame_elem';
import {ProxyLogin} from './proxy_login';
import {respondToHandshake} from './verify';
import {WrapBrowserRequest} from './wrap_browser_request';

// re-export all the data types
export * from '../protocol/data';
export {OYInternalError, InternalErrorCode} from '../protocol/errors';

const MOBILE_USER_AGENT_REGEX = /android|iphone|ipod|iemobile/i;

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
  hintsAvailable(options: OYCredentialHintOptions): Promise<boolean>;

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
  hint(options: OYCredentialHintOptions): Promise<OYCredential|null>;

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
  retrieve(options: OYCredentialRequestOptions): Promise<OYCredential|null>;

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
  save(credential: OYCredential): Promise<void>;

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
  proxyLogin(credential: OYCredential): Promise<OYProxyLoginResponse>;

  /**
   * Cancels the last pending OpenYOLO request.
   */
  cancelLastOperation(): Promise<void>;
}

/**
 * A variant of the OpenYoloApi interface, with support for operation timeouts.
 */
export interface OpenYoloWithTimeoutApi {
  hintsAvailable(options: OYCredentialHintOptions, timeoutRacer: TimeoutRacer):
      Promise<boolean>;
  hint(options: OYCredentialHintOptions, timeoutRacer: TimeoutRacer):
      Promise<OYCredential|null>;
  retrieve(options: OYCredentialRequestOptions, timeoutRacer: TimeoutRacer):
      Promise<OYCredential|null>;
  save(credential: OYCredential, timeoutRacer: TimeoutRacer): Promise<void>;
  disableAutoSignIn(timeoutRacer: TimeoutRacer): Promise<void>;
  proxyLogin(credential: OYCredential, timeoutRacer: TimeoutRacer):
      Promise<OYProxyLoginResponse>;
  cancelLastOperation(timeoutRacer: TimeoutRacer): Promise<void>;
  dispose(): Promise<void>;
}

type OpenYoloApiMethods = keyof OpenYoloApi;

/**
 * Defines the different timeouts for every request.
 */
const DEFAULT_TIMEOUTS: {[key in OpenYoloApiMethods]: number} = {
  retrieve: 3000,
  save: 3000,
  disableAutoSignIn: 3000,
  hintsAvailable: 3000,
  hint: 3000,
  proxyLogin: 10000,
  cancelLastOperation: 3000
};

/**
 * Sanitzes the input for renderMode, selecting the default one if invalid.
 */
function verifyOrDetectRenderMode(renderMode: RenderMode|null): RenderMode {
  if (renderMode && renderMode in RenderMode) {
    return renderMode;
  }
  const isNested = window.parent !== window;
  if (isNested) {
    return RenderMode.fullScreen;
  }
  const isMobile = navigator.userAgent.match(MOBILE_USER_AGENT_REGEX);
  if (isMobile) {
    return RenderMode.bottomSheet;
  } else {
    return RenderMode.navPopout;
  }
}

/**
 * OpenYolo implementation using the browser navigator.credentials.
 * TODO: Implement.
 */
class OpenYoloBrowserApiImpl implements OpenYoloWithTimeoutApi {
  async retrieve(
      options: OYCredentialRequestOptions,
      timeoutRacer: TimeoutRacer): Promise<OYCredential|null> {
    return Promise.reject('not implemented');
  }

  async hintsAvailable(
      options: OYCredentialRequestOptions,
      timeoutRacer: TimeoutRacer): Promise<boolean> {
    return Promise.reject('not implemented');
  }

  async hint(options: OYCredentialRequestOptions, timeoutRacer: TimeoutRacer):
      Promise<OYCredential|null> {
    return Promise.reject('not implemented');
  }

  async disableAutoSignIn(timeoutRacer: TimeoutRacer): Promise<void> {
    return Promise.reject('not implemented');
  }

  async save(credential: OYCredential, timeoutRacer: TimeoutRacer):
      Promise<void> {
    return Promise.reject('not implemented');
  }

  async proxyLogin(credential: OYCredential, timeoutRacer: TimeoutRacer):
      Promise<OYProxyLoginResponse> {
    return Promise.reject('not implemented');
  }

  async cancelLastOperation(timeoutRacer: TimeoutRacer): Promise<void> {
    return Promise.reject('not implemented');
  }

  async dispose(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Provides access to the user's preferred credential provider, in order to
 * retrieve credentials.
 */
class OpenYoloApiImpl implements OpenYoloWithTimeoutApi {
  private disposed: boolean = false;

  constructor(
      private frameManager: ProviderFrameElement,
      private channel: SecureChannel) {}

  async hintsAvailable(
      options: OYCredentialHintOptions,
      timeoutRacer: TimeoutRacer): Promise<boolean> {
    this.checkNotDisposed();
    const request = new HintAvailableRequest(this.frameManager, this.channel);
    try {
      return await request.dispatch(options, timeoutRacer);
    } catch (e) {
      console.log(`Hint available request failed: ${e.message}`);
      return false;
    }
  }

  async hint(options: OYCredentialHintOptions, timeoutRacer: TimeoutRacer):
      Promise<OYCredential|null> {
    this.checkNotDisposed();
    const request = new HintRequest(this.frameManager, this.channel);
    return await request.dispatch(options, timeoutRacer);
  }

  async retrieve(
      options: OYCredentialRequestOptions,
      timeoutRacer: TimeoutRacer): Promise<OYCredential|null> {
    this.checkNotDisposed();
    const request = new CredentialRequest(this.frameManager, this.channel);
    return await request.dispatch(options, timeoutRacer);
  }

  async save(credential: OYCredential, timeoutRacer: TimeoutRacer) {
    this.checkNotDisposed();
    const request = new CredentialSave(this.frameManager, this.channel);
    return await request.dispatch(credential, timeoutRacer);
  }

  async proxyLogin(credential: OYCredential, timeoutRacer: TimeoutRacer):
      Promise<OYProxyLoginResponse> {
    this.checkNotDisposed();
    const request = new ProxyLogin(this.frameManager, this.channel);
    return await request.dispatch(credential, timeoutRacer);
  }

  async disableAutoSignIn(timeoutRacer: TimeoutRacer) {
    this.checkNotDisposed();
    const request = new DisableAutoSignIn(this.frameManager, this.channel);
    return await request.dispatch(undefined, timeoutRacer);
  }

  async cancelLastOperation(timeoutRacer: TimeoutRacer) {
    this.checkNotDisposed();
    const request =
        new CancelLastOperationRequest(this.frameManager, this.channel);
    return await request.dispatch(undefined, timeoutRacer);
  }

  dispose(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    this.channel.dispose();
    this.frameManager.dispose();
    return Promise.resolve();
  }

  private checkNotDisposed() {
    if (this.disposed) {
      throw OYInternalError.clientDisposed().toExposedError();
    }
  }
}

export interface OnDemandOpenYoloApi extends OpenYoloApi {
  /**
   * Sets the provider URL.
   */
  setProviderUrlBase(providerUrlBase: string): void;
  /**
   * Sets the render mode, or null if the default one should be used.
   */
  setRenderMode(renderMode: RenderMode|null): void;
  /**
   * Sets a custom timeouts, or 0 to disable timeouts.
   */
  setTimeouts(timeoutMs: number|null): void;
  /**
   * Resets the current instantiation of the API.
   */
  reset(): void;
}

/**
 * Wraps a promise for a CredentialsApiImpl, which is initialized on the first
 * usage of the API. This allows an implementation of CredentialsApi to be
 * directly exported from the module as a constant, without triggering
 * immediate instantiation when the module is loaded.
 */
export class InitializeOnDemandApi implements OnDemandOpenYoloApi {
  private providerUrlBase: string = 'https://provider.openyolo.org';
  private implPromise: Promise<OpenYoloWithTimeoutApi>|null = null;
  private renderMode: RenderMode|null = null;
  /**
   * Custom timeouts defined by the client. When null, the predefined timeouts
   * are used.
   */
  private customTimeoutsMs: number|null = null;

  constructor() {
    // Register the handler for ping verification automatically on module load.
    respondToHandshake(window);
  }

  /**
   * Create the open yolo API based on the parameters given. It will always open
   * the provider page to check the user's configuration, and initialize the
   * correct implementation of OpenYolo based on the result.
   */
  static async createOpenYoloApi(
      timeoutRacer: TimeoutRacer,
      providerUrlBase: string,
      renderMode: RenderMode|null,
      preloadRequest?: PreloadRequest): Promise<OpenYoloWithTimeoutApi> {
    try {
      // Sanitize input.
      renderMode = verifyOrDetectRenderMode(renderMode);

      const instanceId = generateId();
      const instanceIdHash = await timeoutRacer.race(sha256(instanceId));
      const frameManager = new ProviderFrameElement(
          document,
          instanceIdHash,
          window.location.origin,
          renderMode,
          providerUrlBase,
          preloadRequest);

      const channel = await timeoutRacer.race(SecureChannel.clientConnect(
          window, frameManager.getContentWindow(), instanceId, instanceIdHash));

      // Check whether the client should wrap the browser's
      // navigator.credentials.
      const request = new WrapBrowserRequest(frameManager, channel);
      let wrapBrowser = false;
      try {
        wrapBrowser = await request.dispatch(undefined, timeoutRacer);
      } catch (e) {
        // Default to false if request fails.
        // It also ignores timeout errors, as the initialization is actually
        // complete so even if this operation fails, the next could succeed
        // without reloading the IFrame.
      }

      if (wrapBrowser) {
        return new OpenYoloBrowserApiImpl();
      }
      return new OpenYoloApiImpl(frameManager, channel);
    } catch (e) {
      timeoutRacer.rethrowUnlessTimeoutError(e);
      // Convert the timeout error.
      throw OYInternalError.requestTimeout().toExposedError();
    }
  }

  setProviderUrlBase(providerUrlBase: string) {
    this.providerUrlBase = providerUrlBase;
    this.reset();
  }

  setRenderMode(renderMode: RenderMode|null) {
    this.renderMode = renderMode;
    this.reset();
  }

  /**
   * Sets a global custom timeouts that will wrap every request.
   * @param timeoutMs Custom timeout, in milliseconds.
   */
  setTimeouts(timeoutMs: number|null) {
    if (timeoutMs === null) {
      this.customTimeoutsMs = null;
      this.reset();
      return;
    }
    // Perform sanitization on the developer provided value.
    if (typeof timeoutMs !== 'number' || timeoutMs < 0) {
      throw new Error(
          'Invalid timeout. It must be a number greater than or equal to 0. ' +
          'Setting it to 0 disable timeouts.');
    }
    // Only trigger reset if the setting changes and goes to disabling timeout,
    // this is meant to retry without timeout a potentially failed
    // initialization.
    const shouldReset = this.customTimeoutsMs !== timeoutMs && timeoutMs === 0;
    this.customTimeoutsMs = timeoutMs;
    if (shouldReset) {
      this.reset();
    }
  }

  reset() {
    if (!this.implPromise) {
      return;
    }

    let promise = this.implPromise;
    this.implPromise = null;

    promise.then((impl) => {
      impl.dispose();
    });
  }

  private init(timeoutRacer: TimeoutRacer, preloadRequest?: PreloadRequest):
      Promise<OpenYoloWithTimeoutApi> {
    if (!this.implPromise) {
      this.implPromise = InitializeOnDemandApi.createOpenYoloApi(
          timeoutRacer, this.providerUrlBase, this.renderMode, preloadRequest);
    }
    this.implPromise.catch((e) => {
      // If the initialization failed, reset so the next call could work.
      this.reset();
    });
    return this.implPromise;
  }

  private startCustomTimeoutRacer(defaultTimeoutMs: number): TimeoutRacer {
    return startTimeoutRacer(
        this.customTimeoutsMs !== null ? this.customTimeoutsMs :
                                         defaultTimeoutMs);
  }

  async hintsAvailable(options: OYCredentialHintOptions): Promise<boolean> {
    const timeoutRacer =
        this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.hintsAvailable);
    const impl = await this.init(timeoutRacer);
    return await impl.hintsAvailable(options, timeoutRacer);
  }

  async hint(options: OYCredentialHintOptions): Promise<OYCredential|null> {
    const preloadRequest = {type: PreloadRequestType.hint, options};
    const timeoutRacer = this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.hint);
    const impl = await this.init(timeoutRacer, preloadRequest);
    return await impl.hint(options, timeoutRacer);
  }

  async retrieve(options: OYCredentialRequestOptions):
      Promise<OYCredential|null> {
    const preloadRequest = {type: PreloadRequestType.retrieve, options};
    const timeoutRacer =
        this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.retrieve);
    const impl = await this.init(timeoutRacer, preloadRequest);
    return impl.retrieve(options, timeoutRacer);
  }

  async save(credential: OYCredential): Promise<void> {
    const timeoutRacer = this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.save);
    const impl = await this.init(timeoutRacer);
    return impl.save(credential, timeoutRacer);
  }

  async disableAutoSignIn(): Promise<void> {
    const timeoutRacer =
        this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.disableAutoSignIn);
    const impl = await this.init(timeoutRacer);
    return impl.disableAutoSignIn(timeoutRacer);
  }

  async proxyLogin(credential: OYCredential): Promise<OYProxyLoginResponse> {
    const timeoutRacer =
        this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.proxyLogin);
    const impl = await this.init(timeoutRacer);
    return impl.proxyLogin(credential, timeoutRacer);
  }

  async cancelLastOperation(): Promise<void> {
    const timeoutRacer =
        this.startCustomTimeoutRacer(DEFAULT_TIMEOUTS.cancelLastOperation);
    const impl = await this.init(timeoutRacer);
    return impl.cancelLastOperation(timeoutRacer);
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
InitializeOnDemandApi.prototype['setTimeouts'] =
    InitializeOnDemandApi.prototype.setTimeouts;
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
InitializeOnDemandApi.prototype['cancelLastOperation'] =
    InitializeOnDemandApi.prototype.cancelLastOperation;
