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
export const enum InternalErrorCode {
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
  browserWrappingRequired = 'browserWrappingRequired',
  unknownError = 'unknownError'
}

/* Exposed error types meant for apps to trigger different flows. */
export const enum OpenYoloErrorType {
  initializationError = 'initializationError',
  configurationError = 'configurationError',
  userCanceled = 'userCanceled',
  noCredentialsAvailable = 'noCredentialsAvailable',
  operationCanceled = 'operationCanceled',
  clientDisposed = 'clientDisposed',
  requestFailed = 'requestFailed',
  illegalConcurrentRequest = 'illegalConcurrentRequest',
  browserWrappingRequired = 'browserWrappingRequired',
  unknownError = 'unknownError'
}

/**
 * Data containing additional information on the error, used only in the
 * provider frame.
 */
export interface OpenYoloErrorData {
  /** Standardized error code. */
  code: InternalErrorCode;
  /** Type of the corresponding exposed error. */
  exposedErrorType: OpenYoloErrorType;
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
export interface OpenYoloExposedErrorData {
  /** Standardized exposed error type. */
  type: OpenYoloErrorType;
  /**
   * Developer visible and non sensitive error message. It will contain the
   * InternalErrorCode for easier reference: `${code}: ${message}`.
   */
  message: string;
}

/**
 * It is not possible to subclass Error, Array, Map... in TS anymore. It is
 * recommended to create our own Error classes.
 * https://github.com/Microsoft/TypeScript/issues/13965
 */
export interface CustomError {
  /** Name of the error. */
  name: string;
  /** Message of the error. */
  message: string;
}

/**
 * Internal error.
 */
export class OpenYoloInternalError implements CustomError {
  name = 'OpenYoloInternalError';
  message: string;

  constructor(public data: OpenYoloErrorData) {
    this.message = data.message;
  }

  /** Returns the client-side exposed error. */
  toExposedError(): OpenYoloError {
    return OpenYoloError.fromData(this.toExposedErrorData());
  }

  /** Returns the client-side exposed error data. */
  private toExposedErrorData(): OpenYoloExposedErrorData {
    return {
      type: this.data.exposedErrorType,
      message: `${this.data.code}: ${this.data.message}`
    };
  }

  /* Initialization errors. */

  static ackTimeout() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.ackTimeout,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message: 'A parent frame failed to acknowledge the handshake. This can ' +
          'be due, in nested context, to the absence of the handshake ' +
          'responder library.'
    });
  }

  static establishSecureChannelTimeout() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.establishSecureChannelTimeout,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message: 'The Secure Channel failed to initialize in a timely manner. ' +
          'This can be due to network latency or a wrong configuration.'
    });
  }

  static parentVerifyTimeout() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.parentVerifyTimeout,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message: 'The credentials provider frame failed to verify the ancestor ' +
          'frames in a timely manner.'
    });
  }

  static illegalStateError(reason: string) {
    return new OpenYoloInternalError({
      code: InternalErrorCode.illegalStateError,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message: `An internal error happened: ${reason}`
    });
  }

  static providerInitializationFailed() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.providerInitializationFailed,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message: 'The credentials provider frame failed to initialize.'
    });
  }

  static apiDisabled() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.apiDisabled,
      exposedErrorType: OpenYoloErrorType.initializationError,
      message:
          'The API has been disabled by the user’s preference or has not been' +
          ' enabled in the OpenYolo configuration.'
    });
  }

  /* Configuration errors. */

  static untrustedOrigin(origin: string) {
    return new OpenYoloInternalError({
      code: InternalErrorCode.untrustedOrigin,
      exposedErrorType: OpenYoloErrorType.configurationError,
      message: `A parent frame does not belong to an authorized origin. ` +
          `Ensure the configuration of OpenYolo contains '${origin}'.`
    });
  }

  static parentIsNotRoot() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.parentIsNotRoot,
      exposedErrorType: OpenYoloErrorType.configurationError,
      message:
          `The caller window is an IFrame which is not authorized in OpenYolo` +
          `configuration.`
    });
  }

  /* Flow errors. */

  static userCanceled() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.userCanceled,
      exposedErrorType: OpenYoloErrorType.userCanceled,
      message: 'The user canceled the operation.'
    });
  }

  static noCredentialsAvailable() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.noCredentialsAvailable,
      exposedErrorType: OpenYoloErrorType.noCredentialsAvailable,
      message: 'No credential is available for the current user.'
    });
  }

  static operationCanceled() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.operationCanceled,
      exposedErrorType: OpenYoloErrorType.operationCanceled,
      message: 'The operation was canceled.'
    });
  }

  static clientDisposed() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.clientDisposed,
      exposedErrorType: OpenYoloErrorType.clientDisposed,
      message: 'The API has been disposed from the current context.'
    });
  }

  /* Request errors. */

  static requestFailed(message: string) {
    return new OpenYoloInternalError({
      code: InternalErrorCode.requestFailed,
      exposedErrorType: OpenYoloErrorType.requestFailed,
      message: `The API request failed to resolve: ${message}`
    });
  }

  static requestTimeout() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.requestTimeout,
      exposedErrorType: OpenYoloErrorType.requestFailed,
      message: 'The API request timed out.'
    });
  }

  static illegalConcurrentRequestError() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.illegalConcurrentRequest,
      exposedErrorType: OpenYoloErrorType.illegalConcurrentRequest,
      message:
          'The request could not be resolved because another operation is ' +
          'currently pending.'
    });
  }

  static unknownRequest(requestType: string) {
    return new OpenYoloInternalError({
      code: InternalErrorCode.unknownRequest,
      exposedErrorType: OpenYoloErrorType.requestFailed,
      message: `The '${requestType}' request sent could not be handled by the` +
          ` credentials provider.`
    });
  }

  static browserWrappingRequired() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.browserWrappingRequired,
      exposedErrorType: OpenYoloErrorType.browserWrappingRequired,
      message: 'The current request requires using navigator.credentials.'
    });
  }

  static unknownError() {
    return new OpenYoloInternalError({
      code: InternalErrorCode.unknownError,
      exposedErrorType: OpenYoloErrorType.unknownError,
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
export declare interface OpenYoloError extends CustomError {
  /** Standardized error type. */
  type: OpenYoloErrorType;
  /**
   * Developer visible and non sensitive error message. It will contain the
   * InternalErrorCode for easier reference: `${code}: ${message}`.
   */
  message: string;
}

export class OpenYoloError {
  name = 'OpenYoloError';
  message: string;

  constructor(message: string, public type: OpenYoloErrorType) {
    this.message = message;
  }

  toData(): OpenYoloExposedErrorData {
    return {message: this.message, type: this.type};
  }

  static fromData(data: OpenYoloExposedErrorData): OpenYoloError {
    return new OpenYoloError(data.message, data.type);
  }
}
