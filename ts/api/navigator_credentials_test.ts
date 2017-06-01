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

import {Credential as OpenYoloCredential, CredentialRequestOptions as OpenYoloCredentialRequestOptions} from '../protocol/data';
import {AUTHENTICATION_METHODS} from '../protocol/data';

import {NavigatorCredentials} from './navigator_credentials';

describe('NavigatorCredentials', () => {
  if (!navigator.credentials) {
    // Only test browsers with navigator.credentials implemented (Chrome).
    return;
  }
  let cmApi = navigator.credentials!;
  let navigatorCredentials: NavigatorCredentials;

  beforeEach(() => {
    navigatorCredentials = new NavigatorCredentials(cmApi);
  });

  describe('retrieve', () => {
    it('returns the federated credential', done => {
      let federatedCredential: FederatedCredential = {
        provider: AUTHENTICATION_METHODS.GOOGLE,
        protocol: null,
        name: 'Name',
        iconURL: 'icon.jpg',
        type: 'federated',
        id: 'user@example.com'
      };
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(federatedCredential));
      let options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.GOOGLE]
      };
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
          profilePicture: 'icon.jpg',
          proxiedAuthRequired: false
        });
        done();
      });
    });

    it('returns the password credential', done => {
      let passwordCredential: PasswordCredential = {
        name: 'Name',
        iconURL: 'icon.jpg',
        type: 'password',
        id: 'user@example.com',
        idName: 'username',
        passwordName: 'password',
        additionalData: null
      };
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(passwordCredential));
      let options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
      };
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
          profilePicture: 'icon.jpg',
          proxiedAuthRequired: true
        }));
        done();
      });
    });

    it('returns nothing', done => {
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve());
      navigatorCredentials.retrieve().then(credential => {
        expect(credential).toBeUndefined();
        done();
      });
    });

    it('fails', done => {
      let expectedError = new Error('ERROR!');
      spyOn(cmApi, 'get').and.returnValue(Promise.reject(expectedError));
      navigatorCredentials.retrieve().then(
          () => {
            done.fail('Unexpected success!');
          },
          error => {
            expect(error).toBe(expectedError);
            done();
          });
    });
  });

  describe('save', () => {
    it('saves the password credential', done => {
      let credential: OpenYoloCredential = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Name',
        profilePicture: 'http://www.example.com/icon.jpg',
        proxiedAuthRequired: false,  // Does not matter but required.
        password: 'password'
      };
      let fakeSavedCred = {};
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
      let credential: OpenYoloCredential = {
        id: 'user@example.com',
        authMethod: AUTHENTICATION_METHODS.GOOGLE,
        displayName: 'Name',
        profilePicture: 'http://www.example.com/icon.jpg',
        proxiedAuthRequired: false  // Does not matter but required.
      };
      let fakeSavedCred = {};
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
      let expectedError = new Error('ERROR!');
      spyOn(cmApi, 'store').and.returnValue(Promise.reject(expectedError));
      let credential: OpenYoloCredential = {
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
                expect(error).toBe(expectedError);
                done();
              });
    });
  });

  describe('proxyLogin', () => {
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
      let otherCredential: PasswordCredential = {
        name: 'Name 2',
        iconURL: 'icon.jpg',
        type: 'password',
        id: 'user2@example.com',
        idName: 'username',
        passwordName: 'password',
        additionalData: null
      };
      let expectedResponse = {
        status: 200,
        text: () => {
          return Promise.resolve('Signed in!');
        }
      };
      let getSpy = spyOn(cmApi, 'get');
      getSpy.and.returnValue(Promise.resolve(otherCredential));
      // We cannot test for the value of credentials passed to fetch method, as
      // once the Request object is created (with the `credentials` param), its
      // `credentials` property is set to "password". Any idea to properly test
      // is welcome.
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(expectedResponse));
      navigatorCredentials.retrieve()
          .then(cred => {
            // Second call is the credential to use.
            getSpy.and.returnValue(Promise.resolve(credential));
            return navigatorCredentials.retrieve();
          })
          .then(cred => {
            return navigatorCredentials.proxyLogin(cred);
          })
          .then((response) => {
            expect(response).toEqual(jasmine.objectContaining(
                {statusCode: 200, responseText: 'Signed in!'}));
            done();
          });
    });

    it('fetches return status different than 200 reject the promise', done => {
      let expectedResponse = {status: 400};
      spyOn(cmApi, 'get').and.returnValue(Promise.resolve(credential));
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(expectedResponse));
      navigatorCredentials.retrieve().then(cred => {
        navigatorCredentials.proxyLogin(cred).then(
            (response) => {
              done.fail('Unexpected success!');
            },
            (error) => {
              expect(error.message).toEqual('Error: status code 400');
              done();
            });
      });
    });

    it('requires the credential to be fetched first', done => {
      let cred = {
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
            expect(error.message).toEqual('Invalid credential!');
            done();
          });
    });
  });
});
