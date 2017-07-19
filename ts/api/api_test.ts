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

import {OYCredential, OYCredentialHintOptions, OYCredentialRequestOptions, OYProxyLoginResponse} from '../protocol/data';
import {SecureChannel} from '../protocol/secure_channel';
import {PromiseResolver} from '../protocol/utils';

import {InitializeOnDemandApi, openyolo, OpenYoloWithTimeoutApi} from './api';
import {DisableAutoSignIn} from './disable_auto_sign_in';
import {WrapBrowserRequest} from './wrap_browser_request';

type OpenYoloWithTimeoutApiMethods = keyof OpenYoloWithTimeoutApi;

describe('OpenYolo API', () => {
  const credential: OYCredential = {id: 'test', authMethod: 'test'};
  const expectedError = new Error('ERROR!');
  const secureChannelSpy =
      jasmine.createSpyObj('SecureChannel', ['send', 'listen', 'dispose']);

  describe('setTimeouts', () => {
    it('raises an error if given a negative number', () => {
      expect(() => {
        openyolo.setTimeouts(-1);
      }).toThrowError();
    });

    it('resets if changes to disable', () => {
      spyOn(openyolo, 'reset');
      openyolo.setTimeouts(0);
      expect(openyolo.reset).toHaveBeenCalled();
      // Do no call reset a second time.
      openyolo.setTimeouts(0);
      expect(openyolo.reset).toHaveBeenCalledTimes(1);
    });

    it('does not reset if changes to positive value', () => {
      spyOn(openyolo, 'reset');
      openyolo.setTimeouts(1);
      expect(openyolo.reset).not.toHaveBeenCalled();
    });
  });

  describe('initialization', () => {
    let openYoloApiImplSpy:
        {[key in OpenYoloWithTimeoutApiMethods]: jasmine.Spy};
    beforeEach(() => {
      openyolo.setTimeouts(null);
      openYoloApiImplSpy = jasmine.createSpyObj('OpenYoloApiImpl', [
        'hintsAvailable',
        'hint',
        'retrieve',
        'save',
        'proxyLogin',
        'disableAutoSignIn',
        'cancelLastOperation',
        'dispose'
      ]);
    });

    it('allows to initialize again if failed first time', (done) => {
      spyOn(InitializeOnDemandApi, 'createOpenYoloApi')
          .and.returnValue(Promise.reject(expectedError));
      // The operation does not matter here.
      openyolo.disableAutoSignIn()
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(error).toBe(expectedError);
                // Successful operation.
                (InitializeOnDemandApi.createOpenYoloApi as jasmine.Spy)
                    .and.returnValue(Promise.resolve(openYoloApiImplSpy));
                // Successful operation.
                openYoloApiImplSpy.disableAutoSignIn.and.returnValue(
                    Promise.resolve());
                return openyolo.disableAutoSignIn();
              })
          .then(done);
    });

    it('secure channel connection fails', (done) => {
      spyOn(SecureChannel, 'clientConnectNoTimeout')
          .and.returnValue(Promise.reject(expectedError));
      // The operation does not matter here.
      openyolo.disableAutoSignIn().then(
          () => {
            done.fail('Should not resolve!');
          },
          (error) => {
            expect(error).toBe(expectedError);
            openyolo.reset();
            done();
          });
    });

    it('wrap browser fails', (done) => {
      spyOn(SecureChannel, 'clientConnectNoTimeout')
          .and.returnValue(Promise.resolve(secureChannelSpy));
      spyOn(WrapBrowserRequest.prototype, 'dispatch')
          .and.returnValue(Promise.reject(expectedError));
      spyOn(DisableAutoSignIn.prototype, 'dispatch')
          .and.returnValue(Promise.resolve());
      // The operation does not matter here.
      openyolo.disableAutoSignIn().then(
          () => {
            // Ignore the failed request.
            openyolo.reset();
            done();
          },
          (error) => {
            done.fail('Should not reject!');
          });
    });

    it('wrap browser succeeds', (done) => {
      spyOn(SecureChannel, 'clientConnectNoTimeout')
          .and.returnValue(Promise.resolve(secureChannelSpy));
      spyOn(WrapBrowserRequest.prototype, 'dispatch')
          .and.returnValue(Promise.resolve(false));
      spyOn(DisableAutoSignIn.prototype, 'dispatch')
          .and.returnValue(Promise.resolve());
      // The operation does not matter here.
      openyolo.disableAutoSignIn().then(
          () => {
            openyolo.reset();
            done();
          },
          (error) => {
            done.fail('Should not reject!');
          });
    });

    describe('timeouts', () => {
      beforeEach(() => {
        jasmine.clock().install();
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('timeouts disabled', (done) => {
        const promiseResolver = new PromiseResolver<void>();
        spyOn(SecureChannel, 'clientConnectNoTimeout')
            .and.returnValue(promiseResolver.promise);
        spyOn(WrapBrowserRequest.prototype, 'dispatch')
            .and.returnValue(Promise.resolve(false));
        spyOn(DisableAutoSignIn.prototype, 'dispatch')
            .and.returnValue(Promise.resolve());
        openyolo.setTimeouts(0);
        // The operation does not matter here.
        openyolo.disableAutoSignIn().then(
            () => {
              openyolo.reset();
              done();
            },
            (error) => {
              console.log(error);
              done.fail('Should not reject!');
            });
        jasmine.clock().tick(Infinity);
        promiseResolver.resolve(secureChannelSpy);
      });

      it('custom timeouts set', (done) => {
        const promiseResolver = new PromiseResolver<void>();
        spyOn(SecureChannel, 'clientConnectNoTimeout')
            .and.returnValue(promiseResolver.promise);
        let timeoutExpired = false;
        openyolo.setTimeouts(100);
        // The operation does not matter here.
        openyolo.disableAutoSignIn().then(
            () => {
              done.fail('Should not resolve!');
            },
            (error) => {
              expect(timeoutExpired).toBe(true);
              openyolo.reset();
              done();
            });
        jasmine.clock().tick(99);
        timeoutExpired = true;
        jasmine.clock().tick(1);
        // Does not matter, too late.
        promiseResolver.resolve(secureChannelSpy);
      });
    });

    describe('successful initialization', () => {
      beforeEach(() => {
        spyOn(InitializeOnDemandApi, 'createOpenYoloApi')
            .and.returnValue(Promise.resolve(openYoloApiImplSpy));
      });

      it('disableAutoSignIn', (done) => {
        openYoloApiImplSpy.disableAutoSignIn.and.returnValue(Promise.resolve());
        openyolo.disableAutoSignIn().then(() => {
          expect(openYoloApiImplSpy.disableAutoSignIn)
              .toHaveBeenCalledWith(jasmine.any(Object));
          done();
        });
      });

      it('hintsAvailable', (done) => {
        const options: OYCredentialHintOptions = {supportedAuthMethods: []};
        openYoloApiImplSpy.hintsAvailable.and.returnValue(
            Promise.resolve(true));
        openyolo.hintsAvailable(options).then((result) => {
          expect(result).toBe(true);
          expect(openYoloApiImplSpy.hintsAvailable)
              .toHaveBeenCalledWith(options, jasmine.any(Object));
          done();
        });
      });

      it('hint', (done) => {
        const options: OYCredentialHintOptions = {supportedAuthMethods: []};
        openYoloApiImplSpy.hint.and.returnValue(Promise.resolve(credential));
        openyolo.hint(options).then((cred) => {
          expect(cred).toBe(credential);
          expect(openYoloApiImplSpy.hint)
              .toHaveBeenCalledWith(options, jasmine.any(Object));
          done();
        });
      });

      it('retrieve', (done) => {
        const options: OYCredentialRequestOptions = {supportedAuthMethods: []};
        openYoloApiImplSpy.retrieve.and.returnValue(
            Promise.resolve(credential));
        openyolo.retrieve(options).then((cred) => {
          expect(cred).toBe(credential);
          expect(openYoloApiImplSpy.retrieve)
              .toHaveBeenCalledWith(options, jasmine.any(Object));
          done();
        });
      });

      it('proxyLogin', (done) => {
        const expectedResponse:
            OYProxyLoginResponse = {statusCode: 200, responseText: 'test'};
        openYoloApiImplSpy.proxyLogin.and.returnValue(
            Promise.resolve(expectedResponse));
        openyolo.proxyLogin(credential).then((response) => {
          expect(response).toBe(expectedResponse);
          expect(openYoloApiImplSpy.proxyLogin)
              .toHaveBeenCalledWith(credential, jasmine.any(Object));
          done();
        });
      });

      it('save', (done) => {
        openYoloApiImplSpy.save.and.returnValue(Promise.resolve());
        openyolo.save(credential).then(() => {
          expect(openYoloApiImplSpy.save)
              .toHaveBeenCalledWith(credential, jasmine.any(Object));
          done();
        });
      });

      it('cancelLastOperation', (done) => {
        openYoloApiImplSpy.cancelLastOperation.and.returnValue(
            Promise.resolve());
        openyolo.cancelLastOperation().then(() => {
          expect(openYoloApiImplSpy.cancelLastOperation)
              .toHaveBeenCalledWith(jasmine.any(Object));
          done();
        });
      });
    });
  });
});
