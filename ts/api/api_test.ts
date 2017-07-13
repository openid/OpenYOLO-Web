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
import {OpenYoloError} from '../protocol/errors';
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
  const secureChannelSpy =
      jasmine.createSpyObj('SecureChannel', ['send', 'dispose']);

  beforeEach(() => {
    openyolo.reset();
  });

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

  describe('not wrapping browser', () => {
    beforeEach(() => {
      spyOn(WrapBrowserRequest.prototype, 'dispatch')
          .and.returnValue(Promise.resolve(false));
      spyOn(SecureChannel, 'clientConnectNoTimeout')
          .and.returnValue(Promise.resolve(secureChannelSpy));
    });

    describe('default timeouts', () => {
      describe('disableAutoSignIn', () => {
        it('works', async function(done) {
          spyOn(DisableAutoSignIn.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.disableAutoSignIn().then(done);
        });
      });

      describe('hintsAvailable', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('works', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch')
              .and.returnValue(Promise.resolve(true));
          openyolo.hintsAvailable(options).then((result) => {
            expect(result).toBe(true);
            done();
          });
        });

        it('returns false when rejects', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch')
              .and.returnValue(Promise.reject(expectedError));
          openyolo.hintsAvailable(options).then((result) => {
            expect(result).toBe(false);
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
                done();
              });
        });
      });

      describe('save', () => {
        it('works', async function(done) {
          spyOn(CredentialSave.prototype, 'dispatch')
              .and.returnValue(Promise.resolve());
          openyolo.save(credential).then(() => {
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
                    done();
                  });
        });
      });
    });

    describe('timeouts disabled', () => {
      beforeEach(() => {
        jasmine.clock().install();
        // Disable timeouts.
        openyolo.setTimeouts(0);
      });
      afterEach(() => {
        jasmine.clock().uninstall();
      });

      describe('disableAutoSignIn', () => {
        it('never times out', async function(done) {
          spyOn(DisableAutoSignIn.prototype, 'dispatch');
          openyolo.disableAutoSignIn().then(
              () => {
                done.fail('Should never resolve!');
              },
              (error) => {
                done.fail('Should never reject!');
              });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('hintsAvailable', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('never times out', async function(done) {
          spyOn(HintAvailableRequest.prototype, 'dispatch');
          openyolo.hintsAvailable(options).then(
              () => {
                done.fail('Should never resolve!');
              },
              (error) => {
                done.fail('Should never reject!');
              });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('hint', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('never times out', async function(done) {
          spyOn(HintRequest.prototype, 'dispatch');
          openyolo.hint(options).then(
              () => {
                done.fail('Should never resolve!');
              },
              (error) => {
                done.fail('Should never reject!');
              });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('retrieve', () => {
        const options: CredentialRequestOptions = {supportedAuthMethods: []};

        it('never times out', async function(done) {
          spyOn(CredentialRequest.prototype, 'dispatch');
          openyolo.retrieve(options).then(
              () => {
                done.fail('Should never resolve!');
              },
              (error) => {
                done.fail('Should never reject!');
              });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('save', () => {
        it('never times out', async function(done) {
          spyOn(CredentialSave.prototype, 'dispatch');
          openyolo.save(credential)
              .then(
                  () => {
                    done.fail('Should never resolve!');
                  },
                  (error) => {
                    done.fail('Should never reject!');
                  });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('proxyLogin', () => {
        it('nefver times out', async function(done) {
          spyOn(ProxyLogin.prototype, 'dispatch');
          openyolo.proxyLogin(credential)
              .then(
                  () => {
                    done.fail('Should never resolve!');
                  },
                  (error) => {
                    done.fail('Should never reject!');
                  });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

      describe('cancelLastOperation', () => {
        it('never times out', async function(done) {
          spyOn(CancelLastOperationRequest.prototype, 'dispatch');
          openyolo.cancelLastOperation().then(
              () => {
                done.fail('Should never resolve!');
              },
              (error) => {
                done.fail('Should never reject!');
              });
          jasmine.clock().tick(Infinity);
          Promise.resolve().then(done);
        });
      });

    });

    describe('custom timeout', () => {
      const timeoutMs = 100;

      beforeEach(() => {
        jasmine.clock().install();
        openyolo.setTimeouts(timeoutMs);
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      describe('disableAutoSignIn', () => {
        it('times out', async function(done) {
          openyolo.disableAutoSignIn().then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                done();
              });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('hintsAvailable', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('times out', async function(done) {
          openyolo.hintsAvailable(options).then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                done();
              });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('cancelLastRequest', () => {
        it('times out', async function(done) {
          openyolo.cancelLastOperation().then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                done();
              });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('hint', () => {
        const options: CredentialHintOptions = {supportedAuthMethods: []};

        it('times out', async function(done) {
          openyolo.hint(options).then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                done();
              });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('retrieve', () => {
        const options: CredentialRequestOptions = {supportedAuthMethods: []};

        it('times out', async function(done) {
          openyolo.retrieve(options).then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                done();
              });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('save', () => {
        it('times out', async function(done) {
          openyolo.save(credential)
              .then(
                  () => {
                    done.fail('Should not resolve!');
                  },
                  (error) => {
                    expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                    done();
                  });
          jasmine.clock().tick(timeoutMs);
        });
      });

      describe('proxyLogin', () => {
        it('times out', async function(done) {
          openyolo.proxyLogin(credential)
              .then(
                  () => {
                    done.fail('Should not resolve!');
                  },
                  (error) => {
                    expect(OpenYoloError.errorIs(error, 'requestTimeout'));
                    done();
                  });
          jasmine.clock().tick(timeoutMs);
        });
      });
    });
  });
});
