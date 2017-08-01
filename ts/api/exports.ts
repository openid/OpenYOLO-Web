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

import {OpenYoloError} from '../protocol/errors';

import {InitializeOnDemandApi, openyolo} from './api';

// re-export all the data types
export * from '../protocol/data';
export {OpenYoloInternalError, InternalErrorCode} from '../protocol/errors';

// Export the public methods.
const windowAsAny = window as any;
windowAsAny['openyolo'] = openyolo;
InitializeOnDemandApi.prototype['setProviderUrlBase'] =
    InitializeOnDemandApi.prototype.setProviderUrlBase;
InitializeOnDemandApi.prototype['setRenderMode'] =
    InitializeOnDemandApi.prototype.setRenderMode;
InitializeOnDemandApi.prototype['setTimeouts'] =
    InitializeOnDemandApi.prototype.setTimeouts;
InitializeOnDemandApi.prototype['hintsAvailable'] =
    InitializeOnDemandApi.prototype.hintsAvailable;
InitializeOnDemandApi.prototype['hint'] = InitializeOnDemandApi.prototype.hint;
InitializeOnDemandApi.prototype['retrieve'] =
    InitializeOnDemandApi.prototype.retrieve;
InitializeOnDemandApi.prototype['save'] = InitializeOnDemandApi.prototype.save;
InitializeOnDemandApi.prototype['disableAutoSignIn'] =
    InitializeOnDemandApi.prototype.disableAutoSignIn;
InitializeOnDemandApi.prototype['proxyLogin'] =
    InitializeOnDemandApi.prototype.proxyLogin;
InitializeOnDemandApi.prototype['cancelLastOperation'] =
    InitializeOnDemandApi.prototype.cancelLastOperation;

// Export the exposed errors.
windowAsAny['OpenYoloError'] = OpenYoloError;
OpenYoloError.prototype['type'] = OpenYoloError.prototype.type;
OpenYoloError.prototype['message'] = OpenYoloError.prototype.message;
