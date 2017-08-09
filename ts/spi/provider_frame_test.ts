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

import {PrimaryClientConfiguration} from '../protocol/client_config';
import {AUTHENTICATION_METHODS, OpenYoloCredential, OpenYoloCredentialHintOptions, OpenYoloCredentialRequestOptions} from '../protocol/data';
import {OpenYoloErrorType, OpenYoloInternalError} from '../protocol/errors';
import * as msg from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {PromiseResolver} from '../protocol/utils';
import {FakeProviderConnection} from '../test_utils/channels';
import {MockWindow} from '../test_utils/frames';
import {JasmineTimeoutManager} from '../test_utils/timeout';

import {AncestorOriginVerifier} from './ancestor_origin_verifier';
import {AffiliationProvider, ClientConfigurationProvider, CredentialDataProvider, DisplayCallbacks, InteractionProvider, LocalStateProvider, ProviderConfiguration} from './provider_config';
import {ProviderFrame} from './provider_frame';

const TEST_AUTH_DOMAIN = 'https://www.example.com';
const TEST_CLIENT_NONCE = '1234';

describe('ProviderFrame', () => {

  let parentWindow: MockWindow;
  let window: MockWindow;
  let affiliationProvider: TestAffiliationProvider;
  let clientConfigurationProvider: TestClientConfigurationProvider;
  let credentialDataProvider: TestCredentialDataProvider;
  let interactionProvider: InteractionProvider;
  let localStateProvider: TestLocalStateProvider;

  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;

  let frameConfig: ProviderConfiguration;

  let alicePwdCred: OpenYoloCredential;
  let bobPwdCred: OpenYoloCredential;
  let carlGoogCred: OpenYoloCredential;
  let deliaFbCred: OpenYoloCredential;
  let elisaOtherDomainCred: OpenYoloCredential;

  let timeoutManager = new JasmineTimeoutManager();

  beforeEach(() => {
    parentWindow = new MockWindow();
    window = new MockWindow(parentWindow);

    affiliationProvider = new TestAffiliationProvider();
    clientConfigurationProvider = new TestClientConfigurationProvider();
    credentialDataProvider = new TestCredentialDataProvider();
    interactionProvider = jasmine.createSpyObj('InteractionProvider', [
      'showCredentialPicker',
      'showHintPicker',
      'showSaveConfirmation',
      'showAutoSignIn',
      'dispose'
    ]);
    localStateProvider = new TestLocalStateProvider();

    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;

    frameConfig = {
      clientAuthDomain: TEST_AUTH_DOMAIN,
      clientNonce: TEST_CLIENT_NONCE,
      window,
      affiliationProvider,
      clientConfigurationProvider,
      credentialDataProvider,
      interactionProvider,
      localStateProvider,
      allowDirectAuth: true
    };

    alicePwdCred = {
      id: 'alice@example.com',
      authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
      authDomain: TEST_AUTH_DOMAIN,
      password: 'passw0rd'
    };

    bobPwdCred = {
      id: 'bob@example.com',
      authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
      authDomain: TEST_AUTH_DOMAIN,
      password: '12345'
    };

    carlGoogCred = {
      id: 'carl@gmail.com',
      authMethod: AUTHENTICATION_METHODS.GOOGLE,
      authDomain: TEST_AUTH_DOMAIN
    };

    deliaFbCred = {
      id: 'delia',
      authMethod: AUTHENTICATION_METHODS.FACEBOOK,
      authDomain: TEST_AUTH_DOMAIN
    };

    elisaOtherDomainCred = {
      id: 'elisa@mail.ru',
      authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
      authDomain: 'https://auth.other.com',
      password: 'correcthorsebatterystaple'
    };

    timeoutManager.install();
  });

  afterEach(() => {
    timeoutManager.uninstall();
  });

  describe('initialize', () => {
    it('should succeed for enabled domains', async function(done) {
      spyOn(SecureChannel, 'providerConnect')
          .and.returnValue(Promise.resolve(providerChannel));

      spyOn(AncestorOriginVerifier, 'verifyOnlyParent')
          .and.returnValue(Promise.resolve(TEST_AUTH_DOMAIN));

      clientConfigurationProvider.configMap[TEST_AUTH_DOMAIN] = {
        type: 'primary',
        apiEnabled: true
      };

      ProviderFrame.initialize(frameConfig).then(done, (err) => {
        fail(`Promise was rejected with ${JSON.stringify(err)}`);
      });
    });

    it('should fail if secure channel connection fails', async function(done) {
      let expectedError = OpenYoloInternalError.establishSecureChannelTimeout();

      spyOn(AncestorOriginVerifier, 'verifyOnlyParent')
          .and.returnValue(Promise.resolve(TEST_AUTH_DOMAIN));

      clientConfigurationProvider.configMap[TEST_AUTH_DOMAIN] = {
        type: 'primary',
        apiEnabled: true
      };

      spyOn(SecureChannel, 'providerConnect')
          .and.returnValue(Promise.reject(expectedError));

      try {
        await ProviderFrame.initialize(frameConfig);
        done.fail('Initialization should not succeed');
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
      }
    });

    it('should fail if the API is not enabled', async function(done) {
      clientConfigurationProvider.configMap[TEST_AUTH_DOMAIN] = {
        type: 'primary',
        apiEnabled: false
      };

      try {
        let initPromise = ProviderFrame.initialize(frameConfig);
        await initPromise;
        done.fail('Initialization should not succeed');
      } catch (err) {
        expect(err).toEqual(OpenYoloInternalError.apiDisabled());
        done();
      }
    });

    it('should fail if the parent origin is invalid', () => {
      let parentOrigin = 'https://www.3vil.com';
      spyOn(AncestorOriginVerifier, 'verifyOnlyParent')
          .and.returnValue(Promise.reject(
              OpenYoloInternalError.untrustedOrigin(parentOrigin)));
      clientConfigurationProvider.configMap[TEST_AUTH_DOMAIN] = {
        type: 'primary',
        apiEnabled: true
      };
    });
  });

  describe('when constructed', () => {
    let providerFrame: ProviderFrame;
    let clientConfig:
        PrimaryClientConfiguration = {type: 'primary', apiEnabled: true};
    let equivalentAuthDomains =
        ['https://www.example.com', 'https://auth.example.com'];

    let requestId: string;

    let unexpectedClientMessages = ([] as MessageEvent[]);
    let unexpectedProviderMessages = ([] as MessageEvent[]);

    // wraps expect().toEqual(), but also enforces type safety on the arguments
    // to avoid mistakes in writing tests
    let expectMessageContents = <T extends msg.RpcMessageType, U extends T>(
        messageData: msg.RpcMessageData<T>,
        expectedMessage: msg.RpcMessage<U>) => {
      expect(messageData).toEqual(expectedMessage.data);
    };

    beforeEach(() => {
      providerFrame = new ProviderFrame(
          frameConfig, providerChannel, clientConfig, equivalentAuthDomains);
      requestId = '' + Math.floor(Math.random() * 1000000);

      clientChannel.addFallbackListener((ev) => {
        unexpectedClientMessages.push(ev);
      });

      providerChannel.addFallbackListener((ev) => {
        unexpectedProviderMessages.push(ev);
      });
    });

    it('rejects unknown requests', async function(done) {
      clientChannel.listen(msg.RpcMessageType.error, (data) => {
        expectMessageContents(
            data,
            msg.errorMessage(
                requestId,
                OpenYoloInternalError
                    .unknownRequest(msg.RpcMessageType.hintAvailableResult)
                    .toExposedError()));
        done();
      });

      // send a message that would never normally come from the client
      clientChannel.send(msg.hintAvailableResponseMessage(requestId, false));
    });

    it('rejects concurrent requests', async function(done) {
      // Simulate a never resolve situation to be able to start the two
      // requests.
      spyOn(credentialDataProvider, 'getAllCredentials')
          .and.returnValue(new Promise(() => {}));
      clientChannel.listen(msg.RpcMessageType.error, (data) => {
        expectMessageContents(
            data,
            msg.errorMessage(
                requestId,
                OpenYoloInternalError.illegalConcurrentRequestError()
                    .toExposedError()));
        done();
      });

      clientChannel.send(msg.retrieveMessage(
          requestId,
          {supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]}));
      clientChannel.send(msg.retrieveMessage(
          requestId,
          {supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]}));
    });

    describe('handling disableAutoSignIn', () => {
      it('should set auto sign in enabled to false', async function(done) {
        let enabledBefore =
            await localStateProvider.isAutoSignInEnabled(TEST_AUTH_DOMAIN);
        expect(enabledBefore).toBe(true);
        clientChannel.listen(
            msg.RpcMessageType.disableAutoSignInResult, async function(res) {
              let enabledAfter = await localStateProvider.isAutoSignInEnabled(
                  TEST_AUTH_DOMAIN);
              expect(enabledAfter).toBe(false);
              done();
            });

        clientChannel.send(msg.disableAutoSignInMessage(requestId));
      });
    });

    describe('handling credential retrieval', () => {

      let passwordOnlyRequest: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
      };

      it('should return noCredentialsAvailable when the store is empty',
         async function(done) {
           credentialDataProvider.credentials = [];
           clientChannel.listen(msg.RpcMessageType.error, (data) => {
             expect(data.args.type)
                 .toEqual(OpenYoloErrorType.noCredentialsAvailable);
             done();
           });
           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should return a credential directly if no other options',
         async function(done) {
           credentialDataProvider.credentials = [alicePwdCred];

           (interactionProvider.showAutoSignIn as jasmine.Spy)
               .and.callFake(
                   (credential: OpenYoloCredential,
                    displayCallbacks: DisplayCallbacks) => {
                     expect(credential).toBe(alicePwdCred);
                     return Promise.resolve();
                   });

           clientChannel.listen(msg.RpcMessageType.credential, async (data) => {
             expectMessageContents(
                 data, msg.credentialResultMessage(requestId, alicePwdCred));
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should cancel a credential request', async function(done) {
        credentialDataProvider.credentials = [alicePwdCred];

        (interactionProvider.showAutoSignIn as jasmine.Spy)
            .and.callFake(
                (credential: OpenYoloCredential,
                 displayCallbacks: DisplayCallbacks) => {
                  expect(credential).toBe(alicePwdCred);
                  // return a promise that's not going to resolve
                  return new Promise<void>((resolve, reject) => {});
                });

        let cancelPromise = new PromiseResolver<void>();
        let errorPromise = new PromiseResolver<void>();

        clientChannel.listen(
            msg.RpcMessageType.credential,
            (data) => {
                // does nothing, only adding this to suppress a warning
                // about unknown message types
            });

        clientChannel.listen(
            msg.RpcMessageType.cancelLastOperationResult, (data) => {
              expectMessageContents(
                  data, msg.cancelLastOperationResultMessage(requestId));
              cancelPromise.resolve();
            });

        clientChannel.listen(msg.RpcMessageType.error, (data) => {
          expectMessageContents(
              data,
              msg.errorMessage(
                  requestId,
                  OpenYoloInternalError.operationCanceled().toExposedError()));
          errorPromise.resolve();
        });

        clientChannel.send(msg.retrieveMessage(requestId, passwordOnlyRequest));
        clientChannel.send(msg.cancelLastOperationMessage(requestId));

        Promise.all([cancelPromise.promise, errorPromise.promise])
            .then(done)
            .catch(fail);
      });

      it('should filter out irrelevant credentials', async function(done) {
        // we expect the "carl" credential to be filtered out, as it has
        // an authentication method that is not on the request list.
        credentialDataProvider.credentials = [carlGoogCred];
        clientChannel.listen(msg.RpcMessageType.error, (data) => {
          expect(data.args.type)
              .toEqual(OpenYoloErrorType.noCredentialsAvailable);
          done();
        });

        clientChannel.send(msg.retrieveMessage(requestId, passwordOnlyRequest));
      });

      it('should interact with the user when auto sign in is disabled',
         async function(done) {
           credentialDataProvider.credentials = [alicePwdCred];
           localStateProvider.autoSignIn[TEST_AUTH_DOMAIN] = false;
           let expectFinalResult = false;

           (interactionProvider.showCredentialPicker as jasmine.Spy)
               .and.callFake(
                   (credentials: OpenYoloCredential[],
                    options: OpenYoloCredentialRequestOptions,
                    displayCallbacks: DisplayCallbacks) => {
                     expect(credentials).toEqual([alicePwdCred]);
                     expect(options).toBeDefined();
                     expect(displayCallbacks).toBeDefined();

                     expectFinalResult = true;
                     // Simulate the user picking a credential
                     return Promise.resolve(alicePwdCred);
                   });

           clientChannel.listen(msg.RpcMessageType.credential, async (data) => {
             expect(expectFinalResult).toBeTruthy();
             const enabled =
                 await localStateProvider.isAutoSignInEnabled(TEST_AUTH_DOMAIN);
             expect(enabled).toBe(true);
             expectMessageContents(
                 data, msg.credentialResultMessage(requestId, alicePwdCred));
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should allow to display the IFrame', async function(done) {
        credentialDataProvider.credentials = [alicePwdCred];
        localStateProvider.autoSignIn[TEST_AUTH_DOMAIN] = false;
        const uiConfig = {height: 300, width: 400};

        spyOn(providerChannel, 'sendAndWaitAck')
            .and.callFake((message: any) => {
              expect(message.data.args).toEqual(uiConfig);
              // Simulate acknowledgement received.
              return Promise.resolve();
            });

        (interactionProvider.showCredentialPicker as jasmine.Spy)
            .and.callFake(
                (credentials: OpenYoloCredential[],
                 options: OpenYoloCredentialRequestOptions,
                 displayCallbacks: DisplayCallbacks) => {
                  displayCallbacks.requestDisplayOptions(uiConfig).then(done);
                });

        clientChannel.send(msg.retrieveMessage(requestId, passwordOnlyRequest));
      });

      it('should interact with user and return selected credential ' +
             'when multiple options',
         async function(done) {
           credentialDataProvider.credentials = [alicePwdCred, bobPwdCred];

           let expectFinalResult = false;

           (interactionProvider.showCredentialPicker as jasmine.Spy)
               .and.callFake(
                   (credentials: OpenYoloCredential[],
                    options: OpenYoloCredentialRequestOptions,
                    displayCallbacks: DisplayCallbacks) => {
                     expect(credentials).toEqual([alicePwdCred, bobPwdCred]);
                     expect(options).toBeDefined();
                     expect(displayCallbacks).toBeDefined();
                     expectFinalResult = true;

                     // simulate the user picking a credential
                     return Promise.resolve(bobPwdCred);
                   });

           clientChannel.listen(msg.RpcMessageType.credential, (data) => {
             expect(expectFinalResult).toBeTruthy();
             expectMessageContents(
                 data, msg.credentialResultMessage(requestId, bobPwdCred));
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should reject the promise if the user cancels selection',
         async function(done) {
           credentialDataProvider.credentials = [alicePwdCred, bobPwdCred];
           let expectFinalResult = false;

           (interactionProvider.showCredentialPicker as jasmine.Spy)
               .and.callFake(
                   (credentials: OpenYoloCredential[],
                    options: OpenYoloCredentialRequestOptions,
                    displayCallbacks: DisplayCallbacks) => {
                     expectFinalResult = true;
                     return Promise.reject(
                         OpenYoloInternalError.userCanceled());
                   });

           clientChannel.listen(msg.RpcMessageType.error, (data) => {
             expect(expectFinalResult).toBeTruthy();
             expect(data.args.type).toEqual(OpenYoloErrorType.userCanceled);
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should redact passwords if client requires proxy login',
         async function(done) {
           clientConfig.requireProxyLogin = true;
           credentialDataProvider.credentials = [alicePwdCred];

           clientChannel.listen(msg.RpcMessageType.credential, (data) => {
             // the password should be removed
             expectMessageContents(
                 data, msg.credentialResultMessage(requestId, {
                   id: 'alice@example.com',
                   authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
                   authDomain: TEST_AUTH_DOMAIN,
                   proxiedAuthRequired: true
                 }));
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });

      it('should redact passwords is the provider config says so',
         async function(done) {
           frameConfig.allowDirectAuth = false;
           credentialDataProvider.credentials = [alicePwdCred];

           clientChannel.listen(msg.RpcMessageType.credential, (data) => {
             // the password should be removed
             expectMessageContents(
                 data, msg.credentialResultMessage(requestId, {
                   id: 'alice@example.com',
                   authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
                   authDomain: TEST_AUTH_DOMAIN,
                   proxiedAuthRequired: true
                 }));
             done();
           });

           clientChannel.send(
               msg.retrieveMessage(requestId, passwordOnlyRequest));
         });
    });

    // tests can use this to emulate user interaction in the credential picker
    const pwdOrFbHintOptions: OpenYoloCredentialHintOptions = {
      supportedAuthMethods: [
        AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        AUTHENTICATION_METHODS.FACEBOOK
      ]
    };

    describe('handling hintAvailable', () => {

      it('should return false when the store is empty', async function(done) {
        credentialDataProvider.credentials = [];

        clientChannel.listen(msg.RpcMessageType.hintAvailableResult, (res) => {
          expect(res.args).toBe(false);
          done();
        });

        clientChannel.send(
            msg.hintAvailableMessage(requestId, pwdOrFbHintOptions));
      });

      it('should return false if no data matches', async function(done) {
        // the hint options specify password or facebook credentials, and this
        // credential is for google sign-in. So, we expect no hints to be
        // generated.
        credentialDataProvider.credentials = [carlGoogCred];

        clientChannel.listen(msg.RpcMessageType.hintAvailableResult, (res) => {
          expect(res.args).toBe(false);
          done();
        });

        clientChannel.send(
            msg.hintAvailableMessage(requestId, pwdOrFbHintOptions));
      });

      it('should return true if hint available', async function(done) {
        credentialDataProvider.credentials = [elisaOtherDomainCred];

        clientChannel.listen(msg.RpcMessageType.hintAvailableResult, (res) => {
          expect(res.args).toBe(true);
          done();
        });

        clientChannel.send(
            msg.hintAvailableMessage(requestId, pwdOrFbHintOptions));
      });
    });

    describe('handling hint retrieval', () => {


      // creates a message listener that expects a pick message to be received,
      // and verifies the set of credentials sent to the interaction manager
      // for display. If a selection is provided, then this is used to resolve
      // the hint picker promise, otherwise the promise is rejected unless never
      // resolve is set to true. Finally, if an expected outcome is provided,
      // this is checked for as a follow-up message, otherwise a pick cancel
      // message is expected.
      function expectPickFromHints(
          expectedHints: OpenYoloCredential[],
          selection: OpenYoloCredential|null,
          expectedResult: msg.RpcMessage<msg.RpcMessageType.credential>|
          msg.RpcMessage<msg.RpcMessageType.error>,
          neverResolve: boolean = false) {
        let promiseResolver = new PromiseResolver<void>();
        let expectFinalResult = false;

        (interactionProvider.showHintPicker as jasmine.Spy)
            .and.callFake(
                (hints: OpenYoloCredential[],
                 options: OpenYoloCredentialHintOptions,
                 displayCallbacks: DisplayCallbacks) => {
                  expect(hints).toEqual(expectedHints);
                  expect(options).toBeDefined();
                  expect(displayCallbacks).toBeDefined();
                  expectFinalResult = true;

                  if (neverResolve) {
                    console.warn('expectPickFromHints(...) will not resolve');
                    return new Promise((resolve, reject) => {});
                  } else {
                    if (selection) {
                      return Promise.resolve(selection);
                    } else {
                      return Promise.reject(
                          OpenYoloInternalError.userCanceled());
                    }
                  }
                });

        clientChannel.listen(msg.RpcMessageType.credential, (data) => {
          expect(expectFinalResult).toBeTruthy();
          if (expectedResult.type !== msg.RpcMessageType.credential) {
            fail('Not a valid message.');
            return;
          }
          expectMessageContents(data, expectedResult);
          promiseResolver.resolve();
        });

        clientChannel.listen(msg.RpcMessageType.error, (data) => {
          if (expectedResult.type !== msg.RpcMessageType.error) {
            fail('Not a valid message.');
            return;
          }
          expectMessageContents(data, expectedResult);
          promiseResolver.resolve();
        });

        return promiseResolver.promise;
      };

      it('should return no hints when the store is empty',
         async function(done) {
           credentialDataProvider.credentials = [];

           clientChannel.listen(msg.RpcMessageType.error, (data) => {
             expect(data.args.type)
                 .toEqual(OpenYoloErrorType.noCredentialsAvailable);
             done();
           });

           clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
         });

      it('should return no hints if none match', async function(done) {
        // the hint options specify password or facebook credentials, and this
        // credential is for google sign-in. So, we expect no hints to be
        // generated.
        credentialDataProvider.credentials = [carlGoogCred];

        clientChannel.listen(msg.RpcMessageType.error, (data) => {
          expect(data.args.type)
              .toEqual(OpenYoloErrorType.noCredentialsAvailable);
          done();
        });

        clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
      });

      it('should return selected hint', async function(done) {
        localStateProvider.autoSignIn[TEST_AUTH_DOMAIN] = false;
        credentialDataProvider.credentials = [elisaOtherDomainCred];
        let redactedElisaCred: OpenYoloCredential = {
          id: elisaOtherDomainCred.id,
          authMethod: elisaOtherDomainCred.authMethod,
          authDomain: TEST_AUTH_DOMAIN
        };

        // the data store might actually be defining additional properties on
        // credentials beyond the basics defined in Credential. These must
        // not be leaked either.
        (elisaOtherDomainCred as any)['additionalSecret'] = '12345';

        // the interaction provider should be provided the full credential,
        // but once a selection is made the client should only receive
        // the redacted version.
        expectPickFromHints(
            [elisaOtherDomainCred],
            elisaOtherDomainCred,
            msg.credentialResultMessage(requestId, redactedElisaCred))
            .then(() => {
              return localStateProvider.isAutoSignInEnabled(TEST_AUTH_DOMAIN);
            })
            .then((enabled) => {
              expect(enabled).toBe(true);
              done();
            });
        clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
      });

      it('should notify the client of user cancellation', async function(done) {
        credentialDataProvider.credentials = [deliaFbCred];
        expectPickFromHints(
            [deliaFbCred],
            null,
            msg.errorMessage(
                requestId,
                OpenYoloInternalError.userCanceled().toExposedError()))
            .then(done);
        clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
      });

      it('should notify the client when an hint operation is cancelled',
         async function(done) {
           expectPickFromHints(
               [deliaFbCred],
               null,
               msg.errorMessage(
                   requestId,
                   OpenYoloInternalError.operationCanceled().toExposedError()),
               true /* neverResolve */)
               .then(done);

           clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
           clientChannel.send(msg.cancelLastOperationMessage(requestId));
         });

      it('should prioritize federated hints over password hints',
         async function(done) {
           let aliceFbCred = {
             id: alicePwdCred.id,
             authMethod: AUTHENTICATION_METHODS.FACEBOOK,
             authDomain: TEST_AUTH_DOMAIN
           };

           credentialDataProvider.credentials = [alicePwdCred, aliceFbCred];
           expectPickFromHints(
               [aliceFbCred],
               aliceFbCred,
               msg.credentialResultMessage(requestId, aliceFbCred))
               .then(done);
           clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
         });

      it('should prioritize hints with a display name', async function(done) {
        let deliaFbCredWithName: OpenYoloCredential = {
          id: deliaFbCred.id,
          authMethod: deliaFbCred.authMethod,
          authDomain: deliaFbCred.authDomain,
          displayName: 'Delia McTesterson'
        };

        credentialDataProvider.credentials = [deliaFbCred, deliaFbCredWithName];
        expectPickFromHints(
            [deliaFbCredWithName],
            deliaFbCredWithName,
            msg.credentialResultMessage(requestId, deliaFbCredWithName))
            .then(done);
        clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
      });

      it('should prioritize hints with a profile picture',
         async function(done) {
           let deliaFbCredWithPicture: OpenYoloCredential = {
             id: deliaFbCred.id,
             authMethod: deliaFbCred.authMethod,
             authDomain: deliaFbCred.authDomain,
             profilePicture: 'https://www.facebook.com/delia/profile.png'
           };

           credentialDataProvider.credentials =
               [deliaFbCred, deliaFbCredWithPicture];
           expectPickFromHints(
               [deliaFbCredWithPicture],
               deliaFbCredWithPicture,
               msg.credentialResultMessage(requestId, deliaFbCredWithPicture))
               .then(done);
           clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
         });

      it('should order the hint list by frequency', async function(done) {
        // as a cheap way to emulate a particular identifier occurring in
        // multiple credentials, we just include the same credential multiple
        // times.
        credentialDataProvider.credentials = [
          bobPwdCred,
          alicePwdCred,
          alicePwdCred,
          bobPwdCred,
          bobPwdCred,
          deliaFbCred,
          deliaFbCred,
          deliaFbCred,
          bobPwdCred
        ];

        expectPickFromHints(
            [bobPwdCred, deliaFbCred, alicePwdCred],
            deliaFbCred,
            msg.credentialResultMessage(requestId, deliaFbCred))
            .then(done);
        clientChannel.send(msg.hintMessage(requestId, pwdOrFbHintOptions));
      });
    });
  });
});


class TestAffiliationProvider implements AffiliationProvider {
  affiliationMap: {[key: string]: string[]} = {};
  async getEquivalentDomains(authDomain: string): Promise<string[]> {
    if (authDomain in this.affiliationMap) {
      return this.affiliationMap[authDomain];
    }

    return [authDomain];
  }
}

class TestClientConfigurationProvider implements ClientConfigurationProvider {
  configMap: {[key: string]: PrimaryClientConfiguration} = {};

  async getConfiguration(authDomain: string):
      Promise<PrimaryClientConfiguration> {
    if (authDomain in this.configMap) {
      return this.configMap[authDomain];
    }
    throw new Error('The Test Client Configuration does not exist!');
  }
}

class TestCredentialDataProvider implements CredentialDataProvider {
  credentials: OpenYoloCredential[] = [];
  neverSave: {[key: string]: boolean} = {};

  async getAllCredentials(authDomains: string[]):
      Promise<OpenYoloCredential[]> {
    if (authDomains.length < 1) {
      return this.credentials;
    }

    let filteredCredentials: OpenYoloCredential[] = [];

    for (let i = 0; i < this.credentials.length; i++) {
      let credential = this.credentials[i];
      if (authDomains.find(
              (authDomain) => authDomain === credential.authDomain)) {
        filteredCredentials.push(credential);
      }
    }

    return filteredCredentials;
  }

  async getAllHints(options: OpenYoloCredentialHintOptions):
      Promise<OpenYoloCredential[]> {
    // no filtering required in the hints case
    return this.credentials;
  }

  /**
   * Stores the user preference that no credentials should be saved for
   * the provided domains.
   */
  async markNeverSave(authDomains: string[]): Promise<void> {
    for (let i = 0; i < authDomains.length; i++) {
      this.neverSave[authDomains[i]] = true;
    }
  }

  /**
   * Determines whether the user forbids saving credentials for any of the
   * provided domains.
   */
  async areAnyNeverSave(authDomain: string[]): Promise<boolean> {
    return !!authDomain.find(
        (authDomain) =>
            authDomain in this.neverSave && this.neverSave[authDomain]);
  }

  /**
   * Determines whether the provided credential can be saved to this store.
   */
  async canSave(credential: OpenYoloCredential): Promise<boolean> {
    return true;
  }

  /**
   * Creates or updates an existing credential.
   */
  async upsertCredential(
      credential: OpenYoloCredential,
      original?: OpenYoloCredential): Promise<OpenYoloCredential> {
    if (original) {
      await this.deleteCredential(original);
    }
    this.credentials.push(credential);
    return credential;
  }

  /**
   * Determines whether the provided credential can be deleted.
   */
  async canDelete(credential: OpenYoloCredential): Promise<boolean> {
    return true;
  }

  /**
   * Deletes the provided credential from the store. If delete is not
   * permitted for this credential, the returned promise will be rejected.
   */
  async deleteCredential(credential: OpenYoloCredential): Promise<void> {
    let existing = this.credentials.findIndex(
        (c) => c.authDomain === credential.authDomain &&
            c.id === credential.id && c.authMethod === credential.authMethod);

    if (existing < 0) {
      return;
    }

    this.credentials = this.credentials.splice(existing, 1);
  }
}

class TestLocalStateProvider implements LocalStateProvider {
  autoSignIn: {[label: string]: boolean} = {};
  retained: {[authDomain: string]: OpenYoloCredential} = {};

  async isAutoSignInEnabled(authDomain: string): Promise<boolean> {
    let result: boolean;
    if (authDomain in this.autoSignIn) {
      result = this.autoSignIn[authDomain];
    } else {
      result = true;
    }
    return result;
  }

  async setAutoSignInEnabled(authDomain: string, enabled: boolean) {
    this.autoSignIn[authDomain] = enabled;
  }

  async retainCredentialForSession(
      authDomain: string,
      credential: OpenYoloCredential) {
    this.retained[authDomain] = credential;
  }

  async getRetainedCredential(authDomain: string): Promise<OpenYoloCredential> {
    if (this.retained[authDomain]) {
      let credential = this.retained[authDomain];
      delete this.retained[authDomain];
      return credential;
    }

    throw new Error(`no retained credential for ${authDomain}`);
  }
}
