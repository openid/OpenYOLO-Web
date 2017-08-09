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

import {isOpenYoloMessageFormat, Message, MESSAGE_DATA_VALIDATORS, MessageData, MessageType} from './messages';
import {PostMessageData, PostMessageType} from './post_messages';
import {RpcMessageData, RpcMessageType} from './rpc_messages';

/**
 * Interface exposing only the required properties and methods of the Window
 * object that this library uses. Useful to test the logic without having to
 * handle real Window objects.
 */
export interface WindowLike extends EventTarget {
  parent: WindowLike;
  opener: WindowLike|null;
  close(): void;
  postMessage(data: any, targetOrigin: string, transfer?: MessagePort[]): void;
}

/**
 * Sends a message to the specified target frame, optionally restricting
 * delivery to the specified target origin.
 */
export function sendMessage<T extends PostMessageType>(
    target: WindowLike, message: Message<T>, targetOrigin?: string): void {
  target.postMessage(message, targetOrigin || '*');
}

/**
 * Determines whether the specified origin is part of the set of permitted
 * origins.
 */
export function isPermittedOrigin(
    origin: string, permittedOrigins: string[]): boolean {
  return permittedOrigins.indexOf(origin) !== -1;
}

export type PostMessageListener<T extends PostMessageType> =
    (data: PostMessageData<T>, type: T, event: MessageEvent) => void;

export type RpcMessageListener<T extends RpcMessageType> =
    (data: RpcMessageData<T>, type: T, event: MessageEvent) => void;

export type MessageListener<T extends MessageType> =
    (data: MessageData<T>, type: T, event: MessageEvent) => void;

export type FilteringEventListener = (ev: MessageEvent) => boolean;

/**
 * Returns an EventListener that captures and validates OpenYOLO messages
 * of a specific type, before
 * before passing them on to a provided handler.
 */
export function createMessageListener<T extends MessageType>(
    type: T, listener: MessageListener<T>): FilteringEventListener {
  let messageListener = (ev: MessageEvent) => {
    if (!isOpenYoloMessageFormat(ev.data)) {
      return false;
    }
    if (ev.data['type'] !== type) return false;

    let validator = MESSAGE_DATA_VALIDATORS[(type as MessageType)];
    if (!validator(ev.data['data'])) {
      return false;
    }
    listener(ev.data['data'], ev.data['type'], ev);
    return true;
  };

  messageListener.toString = () => `${type} message listener`;
  return messageListener;
}

export interface TypedMessageEvent<T extends MessageType> extends MessageEvent {
  data: MessageData<T>;
}

export type MessageEventListener<T extends MessageType> =
    (ev: TypedMessageEvent<T>) => void;
