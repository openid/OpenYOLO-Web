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

import {strEnum} from './enums';
import {OpenYoloErrorData, OpenYoloExtendedError} from './errors';
import {isNonEmptyString, isValidError} from './validators';

/**
 * Top-level message envelope types defined for OpenYOLO:
 *
 * - ack: sent by the recipientof a message to its original sender to
 *     acknowledge it has been received.
 * - verifyPing: sent by the provider frame to every ancestor frame for origin
 *     verification.
 * - verifyAck: sent by ancestor frames to the provider farme in response to a
 *     ping.
 * - readyForConnect: sent by the provider frame to the parent frame to
 *     indicate it is ready to accept requests.
 * - channelError: sent when establishing the message channel fails.
 */
export const POST_MESSAGE_TYPES = strEnum(
    'ack',
    'verifyPing',
    'verifyAck',
    'readyForConnect',
    'channelConnect',
    'channelReady',
    'channelError');

export type PostMessageType = keyof typeof POST_MESSAGE_TYPES;

export interface PostMessage<T extends PostMessageType> {
  type: T;
  data: PostMessageDataType<T>;
}

/**
 * A map of message types to their data payload types.
 */
export type PostMessageDataTypes = {
  'ack': string,
  'readyForConnect': string,
  'verifyPing': string,
  'verifyAck': string,
  'channelReady': string,
  'channelConnect': string,
  'channelError': OpenYoloErrorData
};

export type PostMessageDataType<K extends PostMessageType> =
    PostMessageDataTypes[K];

export const POST_MESSAGE_DATA_VALIDATORS:
    {[K in PostMessageType]: (value: any) => boolean} = {
      'ack': isNonEmptyString,
      'verifyPing': isNonEmptyString,
      'verifyAck': isNonEmptyString,
      'readyForConnect': isNonEmptyString,
      'channelConnect': isNonEmptyString,
      'channelReady': isNonEmptyString,
      'channelError': isValidError
    };

export function postMessage<T extends PostMessageType>(
    type: T, data: PostMessageDataType<T>): PostMessage<T> {
  return {type, data};
}

export function ackMessage(id: string) {
  return postMessage(POST_MESSAGE_TYPES.ack, id);
}

export function verifyPingMessage(nonce: string) {
  return postMessage(POST_MESSAGE_TYPES.verifyPing, nonce);
}

export function verifyAckMessage(nonce: string) {
  return postMessage(POST_MESSAGE_TYPES.verifyAck, nonce);
}

export function channelReadyMessage(nonce: string) {
  return postMessage(POST_MESSAGE_TYPES.channelReady, nonce);
}

export function channelErrorMessage(error: OpenYoloExtendedError) {
  return postMessage(POST_MESSAGE_TYPES.channelError, error.data);
}

export function readyForConnectMessage(nonce: string) {
  return postMessage(POST_MESSAGE_TYPES.readyForConnect, nonce);
}

export function channelConnectMessage(nonce: string) {
  return postMessage(POST_MESSAGE_TYPES.channelConnect, nonce);
}
