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

import {disableAutoSignInMessage, disableAutoSignInResultMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {DisableAutoSignIn} from './disable_auto_sign_in';

describe('DisableAutoSignInRequest', () => {
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let request: DisableAutoSignIn;
  let frame: any;

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new DisableAutoSignIn(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      request.dispatch(undefined);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(disableAutoSignInMessage(request.id));
    });
  });

  it('should resolve when result received', async function(done) {
    let promise = request.dispatch(undefined);
    providerChannel.send(disableAutoSignInResultMessage(request.id));
    try {
      await promise;
      expect(request.dispose).toHaveBeenCalled();
      done();
    } catch (err) {
      done.fail('Promise should resolve');
    }
  });
});
