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
import {Credential, CredentialHintOptions} from '../protocol/data';
import {DisplayOptions} from '../protocol/rpc_messages';

/**
 * The collection of all configuration and necessary dependencies for an
 * OpenYOLO provider frame using the base reference implementation in
 * ProviderFrame.
 */
export interface ProviderConfiguration {
  /**
   * The authentication domain of the client that is interacting with this
   * provider instance.
   */
  clientAuthDomain: string;

  /**
   * The nonce that was supplied by the client, used to establish the message
   * channel.
   */
  clientNonce: string;

  /**
   * A pointer to the user agent window object. Included here for testability.
   */
  window: WindowLike;

  /**
   * Whether the client should use the browser credential management API
   * for core operations, instead of this frame. This setting is not typically
   * client-specific, and is usually determined either by the type of
   * user agent, or by global user / provider settings.
   */
  delegateToBrowser: boolean;

  affiliationProvider: AffiliationProvider;
  clientConfigurationProvider: ClientConfigurationProvider;
  credentialDataProvider: CredentialDataProvider;
  interactionProvider: InteractionProvider;
  localStateProvider: LocalStateProvider;

  /**
   * Whether direct authentication, passing the full credential including
   * plain-text secrets to the client, is permitted by this provider.
   */
  allowDirectAuth: boolean;
}

/**
 * Interface exposing only the required properties and methods for the purpose
 * of the frame provider. Useful to test the logic without having to handle real
 * Window objects.
 */
export interface WindowLike extends EventTarget {
  parent: WindowLike;
  opener: WindowLike|null;
  close(): void;
  postMessage(data: any, targetOrigin: string, transfer?: MessagePort[]): void;
}

/**
 * A service which is able to provide an equivalence class of authentication
 * domains.
 */
export interface AffiliationProvider {
  getEquivalentDomains(authDomain: string): Promise<string[]>;
}

/**
 * A service which is able to provide the OpenYOLO configuration
 * for an OpenYOLO client.
 */
export interface ClientConfigurationProvider {
  /**
   * Returns the client configuration for the specified domain, if available.
   */
  getConfiguration(authDomain: string): Promise<PrimaryClientConfiguration>;
}

/**
 * The data layer of a credential provider, which is wrapped by a
 * `CredentialManager`.
 */
export interface CredentialDataProvider {
  /**
   * Retrieves all hint credentials, based upon the provided options.
   */
  getAllHints(options: CredentialHintOptions): Promise<Credential[]>;

  /**
   * Retrieves all credentials for the specified authentication domains
   * (derived from the request) and the specified request options.
   */
  getAllCredentials(authDomains: string[], options: CredentialRequestOptions):
      Promise<Credential[]>;

  /**
   * Creates or updates an existing credential. If the credential cannot be
   * created or updated, the promise should be rejected.
   */
  upsertCredential(credential: Credential, original?: Credential):
      Promise<Credential>;

  /**
   * Deletes the provided credential from the store. If delete is not
   * permitted for this credential, the returned promise will be rejected.
   */
  deleteCredential(credential: Credential): Promise<void>;
}

export interface DisplayCallbacks {
  requestDisplayOptions(options: DisplayOptions): void;
}

/**
 * Controls the rendering of user interfaces into the iframe.
 */
export interface InteractionProvider {
  /**
   * Requests the display of a credential picker containing the provided list
   * of credentials. The promise should resolve with the selected credential,
   * or reject if the action is cancelled or fails for any reason.
   */
  showCredentialPicker(
      credentials: Credential[],
      options: CredentialRequestOptions,
      displayCallbacks: DisplayCallbacks): Promise<Credential>;

  /**
   * Requests the display of a hint picker containing the provided list of
   * hints. If the user successfully selects a hints, the
   * returned promise should resolve with that credential. If the user does
   * not select a credential, the promise should be rejected.
   */
  showHintPicker(
      hints: Credential[],
      options: CredentialHintOptions,
      displayCallbacks: DisplayCallbacks): Promise<Credential>;

  /**
   * Requests the display of a confirmation screen, allowing the user to
   * choose whether to save the provided credential. The returned promise
   * should resolve {@code true} if the user consents to saving the
   * credential, false otherwise.
   */
  showSaveConfirmation(
      credential: Credential,
      displayCallbacks: DisplayCallbacks): Promise<boolean>;

  /**
   * Requests the immediate tear down of any presently active UI.
   */
  dispose(): void;
}

/**
 * Provides a means of storing OpenYOLO provider state that typically only
 * applies to the current user agent.
 */
export interface LocalStateProvider {
  /**
   * Determines whether auto sign-in should be permitted for the specified
   * origin.
   */
  isAutoSignInEnabled(authDomain: string): Promise<boolean>;

  /**
   * Stores whether auto sign-in should be permitted for the provided set of
   * authentication domains. This setting should persist long-term in the
   * context of this user agent, but should not typically be synchronized
   * across multiple devices for the same user.
   */
  setAutoSignInEnabled(authDomain: string, enabled: boolean): Promise<void>;

  /**
   * Holds the provided credential for the duration of the current
   * browser session. The credential can later be retrieved by providing
   * the same authentication domain to {@link #getRetainedCredential}.
   * If a credential is already stored under that authentication domain, it
   * should be discarded and replaced. The credential should be retained on a
   * timescale equivalent to what sessionStorage provides - not permanent, but
   * able to survive page turns / reinstantiation of the provider frame.
   */
  retainCredentialForSession(authDomain: string, credential: Credential):
      Promise<void>;

  /**
   * Retrieves a retained credential for the specified authentication domain
   * that was stored by {@link #retainCredentialForSession}. If no
   * credential is stored for the provided authentication domain, the promise
   * should be rejected.
   *
   * Returned credentials should be immediately discarded by the implementation
   * of this interface, such that subsequent calls to this method for the same
   * domain would also return a rejected promise.
   */
  getRetainedCredential(authDomain: string): Promise<Credential>;
}
