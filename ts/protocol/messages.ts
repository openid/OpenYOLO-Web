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

import {POST_MESSAGE_DATA_VALIDATORS, PostMessageData, PostMessageType} from './post_messages';
import {RPC_MESSAGE_DATA_VALIDATORS, RpcMessageData, RpcMessageType} from './rpc_messages';

export type MessageType = PostMessageType | RpcMessageType;

export type MessageData<T extends MessageType> =
    PostMessageData<T&PostMessageType>| RpcMessageData<T&RpcMessageType>;

export interface Message<T extends MessageType> {
  type: T;
  data: MessageData<T>;
}

export function isOpenYoloMessageFormat(msgData: any) {
  return !!msgData && typeof msgData === 'object' && 'type' in msgData &&
      'data' in msgData;
}

export const MESSAGE_DATA_VALIDATORS:
    {[K in MessageType]: (data: any) => boolean} = {
      ...POST_MESSAGE_DATA_VALIDATORS,
      ...RPC_MESSAGE_DATA_VALIDATORS
    };
