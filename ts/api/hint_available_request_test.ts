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

import {AUTHENTICATION_METHODS, OpenYoloCredentialHintOptions} from '../protocol/data';
import {OpenYoloInternalError} from '../protocol/errors';
import {errorMessage, hintAvailableMessage, hintAvailableResponseMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {HintAvailableRequest} from './hint_available_request';

describe('HintAvailableRequest', () => {
  let request: HintAvailableRequest;
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: any;
  let passwordOnlyOptions: OpenYoloCredentialHintOptions = {
    supportedAuthMethods: [AUTHENTICATION_METHODS.ID_AND_PASSWORD]
  };

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new HintAvailableRequest(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      request.dispatch(passwordOnlyOptions);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(
              hintAvailableMessage(request.id, passwordOnlyOptions));
    });
  });

  it('should return true if there are hints available', async function(done) {
    let promise = request.dispatch(passwordOnlyOptions);
    providerChannel.send(hintAvailableResponseMessage(request.id, true));

    try {
      let result = await promise;
      expect(result).toBeTruthy();
      expect(request.dispose).toHaveBeenCalled();
      done();
    } catch (err) {
      done.fail('Promise should resolve');
    }
  });

  it('should return false if not hints are available', async function(done) {
    let promise = request.dispatch(passwordOnlyOptions);
    providerChannel.send(hintAvailableResponseMessage(request.id, false));
    try {
      let result = await promise;
      expect(result).toBe(false);
      expect(request.dispose).toHaveBeenCalled();
      done();
    } catch (err) {
      done.fail('Promise should resolve');
    }
  });

  it('should fail if error returned', async function(done) {
    let promise = request.dispatch(passwordOnlyOptions);
    let expectedError =
        OpenYoloInternalError.requestFailed('error!').toExposedError();
    providerChannel.send(errorMessage(request.id, expectedError));

    try {
      await promise;
      done.fail('Promise should reject');
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
    }
  });
});
