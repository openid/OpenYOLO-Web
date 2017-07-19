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

import {OYCredential, OYCredentialHintOptions} from '../protocol/data';
import {hintMessage, RpcMessageType} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

/**
 * Handles the get hint request, by displaying the IFrame or not to let
 * the user selects a hint, if any is available.
 */
export class HintRequest extends
    BaseRequest<OYCredential|null, OYCredentialHintOptions|undefined> {
  /**
   * Starts the Hint Request flow.
   */
  dispatchInternal(options: OYCredentialHintOptions) {
    this.registerHandler(
        RpcMessageType.credential,
        (credential: OYCredential) => this.handleResult(credential));
    this.registerHandler(RpcMessageType.none, () => this.handleResult(null));

    this.debugLog(`Sending hint request`);
    this.channel.send(hintMessage(this.id, options));
  }

  /**
   * Handles the initial response from a hint request.
   */
  private handleResult(credential: OYCredential|null): void {
    this.debugLog(`Hint request complete`);
    this.resolve(credential);
    this.dispose();
  }
}
