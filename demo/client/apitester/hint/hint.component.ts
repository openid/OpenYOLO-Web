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
import {OnInit} from '@angular/core';
import {MdSnackBar} from '@angular/material';
import {AUTHENTICATION_METHODS, Credential, CredentialHintOptions, openyolo, OpenYoloError} from '../../../../ts/api/api';
import {SettingsService} from '../app/settings.service';

@Component({
  selector: 'app-hint-tester',
  templateUrl: './hint.component.html',
  styleUrls: ['./hint.component.css']
})
export class HintComponent implements OnInit {
  public requestInProgress = false;
  public askForPassword = true;
  public askForGoogle = true;
  public askForFacebook = false;
  public askForMicrosoft = false;

  public credentialAvailable: string = null;
  public credential: Credential|null = null;
  public error: OpenYoloError|null = null;

  constructor(
      public snackBar: MdSnackBar,
      private settingsService: SettingsService) {}

  ngOnInit() {
    openyolo.setProviderUrlBase(this.settingsService.getProviderBaseUrl());
  }

  async sendRequest() {
    this.resetForRequest();

    try {
      this.credential = await openyolo.hint(this.buildHintOptions());
    } catch (err) {
      this.error = err;
    } finally {
      this.requestInProgress = false;
    }
  }

  async sendAvailableRequest() {
    this.resetForRequest();
    try {
      if (await openyolo.hintsAvailable(this.buildHintOptions())) {
        this.credentialAvailable = 'YES';
      } else {
        this.credentialAvailable = 'NO';
      }
    } catch (err) {
      this.error = err;
    } finally {
      this.requestInProgress = false;
    }
  }

  resetForRequest() {
    if (this.requestInProgress) {
      console.warn('Attempting to send two requests concurrently');
    }

    this.requestInProgress = true;
    this.credential = null;
    this.error = null;
  }

  buildHintOptions(): CredentialHintOptions {
    return {supportedAuthMethods: this.getSelectedAuthMethods()};
  }

  getSelectedAuthMethods(): string[] {
    const authMethods = [];
    if (this.askForPassword) {
      authMethods.push(AUTHENTICATION_METHODS.ID_AND_PASSWORD);
    }
    if (this.askForGoogle) {
      authMethods.push(AUTHENTICATION_METHODS.GOOGLE);
    }
    if (this.askForFacebook) {
      authMethods.push(AUTHENTICATION_METHODS.FACEBOOK);
    }
    if (this.askForMicrosoft) {
      authMethods.push(AUTHENTICATION_METHODS.MICROSOFT);
    }

    return authMethods;
  }
}
