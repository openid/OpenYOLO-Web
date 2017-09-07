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

import {RenderMode} from '../../../../ts/protocol/data';
import {environment} from '../environments/environment';

const PROVIDER_BASE_URL_KEY = 'providerBaseUrl';
const RENDER_MODE_KEY = 'renderMode';

@Injectable()
export class SettingsService {
  getProviderBaseUrl() {
    let baseUrl = localStorage.getItem(PROVIDER_BASE_URL_KEY);
    if (!!baseUrl) {
      return baseUrl;
    }

    return environment.defaultProviderUrl;
  }

  setProviderBaseUrl(providerUrl: string) {
    if (!providerUrl || providerUrl.length < 1) {
      localStorage.removeItem(PROVIDER_BASE_URL_KEY);
      return;
    }

    localStorage.setItem(PROVIDER_BASE_URL_KEY, providerUrl);
  }

  getRenderMode(): RenderMode {
    let renderMode = localStorage.getItem(RENDER_MODE_KEY);
    if (!renderMode || renderMode.length < 1) {
      return null;
    }

    return (renderMode as any);
  }

  setRenderMode(renderMode: string|null) {
    if (!renderMode || renderMode.length < 1) {
      localStorage.removeItem(RENDER_MODE_KEY);
      return;
    }

    localStorage.setItem(RENDER_MODE_KEY, renderMode);
  }
}
