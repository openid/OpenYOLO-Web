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

import {WindowLike} from '../protocol/comms';
import {Message, MessageType} from '../protocol/messages';

/**
 * Creates a fake message event. This doesn't actually have all the properties
 * that a real message event has, but it defines all the properties we actually
 * use.
 */
export function createMessageEvent<T extends MessageType>(
    data: Message<T>,
    origin?: string,
    ports?: MessagePort[],
    source?: WindowLike): MessageEvent {
  let fakeMessage = {type: 'message', data, origin, source, ports};
  return (fakeMessage as MessageEvent);
}

/**
 * Creates a fake message event, where the data can be anything. Useful for
 * testing message validators, otherwise use createMessageEvent.
 */
export function createUntypedMessageEvent(
    data: any, origin?: string, source?: WindowLike, ports?: MessagePort[]) {
  let fakeMessage = {type: 'message', data, origin, source, ports};
  return (fakeMessage as MessageEvent);
}
