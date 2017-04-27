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

export const ERROR_TYPES = strEnum(
    'ackTimeout',
    'canceled',
    'clientDisposed',
    'handshakeFailed',
    'invalidCredential',
    'invalidData',
    'iframeError',
    'invalidOrigin',
    'untrustedOrigin',
    'requestFailed',
    'requestTimeout',
    'illegalState',
    'illegalConcurrentRequest',
    'establishSecureChannelTimeout',
    'unknownRequest',
    'apiDisabled',
    'parentVerifyTimeout',
    'parentIsNotRoot',
    'providerInitFailed',
    'unknown');

export type ErrorType = keyof typeof ERROR_TYPES;

export interface OpenYoloErrorData {
  code: ErrorType;
  message: string;
  info?: {[key: string]: string};
}

export interface OpenYoloExtendedError extends Error {
  data: OpenYoloErrorData;
}

export class OpenYoloError {
  static ackTimeout() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.ackTimeout,
      message: 'Message acknowledgement timed out.'
    });
  }

  static canceled() {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.canceled, message: 'User canceled'});
  }

  static clientDisposed() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.clientDisposed,
      message: 'Client is disposed and no longer usable'
    });
  }

  static handshake(reason: string) {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.handshakeFailed, message: reason});
  }

  static invalidCredential() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.invalidCredential,
      message: 'The provided credential is invalid'
    });
  }

  static invalidData() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.invalidData,
      message: 'Message contained invalid data'
    });
  }

  static iframe(cause: string) {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.iframeError, message: `IFrame error: ${cause}`});
  }

  static untrustedOrigin(origin: string) {
    return OpenYoloError.createError({
      code: ERROR_TYPES.untrustedOrigin,
      message: `Untrusted origin: ${origin}`
    });
  }

  static requestFailed(message: string) {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.requestFailed, message});
  }

  static requestTimeout() {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.requestTimeout, message: 'Request timed out'});
  }

  static illegalStateError(reason: string) {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.illegalState, message: reason});
  }

  static illegalConcurrentRequestError() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.illegalConcurrentRequest,
      message: 'Concurrent requests are not permitted'
    });
  }

  static establishSecureChannelTimeout() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.establishSecureChannelTimeout,
      message: 'SecureConnection establishment timed out'
    });
  }

  static unknownRequest(requestType: string) {
    return OpenYoloError.createError({
      code: ERROR_TYPES.unknownRequest,
      message: `Unknown request type ${requestType}`
    });
  }

  static apiDisabled() {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.apiDisabled, message: 'API is disabled'});
  }

  static unknown() {
    return OpenYoloError.createError(
        {code: ERROR_TYPES.unknown, message: 'Unknown error'});
  }

  static ancestorVerifyTimeout() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.parentVerifyTimeout,
      message: `Frame ancestor origin verification timed out`
    });
  }

  static parentIsNotRoot() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.parentIsNotRoot,
      message: `Parent frame is not a root window`
    });
  }

  static providerInitFailed() {
    return OpenYoloError.createError({
      code: ERROR_TYPES.providerInitFailed,
      message: `Provider failed to initialize`
    });
  }

  static createError(errorData: OpenYoloErrorData): OpenYoloExtendedError {
    let err = (new Error(errorData.message) as any);
    err.data = errorData;
    return err;
  }

  static errorIs<T extends ErrorType>(err: any, code: T) {
    // force comparability for the purposes of this dynamic check
    if ('data' in err) {
      return err['data']['code'] === code;
    }

    return false;
  }
}
