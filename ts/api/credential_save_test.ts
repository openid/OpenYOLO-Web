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

import {OpenYoloCredential} from '../protocol/data';
import {AUTHENTICATION_METHODS} from '../protocol/data';
import {OpenYoloErrorType, OpenYoloInternalError} from '../protocol/errors';
import {errorMessage, saveMessage, saveResultMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {CredentialSave} from './credential_save';

describe('CredentialSave', () => {
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let request: CredentialSave;
  let frame: any;
  let credential: OpenYoloCredential = {
    id: 'user@example.com',
    authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
    displayName: 'User',
    password: 'password'
  };

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new CredentialSave(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      request.dispatch(credential);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(saveMessage(request.id, credential));
    });
  });

  it('should resolve if successful', async function(done) {
    let promise = request.dispatch(credential);
    providerChannel.send(saveResultMessage(request.id, true));
    try {
      await promise;
      expect(request.dispose).toHaveBeenCalled();
      done();
    } catch (err) {
      done.fail('Promise should resolve');
    }
  });

  it('should reject if canceled', async function(done) {
    let promise = request.dispatch(credential);
    providerChannel.send(saveResultMessage(request.id, false));
    try {
      await promise;
      done.fail('promise should be rejected');
    } catch (err) {
      expect(err.type).toEqual(OpenYoloErrorType.userCanceled);
      expect(request.dispose).toHaveBeenCalled();
      done();
    }
  });

  it('should reject if error received', async function(done) {
    let promise = request.dispatch(credential);

    providerChannel.send(errorMessage(
        request.id,
        OpenYoloInternalError.requestFailed('ERROR!').toExposedError()));
    try {
      await promise;
      done.fail('Promise should be rejected');
    } catch (err) {
      expect(err.type).toEqual(OpenYoloErrorType.requestFailed);
      expect(request.dispose).toHaveBeenCalled();
      done();
    }
  });
});
