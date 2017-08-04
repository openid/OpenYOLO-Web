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
import {LogLevel} from '../protocol/data';
import {setLogLevelMessage, setLogLevelResultMessage} from '../protocol/rpc_messages';
import {SecureChannel} from '../protocol/secure_channel';
import {FakeProviderConnection} from '../test_utils/channels';
import {createSpyFrame} from '../test_utils/frames';

import {SetLogLevelRequest} from './set_log_level_request';


describe('SetLogLevelRequest', () => {
  let request: SetLogLevelRequest;
  let clientChannel: SecureChannel;
  let providerChannel: SecureChannel;
  let frame: any;

  beforeEach(() => {
    let connection = new FakeProviderConnection();
    clientChannel = connection.clientChannel;
    providerChannel = connection.providerChannel;
    frame = createSpyFrame('frameId');
    request = new SetLogLevelRequest(frame, clientChannel);
    spyOn(request, 'dispose').and.callThrough();
  });

  afterEach(() => {
    request.dispose();
  });

  describe('dispatch', () => {
    it('should send a RPC message to the frame', () => {
      spyOn(clientChannel, 'send').and.callThrough();
      request.dispatch(LogLevel.DEBUG);
      expect(clientChannel.send)
          .toHaveBeenCalledWith(setLogLevelMessage(request.id, LogLevel.DEBUG));
    });
  });

  it('should resolve the promise once operation is successful',
     async function(done) {
       let promise = request.dispatch(LogLevel.DEBUG);
       providerChannel.send(setLogLevelResultMessage(request.id));
       try {
         let result = await promise;
         expect(result).toBeFalsy();
         expect(request.dispose).toHaveBeenCalled();
         done();
       } catch (err) {
         done.fail('Promise should resolve');
       }
     });
});
