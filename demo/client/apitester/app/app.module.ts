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

import 'hammerjs';

import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {MaterialModule} from '@angular/material';
import {MdIconRegistry} from '@angular/material';
import {BrowserModule} from '@angular/platform-browser';
import {DomSanitizer} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {HintComponent} from '../hint/hint.component';
import {RetrieveComponent} from '../retrieve/retrieve.component';
import {SaveComponent} from '../save/save.component';
import {SettingsComponent} from '../settings/settings.component';

import {AppComponent} from './app.component';
import {SettingsService} from './settings.service';

@NgModule({
  declarations: [
    AppComponent,
    HintComponent,
    RetrieveComponent,
    SaveComponent,
    SettingsComponent
  ],
  entryComponents: [SettingsComponent],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    MaterialModule,
  ],
  providers: [SettingsService],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(iconRegistry: MdIconRegistry, sanitizer: DomSanitizer) {
    const addIcon = (name: string) => {
      iconRegistry.addSvgIcon(
          name, sanitizer.bypassSecurityTrustResourceUrl(`assets/${name}.svg`));
    };

    const addIcons = (...names: string[]) => names.forEach(addIcon);

    addIcons('facebook', 'google', 'microsoft', 'password', 'settings');
  }
}
