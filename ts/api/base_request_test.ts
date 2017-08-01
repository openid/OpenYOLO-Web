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

import {OpenYoloErrorType, OpenYoloInternalError} from '../protocol/errors';
import {errorMessage, RpcMessageType, saveResultMessage, showProviderMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {startTimeoutRacer} from '../protocol/utils';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';
import {createUntypedMessageEvent} from '../test_utils/messages';

import {BaseRequest} from './base_request';
import {ProviderFrameElement} from './provider_frame_elem';

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

  beforeEach(() => {
    frame = createSpyFrame('frameId');
    handlerSpy = jasmine.createSpy('handlerSpy');
    connection = new FakeProviderConnection();

    channel = connection.clientChannel;
    listenSpy = spyOn(channel, 'listen').and.callThrough();
    unlistenSpy = spyOn(channel, 'unlisten').and.callThrough();

    providerChannel = connection.providerChannel;
    request = new ImplementedBaseRequest(frame, channel);
    jasmine.clock().install();
  });

  afterEach(() => {
    request.dispose();
    jasmine.clock().uninstall();
  });

  describe('registerHandler', () => {
    beforeEach(() => {
      request.registerHandler(RpcMessageType.saveResult, handlerSpy);
    });

    it('should unlisten when disposed', () => {
      // Listener for a different message type.
      request.registerHandler(
          RpcMessageType.proxy, jasmine.createSpy('messageSpy'));
      request.dispose();
      expect(unlistenSpy).toHaveBeenCalledTimes(2);
    });

    it('should respond to valid message', () => {
      providerChannel.send(saveResultMessage(request.id, true));
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should filter invalid type', () => {
      let event = createUntypedMessageEvent({'type': 'unknownType'});
      connection.clientPort.postMessage(event);
      expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should filter invalid id', () => {
      providerChannel.send(saveResultMessage('differentId', true));
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });

  describe('timeouts handling', () => {
    it('timeouts if too long', async function(done) {
      const timeoutRacer = startTimeoutRacer(100);
      request.dispatch(undefined, timeoutRacer)
          .then(
              () => {
                done.fail('Should not be a success!');
              },
              (error) => {
                expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
                expect(frame.hide).toHaveBeenCalled();
                done();
              });
      jasmine.clock().tick(100);
    });

    it('does not timeout if disabled', async function(done) {
      const timeoutRacer = startTimeoutRacer(0);
      request.dispatch(undefined, timeoutRacer)
          .then(
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
       async function(done) {
         const timeoutRacer = startTimeoutRacer(100);
         request.dispatch(undefined, timeoutRacer)
             .then(
                 () => {
                   done.fail('Should not be a success!');
                 },
                 (error) => {
                   done.fail('Should not timeout!');
                 });
         const displayOptions = {height: 100};
         jasmine.clock().tick(99);
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

    it('listens to error and disposes', async function(done) {
      const expectedError =
          OpenYoloInternalError.illegalStateError('ERROR!').toExposedError();
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
       async function(done) {
         const expectedError =
             OpenYoloInternalError.illegalConcurrentRequestError()
                 .toExposedError();
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
});
