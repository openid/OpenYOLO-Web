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

import {createUntypedMessageEvent} from '../test_utils/messages';

import {createMessageListener, isPermittedOrigin, PostMessageListener, sendMessage} from './comms';
import {channelReadyMessage, PostMessageType} from './post_messages';

describe('comms', () => {
  describe('isPermittedOrigin', () => {
    it('should return true when the origin is allowed', () => {
      let permittedOrigins = ['http://localhost:8000', 'https://example.com'];
      expect(isPermittedOrigin('http://localhost:8000', permittedOrigins))
          .toBe(true);
      expect(isPermittedOrigin('https://example.com', permittedOrigins))
          .toBe(true);
      expect(isPermittedOrigin('http://example.com', permittedOrigins))
          .toBe(false);
      expect(isPermittedOrigin('https://other.com', permittedOrigins))
          .toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send a postMessage to the target', () => {
      let target = jasmine.createSpyObj('target', ['postMessage']);
      let message = channelReadyMessage('123');
      sendMessage(target, message);
      expect(target.postMessage).toHaveBeenCalledWith(message, '*');
    });

    it('should send a postMessage to the target with target origin', () => {
      let target = jasmine.createSpyObj('target', ['postMessage']);
      let origin = 'https://origin.com';
      let message = channelReadyMessage('123');
      sendMessage(target, message, origin);
      expect(target.postMessage).toHaveBeenCalledWith(message, origin);
    });
  });

  describe('createMessageListener', () => {
    let spy: PostMessageListener<PostMessageType.verifyPing>;
    let listener: EventListener;

    beforeEach(() => {
      spy = jasmine.createSpy('listener');
      listener = createMessageListener(PostMessageType.verifyPing, spy);
    });

    it('ignores events without content', () => {
      listener(createUntypedMessageEvent({}));
      expect(spy).not.toHaveBeenCalled();
    });

    it('ignores events without type', () => {
      let event = createUntypedMessageEvent({data: {}});
      listener(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('ignores events without data', () => {
      let event = createUntypedMessageEvent({data: {type: 'TYPE'}});
      listener(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('filters events with invalid data', () => {
      // ping message data must be a string
      let event = createUntypedMessageEvent(
          {data: {type: PostMessageType.verifyPing, data: 0}});
      listener(event);
      expect(spy).not.toHaveBeenCalled();
    });

    it('passes valid messages', () => {
      let event = {data: {type: PostMessageType.verifyPing, data: '123'}};
      listener(event as MessageEvent);
      expect(spy).toHaveBeenCalledWith(
          '123', PostMessageType.verifyPing, event);
    });
  });
});
