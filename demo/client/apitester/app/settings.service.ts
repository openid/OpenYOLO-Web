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

import {Injectable} from '@angular/core';

const PROVIDER_BASE_URL_KEY = 'providerBaseUrl';

@Injectable()
export class SettingsService {
  getProviderBaseUrl() {
    let baseUrl = localStorage.getItem(PROVIDER_BASE_URL_KEY);
    if (!baseUrl) {
      return this.guessProviderBaseUrl();
    }
  }

  guessProviderBaseUrl() {
    // in dev mode, we typically run the provider one port higher than the
    // test app.
    return window.location.protocol + '//' + window.location.hostname + ':' +
        (parseInt(window.location.port, 10) + 1) + '/openyolo-provider';
  }
}
