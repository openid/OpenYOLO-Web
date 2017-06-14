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

import { OpenYoloError } from '../protocol/errors';
import { errorMessage, noneAvailableMessage, RPC_MESSAGE_TYPES, showProviderMessage } from '../protocol/rpc_messages';
import { SecureChannel } from '../protocol/secure_channel';
import { FakeProviderConnection } from '../test_utils/channels';
import { createSpyFrame } from '../test_utils/frames';
import { createUntypedMessageEvent } from '../test_utils/messages';
import { JasmineTimeoutManager } from '../test_utils/timeout';

import { BaseRequest } from './base_request';
import { ProviderFrameElement } from './provider_frame_elem';

class ImplementedBaseRequest extends BaseRequest<string, undefined> {
  dispatchInternal() {}
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
      // Listener for a different message type.
      request.registerHandler(
        RPC_MESSAGE_TYPES.credential, jasmine.createSpy('messageSpy'));
      request.dispose();
      expect(unlistenSpy).toHaveBeenCalledTimes(2);
    });

    it('should respond to valid message', () => {
      providerChannel.send(noneAvailableMessage(request.id));
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should filter invalid type', () => {
      let event = createUntypedMessageEvent({ 'type': 'unknownType' });
      connection.clientPort.postMessage(event);
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should filter invalid id', () => {
      providerChannel.send(noneAvailableMessage('differentId'));
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });

  describe('timeouts handling', () => {
    it('timeouts if too long', async function (done) {
      request.dispatch(undefined, 100)
        .then(
        (result) => {
          done.fail('Should not be a success !');
        },
        (error) => {
          expect(OpenYoloError.errorIs(error, 'requestTimeout'))
            .toBe(true);
          done();
        });
      jasmine.clock().tick(101);
    });

    it('does not timeout if disabled', async function (done) {
      request.dispatch(undefined).then(
        () => {
          done.fail('Should not be a success!');
        },
        (error) => {
          done.fail('Should not timeout!');
        });
      jasmine.clock().tick(Infinity);
      done();
    });

    it('clears timeouts when showProvider message is received',
      async function (done) {
        request.dispatch(undefined, 100)
          .then(
          () => {
            done.fail('Should not be a success!');
          },
          (error) => {
            done.fail('Should not timeout!');
          });
        const displayOptions = { height: 100 };
        providerChannel.send(showProviderMessage(request.id, displayOptions));
        jasmine.clock().tick(Infinity);
        expect(frame.display).toHaveBeenCalledWith(displayOptions);
        done();
      });
  });

  describe('error handling', () => {
    beforeEach(() => {
      spyOn(request, 'dispose').and.callThrough();
    });

    it('listens to error and disposes', async function (done) {
      const expectedError = OpenYoloError.illegalStateError('ERROR!');
      const promise = request.dispatch(undefined);
      providerChannel.send(errorMessage(request.id, expectedError));
      try {
        await promise;
        done.fail('Promise should not resolve');
      } catch (err) {
        expect(err).toEqual(expectedError);
        expect(request.dispose).toHaveBeenCalled();
        expect(frame.hide).toHaveBeenCalled();
        done();
      }
    });

    it('listens to illegalConcurrentError and disposes but not hide the iframe',
      async function (done) {
        const expectedError = OpenYoloError.illegalConcurrentRequestError();
        const promise = request.dispatch(undefined);
        providerChannel.send(errorMessage(request.id, expectedError));
        try {
          await promise;
          done.fail('Promise should not resolve');
        } catch (err) {
          expect(err).toEqual(expectedError);
          expect(request.dispose).toHaveBeenCalled();
          expect(frame.hide).not.toHaveBeenCalled();
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

  describe('cancel requests', () => {
    it('should reject when canceling requests', done => {
      const expectedError = OpenYoloError.operationCancelled();
      request.dispatch(undefined, 100)
        .then(() => fail('Should not have resolved'))
        .catch((error) => {
          expect(error).toEqual(expectedError);
          done();
        });
      request.cancel();
    });
  });
});
