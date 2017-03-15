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

import {RPC_MESSAGE_TYPES, wrapBrowserMessage} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

const DEFAULT_TIMEOUT_MS = 1000;

/**
 * Handles the check for whether hints are available or not. It does not require
 * any user interaction, and if fails, just return as if there was no hints.
 */
export class WrapBrowserRequest extends BaseRequest<boolean, undefined> {
  /**
   * Sends the RPC to the IFrame and waits for the result.
   */
  dispatch(timeoutMs?: number): Promise<boolean> {
    this.registerHandler(
        RPC_MESSAGE_TYPES.wrapBrowserResult, (wrapBrowser: boolean) => {
          this.clearTimeouts();
          this.resolve(wrapBrowser);
          this.dispose();
        });

    this.setAndRegisterTimeout(() => {
      this.resolve(false);
      this.dispose();
    }, (timeoutMs && timeoutMs > 0) ? timeoutMs : DEFAULT_TIMEOUT_MS);

    this.channel.send(wrapBrowserMessage(this.id));
    return this.getPromise();
  }
}
