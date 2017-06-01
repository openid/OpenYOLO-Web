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

import {AUTHENTICATION_METHODS, Credential as OpenYoloCredential, CredentialHintOptions, CredentialRequestOptions as OpenYoloCredentialRequestOptions, ProxyLoginResponse} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';

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
  let authMethod = credential.type === 'federated' ?
      (credential as FederatedCredential).provider :
      AUTHENTICATION_METHODS.ID_AND_PASSWORD;

  let convertedCredential: OpenYoloCredential = {
    id: credential.id,
    authMethod: authMethod,
    displayName: credential.name || undefined,
    profilePicture: credential.iconURL || undefined,
    // navigator.credentials do not pass the password directly, so proxyLogin
    // has to be used.
    proxiedAuthRequired: credential.type === 'password'
  };

  return convertedCredential;
}

/**
 * Convert Open Yolo Credential to navigator.credentials Credential.
 */
function convertCredentialFromOpenYolo(credential: OpenYoloCredential):
    Credential {
  if (credential.authMethod === AUTHENTICATION_METHODS.ID_AND_PASSWORD) {
    let convertedCredential = new PasswordCredential({
      id: credential.id,
      type: 'password',
      name: credential.displayName,
      iconURL: credential.profilePicture,
      password: credential.password
    } as PasswordCredentialData);
    return convertedCredential;
  } else {
    let convertedCredential = new FederatedCredential({
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
 * Wrapper of navigator.credentials exposing the same API than OpenYolo.
 *
 * TODO(tch): wrap navigator.credentials errors in OpenYolo errors.
 */
export class NavigatorCredentials implements OpenYoloApi {
  private credentialsMap: CredentialsMap = new CredentialsMap();

  constructor(private cmApi: CredentialsContainer) {}

  disableAutoSignIn(): Promise<void> {
    return this.cmApi.requireUserMediation();
  }

  retrieve(options?: OpenYoloCredentialRequestOptions):
      Promise<OpenYoloCredential> {
    let convertedOptions = convertRequestOptions(options);
    return this.cmApi.get(convertedOptions).then((cred) => {
      if (!cred) return;
      this.credentialsMap.insert(cred);
      return convertCredentialToOpenYolo(
          cred as FederatedCredential | PasswordCredential);
    });
  }

  save(credential: OpenYoloCredential): Promise<void> {
    let convertedCredential = convertCredentialFromOpenYolo(credential);
    return this.cmApi.store(convertedCredential).then((cred) => {
      // Return nothing as per OpenYolo specs.
      return;
    });
  }

  hint(options?: CredentialHintOptions): Promise<OpenYoloCredential> {
    // Reject with a canceled error as no hints can be retrieved.
    return Promise.reject(OpenYoloError.canceled());
  }

  hintsAvailable(): Promise<boolean> {
    return Promise.resolve(false);
  }

  proxyLogin(credential: OpenYoloCredential): Promise<ProxyLoginResponse> {
    // TODO(tch): Fetch the URL from configuration.
    let url = `${window.location.protocol}//${window.location.host}/signin`;
    const cred = this.credentialsMap.retrieve(
        CredentialsMap.getKeyFromOpenYoloCredential(credential));
    if (!cred || cred.type !== 'password') {
      return Promise.reject(new Error('Invalid credential!'));
    }

    return new Promise<ProxyLoginResponse>((resolve, reject) => {
      fetch(url, {method: 'POST', credentials: cred}).then(resp => {
        if (resp.status !== 200) {
          reject(
              OpenYoloError.requestFailed(`Error: status code ${resp.status}`));
        }
        resp.text().then(responseText => {
          resolve({statusCode: resp.status, responseText: responseText});
        });
      });
    });
  }
}
