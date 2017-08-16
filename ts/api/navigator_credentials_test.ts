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

import {OpenYoloCredential as OpenYoloCredential, OpenYoloCredentialRequestOptions as OpenYoloCredentialRequestOptions} from '../protocol/data';
import {AUTHENTICATION_METHODS} from '../protocol/data';
import {InternalErrorCode, OpenYoloErrorType, OpenYoloInternalError} from '../protocol/errors';

import {OpenYoloApi} from './api';
import {NavigatorCredentials, NoOpNavigatorCredentials} from './navigator_credentials';

describe('NavigatorCredentials', () => {
  if (!navigator.credentials) {
    // Only test browsers with navigator.credentials implemented (Chrome).
    return;
  }
  let cmApi = navigator.credentials!;
  let navigatorCredentials: OpenYoloApi;

  beforeEach(() => {
    navigatorCredentials = new NavigatorCredentials(cmApi);
  });

  describe('disableAutoSignIn', () => {
    it('resolves when success', (done) => {
      spyOn(cmApi, 'requireUserMediation').and.returnValue(Promise.resolve());
      navigatorCredentials.disableAutoSignIn().then(done);
    });

    it('resolves when insecure origin error', (done) => {
      spyOn(cmApi, 'requireUserMediation')
          .and.returnValue(Promise.reject(new Error('Insecure origin!')));
      navigatorCredentials.disableAutoSignIn().then(done);
    });
  });

  describe('retrieve', () => {
    it('returns the federated credential', done => {
      const options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.GOOGLE]
      };
      const federatedCredential = new FederatedCredential({
        provider: AUTHENTICATION_METHODS.GOOGLE,
        protocol: 'openidconnect',
        name: 'Name',
        iconURL: 'https://www.example.com/icon.jpg',
        id: 'user@example.com'
      });
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(federatedCredential));
      navigatorCredentials.retrieve(options).then(credential => {
        expect(cmApi.get).toHaveBeenCalledWith(jasmine.objectContaining({
          password: false,
          federated:
              {providers: [AUTHENTICATION_METHODS.GOOGLE], protocols: []},
          unmediated: false
        }));
        expect(credential).toEqual({
          id: 'user@example.com',
          authMethod: AUTHENTICATION_METHODS.GOOGLE,
          displayName: 'Name',
          profilePicture: 'https://www.example.com/icon.jpg',
          proxiedAuthRequired: false
        });
        done();
      });
    });

    it('returns the password credential', done => {
      const options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
      };
      const passwordCredential = new PasswordCredential({
        name: 'Name',
        iconURL: 'https://www.example.com/icon.jpg',
        type: 'password',
        id: 'user@example.com',
        idName: 'username',
        passwordName: 'password',
        password: 'password',
        additionalData: null
      });
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(passwordCredential));
      navigatorCredentials.retrieve(options).then(credential => {
        expect(cmApi.get).toHaveBeenCalledWith(jasmine.objectContaining({
          password: true,
          federated: {providers: [], protocols: []},
          unmediated: false
        }));
        expect(credential).toEqual(jasmine.objectContaining({
          id: 'user@example.com',
          authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
          displayName: 'Name',
          profilePicture: 'https://www.example.com/icon.jpg',
          proxiedAuthRequired: false,
          password: 'password'
        }));
        done();
      });
    });

    it('rejects when no credential', done => {
      const options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.GOOGLE]
      };
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve());
      navigatorCredentials.retrieve(options).then(
          credential => {
            done.fail('Should not resolve!');
          },
          (error) => {
            expect(OpenYoloInternalError.errorIs(
                error, InternalErrorCode.noCredentialsAvailable));
            done();
          });
    });

    it('fails', done => {
      const options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.GOOGLE]
      };
      const expectedError = new Error('ERROR!');
      spyOn(cmApi, 'get').and.returnValue(Promise.reject(expectedError));
      navigatorCredentials.retrieve(options).then(
          () => {
            done.fail('Unexpected success!');
          },
          error => {
            expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
            done();
          });
    });
  });

  describe('cancelLastOperation', () => {
    it('always resolves', done => {
      navigatorCredentials.cancelLastOperation().then(done);
    });
  });

  describe('save', () => {
    it('saves the password credential', done => {
      const credential: OpenYoloCredential = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Name',
        profilePicture: 'http://www.example.com/icon.jpg',
        proxiedAuthRequired: false,  // Does not matter but required.
        password: 'password'
      };
      const fakeSavedCred = {};
      spyOn(cmApi, 'store').and.callFake((cred: any) => {
        expect(cred instanceof PasswordCredential).toBe(true);
        expect(cred.id).toEqual('user@example.com');
        expect(cred.name).toEqual('Name');
        expect(cred.iconURL).toEqual('http://www.example.com/icon.jpg');
        return Promise.resolve(fakeSavedCred);
      });
      navigatorCredentials.save(credential).then(done);
    });

    it('saves the federated credential', done => {
      const credential: OpenYoloCredential = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.GOOGLE,
        displayName: 'Name',
        profilePicture: 'http://www.example.com/icon.jpg',
        proxiedAuthRequired: false  // Does not matter but required.
      };
      const fakeSavedCred = {};
      spyOn(cmApi, 'store').and.callFake((cred: any) => {
        expect(cred instanceof FederatedCredential).toBe(true);
        expect(cred.id).toEqual('user@example.com');
        expect(cred.provider).toEqual(AUTHENTICATION_METHODS.GOOGLE);
        expect(cred.name).toEqual('Name');
        expect(cred.iconURL).toEqual('http://www.example.com/icon.jpg');
        return Promise.resolve(fakeSavedCred);
      });
      navigatorCredentials.save(credential).then(done);
    });

    it('fails', done => {
      const expectedError = new Error('ERROR!');
      spyOn(cmApi, 'store').and.returnValue(Promise.reject(expectedError));
      const credential: OpenYoloCredential = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.GOOGLE,
        displayName: 'Name',
        profilePicture: 'http://www.example.com/icon.jpg',
        proxiedAuthRequired: false  // Does not matter but required.
      };
      navigatorCredentials.save(credential)
          .then(
              () => {
                done.fail('Unexpected success!');
              },
              error => {
                expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
                done();
              });
    });
  });

  describe('proxyLogin', () => {
    const options: OpenYoloCredentialRequestOptions = {
      supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
    };

    let credential: PasswordCredential;

    beforeEach(() => {
      credential = {
        name: 'Name',
        iconURL: 'icon.jpg',
        type: 'password',
        id: 'user@example.com',
        idName: 'username',
        passwordName: 'password',
        additionalData: null
      };
    });

    it('fetches with the correct credential', done => {
      const otherCredential: PasswordCredential = {
        name: 'Name 2',
        iconURL: 'icon.jpg',
        type: 'password',
        id: 'user2@example.com',
        idName: 'username',
        passwordName: 'password',
        additionalData: null
      };
      const expectedResponse = {
        status: 200,
        text: () => {
          return Promise.resolve('Signed in!');
        }
      };
      const getSpy = spyOn(cmApi, 'get');
      getSpy.and.returnValue(Promise.resolve(otherCredential));
      // We cannot test for the value of credentials passed to fetch method, as
      // once the Request object is created (with the `credentials` param), its
      // `credentials` property is set to "password". Any idea to properly test
      // is welcome.
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(expectedResponse));
      navigatorCredentials.retrieve(options)
          .then((cred) => {
            // Second call is the credential to use.
            getSpy.and.returnValue(Promise.resolve(credential));
            return navigatorCredentials.retrieve(options);
          })
          .then((cred) => {
            return navigatorCredentials.proxyLogin(cred);
          })
          .then((response) => {
            expect(response).toEqual(jasmine.objectContaining(
                {statusCode: 200, responseText: 'Signed in!'}));
            done();
          });
    });

    it('fetches return status different than 200 reject the promise', done => {
      const expectedResponse = {status: 400};
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(credential));
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(expectedResponse));
      navigatorCredentials.retrieve(options).then((cred) => {
        navigatorCredentials.proxyLogin(cred).then(
            (response) => {
              done.fail('Unexpected success!');
            },
            (error) => {
              expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
              expect(error.message)
                  .toContain(
                      'The API request failed to resolve: Status code 400');
              done();
            });
      });
    });

    it('requires the credential to be fetched first', done => {
      const cred = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Name',
        profilePicture: 'photo.jpg',
        isProxyLoginRequired: true
      };
      navigatorCredentials.proxyLogin(cred).then(
          (response) => {
            done.fail('Unexpected success!');
          },
          (error) => {
            expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
            expect(error.message).toContain('Invalid credential.');
            done();
          });
    });
  });

  describe('NoOp implementation', () => {
    beforeEach(() => {
      navigatorCredentials = new NoOpNavigatorCredentials();
    });

    it('retrieve', (done) => {
      navigatorCredentials.retrieve({supportedAuthMethods: []})
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(error.type)
                    .toEqual(OpenYoloErrorType.noCredentialsAvailable);
                done();
              });
    });

    it('hint', (done) => {
      navigatorCredentials.hint({supportedAuthMethods: []})
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(error.type)
                    .toEqual(OpenYoloErrorType.noCredentialsAvailable);
                done();
              });
    });

    it('hintsAvaialble', (done) => {
      navigatorCredentials.hintsAvailable({supportedAuthMethods: []})
          .then(done);
    });

    it('save', (done) => {
      const cred = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Name',
        profilePicture: 'photo.jpg',
        isProxyLoginRequired: true
      };
      navigatorCredentials.save(cred).then(done);
    });

    it('proxyLogin', (done) => {
      const cred = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Name',
        profilePicture: 'photo.jpg',
        isProxyLoginRequired: true
      };
      navigatorCredentials.proxyLogin(cred).then(
          () => {
            done.fail('Should not resolve!');
          },
          (error) => {
            expect(error.type).toEqual(OpenYoloErrorType.requestFailed);
            done();
          });
    });

    it('disableAutoSignIn', (done) => {
      navigatorCredentials.disableAutoSignIn().then(done);
    });

    it('disableAutcancelLastOperationoSignIn', (done) => {
      navigatorCredentials.cancelLastOperation().then(done);
    });
  });
});
