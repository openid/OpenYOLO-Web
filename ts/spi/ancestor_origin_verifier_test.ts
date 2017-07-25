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

import {OpenYoloInternalError} from '../protocol/errors';
import {PostMessageType, verifyAckMessage, verifyPingMessage} from '../protocol/post_messages';
import {MockWindow} from '../test_utils/frames';
import {createMessageEvent} from '../test_utils/messages';
import {JasmineTimeoutManager} from '../test_utils/timeout';

import {AncestorOriginVerifier} from './ancestor_origin_verifier';

describe('AncestorOriginVerifier', () => {

  const TIMEOUT = 1000;

  let parentFrame: MockWindow;
  let providerFrame: MockWindow;
  let permittedOrigins: string[];

  let verifier: AncestorOriginVerifier;

  let timeoutManager = new JasmineTimeoutManager();

  beforeEach(() => {
    parentFrame = new MockWindow();
    providerFrame = new MockWindow(parentFrame);
    permittedOrigins = ['https://www.example.com', 'https://auth.example.com'];
    verifier =
        new AncestorOriginVerifier(providerFrame, permittedOrigins, TIMEOUT);
    timeoutManager.install();
  });

  afterEach(() => {
    timeoutManager.uninstall();
  });

  describe('verifyAncestorOrigin', () => {
    it('should post a ping message and listen for response', () => {
      let addEventListenerSpy = spyOn(providerFrame, 'addEventListener');
      let postMessageSpy = spyOn(parentFrame, 'postMessage');
      verifier.verifyAncestorOrigin(parentFrame, 0);

      // a listener should be registered to capture the verification
      // acknowledgement message
      expect(addEventListenerSpy)
          .toHaveBeenCalledWith('message', jasmine.anything());

      // the verification message should be sent
      expect(postMessageSpy)
          .toHaveBeenCalledWith(
              jasmine.objectContaining(
                  {type: PostMessageType.verifyPing, data: jasmine.anything()}),
              '*');
    });

    it('should timeout if no response arrives', (done) => {
      let expectFailNow = false;
      verifier.verifyAncestorOrigin(parentFrame, 0)
          .then(
              () => {
                done.fail('Verification should not succeed');
              },
              (err) => {
                expect(expectFailNow).toBeTruthy('Failed too early');
                expect(err).toEqual(
                    OpenYoloInternalError.parentVerifyTimeout());
                done();
              });

      // advance clock to just before the timeout
      jasmine.clock().tick(TIMEOUT - 1);
      expectFailNow = true;
      jasmine.clock().tick(1);
    });

    it('should resolve if a valid response arrives', async function(done) {
      let parentOrigin = permittedOrigins[0];

      parentFrame.addEventListener('message', (ev: MessageEvent) => {
        expect(ev.data.type).toBe(PostMessageType.verifyPing);
        // simulate the response message from the valid parent origin, and
        // with the received nonce value
        providerFrame.postMessageFromOrigin(
            verifyAckMessage(ev.data.data), null, parentOrigin, parentFrame);
      });

      let result = await verifier.verifyAncestorOrigin(parentFrame, 0);
      expect(result).toEqual(parentOrigin);
      done();
    });

    it('should reject the promise if the response comes from an invalid origin',
       async function(done) {
         let parentOrigin = 'https://www.3vil.com';

         let pingReceived = false;
         parentFrame.addEventListener('message', (ev: MessageEvent) => {
           expect(ev.data.type).toBe(PostMessageType.verifyPing);
           pingReceived = true;
           // simulate the response message from the wrong origin
           providerFrame.postMessageFromOrigin(
               verifyAckMessage(ev.data.data), null, parentOrigin, parentFrame);
         });

         let verifyPromise = verifier.verifyAncestorOrigin(parentFrame, 0);
         try {
           await verifyPromise;
           done.fail('Verification should not succeed');
         } catch (err) {
           expect(pingReceived).toBeTruthy();
           expect(err).toEqual(
               OpenYoloInternalError.untrustedOrigin(parentOrigin));
           done();
         }
       });

    it('should ignore different verification nonces', async function(done) {
      let parentOrigin = permittedOrigins[0];

      parentFrame.addEventListener('message', (ev: MessageEvent) => {
        expect(ev.data.type).toBe(PostMessageType.verifyPing);
        // simulate the response message from the valid parent origin,
        // but with a different nonce
        providerFrame.postMessageFromOrigin(
            verifyAckMessage('differentNonce'),
            null,
            parentOrigin,
            parentFrame);
      });

      let verifyPromise = verifier.verifyAncestorOrigin(parentFrame, 0);
      jasmine.clock().tick(TIMEOUT);
      try {
        await verifyPromise;
        done.fail('Verification should not succeed');
      } catch (err) {
        expect(err).toEqual(OpenYoloInternalError.parentVerifyTimeout());
        done();
      }
    });

    it('should ignore messages of the wrong type', async function(done) {
      let parentOrigin = permittedOrigins[0];

      parentFrame.addEventListener('message', (ev: MessageEvent) => {
        expect(ev.data.type).toBe(PostMessageType.verifyPing);
        // simulate the response message from the valid parent origin,
        // but with another ping instead of an ack
        providerFrame.postMessageFromOrigin(
            verifyPingMessage(ev.data.data), null, parentOrigin, parentFrame);
      });

      let verifyPromise = verifier.verifyAncestorOrigin(parentFrame, 0);
      jasmine.clock().tick(TIMEOUT);
      try {
        await verifyPromise;
        done.fail('Verification should not succeed');
      } catch (err) {
        expect(err).toEqual(OpenYoloInternalError.parentVerifyTimeout());
        done();
      }
    });

    it('should ignore messages that are not sourced from the window',
       async function(done) {
         let parentOrigin = permittedOrigins[0];

         let pingReceived = false;
         parentFrame.addEventListener('message', (ev: MessageEvent) => {
           expect(ev.data.type).toBe(PostMessageType.verifyPing);
           pingReceived = true;
           // simulate the response message from the valid parent origin,
           // but with a source that is not the provider frame
           providerFrame.dispatchEvent(createMessageEvent(
               verifyAckMessage(ev.data.data),
               parentOrigin,
               undefined,
               new MockWindow()));
         });

         let verifyPromise = verifier.verifyAncestorOrigin(parentFrame, 0);
         jasmine.clock().tick(TIMEOUT);
         try {
           await verifyPromise;
           done.fail('Verification should not succeed');
         } catch (err) {
           expect(pingReceived).toBeTruthy();
           expect(err).toEqual(OpenYoloInternalError.parentVerifyTimeout());
           done();
         }
       });
  });

  describe('verify', () => {

    describe('single parent allowed', () => {
      it('should resolve the promise when parent is valid',
         async function(done) {
           let parentOrigin = permittedOrigins[0];
           spyOn(verifier, 'verifyAncestorOrigin')
               .and.returnValue(Promise.resolve(parentOrigin));
           try {
             let result = await verifier.verify(false);
             expect(result).toEqual([parentOrigin]);
             done();
           } catch (err) {
             done.fail('Promise was rejected');
           }
         });

      it('should reject the promise when the parent is invalid',
         async function(done) {
           let parentOrigin = 'https://www.3vil.com';
           let expectedError =
               OpenYoloInternalError.untrustedOrigin(parentOrigin);
           spyOn(verifier, 'verifyAncestorOrigin')
               .and.returnValue(Promise.reject(expectedError));
           try {
             await verifier.verify(false);
             done.fail('Promise should not resolve');
           } catch (err) {
             expect(err).toEqual(expectedError);
             done();
           }
         });

      it('should reject the promise if more than one ancestor frame',
         async function(done) {
           let ancestorFrame = new MockWindow();
           parentFrame.parent = ancestorFrame;

           try {
             await verifier.verify(false);
             done.fail('Promise should not resolve');
           } catch (err) {
             expect(err).toEqual(OpenYoloInternalError.parentIsNotRoot());
             done();
           }
         });
    });

    describe('multiple ancestors allowed', () => {

      let ancestorFrame: MockWindow;

      beforeEach(() => {
        ancestorFrame = new MockWindow();
        parentFrame.parent = ancestorFrame;
      });

      it('should resolve the promise if all ancestors valid',
         async function(done) {
           spyOn(verifier, 'verifyAncestorOrigin')
               .and.callFake((ancestor: any) => {
                 if (ancestor === parentFrame) {
                   return Promise.resolve(permittedOrigins[1]);
                 } else if (ancestor === ancestorFrame) {
                   return Promise.resolve(permittedOrigins[0]);
                 }
                 done.fail('unknown frame');
               });

           try {
             let result = await verifier.verify(true);
             expect(result).toEqual([permittedOrigins[1], permittedOrigins[0]]);
             done();
           } catch (err) {
             done.fail('Promise rejected');
           }
         });

      it('should reject the promise if any ancestor is invalid',
         async function(done) {
           let expectedError =
               OpenYoloInternalError.untrustedOrigin('https://www.3vil.com');
           spyOn(verifier, 'verifyAncestorOrigin')
               .and.callFake((ancestor: any) => {
                 if (ancestor === parentFrame) {
                   return Promise.resolve(permittedOrigins[0]);
                 } else if (ancestor === ancestorFrame) {
                   return Promise.reject(expectedError);
                 }
                 done.fail('unknown frame');
               });

           try {
             await verifier.verify(true);
             done.fail('Promise should not resolve');
           } catch (err) {
             expect(err).toEqual(expectedError);
             done();
           }
         });
    });
  });
});
