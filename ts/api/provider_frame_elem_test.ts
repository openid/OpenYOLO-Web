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

import {RenderMode} from './exports';
import {ProviderFrameElement} from './provider_frame_elem';

describe('ProviderFrameElement', () => {
  const instanceIdHash = 'hashId';
  const clientOrigin = 'https://www.example.com';
  const providerUrlBase = 'https://provider.openyolo.com/iframe/request';

  let providerFrame: ProviderFrameElement;
  let iframeElement: HTMLElement;
  let clientDocument: any;

  beforeEach(() => {
    clientDocument = jasmine.createSpyObj('document', ['createElement']);
    clientDocument.style = {};
    clientDocument.body =
        jasmine.createSpyObj('body', ['appendChild', 'removeChild']);
    iframeElement = document.createElement('iframe');
    clientDocument.createElement.and.returnValue(iframeElement);
  });

  describe('display', () => {
    describe('bottomSheet', () => {
      beforeEach(() => {
        providerFrame = new ProviderFrameElement(
            clientDocument,
            instanceIdHash,
            clientOrigin,
            RenderMode.bottomSheet,
            providerUrlBase);
      });

      it('sets the default style and hides the iframe', () => {
        expect(iframeElement.style.border).toEqual('none');
        expect(iframeElement.style.position).toEqual('fixed');
        expect(iframeElement.style.zIndex).toEqual('9999');
        expect(iframeElement.style.display).toEqual('none');
        expect(iframeElement.hidden).toBe(true);
        expect(clientDocument.body.appendChild)
            .toHaveBeenCalledWith(iframeElement);
      });

      it('displays', () => {
        providerFrame.display({});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('320px');
        expect(iframeElement.style.width).toEqual('100%');
        expect(iframeElement.style.bottom).toEqual('0px');
        expect(iframeElement.style.left).toEqual('0px');
        expect(iframeElement.style.right).toEqual('');
        expect(iframeElement.style.top).toEqual('');
        expect(iframeElement.hidden).toBe(false);
      });

      it('displays with the given height', () => {
        providerFrame.display({height: 300});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('300px');
        expect(iframeElement.style.width).toEqual('100%');
        expect(iframeElement.style.bottom).toEqual('0px');
        expect(iframeElement.style.left).toEqual('0px');
        expect(iframeElement.style.right).toEqual('');
        expect(iframeElement.style.top).toEqual('');
        expect(iframeElement.hidden).toBe(false);
      });
    });

    describe('navPopout', () => {
      beforeEach(() => {
        providerFrame = new ProviderFrameElement(
            clientDocument,
            instanceIdHash,
            clientOrigin,
            RenderMode.navPopout,
            providerUrlBase);
      });

      it('sets the default style and hides the iframe', () => {
        expect(iframeElement.style.border).toEqual('none');
        expect(iframeElement.style.position).toEqual('fixed');
        expect(iframeElement.style.zIndex).toEqual('9999');
        expect(iframeElement.style.display).toEqual('none');
        expect(iframeElement.hidden).toBe(true);
        expect(clientDocument.body.appendChild)
            .toHaveBeenCalledWith(iframeElement);
      });

      it('displays', () => {
        providerFrame.display({});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('320px');
        expect(iframeElement.style.width).toEqual('320px');
        expect(iframeElement.style.bottom).toEqual('');
        expect(iframeElement.style.left).toEqual('');
        expect(iframeElement.style.right).toEqual('0px');
        expect(iframeElement.style.top).toEqual('0px');
        expect(iframeElement.hidden).toBe(false);
      });

      it('displays with default after displayed and hidden', () => {
        providerFrame.display({height: 300, width: 400});
        providerFrame.hide();
        providerFrame.display({});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('320px');
        expect(iframeElement.style.width).toEqual('320px');
        expect(iframeElement.style.bottom).toEqual('');
        expect(iframeElement.style.left).toEqual('');
        expect(iframeElement.style.right).toEqual('0px');
        expect(iframeElement.style.top).toEqual('0px');
        expect(iframeElement.hidden).toBe(false);
      });

      it('displays with the given height and width', () => {
        providerFrame.display({height: 300, width: 400});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('300px');
        expect(iframeElement.style.width).toEqual('400px');
        expect(iframeElement.style.bottom).toEqual('');
        expect(iframeElement.style.left).toEqual('');
        expect(iframeElement.style.right).toEqual('0px');
        expect(iframeElement.style.top).toEqual('0px');
        expect(iframeElement.hidden).toBe(false);
      });

      it('displays with the given height, and then width', () => {
        providerFrame.display({height: 300});
        providerFrame.display({width: 400});
        expect(iframeElement.style.display).toEqual('');
        expect(iframeElement.style.height).toEqual('300px');
        expect(iframeElement.style.width).toEqual('400px');
        expect(iframeElement.style.bottom).toEqual('');
        expect(iframeElement.style.left).toEqual('');
        expect(iframeElement.style.right).toEqual('0px');
        expect(iframeElement.style.top).toEqual('0px');
        expect(iframeElement.hidden).toBe(false);
      });
    });
  });

  describe('PropagateFeatureConfig', () => {
    let expectedUrl: string;

    beforeEach(() => {
      const featureConfig = {feature: ['DISPLAY_CLICKJACKING_POPUP']};
      providerFrame = new ProviderFrameElement(
          clientDocument,
          instanceIdHash,
          clientOrigin,
          RenderMode.bottomSheet,
          providerUrlBase,
          featureConfig);
      expectedUrl =
          `${providerUrlBase}?client=${encodeURIComponent(clientOrigin)}` +
          `&id=hashId&renderMode=bottomSheet` +
          `&featureConfig=${encodeURIComponent(JSON.stringify(featureConfig))}`;
    });

    it('propagate the correct feature config', () => {
      expect(iframeElement.getAttribute('src')).toEqual(expectedUrl);
    });
  });
});
