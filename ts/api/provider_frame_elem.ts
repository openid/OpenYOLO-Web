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
import {FeatureConfig} from '../protocol/feature_config';
import {PreloadRequest} from '../protocol/preload_request';
import {DisplayOptions} from '../protocol/rpc_messages';

export const HIDDEN_FRAME_CLASS = 'openyolo-hidden';
export const VISIBLE_FRAME_CLASS = 'openyolo-visible';

type UpdatableStyle = 'bottom'|'top'|'right'|'left'|'width'|'height';

type StyleDeclaration = {
  [key in UpdatableStyle]?: string
};

// Use a mapping of style to use the style attribute of the IFrame element. This
// is to avoid CSP issue with style injection. See:
// https://stackoverflow.com/questions/48449246/google-yolo-custom-styles-csp-support
const FRAME_RENDER_MODE_STYLE_MAPPING: {[key in RenderMode]: StyleDeclaration}&
    {[key: string]: StyleDeclaration} = {
      'bottomSheet': {
        'bottom': '0',
        'left': '0',
        'width': '100%',
        'height': '320px',
      },
      'navPopout': {
        'top': '0',
        'right': '0',
        'width': '320px',
        'height': '320px',
      },
      'fullScreen': {
        'top': '0',
        'left': '0',
        'width': '100%',
        'height': '100%',
      },
    };

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
      featureConfig?: FeatureConfig,
      preloadRequest?: PreloadRequest) {
    this.frameElem = this.clientDocument.createElement('iframe');
    this.frameElem.src = `${providerUrlBase}` +
        `?client=${encodeURIComponent(clientOrigin)}` +
        `&id=${this.instanceIdHash}` +
        `&renderMode=${renderMode}`;

    if (preloadRequest) {
      let encodedRequest = encodeURIComponent(JSON.stringify(preloadRequest));
      this.frameElem.src += `&preloadRequest=${encodedRequest}`;
    }

    if (featureConfig) {
      let encodedFeatures = encodeURIComponent(JSON.stringify(featureConfig));
      this.frameElem.src += `&featureConfig=${encodedFeatures}`;
    }

    // Generic style.
    this.frameElem.style.border = 'none';
    this.frameElem.style.position = 'fixed';
    this.frameElem.style.zIndex = '9999';

    this.hide();
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
    if (this.frameElem.hidden) {
      this.resetStyle();
      this.applyStyle(FRAME_RENDER_MODE_STYLE_MAPPING[this.renderMode]);
      this.frameElem.hidden = false;
    }
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
    this.resetStyle();
    this.frameElem.style.display = 'none';
    this.frameElem.hidden = true;
  }

  /**
   * Disposes of the container.
   */
  dispose(): void {
    this.clientDocument.body.removeChild(this.frameElem);
  }

  /**
   * Resets the IFrame updatable style.
   */
  private resetStyle(): void {
    this.frameElem.style.display = '';
    this.frameElem.style.height = '';
    this.frameElem.style.width = '';
    this.frameElem.style.top = '';
    this.frameElem.style.left = '';
    this.frameElem.style.right = '';
    this.frameElem.style.bottom = '';
  }

  /**
   * Applies the given style on the IFrame element.
   */
  private applyStyle(style: StyleDeclaration): void {
    if (style.bottom) this.frameElem.style.bottom = style.bottom;
    if (style.top) this.frameElem.style.top = style.top;
    if (style.right) this.frameElem.style.right = style.right;
    if (style.left) this.frameElem.style.left = style.left;
    if (style.width) this.frameElem.style.width = style.width;
    if (style.height) this.frameElem.style.height = style.height;
  }
}
