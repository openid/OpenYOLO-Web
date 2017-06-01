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

import {WindowLike} from '../protocol/comms';
import {ListenerManager} from './listeners';
import {createMessageEvent} from './messages';

export class MockWindow implements WindowLike {
  parent: WindowLike;
  opener: WindowLike|null;
  private listeners: ListenerManager;

  constructor(parent?: WindowLike, opener?: WindowLike) {
    // When no parent specified, uses itself as parent just as a common Window.
    this.parent = parent || this;
    this.opener = opener || null;
    this.listeners = new ListenerManager();
  }

  close(): void{};

  postMessage(data: any, targetOrigin: string, transfer?: MessagePort[]): void {
    this.postMessageFromOrigin(
        data, transfer || null, 'https://default.mockwindoworigin.com', this);
  };

  postMessageFromOrigin(
      data: any,
      ports: MessagePort[]|null,
      sourceOrigin: string,
      sourceWindow: WindowLike) {
    let event = createMessageEvent(
        data, sourceOrigin, ports || undefined, sourceWindow);
    this.dispatchEvent(event);
  }

  /**
   * Naive implementation that dispatches events to every listener,
   * i.e. the ignoring the message's type.
   */
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.add(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.remove(type, listener);
  }

  dispatchEvent(event: Event): boolean {
    this.listeners.dispatch(event.type, event);
    return true;
  }
}

/**
 * Create a mocked SmartLock frame to be injected in tests.
 */
export function createSpyFrame(id: string) {
  let frame = jasmine.createSpyObj(
      'frame', ['load', 'display', 'sendMessage', 'hide', 'dispose']);
  frame.id = id;
  return frame;
}
