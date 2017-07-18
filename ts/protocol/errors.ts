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

export enum InternalErrorCode {
  ackTimeout = 'ackTimeout',
  establishSecureChannelTimeout = 'establishSecureChannelTimeout',
  parentVerifyTimeout = 'parentVerifyTimeout',
  illegalStateError = 'illegalStateError',
  providerInitializationFailed = 'providerInitializationFailed',
  apiDisabled = 'apiDisabled',
  untrustedOrigin = 'untrustedOrigin',
  parentIsNotRoot = 'parentIsNotRoot',
  userCanceled = 'userCanceled',
  noCredentialsAvailable = 'noCredentialsAvailable',
  operationCanceled = 'operationCanceled',
  clientDisposed = 'clientDisposed',
  requestFailed = 'requestFailed',
  requestTimeout = 'requestTimeout',
  illegalConcurrentRequest = 'illegalConcurrentRequest',
  unknownRequest = 'unknownRequest',
  unknown = 'unknown'
}

export interface OpenYoloErrorData {
  code: InternalErrorCode;
  message: string;
  info?: {[key: string]: string};
}

export interface OpenYoloExtendedError extends Error {
  data: OpenYoloErrorData;
}

export class OpenYoloError {
  static ackTimeout() {
    return OpenYoloError.createError({
      code: InternalErrorCode.ackTimeout,
      message: 'Message acknowledgement timed out.'
    });
  }

  static canceled() {
    return OpenYoloError.createError(
        {code: InternalErrorCode.userCanceled, message: 'User canceled'});
  }

  static clientCancelled() {
    return OpenYoloError.createError({
      code: InternalErrorCode.operationCanceled,
      message: 'Operation cancelled'
    });
  }

  static clientDisposed() {
    return OpenYoloError.createError({
      code: InternalErrorCode.clientDisposed,
      message: 'Client is disposed and no longer usable'
    });
  }

  static untrustedOrigin(origin: string) {
    return OpenYoloError.createError({
      code: InternalErrorCode.untrustedOrigin,
      message: `Untrusted origin: ${origin}`
    });
  }

  static requestFailed(message: string) {
    return OpenYoloError.createError(
        {code: InternalErrorCode.requestFailed, message});
  }

  static requestTimeout() {
    return OpenYoloError.createError(
        {code: InternalErrorCode.requestTimeout, message: 'Request timed out'});
  }

  static illegalStateError(reason: string) {
    return OpenYoloError.createError(
        {code: InternalErrorCode.illegalStateError, message: reason});
  }

  static illegalConcurrentRequestError() {
    return OpenYoloError.createError({
      code: InternalErrorCode.illegalConcurrentRequest,
      message: 'Concurrent requests are not permitted'
    });
  }

  static establishSecureChannelTimeout() {
    return OpenYoloError.createError({
      code: InternalErrorCode.establishSecureChannelTimeout,
      message: 'SecureConnection establishment timed out'
    });
  }

  static unknownRequest(requestType: string) {
    return OpenYoloError.createError({
      code: InternalErrorCode.unknownRequest,
      message: `Unknown request type ${requestType}`
    });
  }

  static apiDisabled() {
    return OpenYoloError.createError(
        {code: InternalErrorCode.apiDisabled, message: 'API is disabled'});
  }

  static ancestorVerifyTimeout() {
    return OpenYoloError.createError({
      code: InternalErrorCode.parentVerifyTimeout,
      message: `Frame ancestor origin verification timed out`
    });
  }

  static parentIsNotRoot() {
    return OpenYoloError.createError({
      code: InternalErrorCode.parentIsNotRoot,
      message: `Parent frame is not a root window`
    });
  }

  static providerInitFailed() {
    return OpenYoloError.createError({
      code: InternalErrorCode.providerInitializationFailed,
      message: `Provider failed to initialize`
    });
  }

  static unknown() {
    return OpenYoloError.createError(
        {code: InternalErrorCode.unknown, message: `Unkown error.`});
  }

  static createError(errorData: OpenYoloErrorData): OpenYoloExtendedError {
    let err = (new Error(errorData.message) as any);
    err.data = errorData;
    return err;
  }

  static errorIs(err: any, code: InternalErrorCode) {
    // force comparability for the purposes of this dynamic check
    if ('data' in err) {
      return err['data']['code'] === code;
    }

    return false;
  }
}
