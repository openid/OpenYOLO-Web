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

import {OpenYoloError, OpenYoloErrorData} from '../protocol/errors';
import {RpcMessageArgumentTypes, RpcMessageDataTypes, RpcMessageType} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {generateId, PromiseResolver} from '../protocol/utils';

import {ProviderFrameElement} from './provider_frame_elem';

export type RpcMessageHandler<T extends RpcMessageType> =
    (data: RpcMessageArgumentTypes[T], type: T, ev: MessageEvent) => void;

/**
 * General interface of a request to the relay.
 *
 * @template T
 *     Type of the response returned when the request resolves.
 * @template O
 *     Type of the options required for this request.
 */
export interface RelayRequest<T, O> {
  /**
   * Sends the specific request to the relay, with the given options.
   */
  dispatch(options: O): Promise<T>;
}

/**
 * Super class to all requests to the backend relay, being an IFrame or a popup
 * according to the flow chosen. Handles the creation of timeouts and message
 * handlers as well as disposing of these.
 *
 * @template ResultT
 *     Type of the response returned when the request resolves.
 *
 * @template OptionsT
 *     Type of the options required for this request.
 */
export abstract class BaseRequest<ResultT, OptionsT> implements
    RelayRequest<ResultT, OptionsT> {
  private promiseResolver = new PromiseResolver<ResultT>();
  private listenerKeys: number[] = [];
  private timeouts: number[] = [];
  private disposed = false;

  constructor(
      protected frame: ProviderFrameElement,
      protected channel: SecureChannel,
      public id = generateId()) {
    this.debugLog('request instantiated');
    // register a standard error handler
    this.registerHandler('error', (data: OpenYoloErrorData) => {
      let error: Error;
      if (data) {
        error = OpenYoloError.createError(data);
      } else {
        error = OpenYoloError.unknown();
      }

      this.debugLog(`request failed: ${error}`);
      this.reject(error);
      this.dispose();
    });

    // register a standard handler for displaying the provider - when UI is
    // shown, the timeouts are also canceled to allow the operation to proceed
    // at human pace.
    this.registerHandler('showProvider', (options) => {
      this.clearTimeouts();
      frame.display(options);
    });
  }

  abstract dispatch(options: OptionsT): Promise<ResultT>;

  debugLog(message: string) {
    console.debug(`(rq-${this.id}): ` + message);
  }

  getPromise(): Promise<ResultT> {
    return this.promiseResolver.promise;
  }

  resolve(response?: ResultT) {
    this.promiseResolver.resolve(response);
    this.frame.hide();
  }

  reject(reason: Error) {
    this.promiseResolver.reject(reason);
    this.frame.hide();
  }

  /**
   * Registers a message handler for this request. It will forward messages
   * of the specified type that match the ID of this request.
   */
  registerHandler<T extends RpcMessageType>(
      type: T,
      handler: RpcMessageHandler<T>): void {
    let filter =
        (data: RpcMessageDataTypes[T], t: T, e: MessageEvent): boolean => {
          // TODO: a TS compiler bug appears to be causing intermittent problems
          // with resolving RpcMessageDataTypes[T]. Cast to any until this
          // is resolved
          let anyData = (data as any);
          if (anyData.id !== this.id) {
            return false;
          }

          handler(anyData.args, type, e);
        };
    filter.toString = () => `${type} message handler`;
    this.listenerKeys.push(this.channel.listen(type, filter));
  }

  /**
   * Clears all listeners.
   */
  protected clearListeners(): void {
    this.listenerKeys.forEach((key) => {
      this.channel.unlisten(key);
    });
    this.listenerKeys = [];
  }

  /**
   * Sets a timeout and keep the id to be able to clear it later.
   */
  setAndRegisterTimeout(fn: () => void, timeout: number) {
    this.timeouts.push(window.setTimeout(() => fn(), timeout));
  }

  /**
   * Clears all started timeouts.
   */
  protected clearTimeouts(): void {
    this.timeouts.forEach((id) => {
      window.clearTimeout(id);
    });
    this.timeouts = [];
  }

  /**
   * Clears timeouts and listeners.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.clearTimeouts();
    this.clearListeners();
    this.promiseResolver.dispose();
    this.disposed = true;
  }
}
