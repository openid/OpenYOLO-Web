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

import {Credential, CredentialHintOptions, CredentialRequestOptions, ProxyLoginResponse} from '../protocol/data';
import {SecureChannel} from '../protocol/secure_channel';

import {openyolo} from './api';
import {CancelLastOperationRequest} from './cancel_last_operation_request';
import {CredentialRequest} from './credential_request';
import {CredentialSave} from './credential_save';
import {DisableAutoSignIn} from './disable_auto_sign_in';
import {HintAvailableRequest} from './hint_available_request';
import {HintRequest} from './hint_request';
import {ProxyLogin} from './proxy_login';
import {WrapBrowserRequest} from './wrap_browser_request';

describe('OpenYolo API', () => {
  const credential: Credential = {id: 'test', authMethod: 'test'};
  const expectedError = new Error('ERROR!');
  const secureChannelSpy = jasmine.createSpyObj('SecureChannel', ['send']);

  describe('not wrapping browser', () => {
    beforeEach(() => {
      spyOn(WrapBrowserRequest.prototype, 'dispatch')
          .and.returnValue(Promise.resolve(false));
    });

    describe('timeouts enabled', () => {
      beforeEach(() => {
        spyOn(SecureChannel, 'clientConnect')
            .and.returnValue(Promise.resolve(secureChannelSpy));
        spyOn(SecureChannel, 'clientConnectNoTimeout')
            .and.throwError('Should not use the noTimeout method!');
      });

      describe('disableAutoSignIn', () => {
        it('works', async function(done) {
          spyOn(DisableAutoSignIn.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.disableAutoSignIn().then(() => {
            expect(DisableAutoSignIn.prototype.dispatch)
                .toHaveBeenCalledWith(undefined, 3000);
            done();
          });
        });
      });

      describe('hintsAvailable', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(true));
          openyolo.hintsAvailable(options).then((result) => {
            expect(result).toBe(true);
            expect(HintAvailableRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, 3000);
            done();
          });
        });

        it('returns false when rejects', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.hintsAvailable(options).then((result) => {
            expect(result).toBe(false);
            expect(HintAvailableRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, 3000);
            done();
          });
        });
      });

      describe('cancelLastRequest', () => {
        it('works', async function(done) {
          spyOn(CancelLastOperationRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(undefined));
          openyolo.cancelLastOperation().then((result) => {
            expect(result).toBeFalsy();
            expect(CancelLastOperationRequest.prototype.dispatch)
                .toHaveBeenCalledWith(undefined, 1000);
            done();
          });
        });
      });

      describe('hint', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(HintRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(credential));
          openyolo.hint(options).then((result) => {
            expect(result).toEqual(credential);
            expect(HintRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, 3000);
            done();
          });
        });

        it('rejects', async function(done) {
          spyOn(HintRequest.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.hint(options).then(
              () => {
                done.fail('Should not succeed!');
              },
              (error) => {
                expect(HintRequest.prototype.dispatch)
                    .toHaveBeenCalledWith(options, 3000);
                expect(error).toEqual(expectedError);
                done();
              });
        });
      });

      describe('retrieve', () => {
        const options: CredentialRequestOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(CredentialRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(credential));
          openyolo.retrieve(options).then((result) => {
            expect(result).toEqual(credential);
            expect(CredentialRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, 3000);
            done();
          });
        });

        it('rejects', async function(done) {
          spyOn(CredentialRequest.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.retrieve(options).then(
              () => {
                done.fail('Should not succeed!');
              },
              (error) => {
                expect(error).toEqual(expectedError);
                expect(CredentialRequest.prototype.dispatch)
                    .toHaveBeenCalledWith(options, 3000);
                done();
              });
        });
      });

      describe('save', () => {
        it('works', async function(done) {
          spyOn(CredentialSave.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.save(credential).then(() => {
            expect(CredentialSave.prototype.dispatch)
                .toHaveBeenCalledWith(credential, 3000);
            done();
          });
        });

        it('rejects', async function(done) {
          spyOn(CredentialSave.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.save(credential)
              .then(
                  () => {
                    done.fail('Should not succeed!');
                  },
                  (error) => {
                    expect(error).toEqual(expectedError);
                    expect(CredentialSave.prototype.dispatch)
                        .toHaveBeenCalledWith(credential, 3000);
                    done();
                  });
        });
      });

      describe('proxyLogin', () => {
        it('works', async function(done) {
          const expectedResponse:
              ProxyLoginResponse = {statusCode: 200, responseText: 'test'};
          spyOn(ProxyLogin.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(expectedResponse));
          openyolo.proxyLogin(credential).then((result) => {
            expect(result).toEqual(expectedResponse);
            expect(ProxyLogin.prototype.dispatch)
                .toHaveBeenCalledWith(credential, 10000);
            done();
          });
        });

        it('rejects', async function(done) {
          spyOn(ProxyLogin.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.proxyLogin(credential)
              .then(
                  () => {
                    done.fail('Should not succeed!');
                  },
                  (error) => {
                    expect(error).toEqual(expectedError);
                    expect(ProxyLogin.prototype.dispatch)
                        .toHaveBeenCalledWith(credential, 10000);
                    done();
                  });
        });
      });
    });

    describe('timeouts disabled', () => {
      beforeEach(() => {
        spyOn(SecureChannel, 'clientConnect')
            .and.throwError('Should not use the with timeout method!');
        spyOn(SecureChannel, 'clientConnectNoTimeout')
            .and.returnValue(Promise.resolve(secureChannelSpy));
        openyolo.setTimeoutsEnabled(false);
      });

      describe('disableAutoSignIn', () => {
        it('works', async function(done) {
          spyOn(DisableAutoSignIn.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.disableAutoSignIn().then(() => {
            expect(DisableAutoSignIn.prototype.dispatch)
                .toHaveBeenCalledWith(undefined, undefined);
            done();
          });
        });
      });

      describe('hintsAvailable', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(true));
          openyolo.hintsAvailable(options).then((result) => {
            expect(result).toBe(true);
            expect(HintAvailableRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, undefined);
            done();
          });
        });
      });

      describe('hint', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(HintRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(credential));
          openyolo.hint(options).then((result) => {
            expect(result).toEqual(credential);
            expect(HintRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, undefined);
            done();
          });
        });
      });

      describe('retrieve', () => {
        const options: CredentialRequestOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(CredentialRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(credential));
          openyolo.retrieve(options).then((result) => {
            expect(result).toEqual(credential);
            expect(CredentialRequest.prototype.dispatch)
                .toHaveBeenCalledWith(options, undefined);
            done();
          });
        });
      });

      describe('save', () => {
        it('works', async function(done) {
          spyOn(CredentialSave.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.save(credential).then(() => {
            expect(CredentialSave.prototype.dispatch)
                .toHaveBeenCalledWith(credential, undefined);
            done();
          });
        });
      });

      describe('proxyLogin', () => {
        it('works', async function(done) {
          const expectedResponse:
              ProxyLoginResponse = {statusCode: 200, responseText: 'test'};
          spyOn(ProxyLogin.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(expectedResponse));
          openyolo.proxyLogin(credential).then((result) => {
            expect(result).toEqual(expectedResponse);
            expect(ProxyLogin.prototype.dispatch)
                .toHaveBeenCalledWith(credential, undefined);
            done();
          });
        });
      });

      describe('cancelLastOperation', () => {
        it('works', async function(done) {
          spyOn(CancelLastOperationRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.cancelLastOperation().then(() => {
            expect(CancelLastOperationRequest.prototype.dispatch)
                .toHaveBeenCalledWith(undefined, undefined);
            done();
          });
        });
      });

    });
  });
});
