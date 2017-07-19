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

import {OYCredential, OYCredentialHintOptions, OYCredentialRequestOptions, OYProxyLoginResponse} from './data';
import {OpenYoloError, OYExposedErrorData} from './errors';
import {DataValidator, isBoolean, isUndefined, isValidCredential, isValidDisplayOptions, isValidError, isValidHintOptions, isValidProxyLoginResponse, isValidRequestOptions} from './validators';

export enum RpcMessageType {
  disableAutoSignIn = 'disableAutoSignIn',
  disableAutoSignInResult = 'disableAutoSignInResult',
  retrieve = 'retrieve',
  hintAvailable = 'hintAvailable',
  hintAvailableResult = 'hintAvailableResult',
  hint = 'hint',
  save = 'save',
  saveResult = 'saveResult',
  proxy = 'proxy',
  proxyResult = 'proxyResult',
  wrapBrowser = 'wrapBrowser',
  wrapBrowserResult = 'wrapBrowserResult',
  showProvider = 'showProvider',
  none = 'none',
  credential = 'credential',
  error = 'error',
  cancelLastOperation = 'cancelLastOperation',
  cancelLastOperationResult = 'cancelLastOperationResult'
}

export type RpcMessageArgumentTypes = {
  'disableAutoSignIn': undefined,
  'disableAutoSignInResult': undefined,
  'retrieve': OYCredentialRequestOptions,
  'hintAvailable': OYCredentialHintOptions,
  'hintAvailableResult': boolean,
  'hint': OYCredentialHintOptions,
  'save': OYCredential,
  'saveResult': boolean,
  'proxy': OYCredential,
  'proxyResult': OYProxyLoginResponse,
  'showProvider': DisplayOptions,
  'wrapBrowser': undefined,
  'wrapBrowserResult': boolean,
  'none': undefined,
  'credential': OYCredential,
  'error': OYExposedErrorData,
  'cancelLastOperation': undefined,
  'cancelLastOperationResult': undefined
};

export interface RpcMessageData<T extends RpcMessageType> {
  id: string;
  ack: boolean;
  args: RpcMessageArgumentTypes[T];
}

export interface RpcMessage<T extends RpcMessageType> {
  type: T;
  data: RpcMessageData<T>;
}

function rpcDataValidator(dataValidator: DataValidator): DataValidator {
  return (data: any): boolean => {
    return !!data && typeof data === 'object' && 'id' in data &&
        typeof data['id'] === 'string' && dataValidator(data['args']);
  };
}

// It is required to provide such index signature to enforce the type of the map
// association.
export type RpcMessageDataValidators = {
  [K in RpcMessageType]: DataValidator
} & {[key: string]: DataValidator};

export const RPC_MESSAGE_DATA_VALIDATORS: RpcMessageDataValidators = {
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
  'error': rpcDataValidator(isValidError),
  'cancelLastOperation': rpcDataValidator(isUndefined),
  'cancelLastOperationResult': rpcDataValidator(isUndefined)
};

export interface DisplayOptions {
  height?: number;
  width?: number;
}

/* ****************************************************************************/
/* ************************ MESSAGE CREATION FUNCTIONS ************************/
/* ****************************************************************************/

export function rpcMessage<T extends RpcMessageType>(
    type: T, id: string, args: RpcMessageArgumentTypes[T]): RpcMessage<T> {
  return {type, data: {id, args, ack: false}};
}

export function disableAutoSignInMessage(id: string) {
  return rpcMessage(RpcMessageType.disableAutoSignIn, id, undefined);
}

export function disableAutoSignInResultMessage(id: string) {
  return rpcMessage(RpcMessageType.disableAutoSignInResult, id, undefined);
}

export function retrieveMessage(
    id: string, options: OYCredentialRequestOptions) {
  return rpcMessage(RpcMessageType.retrieve, id, options);
}

export function hintAvailableMessage(
    id: string, options: OYCredentialHintOptions) {
  return rpcMessage(RpcMessageType.hintAvailable, id, options);
}

export function hintAvailableResponseMessage(id: string, available: boolean) {
  return rpcMessage(RpcMessageType.hintAvailableResult, id, available);
}

export function hintMessage(id: string, options: OYCredentialHintOptions) {
  return rpcMessage(RpcMessageType.hint, id, options);
}

export function proxyLoginMessage(id: string, credential: OYCredential) {
  return rpcMessage(RpcMessageType.proxy, id, credential);
}

export function proxyLoginResponseMessage(
    id: string, response: OYProxyLoginResponse) {
  return rpcMessage(RpcMessageType.proxyResult, id, response);
}

export function wrapBrowserMessage(id: string) {
  return rpcMessage(RpcMessageType.wrapBrowser, id, undefined);
}

export function wrapBrowserResultMessage(id: string, wrapBrowser: boolean) {
  console.log(`wrapBrowserResult ${id} ${wrapBrowser}`);
  return rpcMessage(RpcMessageType.wrapBrowserResult, id, wrapBrowser);
}

export function noneAvailableMessage(id: string) {
  return rpcMessage(RpcMessageType.none, id, undefined);
}

export function credentialResultMessage(id: string, credential: OYCredential) {
  return rpcMessage(RpcMessageType.credential, id, credential);
}

export function showProviderMessage(id: string, options: DisplayOptions) {
  return rpcMessage(RpcMessageType.showProvider, id, options);
}

export function saveMessage(id: string, credential: OYCredential) {
  return rpcMessage(RpcMessageType.save, id, credential);
}

export function saveResultMessage(id: string, saved: boolean) {
  return rpcMessage(RpcMessageType.saveResult, id, saved);
}

export function errorMessage(id: string, error: OpenYoloError) {
  return rpcMessage(RpcMessageType.error, id, error.toData());
}

export function cancelLastOperationMessage(id: string) {
  return rpcMessage(RpcMessageType.cancelLastOperation, id, undefined);
}

export function cancelLastOperationResultMessage(id: string) {
  return rpcMessage(RpcMessageType.cancelLastOperationResult, id, undefined);
}
