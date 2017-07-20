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

import {OpenYoloCredentialHintOptions} from '../protocol/data';
import {hintAvailableMessage, RpcMessageType} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

/**
 * Handles the check for whether hints are available or not. It does not require
 * any user interaction, and if fails, just return as if there was no hints.
 */
export class HintAvailableRequest extends
    BaseRequest<boolean, OpenYoloCredentialHintOptions> {
  /**
   * Sends the RPC to the IFrame and waits for the result.
   */
  dispatchInternal(options: OpenYoloCredentialHintOptions) {
    this.registerHandler(
        RpcMessageType.hintAvailableResult, (available: boolean) => {
          this.resolve(available);
          this.dispose();
        });

    this.channel.send(hintAvailableMessage(this.id, options));
  }
}
