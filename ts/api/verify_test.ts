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
import {verifyAckMessage, verifyPingMessage} from '../protocol/post_messages';
import {MockWindow} from '../test_utils/frames';
import {createMessageEvent, createUntypedMessageEvent} from '../test_utils/messages';

import * as verify from './verify';

describe('verify', () => {
  describe('respondToHandshake', () => {
    let rootFrame: WindowLike;
    let middleFrame: WindowLike;
    let providerFrame: WindowLike;
    let providerFrameMessageSpy: any;

    beforeEach(() => {
      // verify is typically used in a situation where login is happening in
      // a frame which is not the root of the window. Verification of frames
      // to the root is required, so the root frame will import and use verify
      // directly. We mock this setup with three frames, where the ping messages
      // will come from the most deeply nested, and the use of verify is in the
      // root.
      rootFrame = new MockWindow();
      middleFrame = new MockWindow(middleFrame);
      providerFrame = new MockWindow(middleFrame);

      // TypeScript doesn't like calling .calls directly on the stubbed method,
      // i.e. window.postMessage.calls will raise a compilation error.
      providerFrameMessageSpy = spyOn(providerFrame, 'postMessage');
    });

    it('should acknowledge valid ping message', () => {
      verify.respondToHandshake(rootFrame);
      let event = createMessageEvent(
          verifyPingMessage('123'),
          'https://provider.example.com',
          undefined,
          providerFrame);
      rootFrame.dispatchEvent(event);
      expect(providerFrameMessageSpy)
          .toHaveBeenCalledWith(
              verifyAckMessage('123'), 'https://provider.example.com');
    });

    it('should acknowledge more than one ping messages', () => {
      verify.respondToHandshake(rootFrame);
      let event = createMessageEvent(
          verifyPingMessage('123'),
          'https://provider.example.com',
          undefined,
          providerFrame);
      rootFrame.dispatchEvent(event);
      rootFrame.dispatchEvent(event);
      expect(providerFrameMessageSpy.calls.count()).toEqual(2);
    });

    it('should not acknowledge invalid ping message', () => {
      verify.respondToHandshake(rootFrame);
      let event = createUntypedMessageEvent({type: 'not-a-ping', data: '123'});
      rootFrame.dispatchEvent(event);
      expect(providerFrameMessageSpy).not.toHaveBeenCalled();
    });
  });
});
