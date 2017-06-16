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

import {Credential, CredentialHintOptions, CredentialRequestOptions, ProxyLoginResponse} from './data';
import {map2Enum} from './enums';
import {OpenYoloErrorData, OpenYoloExtendedError} from './errors';
import {isBoolean, isUndefined, isValidCredential, isValidDisplayOptions, isValidError, isValidHintOptions, isValidProxyLoginResponse, isValidRequestOptions} from './validators';

export const RPC_MESSAGE_TYPES = map2Enum({
  disableAutoSignIn: 'disableAutoSignIn',
  disableAutoSignInResult: 'disableAutoSignInResult',
  retrieve: 'retrieve',
  hintAvailable: 'hintAvailable',
  hintAvailableResult: 'hintAvailableResult',
  hint: 'hint',
  save: 'save',
  saveResult: 'saveResult',
  proxy: 'proxy',
  proxyResult: 'proxyResult',
  wrapBrowser: 'wrapBrowser',
  wrapBrowserResult: 'wrapBrowserResult',
  showProvider: 'showProvider',
  none: 'none',
  credential: 'credential',
  error: 'error'
});

export type RpcMessageType = keyof typeof RPC_MESSAGE_TYPES;

export interface RpcMessage<T extends RpcMessageType> {
  type: T;
  data: RpcMessageData<T>;
}

export type RpcMessageArgumentTypes = {
  'disableAutoSignIn': undefined,
  'disableAutoSignInResult': undefined,
  'retrieve': CredentialRequestOptions,
  'hintAvailable': CredentialHintOptions,
  'hintAvailableResult': boolean,
  'hint': CredentialHintOptions,
  'save': Credential,
  'saveResult': boolean,
  'proxy': Credential,
  'proxyResult': ProxyLoginResponse,
  'showProvider': DisplayOptions,
  'wrapBrowser': undefined,
  'wrapBrowserResult': boolean,
  'none': undefined,
  'credential': Credential,
  'error': OpenYoloErrorData
};

export type RpcMessageArgumentType<T extends RpcMessageType> =
    RpcMessageArgumentTypes[T];

export interface RpcMessageData<T extends RpcMessageType> {
  id: string;
  ack: boolean;
  args: RpcMessageArgumentTypes[T];
}

export type RpcMessageDataTypes = {
  [K in RpcMessageType]: RpcMessageData<K>
};

export interface CredentialResponseData { credential: Credential; }

export interface ErrorMessageData { error: OpenYoloErrorData; }

export interface DisplayOptions {
  height?: number;
  width?: number;
}

function rpcDataValidator(dataValidator: (data: any) => boolean) {
  return (data: any): boolean => {
    return !!data && typeof data === 'object' && 'id' in data &&
        typeof data['id'] === 'string' && dataValidator(data['args']);
  };
}

export const RPC_MESSAGE_DATA_VALIDATORS:
    {[K in RpcMessageType]: (data: any) => boolean} = {
      'disableAutoSignIn': rpcDataValidator(isUndefined),
      'disableAutoSignInResult': rpcDataValidator(isUndefined),
      'retrieve': rpcDataValidator(isValidRequestOptions),
      'hintAvailable': rpcDataValidator(isValidHintOptions),
      'hintAvailableResult': rpcDataValidator(isBoolean),
      'hint': rpcDataValidator(isValidHintOptions),
      'save': rpcDataValidator(isValidCredential),
      'saveResult': rpcDataValidator(isBoolean),
      'proxy': rpcDataValidator(isValidCredential),
      'proxyResult': rpcDataValidator(isValidProxyLoginResponse),
      'wrapBrowser': rpcDataValidator(isUndefined),
      'wrapBrowserResult': rpcDataValidator(isBoolean),
      'showProvider': rpcDataValidator(isValidDisplayOptions),
      'none': rpcDataValidator(isUndefined),
      'credential': rpcDataValidator(isValidCredential),
      'error': rpcDataValidator(isValidError)
    };

/* ****************************************************************************/
/* ************************ MESSAGE CREATION FUNCTIONS ************************/
/* ****************************************************************************/

export function rpcMessage<T extends RpcMessageType>(
    type: T, id: string, args: RpcMessageArgumentTypes[T]): RpcMessage<T> {
  return {type, data: {id, args, ack: false}};
}

export function disableAutoSignInMessage(id: string) {
  return rpcMessage(RPC_MESSAGE_TYPES.disableAutoSignIn, id, undefined);
}

export function disableAutoSignInResultMessage(id: string) {
  return rpcMessage(RPC_MESSAGE_TYPES.disableAutoSignInResult, id, undefined);
}

export function retrieveMessage(id: string, options: CredentialRequestOptions) {
  return rpcMessage(RPC_MESSAGE_TYPES.retrieve, id, options);
}

export function hintAvailableMessage(
    id: string, options: CredentialHintOptions) {
  return rpcMessage(RPC_MESSAGE_TYPES.hintAvailable, id, options);
}

export function hintAvailableResponseMessage(id: string, available: boolean) {
  return rpcMessage(RPC_MESSAGE_TYPES.hintAvailableResult, id, available);
}

export function hintMessage(id: string, options: CredentialHintOptions) {
  return rpcMessage(RPC_MESSAGE_TYPES.hint, id, options);
}

export function proxyLoginMessage(id: string, credential: Credential) {
  return rpcMessage(RPC_MESSAGE_TYPES.proxy, id, credential);
}

export function proxyLoginResponseMessage(
    id: string, response: ProxyLoginResponse) {
  return rpcMessage(RPC_MESSAGE_TYPES.proxyResult, id, response);
}

export function wrapBrowserMessage(id: string) {
  return rpcMessage(RPC_MESSAGE_TYPES.wrapBrowser, id, undefined);
}

export function wrapBrowserResultMessage(id: string, wrapBrowser: boolean) {
  console.log(`wrapBrowserResult ${id} ${wrapBrowser}`);
  return rpcMessage(RPC_MESSAGE_TYPES.wrapBrowserResult, id, wrapBrowser);
}

export function noneAvailableMessage(id: string) {
  return rpcMessage(RPC_MESSAGE_TYPES.none, id, undefined);
}

export function credentialResultMessage(id: string, credential: Credential) {
  return rpcMessage(RPC_MESSAGE_TYPES.credential, id, credential);
}

export function showProviderMessage(id: string, options: DisplayOptions) {
  return rpcMessage(RPC_MESSAGE_TYPES.showProvider, id, options);
}

export function saveMessage(id: string, credential: Credential) {
  return rpcMessage(RPC_MESSAGE_TYPES.save, id, credential);
}

export function saveResultMessage(id: string, saved: boolean) {
  return rpcMessage(RPC_MESSAGE_TYPES.saveResult, id, saved);
}

export function errorMessage(id: string, error: OpenYoloExtendedError) {
  return rpcMessage(RPC_MESSAGE_TYPES.error, id, error.data);
}
