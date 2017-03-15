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
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {MaterialModule} from '@angular/material';
import {MdIconRegistry} from '@angular/material';
import {BrowserModule, DomSanitizer} from '@angular/platform-browser';
import {RouterModule, Routes} from '@angular/router';

import {CredentialStoreService} from '../credential_store/credential_store.service';
import {ManageStoreComponent} from '../manage_store/manage_store.component';
import {OpenYoloProviderComponent} from '../openyolo_provider/openyolo_provider.component';

import {AppComponent} from './app.component';

const appRoutes: Routes = [
  {path: 'openyolo-provider', component: OpenYoloProviderComponent},
  {path: '', component: ManageStoreComponent}
];

@NgModule({
  declarations: [AppComponent, OpenYoloProviderComponent, ManageStoreComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    MaterialModule,
    RouterModule.forRoot(appRoutes)
  ],
  providers: [CredentialStoreService],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(iconRegistry: MdIconRegistry, sanitizer: DomSanitizer) {
    const addIcon = (name: string) => {
      iconRegistry.addSvgIcon(
          name, sanitizer.bypassSecurityTrustResourceUrl(`assets/${name}.svg`));
    };

    const addIcons = (...names: string[]) => names.forEach(addIcon);

    addIcons(
        'barbican',
        'continue',
        'edit',
        'email_account',
        'generic_account',
        'phone_account');
  }
}
