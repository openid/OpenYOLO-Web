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

import {Component} from '@angular/core';

import {openyolo} from '../../../../ts/api/api';
import {RenderMode} from '../../../../ts/protocol/data';
import {SettingsService} from '../app/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  providerUrl: string;
  renderMode: string;
  renderModes: string[];

  constructor(private settingsService: SettingsService) {
    this.providerUrl = settingsService.getProviderBaseUrl();
    this.renderModes = [];
    this.renderModes.push('default');
    this.renderModes.push(RenderMode.bottomSheet);
    this.renderModes.push(RenderMode.navPopout);
    this.renderModes.push(RenderMode.fullScreen);

    this.renderMode = settingsService.getRenderMode() || 'default';
  }

  confirm() {
    this.settingsService.setProviderBaseUrl(this.providerUrl);
    this.settingsService.setRenderMode(this.renderMode);
    openyolo.setProviderUrlBase(this.providerUrl);
    openyolo.setRenderMode(this.getRenderMode());
    openyolo.reset();
  }

  private getRenderMode(): RenderMode|null {
    return this.renderMode as RenderMode;
  }
}
