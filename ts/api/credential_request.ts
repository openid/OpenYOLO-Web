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

import {Credential, CredentialRequestOptions} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';
import {retrieveMessage, RPC_MESSAGE_TYPES} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

const TIMEOUT_MS = 5000;

/**
 * Handles the get credential request, by displaying the IFrame or not to let
 * the user selects a credential, if any is available.
 */
export class CredentialRequest extends
    BaseRequest<Credential, CredentialRequestOptions|undefined> {
  /**
   * Starts the Credential Request flow.
   */
  dispatch(options?: CredentialRequestOptions): Promise<Credential> {
    // the final outcome will either be a credential, or a notification that
    // none are available / none was selected by the user.
    this.registerHandler(
        RPC_MESSAGE_TYPES.credential,
        (credential: Credential) => this.handleResult(credential));
    this.registerHandler(RPC_MESSAGE_TYPES.none, () => this.handleResult(null));

    // start our timeout, to ensure that if the provider takes too long to
    // provide an initial response, that we do not indefinitely block the
    // caller.
    this.setAndRegisterTimeout(() => {
      this.reject(OpenYoloError.requestTimeout());
      this.dispose();
    }, TIMEOUT_MS);

    // send the request
    this.channel.send(retrieveMessage(this.id, options));
    return this.getPromise();
  }

  /**
   * Handles the initial response from a credential request.
   */
  private handleResult(credential: Credential): void {
    this.clearTimeouts();
    this.resolve(credential);
    this.dispose();
  }
}
