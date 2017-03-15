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

/**
 * Simple implementation of a typed listener collection, useful for emulating
 * the add/remove listener operations common in the DOM.
 */
export class ListenerManager {
  listeners: {[type: string]: EventListenerOrEventListenerObject[]} = {};

  add(type: string, listener: EventListenerOrEventListenerObject) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  remove(type: string, listener: EventListenerOrEventListenerObject) {
    if (!(type in this.listeners)) {
      return;
    }

    this.listeners[type] = this.listeners[type].filter((l) => l === listener);
  }

  dispatch(type: string, event: Event) {
    if (!(type in this.listeners)) {
      return;
    }

    for (let i = 0; i < this.listeners[type].length; i++) {
      let listener = this.listeners[type][i];
      if ('handleEvent' in listener) {
        (listener as EventListenerObject).handleEvent(event);
      } else {
        (listener as EventListener)(event);
      }
    }
  }
}
