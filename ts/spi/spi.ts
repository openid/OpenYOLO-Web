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

/**
 * @file The main module for credential providers to import, in order to
 * implement the OpenYOLO Web protocol.
 */

import {OpenYoloInternalError} from '../protocol/errors';

import {ProviderFrame} from './provider_frame';

export {OpenYoloInternalError} from '../protocol/errors';

export {ProviderFrame} from './provider_frame';

export * from './provider_config';
export * from '../protocol/data';
export * from '../protocol/client_config';

// Export the public method.
const windowAsAny = window as any;
windowAsAny['openyolo_spi'] = windowAsAny['openyolo_spi'] || {};
windowAsAny['openyolo_spi']['ProviderFrame'] = ProviderFrame;
ProviderFrame['initialize'] = ProviderFrame.initialize;
windowAsAny['openyolo_spi']['Error'] = OpenYoloInternalError;
// Expose a subset of errors that providers' implementations can use to trigger
// specific flows or propagate particular errors back to the client.
OpenYoloInternalError['noCredentialsAvailable'] =
    OpenYoloInternalError.noCredentialsAvailable;
OpenYoloInternalError['userCanceled'] = OpenYoloInternalError.userCanceled;
OpenYoloInternalError['browserWrappingRequired'] =
    OpenYoloInternalError.browserWrappingRequired;