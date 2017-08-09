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

import {SecureChannel} from '../protocol/secure_channel';

import {ListenerManager} from './listeners';
import {createMessageEvent} from './messages';

/**
 * A MessageChannel-like object that works within a single window.
 */
export class FakeMessageChannel implements MessageChannel {
  port1: FakeMessagePort;
  port2: FakeMessagePort;

  constructor() {
    this.port1 = new FakeMessagePort();
    this.port2 = new FakeMessagePort();
    this.port1.twin = this.port2;
    this.port2.twin = this.port1;
  }
}

/**
 * A MessagePort-like object that works within a single window.
 */
export class FakeMessagePort implements MessagePort {
  twin: FakeMessagePort;
  closed: boolean;

  listeners: ListenerManager = new ListenerManager();

  onmessage(this: MessagePort, ev: MessageEvent) {}

  close(): void {
    this.closed = true;
  }

  postMessage(message?: any, ports?: any): void {
    this.twin.twinDispatch(createMessageEvent(message));
  }

  start(): void {}

  addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      useCapture?: boolean): void {
    this.listeners.add(type, listener);
  }

  dispatchEvent(evt: Event): boolean {
    this.listeners.dispatch(evt.type, evt);
    return true;
  }

  private twinDispatch(evt: MessageEvent) {
    this.listeners.dispatch('message', evt);
  }

  removeEventListener(
      type: string,
      listener?: EventListenerOrEventListenerObject,
      useCapture?: boolean): void {
    if (listener) {
      this.listeners.remove(type, listener);
    }
  }
}

export class FakeProviderConnection {
  public readonly clientChannel: SecureChannel;
  public readonly providerChannel: SecureChannel;

  public readonly messageChannel: FakeMessageChannel;
  public readonly clientPort: FakeMessagePort;
  public readonly providerPort: FakeMessagePort;

  constructor() {
    this.messageChannel = new FakeMessageChannel();
    this.clientPort = this.messageChannel.port1;
    this.providerPort = this.messageChannel.port2;
    this.clientChannel = new SecureChannel(this.clientPort);
    this.providerChannel = new SecureChannel(this.providerPort);
  }
}
