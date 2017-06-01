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

import {createMessageListener, FilteringEventListener, isPermittedOrigin, RpcMessageListener, WindowLike} from './comms';
import {OpenYoloError} from './errors';
import {ackMessage, channelConnectMessage, channelReadyMessage, POST_MESSAGE_TYPES, readyForConnectMessage} from './post_messages';
import {RpcMessage, RpcMessageDataTypes, RpcMessageType} from './rpc_messages';
import {PromiseResolver, sha256, timeoutPromise} from './utils';

const DEFAULT_TIMEOUT_MS = 3000;

/**
 * The timeout for ack message.
 */
const ACK_TIMEOUT_MS = 500;

export type UnknownMessageEventListener = (ev: MessageEvent) => void;

interface ListenerPair {
  portListener: FilteringEventListener;
  wrappedListener: RpcMessageListener<any>;
}

export class SecureChannel {
  private mainListener: (ev: MessageEvent) => void;
  private listeners: Array<ListenerPair|null> = [];
  private fallbackListeners: UnknownMessageEventListener[] = [];

  /**
   * Connect method that an OpenYOLO client calls to establish contact with
   * the provider.
   */
  static clientConnect(
      clientWindow: WindowLike,
      providerWindow: WindowLike,
      connectionNonce: string,
      connectionNonceHash: string,
      timeoutMs?: number): Promise<SecureChannel> {
    timeoutMs = (timeoutMs && timeoutMs > 0) ? timeoutMs : DEFAULT_TIMEOUT_MS;

    let timeout = timeoutPromise<SecureChannel>(
        OpenYoloError.establishSecureChannelTimeout(), timeoutMs);

    let connectPromise = SecureChannel.clientConnectNoTimeout(
        clientWindow, providerWindow, connectionNonce, connectionNonceHash);

    return Promise.race([timeout, connectPromise]);
  }

  static async clientConnectNoTimeout(
      clientWindow: WindowLike,
      providerWindow: WindowLike,
      connectionNonce: string,
      connectionNonceHash: string): Promise<SecureChannel> {
    SecureChannel.debugLog(
        'client', 'waiting for ready message from credential provider');
    // await the provider notifying us that it is ready to connect
    await SecureChannel.providerReadyToConnect(
        clientWindow, connectionNonceHash);

    let channel = new MessageChannel();

    let readyPromiseResolver = new PromiseResolver();
    // register another listener for the success / fail of establishing the
    // connection.

    let readyListener = createMessageListener('channelReady', () => {
      readyPromiseResolver.resolve();
    });

    let errorListener = createMessageListener('channelError', (err) => {
      readyPromiseResolver.reject(OpenYoloError.createError(err));
    });

    clientWindow.addEventListener('message', readyListener);
    clientWindow.addEventListener('message', errorListener);

    // send the connection initialization message, carrying the port for
    // subsequent communication.
    SecureChannel.debugLog(
        'client', 'sending connection challenge to provider');
    providerWindow.postMessage(
        channelConnectMessage(connectionNonce), '*', [channel.port2]);

    try {
      // await ready, and if successful, remove our temporary ready listener
      // and return the established channel.
      await readyPromiseResolver.promise;
      SecureChannel.debugLog(
          'client', 'credential provider accepted connection');
      return new SecureChannel(channel.port1, false);
    } catch (err) {
      // failed to establish the connection. Close the now defunct port
      SecureChannel.debugLog(
          'client', `credential provider rejected connection: ${err['code']}`);
      channel.port1.close();
      throw err;
    } finally {
      clientWindow.removeEventListener('message', readyListener);
      clientWindow.removeEventListener('message', errorListener);
    }
  }

  static providerReadyToConnect(
      clientWindow: WindowLike,
      expectedNonceHash: string): Promise<void> {
    let promiseResolver = new PromiseResolver<void>();
    let listener =
        createMessageListener(POST_MESSAGE_TYPES.readyForConnect, (nonce) => {
          if (expectedNonceHash === nonce) {
            promiseResolver.resolve();
          }
        });

    // add the ready listener, then remove it when done
    clientWindow.addEventListener('message', listener);
    promiseResolver.promise.then(
        () => {
          clientWindow.removeEventListener('message', listener);
        },
        () => {
          clientWindow.removeEventListener('message', listener);
        });

    return promiseResolver.promise;
  }

  /**
   * Connect method that the OpenYOLO provider calls to establish contact
   * with the client.
   */
  static async providerConnect(
      providerWindow: WindowLike,
      permittedOrigins: string[],
      connectionNonce: string): Promise<SecureChannel> {
    let port: MessagePort|null = null;
    let promiseResolver = new PromiseResolver<SecureChannel>();

    let listener = createMessageListener(
        'channelConnect', async function(nonce: string, type, ev) {
          SecureChannel.debugLog(
              'provider', `connection challenge received from ${ev.origin}`);
          // Runtime check as nonce could be anything.
          if (typeof nonce !== 'string') {
            SecureChannel.debugLog(
                'provider', 'challenge nonce is not a string - ignoring');
            return;
          }
          // The connection nonce (ID) in the URL is the hash of a nonce
          // generated by the client. The client sends the actual nonce as a
          // challenge, so this computes the hash of the nonce received to make
          // sure it corresponds to the hash.
          // Ignored otherwise, may be anything.
          const nonceHash = await sha256(nonce);
          if (nonceHash !== connectionNonce) {
            SecureChannel.debugLog(
                'provider', 'challenge nonce did not match - ignoring');
            return;
          }

          if (!isPermittedOrigin(ev.origin, permittedOrigins)) {
            // Invalid origin indicates a potential attack.
            SecureChannel.debugLog(
                'provider',
                'connection challenge from untrusted origin - rejecting');
            promiseResolver.reject(OpenYoloError.untrustedOrigin(ev.origin));
            return;
          }

          if (!ev.ports) {
            SecureChannel.debugLog(
                'provider',
                'connection challenge did not carry a port - rejecting');
            promiseResolver.reject(OpenYoloError.illegalStateError(
                'channel initialization message does not contain ports'));
            return;
          }

          SecureChannel.debugLog(
              'provider', `accepted connection from ${ev.origin}`);
          port = ev.ports[0] as MessagePort;
          providerWindow.parent.postMessage(
              channelReadyMessage(connectionNonce), ev.origin);
          promiseResolver.resolve(new SecureChannel(port, true));
        });

    // listen for the initialization message, and unlisten once the connection
    // succeeds or fails
    providerWindow.addEventListener('message', listener);
    promiseResolver.promise.then(
        () => {
          providerWindow.removeEventListener('message', listener);
        },
        (err) => {
          providerWindow.removeEventListener('message', listener);
        });

    // send the 'ready to connect' message to the client.
    SecureChannel.debugLog(
        'provider', 'sending ready to connect message to client');
    providerWindow.parent.postMessage(
        readyForConnectMessage(connectionNonce), '*');

    return promiseResolver.promise;
  }

  private static debugLog(role: string, message: string) {
    console.debug(`(${role}) ${message}`);
  }

  constructor(private port: MessagePort, private providerEnd: boolean) {
    this.mainListener = (ev) => {
      let anyMatched = false;
      for (let i = 0; i < this.listeners.length; i++) {
        let listener = this.listeners[i];
        if (!listener) continue;
        anyMatched = !!listener.portListener(ev) || anyMatched;
      }

      if (anyMatched) {
        return;
      }

      this.debugLog(
          `no registered listeners to handle received message:` +
          `${JSON.stringify(ev.data)}`);
      for (let i = 0; i < this.fallbackListeners.length; i++) {
        this.fallbackListeners[i](ev);
      }
    };

    this.port.addEventListener('message', this.mainListener);
    this.port.start();
  }

  send<T extends RpcMessageType>(message: RpcMessage<T>): void {
    this.port.postMessage(message);
  }

  /**
   * Sends a message and waits for acknowledgment of the recipient.
   */
  sendAndWaitAck<T extends RpcMessageType>(message: RpcMessage<T>):
      Promise<void> {
    const promiseResolver = new PromiseResolver<void>();
    message.data.ack = true;
    const ackListner = createMessageListener(POST_MESSAGE_TYPES.ack, (id) => {
      if (id === message.data.id) {
        this.port.removeEventListener('message', ackListner);
        promiseResolver.resolve();
      }
    });
    const timeout = timeoutPromise<SecureChannel>(
        OpenYoloError.ackTimeout(), ACK_TIMEOUT_MS);
    timeout.catch((err) => {
      this.port.removeEventListener('message', ackListner);
    });
    this.port.addEventListener('message', ackListner);
    this.send(message);
    return Promise.race([timeout, promiseResolver.promise]);
  }

  listen<T extends RpcMessageType>(
      messageType: T,
      listener: RpcMessageListener<T>): number {
    if (!messageType || !listener) {
      throw OpenYoloError.illegalStateError('invalid type or listener');
    }

    let portListener = createMessageListener(
        messageType,
        (data: RpcMessageDataTypes[T], type: T, event: MessageEvent) => {
          // If acknowledgement is required, send the message to the sender.
          // TODO: a TS compiler bug appears to be causing intermittent problems
          // with resolving RpcMessageDataTypes[T]. Cast to any until this
          // is resolved
          const anyData = data as any;
          if (anyData.ack) {
            this.port.postMessage(ackMessage(anyData.id));
          }
          listener(data, type, event);
        });
    let listenerPair = {portListener, wrappedListener: listener};
    this.listeners.push(listenerPair);
    return this.listeners.length - 1;
  }

  addFallbackListener(fallbackListener: UnknownMessageEventListener) {
    this.fallbackListeners.push(fallbackListener);
  }

  unlisten(key: number): RpcMessageListener<any>|null {
    let listenerPair = this.listeners[key];
    if (!listenerPair) {
      return null;
    }

    this.listeners[key] = null;
    return listenerPair.wrappedListener;
  }

  debugLog(message: string) {
    SecureChannel.debugLog(this.providerEnd ? 'provider' : 'client', message);
  }

  dispose(): void {
    this.debugLog('disposing channel');
    this.port.removeEventListener('message', this.mainListener);
    this.listeners = [];
    this.fallbackListeners = [];
    this.port.close();
  }
}
