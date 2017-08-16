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

import {AUTHENTICATION_METHODS, OpenYoloCredential, OpenYoloCredentialHintOptions, OpenYoloCredentialRequestOptions, OpenYoloProxyLoginResponse} from '../protocol/data';
import {OpenYoloInternalError} from '../protocol/errors';
import {isSecureOrigin} from '../protocol/utils';

import {OpenYoloApi} from './api';

/**
 * Converts Open Yolo request options to the navigator.credentials options.
 */
function convertRequestOptions(options?: OpenYoloCredentialRequestOptions):
    CredentialRequestOptions|undefined {
  if (!options) return;

  // Default options.
  let convertedOptions: CredentialRequestOptions = {
    password: false,
    federated: {providers: [], protocols: []},
    unmediated: false
  };

  // Create a copy of the array.
  let authMethods = options.supportedAuthMethods.slice();
  // Parse the password auth method if present.
  let passwordIndex =
      authMethods.indexOf(AUTHENTICATION_METHODS.ID_AND_PASSWORD);
  if (passwordIndex !== -1) {
    convertedOptions.password = true;
    authMethods.splice(passwordIndex, 1);
  }
  // Pass in the remaining providers options, if any.
  convertedOptions.federated!.providers = authMethods;
  return convertedOptions;
}

/**
 * Convert navigator.credentials Credential to Open Yolo Credential.
 */
function convertCredentialToOpenYolo(credential: PasswordCredential|
                                     FederatedCredential): OpenYoloCredential {
  const authMethod = credential.type === 'federated' ?
      (credential as FederatedCredential).provider :
      AUTHENTICATION_METHODS.ID_AND_PASSWORD;

  const convertedCredential: OpenYoloCredential = {
    id: credential.id,
    authMethod: authMethod,
    displayName: credential.name || undefined,
    profilePicture: credential.iconURL || undefined,
    proxiedAuthRequired: false
  };
  // Chrome M60+ returns the password.
  if (credential instanceof PasswordCredential) {
    convertedCredential.password = credential.password;
  }

  return convertedCredential;
}

/**
 * Convert Open Yolo Credential to navigator.credentials Credential.
 */
function convertCredentialFromOpenYolo(credential: OpenYoloCredential):
    Credential {
  if (credential.authMethod === AUTHENTICATION_METHODS.ID_AND_PASSWORD) {
    const convertedCredential = new PasswordCredential({
      id: credential.id,
      type: 'password',
      name: credential.displayName,
      iconURL: credential.profilePicture,
      password: credential.password
    } as PasswordCredentialData);
    return convertedCredential;
  } else {
    const convertedCredential = new FederatedCredential({
      id: credential.id,
      name: credential.displayName,
      iconURL: credential.profilePicture,
      provider: credential.authMethod
    });
    return convertedCredential;
  }
}

/**
 * Keeps a map of unique key to instances of navigator credentials. This allows
 * to use the proxyLogin method, as the original instance of Credential should
 * be used.
 */
class CredentialsMap {
  private map: {[key: string]: Credential} = {};

  /**
   * Inserts a Credential in the map. Uses `id::type` as uniqueness key.
   * The only case where this uniqueness key could cause issues, is if the user
   * has several PasswordCredentials for the same id (email address), and
   * retrieves several of them before using the proxyLogin with not the last
   * PasswordCredential retrieved.
   */
  insert(credential: Credential): void {
    let key = `${credential.id}::${credential.type}`;
    this.map[key] = credential;
  }

  /**
   * Retrieves the credential in the map corresponding to the key given.
   */
  retrieve(key: string): Credential {
    return this.map[key];
  }

  /**
   * Creates the uniqueness key corresponding to the OpenYolo credential given.
   */
  static getKeyFromOpenYoloCredential(credential: OpenYoloCredential): string {
    let type =
        credential.authMethod === AUTHENTICATION_METHODS.ID_AND_PASSWORD ?
        'password' :
        'federated';
    return `${credential.id}::${type}`;
  }
}

/**
 * A No-Op navigator.credentials wrapper to be used in-lieu of the real one in
 * browsers that don't implement navigator.credentials.
 */
export class NoOpNavigatorCredentials implements OpenYoloApi {
  disableAutoSignIn(): Promise<void> {
    return Promise.resolve();
  }

  async retrieve(options?: OpenYoloCredentialRequestOptions):
      Promise<OpenYoloCredential> {
    throw OpenYoloInternalError.noCredentialsAvailable().toExposedError();
  }

  async save(credential: OpenYoloCredential): Promise<void> {}

  async hint(options?: OpenYoloCredentialHintOptions):
      Promise<OpenYoloCredential> {
    throw OpenYoloInternalError.noCredentialsAvailable().toExposedError();
  }

  async hintsAvailable(): Promise<boolean> {
    return false;
  }

  async cancelLastOperation(): Promise<void> {}

  async proxyLogin(credential: OpenYoloCredential):
      Promise<OpenYoloProxyLoginResponse> {
    throw OpenYoloInternalError
        .requestFailed('Cannot proxy login through the browser.')
        .toExposedError();
  }
}

/**
 * Wrapper of navigator.credentials exposing the same API than OpenYolo.
 *
 * TODO(tch): wrap navigator.credentials errors in OpenYolo errors.
 */
export class NavigatorCredentials implements OpenYoloApi {
  private credentialsMap: CredentialsMap = new CredentialsMap();

  constructor(private cmApi: CredentialsContainer) {}

  async disableAutoSignIn(): Promise<void> {
    try {
      return await this.cmApi.requireUserMediation();
    } catch (e) {
      // Ignore error (i.e. non secure origins for instance).
      return;
    }
  }

  async retrieve(options?: OpenYoloCredentialRequestOptions):
      Promise<OpenYoloCredential> {
    const convertedOptions = convertRequestOptions(options);
    let credential;
    try {
      credential = await this.cmApi.get(convertedOptions);
    } catch (e) {
      throw OpenYoloInternalError.requestFailed('navigator.credentials error')
          .toExposedError();
    }
    if (!credential) {
      // navigator.credentials.get returns null whether the user has canceled or
      // there is no credentials. The user may have canceled, but this error is
      // more developer friendly.
      throw OpenYoloInternalError.noCredentialsAvailable().toExposedError();
    }
    this.credentialsMap.insert(credential);
    return convertCredentialToOpenYolo(
        credential as FederatedCredential | PasswordCredential);
  }

  async save(credential: OpenYoloCredential): Promise<void> {
    const convertedCredential = convertCredentialFromOpenYolo(credential);
    try {
      await this.cmApi.store(convertedCredential);
    } catch (e) {
      throw OpenYoloInternalError.requestFailed('navigator.credentials error')
          .toExposedError();
    }
  }

  async hint(options?: OpenYoloCredentialHintOptions):
      Promise<OpenYoloCredential> {
    throw OpenYoloInternalError.noCredentialsAvailable().toExposedError();
  }

  async hintsAvailable(): Promise<boolean> {
    return false;
  }

  async cancelLastOperation(): Promise<void> {}

  async proxyLogin(credential: OpenYoloCredential):
      Promise<OpenYoloProxyLoginResponse> {
    // TODO(tch): Fetch the URL from configuration.
    const url = `${window.location.protocol}//${window.location.host}/signin`;
    const cred = this.credentialsMap.retrieve(
        CredentialsMap.getKeyFromOpenYoloCredential(credential));
    if (!cred || cred.type !== 'password') {
      throw OpenYoloInternalError.requestFailed('Invalid credential.')
          .toExposedError();
    }

    let resp;
    try {
      resp = await fetch(url, {method: 'POST', credentials: cred});
    } catch (e) {
      throw OpenYoloInternalError.requestFailed(e.message).toExposedError();
    }
    if (resp.status !== 200) {
      throw OpenYoloInternalError.requestFailed(`Status code ${resp.status}`)
          .toExposedError();
    }
    const responseText = await resp.text();
    return {statusCode: resp.status, responseText: responseText};
  }
}

/**
 * Returns the navigator.credentials wrapper according to the environment. If
 * navigator.credentials is not defined, or the current app not on https,
 * it will create a no-op version of the API.
 */
export function createNavigatorCredentialsApi(): OpenYoloApi {
  // As per
  // https://developers.google.com/web/updates/2017/06/credential-management-updates#feature_detection_needs_attention,
  // we check for the presence of preventSilentAccess in navigator.credentials
  // that is a feature of M60+. Previous versions would not release plain-text
  // passwords.
  if (typeof navigator.credentials !== 'undefined' &&
      typeof navigator.credentials.preventSilentAccess === 'function' &&
      isSecureOrigin()) {
    return new NavigatorCredentials(navigator.credentials);
  }
  return new NoOpNavigatorCredentials();
}
