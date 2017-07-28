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

import {OpenYoloError, OpenYoloExposedErrorData} from './errors';
import {DataValidator, isNonEmptyString, isValidError} from './validators';

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
export const enum PostMessageType {
  ack = 'ack',
  verifyPing = 'verifyPing',
  verifyAck = 'verifyAck',
  readyForConnect = 'readyForConnect',
  channelConnect = 'channelConnect',
  channelReady = 'channelReady',
  channelError = 'channelError'
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
  // Ensure only exposable data is sent through the message channel.
  'channelError': OpenYoloExposedErrorData
};

export type PostMessageData<T extends PostMessageType> =
    PostMessageDataTypes[T];

export interface PostMessage<T extends PostMessageType> {
  type: T;
  data: PostMessageDataTypes[T];
}

export const POST_MESSAGE_DATA_VALIDATORS:
    {[K in PostMessageType]: DataValidator} = {
      'ack': isNonEmptyString,
      'verifyPing': isNonEmptyString,
      'verifyAck': isNonEmptyString,
      'readyForConnect': isNonEmptyString,
      'channelConnect': isNonEmptyString,
      'channelReady': isNonEmptyString,
      'channelError': isValidError
    };

export function postMessage<T extends PostMessageType>(
    type: T, data: PostMessageDataTypes[T]): PostMessage<T> {
  return {type, data};
}

export function ackMessage(id: string) {
  return postMessage(PostMessageType.ack, id);
}

export function verifyPingMessage(nonce: string) {
  return postMessage(PostMessageType.verifyPing, nonce);
}

export function verifyAckMessage(nonce: string) {
  return postMessage(PostMessageType.verifyAck, nonce);
}

export function channelReadyMessage(nonce: string) {
  return postMessage(PostMessageType.channelReady, nonce);
}

export function channelErrorMessage(error: OpenYoloError) {
  return postMessage(PostMessageType.channelError, error.toData());
}

export function readyForConnectMessage(nonce: string) {
  return postMessage(PostMessageType.readyForConnect, nonce);
}

export function channelConnectMessage(nonce: string) {
  return postMessage(PostMessageType.channelConnect, nonce);
}
