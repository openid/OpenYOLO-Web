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

import {AUTHENTICATION_METHODS, OpenYoloCredential, OpenYoloCredentialHintOptions} from '../protocol/data';
import {credentialResultMessage, hintMessage, showProviderMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {HintRequest} from './hint_request';

describe('HintRequest', () => {
  let request: HintRequest;
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: any;
  let hint: OpenYoloCredential;
  let passwordOnlyOptions: OpenYoloCredentialHintOptions = {
    supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
  };

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new HintRequest(frame, clientChannel);
    hint = {
      id: 'alice@gmail.com',
      authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
      displayName: 'Alice',
      password: 'qwertyui'
    };
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      let options: OpenYoloCredentialHintOptions = {
        supportedAuthMethods: ['openyolo://id-and-password']
      };
      request.dispatch(options);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(hintMessage(request.id, options));
    });
  });

  it('should display the frame if there are hints available', () => {
    request.dispatch(passwordOnlyOptions);
    providerChannel.send(showProviderMessage(request.id, {height: 200}));
    expect(frame.display).toHaveBeenCalled();
  });

  it('should return hint selected', async function(done) {
    let promise = request.dispatch(passwordOnlyOptions);
    providerChannel.send(credentialResultMessage(request.id, hint));

    try {
      let result = await promise;
      expect(result).toEqual(hint);
      expect(request.dispose).toHaveBeenCalled();
      done();
    } catch (err) {
      done.fail('Promise should resovle');
    }
  });

  it('should ignore when different id', () => {
    request.dispatch(passwordOnlyOptions);
    providerChannel.send(credentialResultMessage('otherId', hint));
    expect(request.dispose).not.toHaveBeenCalled();
  });
});
