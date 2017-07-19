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

/* Internal, detailed, error codes. */
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
  unknownError = 'unknownError'
}

/* Exposed error types meant for apps to trigger different flows. */
export enum ExposedErrorType {
  initializationError = 'initializationError',
  configurationError = 'configurationError',
  userCanceled = 'userCanceled',
  noCredentialsAvailable = 'noCredentialsAvailable',
  operationCanceled = 'operationCanceled',
  clientDisposed = 'clientDisposed',
  requestFailed = 'requestFailed',
  unknownError = 'unknownError'
}

/**
 * Data containing additional information on the error, used only in the
 * provider frame.
 */
export interface OYErrorData {
  /** Standardized error code. */
  code: InternalErrorCode;
  /** Type of the corresponding exposed error. */
  exposedErrorType: ExposedErrorType;
  /** Developer visible and non sensitive error message. */
  message: string;
  /** Additional, potentially sensitive, information. */
  additionalInformation?: {[key in string]: string};
}

/**
 * Data containing additional information on the error, stripped of potentially
 * sensitive data. It is the interface of the object sent through the
 * SecureChannel to the client.
 */
export interface OYExposedErrorData {
  /** Standardized exposed error type. */
  type: ExposedErrorType;
  /**
   * Developer visible and non sensitive error message. It will contain the
   * InternalErrorCode for easier reference: `${code}: ${message}`.
   */
  message: string;
}

/**
 * Internal error.
 */
export class OYInternalError extends Error {
  constructor(public data: OYErrorData) {
    super(data.message);
  }

  /** Returns the client-side exposed error. */
  toExposedErrorData(): OYExposedErrorData {
    return {
      type: this.data.exposedErrorType,
      message: `${this.data.code}: ${this.data.message}`
    };
  }

  /* Initialization errors. */

  static ackTimeout() {
    return new OYInternalError({
      code: InternalErrorCode.ackTimeout,
      exposedErrorType: ExposedErrorType.initializationError,
      message: 'A parent frame failed to acknowledge the handshake. This can ' +
          'be due, in nested context, to the absence of the handshake ' +
          'responder library.'
    });
  }

  static establishSecureChannelTimeout() {
    return new OYInternalError({
      code: InternalErrorCode.establishSecureChannelTimeout,
      exposedErrorType: ExposedErrorType.initializationError,
      message: 'The Secure Channel failed to initialize in a timely manner. ' +
          'This can be due to network latency or a wrong configuration.'
    });
  }

  static parentVerifyTimeout() {
    return new OYInternalError({
      code: InternalErrorCode.parentVerifyTimeout,
      exposedErrorType: ExposedErrorType.initializationError,
      message: 'The credentials provider frame failed to verify the ancestor ' +
          'frames in a timely manner.'
    });
  }

  static illegalStateError(reason: string) {
    return new OYInternalError({
      code: InternalErrorCode.illegalStateError,
      exposedErrorType: ExposedErrorType.initializationError,
      message: `An internal error happened: ${reason}`
    });
  }

  static providerInitializationFailed() {
    return new OYInternalError({
      code: InternalErrorCode.providerInitializationFailed,
      exposedErrorType: ExposedErrorType.initializationError,
      message: 'The credentials provider frame failed to verify the ancestor ' +
          'frames in a timely manner.'
    });
  }

  static apiDisabled() {
    return new OYInternalError({
      code: InternalErrorCode.apiDisabled,
      exposedErrorType: ExposedErrorType.initializationError,
      message:
          'The API has been disabled by the user’s preference or has not been' +
          'enabled in the OpenYolo configuration.'
    });
  }

  /* Configuration errors. */

  static untrustedOrigin(origin: string) {
    return new OYInternalError({
      code: InternalErrorCode.untrustedOrigin,
      exposedErrorType: ExposedErrorType.configurationError,
      message: `A parent frame does not belong to an authorized origin. ` +
          `Ensure the configuration of OpenYolo contains '${origin}'.`
    });
  }

  static parentIsNotRoot() {
    return new OYInternalError({
      code: InternalErrorCode.parentIsNotRoot,
      exposedErrorType: ExposedErrorType.configurationError,
      message:
          `The caller window is an IFrame which is not authorized in OpenYolo` +
          `configuration.`
    });
  }

  /* Flow errors. */

  static userCanceled() {
    return new OYInternalError({
      code: InternalErrorCode.userCanceled,
      exposedErrorType: ExposedErrorType.userCanceled,
      message: 'The user canceled the operation.'
    });
  }

  static noCredentialsAvailable() {
    return new OYInternalError({
      code: InternalErrorCode.noCredentialsAvailable,
      exposedErrorType: ExposedErrorType.noCredentialsAvailable,
      message: 'No credential is available for the current user.'
    });
  }

  static operationCanceled() {
    return new OYInternalError({
      code: InternalErrorCode.operationCanceled,
      exposedErrorType: ExposedErrorType.operationCanceled,
      message: 'The operation was canceled.'
    });
  }

  static clientDisposed() {
    return new OYInternalError({
      code: InternalErrorCode.clientDisposed,
      exposedErrorType: ExposedErrorType.clientDisposed,
      message: 'The API has been disposed from the current context.'
    });
  }

  /* Request errors. */

  static requestFailed(message: string) {
    return new OYInternalError({
      code: InternalErrorCode.requestFailed,
      exposedErrorType: ExposedErrorType.requestFailed,
      message: `The API request failed to resolve: ${message}`
    });
  }

  static requestTimeout() {
    return new OYInternalError({
      code: InternalErrorCode.requestTimeout,
      exposedErrorType: ExposedErrorType.requestFailed,
      message: 'The API request timed out.'
    });
  }

  static illegalConcurrentRequestError() {
    return new OYInternalError({
      code: InternalErrorCode.illegalConcurrentRequest,
      exposedErrorType: ExposedErrorType.requestFailed,
      message:
          'The request could not be resolved because another operation is ' +
          'currently pending.'
    });
  }

  static unknownRequest(requestType: string) {
    return new OYInternalError({
      code: InternalErrorCode.unknownRequest,
      exposedErrorType: ExposedErrorType.requestFailed,
      message: `The '${requestType}' request sent could not be handled by the` +
          `credentials provider.`
    });
  }

  static unknownError() {
    return new OYInternalError({
      code: InternalErrorCode.unknownError,
      exposedErrorType: ExposedErrorType.unknownError,
      message: `Unkown error.`
    });
  }

  static errorIs(err: any, code: InternalErrorCode) {
    // Force comparability for the purposes of this dynamic check.
    if ('data' in err) {
      return err['data']['code'] === code;
    }

    return false;
  }
}

/**
 * Client side exposed error type.
 */
export declare interface OYExposedError extends Error {
  /** Name of the error, to differentiate from ‘Error’. */
  name: string;  // = ‘OpenYoloError’.
  /** Standardized error type. */
  type: ExposedErrorType;
  /**
   * Developer visible and non sensitive error message. It will contain the
   * InternalErrorCode for easier reference: `${code}: ${message}`.
   */
  message: string;
}

export class OYExposedError extends Error {
  constructor(message: string, public type: ExposedErrorType) {
    super(message);
    this.name = 'OpenYoloError';
  }

  toData(): OYExposedErrorData {
    return {message: this.message, type: this.type};
  }

  static fromData(data: OYExposedErrorData): OYExposedError {
    return new OYExposedError(data.message, data.type);
  }
}
