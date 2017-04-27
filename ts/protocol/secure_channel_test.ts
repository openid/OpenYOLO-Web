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

import {FakeMessageChannel, FakeMessagePort} from '../test_utils/channels';
import {MockWindow} from '../test_utils/frames';
import {createMessageEvent, createUntypedMessageEvent} from '../test_utils/messages';
import {JasmineTimeoutManager} from '../test_utils/timeout';

import {ERROR_TYPES, OpenYoloError} from './errors';
import {ackMessage, channelConnectMessage, channelReadyMessage, readyForConnectMessage} from './post_messages';
import * as msg from './rpc_messages';
import {SecureChannel} from './secure_channel';

describe('SecureChannel', () => {
  let clientWindow: MockWindow;
  let providerWindow: MockWindow;
  let originalMessageChannel = MessageChannel;
  let timeoutManager = new JasmineTimeoutManager();

  beforeEach(() => {
    clientWindow = new MockWindow();
    providerWindow = new MockWindow(clientWindow);
    MessageChannel = FakeMessageChannel;
    timeoutManager.install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    MessageChannel = originalMessageChannel;
    timeoutManager.uninstall();
  });

  describe('clientConnect', () => {
    it('performs an initialization handshake', async function(done) {
      let connectNonce = '123';

      spyOn(providerWindow, 'postMessage').and.callThrough();

      let connectPromise = SecureChannel.clientConnect(
          clientWindow, providerWindow, connectNonce);

      providerWindow.addEventListener('message', (ev: MessageEvent) => {
        expect(ev.data).toEqual(channelConnectMessage(connectNonce));
        // emulate the provider accepting this connection
        clientWindow.postMessage(channelReadyMessage(connectNonce), '*');
      });

      // emulate the provider sending a "ready to connect" message
      clientWindow.postMessage(readyForConnectMessage(connectNonce), '*');

      // as a result, the promise should resolve
      try {
        await connectPromise;
        done();
      } catch (err) {
        done.fail('Promise should resolve');
      }
    });

    it('times out automatically if no response', (done) => {
      let timeoutMs = 100;
      let expectReject = false;
      SecureChannel
          .clientConnect(clientWindow, providerWindow, '1234', timeoutMs)
          .then(
              () => {
                done.fail('Creation should not succeed!');
              },
              (err: Error) => {
                expect(expectReject).toBeTruthy('Failed before timeout');
                expect(OpenYoloError.errorIs(
                           err, ERROR_TYPES.establishSecureChannelTimeout))
                    .toBeTruthy();
                done();
              });

      // move the clock forward to just before the timeout
      jasmine.clock().tick(99);
      // then move the clock past it
      expectReject = true;
      jasmine.clock().tick(1);
    });
  });

  describe('after initialization', () => {
    let channel: SecureChannel;
    let port: FakeMessagePort;

    beforeEach(() => {
      let messageChannel = new FakeMessageChannel();
      port = messageChannel.port1;
      spyOn(port, 'start').and.callThrough();
      spyOn(port, 'addEventListener').and.callThrough();
      spyOn(port, 'removeEventListener').and.callThrough();
      spyOn(port, 'postMessage').and.callThrough();
      spyOn(port, 'close').and.callThrough();
      channel = new SecureChannel(port, false);
    });

    it('sends messages', () => {
      let message = msg.noneAvailableMessage('1234');
      channel.send(message);
      expect(port.postMessage).toHaveBeenCalledWith(message);
    });

    it('adds and removes listener', () => {
      let listener1 = jasmine.createSpy('listener1');
      let listener2 = jasmine.createSpy('listener2');
      let listenerKey1 = channel.listen(msg.RPC_MESSAGE_TYPES.none, listener1);
      let listenerKey2 = channel.listen(msg.RPC_MESSAGE_TYPES.none, listener2);

      port.dispatchEvent(createMessageEvent(msg.noneAvailableMessage('123')));

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      listener1.calls.reset();
      listener2.calls.reset();

      // after removing the first listener, only the second listener should
      // be triggered when a message arrives
      expect(channel.unlisten(listenerKey1)).toBe(listener1);
      port.dispatchEvent(createMessageEvent(msg.noneAvailableMessage('123')));
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // unlistening twice is a no-op
      expect(channel.unlisten(listenerKey1)).toBe(null);

      // final listener should still be removable
      expect(channel.unlisten(listenerKey2)).toBe(listener2);
    });

    describe('acknowledgement', () => {
      it('sends and waits for acknowledgement', (done) => {
        let message = msg.noneAvailableMessage('1234');
        channel.sendAndWaitAck(message).then(() => {
          expect(port.removeEventListener)
              .toHaveBeenCalledWith('message', jasmine.any(Function));
          done();
        });
        // Mock the acknowledgement.
        port.dispatchEvent(createMessageEvent(ackMessage('1234')));
      });

      it('sends and waits for acknowledgement until timeout', (done) => {
        let message = msg.noneAvailableMessage('1234');
        let expectReject = false;
        channel.sendAndWaitAck(message).then(
            () => {
              done.fail('It should not resolve the promise!');
            },
            (err) => {
              expect(expectReject).toBeTruthy('Failed before timeout');
              expect(OpenYoloError.errorIs(err, ERROR_TYPES.ackTimeout))
                  .toBeTruthy();
              expect(port.removeEventListener)
                  .toHaveBeenCalledWith('message', jasmine.any(Function));
              done();
            });
        // Mock an acknowledgement with a wrong ID.
        port.dispatchEvent(createMessageEvent(ackMessage('123')));
        jasmine.clock().tick(499);
        expectReject = true;
        jasmine.clock().tick(1);
      });

      it('sends back ack when required', () => {
        const listener1 = jasmine.createSpy('listener1');
        channel.listen(msg.RPC_MESSAGE_TYPES.none, listener1);

        const message = msg.noneAvailableMessage('123');
        message.data.ack = true;
        port.dispatchEvent(createMessageEvent(message));
        const expectedMessage = ackMessage('123');
        expect(port.postMessage).toHaveBeenCalledWith(expectedMessage);
      });
    });

    describe('dispose', () => {
      it('removes listeners and closes', () => {
        let listener1 = jasmine.createSpy('listener1');
        let listener2 = jasmine.createSpy('listener2');
        channel.listen(msg.RPC_MESSAGE_TYPES.credential, listener1);
        channel.listen(msg.RPC_MESSAGE_TYPES.credential, listener2);
        channel.dispose();

        // internally, only a single listener is added to a port, so we only
        // expect a single call.
        expect(port.removeEventListener).toHaveBeenCalledTimes(1);
        expect(port.close).toHaveBeenCalled();
      });
    });
  });

  describe('providerConnect', () => {
    let id = '123';
    let origin = 'https://example.com';
    let permittedOrigins = [origin];
    let port: MessagePort;

    beforeEach(() => {
      let channel = new FakeMessageChannel();
      port = channel.port2;
      spyOn(port, 'start').and.callThrough();
      spyOn(port, 'postMessage').and.callThrough();
      spyOn(port, 'close').and.callThrough();
    });

    it('succeeds after valid handshake', async function(done) {
      let promise =
          SecureChannel.providerConnect(providerWindow, permittedOrigins, id);

      // It should ignore an unknown event.
      providerWindow.dispatchEvent(
          createUntypedMessageEvent('unknown', origin));

      // And then handle a valid one.
      providerWindow.postMessageFromOrigin(
          channelConnectMessage(id), [port], origin, clientWindow);

      try {
        let channel = await promise;
        expect(channel).toBeDefined();
        done();
      } catch (err) {
        done.fail('Promise should resolve');
      }
    });

    it('times out if no message received', (done) => {
      let expectFailNow = false;

      // time out after 100ms
      SecureChannel.providerConnect(providerWindow, permittedOrigins, id, 100)
          .then(
              () => {
                done.fail('Connection should not establish');
              },
              (err) => {
                expect(expectFailNow)
                    .toBeTruthy('Connection establishment prematurely failed');
                expect(OpenYoloError.errorIs(
                           err, ERROR_TYPES.establishSecureChannelTimeout))
                    .toBeTruthy();
                done();
              });

      // push the clock to right before the timeout
      jasmine.clock().tick(90);

      // ... and then over the threshold
      expectFailNow = true;
      jasmine.clock().tick(10);
    });

    it('rejects if invalid origin', async function(done) {
      let evilOrigin = 'https://evil.example.com';
      let connectPromise =
          SecureChannel.providerConnect(providerWindow, permittedOrigins, id);

      // emulate the connection initialization message from the client, from
      // an untrusted origin
      providerWindow.postMessageFromOrigin(
          channelConnectMessage(id), [port], evilOrigin, clientWindow);

      try {
        await connectPromise;
        done.fail('Promise should reject');
      } catch (err) {
        expect(err).toEqual(OpenYoloError.untrustedOrigin(evilOrigin));
        done();
      }
    });
  });
});
