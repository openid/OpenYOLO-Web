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

import {OpenYoloCredential, OpenYoloCredentialHintOptions, OpenYoloCredentialRequestOptions, OpenYoloProxyLoginResponse, RequestContext} from '../protocol/data';
import {OpenYoloInternalError} from '../protocol/errors';
import {SecureChannel} from '../protocol/secure_channel';
import {PromiseResolver, TimeoutRacer} from '../protocol/utils';

import {InitializeOnDemandApi, openyolo, OpenYoloApi, OpenYoloApiImpl, OpenYoloWithTimeoutApi} from './api';
import {RelayRequest} from './base_request';
import {CancelLastOperationRequest} from './cancel_last_operation_request';
import {CredentialRequest} from './credential_request';
import {CredentialSave} from './credential_save';
import {DisableAutoSignIn} from './disable_auto_sign_in';
import {HintAvailableRequest} from './hint_available_request';
import {HintRequest} from './hint_request';
import {ProviderFrameElement} from './provider_frame_elem';
import {ProxyLogin} from './proxy_login';

type OpenYoloWithTimeoutApiMethods = keyof OpenYoloWithTimeoutApi;

describe('OpenYolo API', () => {
  const credential: OpenYoloCredential = {id: 'test', authMethod: 'test'};
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
      openyolo.cancelLastOperation()
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
                return openyolo.cancelLastOperation();
              })
          .then(done);
    });

    it('secure channel connection fails', (done) => {
      spyOn(SecureChannel, 'clientConnect')
          .and.returnValue(Promise.reject(expectedError));
      spyOn(ProviderFrameElement.prototype, 'dispose');
      // The operation does not matter here.
      openyolo.cancelLastOperation().then(
          () => {
            done.fail('Should not resolve!');
          },
          (error) => {
            expect(error).toBe(expectedError);
            expect(ProviderFrameElement.prototype.dispose).toHaveBeenCalled();
            openyolo.reset();
            done();
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
        spyOn(SecureChannel, 'clientConnect')
            .and.returnValue(promiseResolver.promise);
        // Avoid using DisableAutoSignIn here as it uses navigator.credentials.
        spyOn(CancelLastOperationRequest.prototype, 'dispatch')
            .and.returnValue(Promise.resolve());
        openyolo.setTimeouts(0);
        // The operation does not matter here.
        openyolo.cancelLastOperation().then(
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
        spyOn(SecureChannel, 'clientConnect')
            .and.returnValue(promiseResolver.promise);
        let timeoutExpired = false;
        openyolo.setTimeouts(100);
        // The operation does not matter here.
        openyolo.cancelLastOperation().then(
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
        const options:
            OpenYoloCredentialHintOptions = {supportedAuthMethods: []};
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
        const options: OpenYoloCredentialHintOptions = {
          supportedAuthMethods: [],
          context: RequestContext.signIn
        };
        openYoloApiImplSpy.hint.and.returnValue(Promise.resolve(credential));
        openyolo.hint(options).then((cred) => {
          expect(cred).toBe(credential);
          expect(openYoloApiImplSpy.hint)
              .toHaveBeenCalledWith(options, jasmine.any(Object));
          done();
        });
      });

      it('retrieve', (done) => {
        const options:
            OpenYoloCredentialRequestOptions = {supportedAuthMethods: []};
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
        const expectedResponse: OpenYoloProxyLoginResponse = {
          statusCode: 200,
          responseText: 'test'
        };
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

  describe('OpenYoloApiImpl', () => {
    const wrapBrowserError =
        OpenYoloInternalError.browserWrappingRequired().toExposedError();
    const otherError =
        OpenYoloInternalError.noCredentialsAvailable().toExposedError();

    let openYoloApiImpl: OpenYoloApiImpl;
    let timeoutRacerSpy: jasmine.SpyObj<TimeoutRacer>;
    let navCredentialsSpy: jasmine.SpyObj<OpenYoloApi>;

    beforeEach(() => {
      navCredentialsSpy = jasmine.createSpyObj('NavigatorCredentials', [
        'hintsAvailable',
        'hint',
        'retrieve',
        'save',
        'proxyLogin',
        'disableAutoSignIn',
        'cancelLastOperation'
      ]);
      const frameManager =
          jasmine.createSpyObj('ProviderFrameElement', ['display']);
      openYoloApiImpl = new OpenYoloApiImpl(
          frameManager, secureChannelSpy, navCredentialsSpy);
      timeoutRacerSpy =
          jasmine.createSpyObj('TimeoutRacer', ['race', 'hasTimedOut']);
    });

    type methodSignatures =
        {[key in keyof OpenYoloApi]: typeof OpenYoloApiImpl.prototype[key]};

    /**
     * Tests the behavior of operations implementations.
     * @param methodName The method of OpenYoloApi being tested.
     * @param operationRequest The request class's prototype being mocked.
     * @param options The request's options.
     * @param expectedResult The expected result when successful.
     */
    function testOperationImpl<M extends keyof methodSignatures, Opt, Res>(
        methodName: M,
        operationRequest: RelayRequest<Res, Opt>,
        options: Opt,
        expectedResult: Res) {
      let dispatchSpy: jasmine.Spy;

      beforeEach(() => {
        dispatchSpy = spyOn(operationRequest, 'dispatch');
      });

      it('dispatches the request', (done) => {
        dispatchSpy.and.returnValue(Promise.resolve(expectedResult));
        (openYoloApiImpl[methodName] as methodSignatures[M])(
            options, timeoutRacerSpy)
            .then((result: Res) => {
              expect(result).toBe(expectedResult);
              expect(dispatchSpy)
                  .toHaveBeenCalledWith(options, timeoutRacerSpy);
              done();
            });
      });

      it('propagates error', (done) => {
        timeoutRacerSpy.hasTimedOut.and.returnValue(false);
        dispatchSpy.and.returnValue(Promise.reject(otherError));
        (openYoloApiImpl[methodName] as methodSignatures[M])(
            options, timeoutRacerSpy)
            .then(
                () => {
                  done.fail('Should not resolve!');
                },
                (error: Error) => {
                  expect(error).toBe(otherError);
                  done();
                });
      });

      it('captures timeout and cancel operation', (done) => {
        // Simulate timeout error.
        timeoutRacerSpy.hasTimedOut.and.returnValue(true);
        dispatchSpy.and.returnValue(Promise.reject(otherError));
        spyOn(CancelLastOperationRequest.prototype, 'dispatch');
        (openYoloApiImpl[methodName] as methodSignatures[M])(
            options, timeoutRacerSpy)
            .then(
                () => {
                  done.fail('Should not resolve!');
                },
                (error: Error) => {
                  expect(error).toBe(otherError);
                  expect(CancelLastOperationRequest.prototype.dispatch)
                      .toHaveBeenCalledWith(undefined, undefined);
                  done();
                });
      });

      it('delegates to credential', (done) => {
        timeoutRacerSpy.hasTimedOut.and.returnValue(false);
        dispatchSpy.and.returnValue(Promise.reject(wrapBrowserError));
        navCredentialsSpy[methodName].and.returnValue(
            Promise.resolve(expectedResult));
        (openYoloApiImpl[methodName] as methodSignatures[M])(
            options, timeoutRacerSpy)
            .then((result: Res) => {
              expect(result).toBe(expectedResult);
              expect(navCredentialsSpy[methodName])
                  .toHaveBeenCalledWith(options);
              done();
            });
      });
    }

    describe('hintsAvailable', () => {
      const options: OpenYoloCredentialHintOptions = {
        supportedAuthMethods: ['https://accounts.google.com']
      };

      testOperationImpl(
          'hintsAvailable', HintAvailableRequest.prototype, options, true);
    });

    describe('hint', () => {
      const options: OpenYoloCredentialHintOptions = {
        supportedAuthMethods: ['https://accounts.google.com']
      };

      testOperationImpl('hint', HintRequest.prototype, options, credential);
    });

    describe('retrieve', () => {
      const options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: ['https://accounts.google.com']
      };

      testOperationImpl(
          'retrieve', CredentialRequest.prototype, options, credential);
    });

    describe('save', () => {
      testOperationImpl(
          'save', CredentialSave.prototype, credential, undefined);
    });

    describe('proxyLogin', () => {
      testOperationImpl(
          'proxyLogin', ProxyLogin.prototype, credential, undefined);
    });

    describe('cancelLastOperation', () => {
      let dispatchSpy: jasmine.Spy;

      beforeEach(() => {
        dispatchSpy = spyOn(CancelLastOperationRequest.prototype, 'dispatch');
      });

      it('dispatches the request', (done) => {
        dispatchSpy.and.returnValue(Promise.resolve());
        openYoloApiImpl.cancelLastOperation(timeoutRacerSpy).then(() => {
          expect(dispatchSpy).toHaveBeenCalledWith(undefined, timeoutRacerSpy);
          done();
        });
      });

      it('propagates the error', (done) => {
        dispatchSpy.and.returnValue(Promise.reject(otherError));
        openYoloApiImpl.cancelLastOperation(timeoutRacerSpy)
            .then(
                () => {
                  done.fail('Should not resolve!');
                },
                (error) => {
                  expect(error).toBe(otherError);
                  done();
                });
      });

      it('delegates to credential', (done) => {
        dispatchSpy.and.returnValue(Promise.reject(wrapBrowserError));
        navCredentialsSpy.cancelLastOperation.and.returnValue(
            Promise.resolve());
        openYoloApiImpl.cancelLastOperation(timeoutRacerSpy).then(() => {
          expect(navCredentialsSpy.cancelLastOperation).toHaveBeenCalled();
          done();
        });
      });
    });

    describe('disableAutoSignIn', () => {
      it('dispatches the request and calls navigator.credentials', (done) => {
        spyOn(DisableAutoSignIn.prototype, 'dispatch')
            .and.returnValue(Promise.resolve());
        navCredentialsSpy.disableAutoSignIn.and.returnValue(Promise.resolve());
        openYoloApiImpl.disableAutoSignIn(timeoutRacerSpy).then(() => {
          expect(DisableAutoSignIn.prototype.dispatch)
              .toHaveBeenCalledWith(undefined, timeoutRacerSpy);
          expect(navCredentialsSpy.disableAutoSignIn).toHaveBeenCalled();
          done();
        });
      });

      it('captures timeout and cancel operation', (done) => {
        // Simulate timeout error.
        timeoutRacerSpy.hasTimedOut.and.returnValue(true);
        spyOn(DisableAutoSignIn.prototype, 'dispatch')
            .and.returnValue(Promise.reject(otherError));
        spyOn(CancelLastOperationRequest.prototype, 'dispatch');
        openYoloApiImpl.disableAutoSignIn(timeoutRacerSpy)
            .then(
                () => {
                  done.fail('Should not resolve!');
                },
                (error: Error) => {
                  expect(error).toBe(otherError);
                  expect(CancelLastOperationRequest.prototype.dispatch)
                      .toHaveBeenCalledWith(undefined, undefined);
                  done();
                });
      });
    });
  });
});
