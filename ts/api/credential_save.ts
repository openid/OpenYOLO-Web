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

import {Credential} from '../protocol/data';
import {OpenYoloError} from '../protocol/errors';
import {RPC_MESSAGE_TYPES, saveMessage} from '../protocol/rpc_messages';

import {BaseRequest} from './base_request';

export class CredentialSave extends BaseRequest<void, Credential> {
  dispatchInternal(credential: Credential): Promise<void> {
    this.registerHandler(RPC_MESSAGE_TYPES.saveResult, (saved: boolean) => {
      if (saved) {
        this.resolve();
      } else {
        this.reject(OpenYoloError.canceled());
      }
      this.dispose();
    });

    this.channel.send(saveMessage(this.id, credential));
    return this.getPromise();
  }
}
