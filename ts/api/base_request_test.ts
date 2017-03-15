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

import {OpenYoloError} from '../protocol/errors';
import {errorMessage, noneAvailableMessage, RPC_MESSAGE_TYPES} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';
import {createUntypedMessageEvent} from '../test_utils/messages';
import {JasmineTimeoutManager} from '../test_utils/timeout';

import {BaseRequest} from './base_request';
import {ProviderFrameElement} from './provider_frame_elem';

class ImplementedBaseRequest extends BaseRequest<string, undefined> {
  dispatch() {
    return this.getPromise();
  }
}

describe('BaseRequest', () => {
  let request: BaseRequest<string, undefined>;
  let connection: FakeProviderConnection;
  let channel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: ProviderFrameElement;
  let handlerSpy: jasmine.Spy;
  let listenSpy: jasmine.Spy;
  let unlistenSpy: jasmine.Spy;
  let jasmineTimeoutManager = new JasmineTimeoutManager();

  beforeEach(() => {
    frame = createSpyFrame('frameId');
    handlerSpy = jasmine.createSpy('handlerSpy');
    connection = new FakeProviderConnection();

    channel = connection.clientChannel;
    listenSpy = spyOn(channel, 'listen').and.callThrough();
    unlistenSpy = spyOn(channel, 'unlisten').and.callThrough();

    providerChannel = connection.providerChannel;
    request = new ImplementedBaseRequest(frame, channel);
    jasmineTimeoutManager.install();
  });

  afterEach(() => {
    request.dispose();
    jasmineTimeoutManager.uninstall();
  });

  describe('registerHandler', () => {
    beforeEach(() => {
      request.registerHandler(RPC_MESSAGE_TYPES.none, handlerSpy);
    });

    it('should unlisten when disposed', () => {
      // listener for a different message type
      request.registerHandler(
          RPC_MESSAGE_TYPES.credential, jasmine.createSpy('messageSpy'));
      request.dispose();

      // the default error listener and provider display listener are also
      // unregistered, so we expect four unregister calls
      expect(unlistenSpy).toHaveBeenCalledTimes(4);
    });

    it('should respond to valid message', () => {
      providerChannel.send(noneAvailableMessage(request.id));
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should filter invalid type', () => {
      let event = createUntypedMessageEvent({'type': 'unknownType'});
      connection.clientPort.postMessage(event);
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should filter invalid id', () => {
      providerChannel.send(noneAvailableMessage('differentId'));
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      spyOn(request, 'dispose').and.callThrough();
    });

    it('should listen to error and dispose', async function(done) {
      let promise = request.getPromise();
      let expectedError = OpenYoloError.illegalStateError('ERROR!');
      providerChannel.send(errorMessage(request.id, expectedError));
      try {
        await promise;
        done.fail('Promise should not resolve');
      } catch (err) {
        expect(err).toEqual(expectedError);
        expect(request.dispose).toHaveBeenCalled();
        done();
      }
    });
  });

  describe('setAndRegisterTimeout', () => {
    it('should set a timeout', done => {
      request.setAndRegisterTimeout(done, 1000);
      jasmine.clock().tick(1001);
    });

    it('should clear timeout when disposed', done => {
      request.setAndRegisterTimeout(() => {
        done.fail('Should not be called!');
      }, 1000);
      request.dispose();
      jasmine.clock().tick(1001);
      done();
    });
  });
});
