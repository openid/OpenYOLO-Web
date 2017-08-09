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

import {createMessageListener, FilteringEventListener, sendMessage, WindowLike} from '../protocol/comms';
import {PostMessageType, verifyAckMessage} from '../protocol/post_messages';

let listener: FilteringEventListener;

export function respondToHandshake(window: WindowLike): void {
  if (listener) {
    window.removeEventListener('message', listener);
  }
  listener =
      createMessageListener(PostMessageType.verifyPing, (data, type, ev) => {
        sendMessage(ev.source, verifyAckMessage(data), ev.origin);
      });
  window.addEventListener('message', listener);
}
