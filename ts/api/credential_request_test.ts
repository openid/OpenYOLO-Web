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

import {AUTHENTICATION_METHODS, OpenYoloCredential, OpenYoloCredentialRequestOptions} from '../protocol/data';
import {credentialResultMessage, retrieveMessage, showProviderMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {CredentialRequest} from './credential_request';
import {ProviderFrameElement} from './provider_frame_elem';

describe('CredentialRequest', () => {
  let request: CredentialRequest;
  let connection: FakeProviderConnection;
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: ProviderFrameElement;
  const options: OpenYoloCredentialRequestOptions = {supportedAuthMethods: []};

  beforeEach(() => {
    connection = new FakeProviderConnection();
    frame = createSpyFrame('spyframe');

    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    request = new CredentialRequest(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message through the channel', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      let options: OpenYoloCredentialRequestOptions = {
        supportedAuthMethods: ['openyolo://id-and-password']
      };
      request.dispatch(options);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(retrieveMessage(request.id, options));
    });
  });

  describe('response handling', () => {
    it('should display the frame if there are credentials', () => {
      request.dispatch(options);
      providerChannel.send(showProviderMessage(request.id, {height: 200}));
      expect(frame.display).toHaveBeenCalled();
    });

    it('should resolve with credential on success', async function(done) {
      let credential: OpenYoloCredential = {
        id: 'alice@gmail.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        displayName: 'Google'
      };
      let requestPromise = request.dispatch(options);
      providerChannel.send(credentialResultMessage(request.id, credential));
      try {
        let result = await requestPromise;
        expect(result).toEqual(credential);
        expect(request.dispose).toHaveBeenCalled();
        done();
      } catch (err) {
        fail('Result promise was rejected');
      }
    });

    it('should ignore when different id', () => {
      request.dispatch(options);
      let credential = {
        id: 'alice@gmail.com',
        authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
        name: 'Alice',
        password: 'qwertyui'
      };
      providerChannel.send(credentialResultMessage('otherId', credential));
      expect(request.dispose).not.toHaveBeenCalled();
    });
  });
});
