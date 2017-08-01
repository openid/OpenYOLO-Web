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
import {RenderMode} from '../protocol/data';
import {PreloadRequest} from '../protocol/preload_request';
import {DisplayOptions} from '../protocol/rpc_messages';

export const HIDDEN_FRAME_CLASS = 'openyolo-hidden';
export const VISIBLE_FRAME_CLASS = 'openyolo-visible';

const DEFAULT_FRAME_CSS = `
.openyolo-hidden {
  display: none;
}

.openyolo-visible {
  position: fixed;
  border: none;
  z-index: 9999;
}

.openyolo-visible.bottomSheet {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 320px;
}

.openyolo-visible.navPopout {
  top: 0;
  right: 0;
  width: 320px;
  height: 320px;
}

.openyolo-visible.fullScreen {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
`;

let defaultCssNode: HTMLStyleElement|null;

function injectDefaultFrameCss() {
  if (defaultCssNode) return;

  defaultCssNode = document.createElement('style');
  defaultCssNode.type = 'text/css';
  defaultCssNode.appendChild(document.createTextNode(DEFAULT_FRAME_CSS));
  document.getElementsByTagName('head')[0].appendChild(defaultCssNode);
}

/**
 * Defines the interface for a valid OpenYolo Relay container that will hold
 * relay-side logic and securely fetch credentials.
 *
 * It is usually an IFrame or a Popup window.
 */
export class ProviderFrameElement {
  private frameElem: HTMLIFrameElement;

  constructor(
      private clientDocument: Document,
      private instanceIdHash: string,
      clientOrigin: string,
      private renderMode: RenderMode,
      providerUrlBase: string,
      preloadRequest?: PreloadRequest) {
    injectDefaultFrameCss();
    this.frameElem = this.clientDocument.createElement('iframe');
    this.frameElem.src = `${providerUrlBase}` +
        `?client=${encodeURIComponent(clientOrigin)}` +
        `&id=${this.instanceIdHash}` +
        `&renderMode=${renderMode}`;

    if (preloadRequest) {
      let encodedRequest = encodeURIComponent(JSON.stringify(preloadRequest));
      this.frameElem.src += `&preloadRequest=${encodedRequest}`;
    }

    this.frameElem.className = HIDDEN_FRAME_CLASS;
    this.frameElem.hidden = true;
    this.clientDocument.body.appendChild(this.frameElem);
  }

  /**
   * Returns the content window of the container.
   */
  getContentWindow(): WindowLike {
    return this.frameElem.contentWindow;
  }

  /**
   * Displays the container.
   */
  display(options: DisplayOptions): void {
    this.frameElem.className = '';
    this.frameElem.hidden = false;
    this.frameElem.classList.add(VISIBLE_FRAME_CLASS);
    this.frameElem.classList.add(this.renderMode);
    if ((options.height || options.width) &&
        this.renderMode !== RenderMode.fullScreen) {
      if (options.height) this.frameElem.style.height = `${options.height}px`;
      if (options.width) this.frameElem.style.width = `${options.width}px`;
    }
  }

  /**
   * Hides the container.
   */
  hide(): void {
    this.frameElem.className = HIDDEN_FRAME_CLASS;
    this.frameElem.hidden = true;
    this.frameElem.style.height = '';
    this.frameElem.style.width = '';
  }

  /**
   * Disposes of the container.
   */
  dispose(): void {
    this.clientDocument.body.removeChild(this.frameElem);
  }
}
