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

import {OYCredential, OYProxyLoginResponse} from '../protocol/data';
import {proxyLoginMessage, RpcMessageType} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

/**
 * Handles the proxy login.
 */
export class ProxyLogin extends
    BaseRequest<OYProxyLoginResponse, OYCredential> {
  /**
   * Starts the Proxy Login flow.
   */
  dispatchInternal(credential: OYCredential) {
    this.registerHandler(
        RpcMessageType.proxyResult, (response: OYProxyLoginResponse) => {
          this.resolve(response);
          this.dispose();
        });

    this.channel.send(proxyLoginMessage(this.id, credential));
  }
}
