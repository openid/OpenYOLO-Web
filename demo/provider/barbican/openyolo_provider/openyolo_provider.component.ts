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
import {AfterViewChecked, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {OpenYoloCredential as Credential, OpenYoloCredentialHintOptions as CredentialHintOptions, OpenYoloCredentialRequestOptions as CredentialRequestOptions, RenderMode} from '../../../../ts/protocol/data';
import {AffiliationProvider, AUTHENTICATION_METHODS, ClientConfigurationProvider, CredentialDataProvider, DisplayCallbacks, InteractionProvider, LocalStateProvider, PrimaryClientConfiguration, ProviderFrame} from '../../../../ts/spi/spi';
import {CredentialStoreService, StoredCredential} from '../credential_store/credential_store.service';

@Component({
  selector: 'app-openyolo-provider',
  templateUrl: './openyolo_provider.component.html',
  styleUrls: ['./openyolo_provider.component.css']
})
export class OpenYoloProviderComponent implements OnInit, OnDestroy,
                                                  AfterViewChecked,
                                                  InteractionProvider {
  private providerFramePromise: Promise<ProviderFrame>;

  private renderPromiseResolvers: Function[] = [];

  renderMode: string;

  failed = false;
  displayCredentials: DisplayCredential[]|null;

  pickResultPromise: Promise<Credential>;
  pickResolver: (value?: Credential|PromiseLike<Credential>) => void;
  pickRejector: (reason?: any) => void;

  constructor(
      private credentialStoreService: CredentialStoreService,
      private route: ActivatedRoute) {}

  ngOnInit() {
    let clientAuthDomain: string|null = null;
    let clientNonce: string|null = null;
    this.route.queryParams.forEach((queryParams) => {
      clientAuthDomain = queryParams['client'] || null;
      clientNonce = queryParams['id'] || null;
      this.renderMode = queryParams['renderMode'] || null;
    });

    if (!this.renderMode) {
      this.renderMode = RenderMode.bottomSheet;
    }

    this.providerFramePromise = ProviderFrame.initialize({
      allowDirectAuth: true,
      clientAuthDomain,
      clientNonce,
      affiliationProvider: new SimpleAffiliationProvider(),
      clientConfigurationProvider: new SimpleClientConfigurationProvider(),
      credentialDataProvider:
          new CredentialDataProviderImpl(this.credentialStoreService),
      interactionProvider: this,
      localStateProvider: new LocalStateProviderImpl(),
      window
    });

    this.providerFramePromise.catch((err) => {
      this.failed = true;
      console.error(`Provider initialization failed: ${err.code}`, err);
    });
  }

  ngOnDestroy() {
    this.providerFramePromise.then((providerFrame) => {
      providerFrame.dispose();
    });
  }

  ngAfterViewChecked() {
    for (let resolver of this.renderPromiseResolvers) {
      resolver();
    }

    this.renderPromiseResolvers = [];
  }

  createRenderPromise(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.renderPromiseResolvers.push(resolve);
    });
  }

  waitForRender(satisfied: () => boolean): Promise<void> {
    let thisRef = this;
    return new Promise<void>(async function(resolve) {
      while (!satisfied()) {
        await thisRef.createRenderPromise();
      }

      resolve();
    });
  }

  async showHintPicker(
      hints: Credential[],
      options: CredentialHintOptions,
      displayCallbacks: DisplayCallbacks): Promise<Credential> {
    this.displayCredentials = hints.map((hint) => {
      return new DisplayCredential(hint);
    });

    this.pickResultPromise = new Promise<Credential>((resolve, reject) => {
      this.pickResolver = resolve;
      this.pickRejector = reject;
    });

    // allow ng2 to render the picker, which we detect by looking for the
    // addition of an element with the picker class to the DOM.
    await this.waitForRender(() => {
      return document.getElementsByClassName('picker').length > 0;
    });

    // measure the picker and send this as the desired frame size to the
    // parent.
    let pickerElem = document.getElementsByClassName('picker')[0];
    let computedStyle = window.getComputedStyle(pickerElem);
    let height = pickerElem.clientHeight;
    height += parseInt(computedStyle.getPropertyValue('margin-top'), 10);
    height += parseInt(computedStyle.getPropertyValue('border-top'), 10);
    height += parseInt(computedStyle.getPropertyValue('border-bottom'), 10);
    height += parseInt(computedStyle.getPropertyValue('margin-bottom'), 10);
    displayCallbacks.requestDisplayOptions({height});

    try {
      return await this.pickResultPromise;
    } finally {
      this.displayCredentials = null;
    }
  }

  async showCredentialPicker(
      credentials: Credential[],
      options: CredentialRequestOptions,
      displayCallbacks: DisplayCallbacks): Promise<Credential> {
    return null;
  }

  async showSaveConfirmation(
      credential: Credential,
      displayCallbacks: DisplayCallbacks): Promise<boolean> {
    return false;
  }

  async showAutoSignIn(
      credential: Credential,
      displayCallbacks: DisplayCallbacks): Promise<any> {
    return;
  }

  async dispose(): Promise<void> {
    return;
  }

  handleCredentialClick(displayCredential: DisplayCredential) {
    this.pickResolver(displayCredential.credential);
  }

  dismiss() {
    this.pickResolver(null);
  }
}

/**
 * A wrapper for a credential that reformats it specifically to make display
 * in the angular template easier.
 */
export class DisplayCredential {
  isEmail = false;
  isPhone = false;
  imageUrl: string = null;
  firstLine: string;
  secondLine: string = null;

  constructor(public credential: Credential) {
    if (credential.displayName) {
      this.firstLine = credential.displayName;
      this.secondLine = credential.id;
    } else {
      this.firstLine = credential.id;
    }

    if (credential.id.indexOf('@') !== -1) {
      this.isEmail = true;
    } else if (/[0-9-+. \(\)]/.test(credential.id)) {
      this.isPhone = true;
    }
  }
}

/**
 * Affiliation provider that simply returns the provided authentication domain
 * as equivalent to itself.
 */
class SimpleAffiliationProvider implements AffiliationProvider {
  async getEquivalentDomains(authDomain: string): Promise<string[]> {
    return [authDomain];
  }
}

/**
 * Client configuration provider that assumes that the API is enabled for all
 * clients.
 */
class SimpleClientConfigurationProvider implements ClientConfigurationProvider {
  async getConfiguration(authDomain: string):
      Promise<PrimaryClientConfiguration> {
    return {
      type: 'primary',
      apiEnabled: true,
      allowNestedFrameRequests: true,
      authenticationEndpoint: authDomain + '/login',
      requireProxyLogin: false
    };
  }
}

class CredentialDataProviderImpl implements CredentialDataProvider {
  constructor(private credentialStoreService: CredentialStoreService) {}

  async getAllCredentials(
      authDomains: string[],
      options: CredentialHintOptions): Promise<Credential[]> {
    let credentials = this.credentialStoreService.getAllCredentials();

    let resultCredentials: Credential[] = [];
    for (let credential of credentials) {
      if (!authDomains ||
          authDomains.findIndex(
              (authDomain) => authDomain === credential.from) !== -1) {
        resultCredentials.push(this.translateToExternalCredential(credential));
      }
    }

    return resultCredentials;
  }

  async getAllHints(options: CredentialHintOptions): Promise<Credential[]> {
    return this.credentialStoreService.getAllCredentials().map(
        c => this.translateToExternalCredential(c));
  }

  async upsertCredential(credential: Credential, original?: Credential):
      Promise<Credential> {
    return credential;
  }

  async deleteCredential(credential: Credential): Promise<void> {
    return;
  }

  private translateToExternalCredential(credential: StoredCredential):
      Credential {
    return {
      id: credential.id,
      displayName: credential.display,
      authMethod: AUTHENTICATION_METHODS.ID_AND_PASSWORD,
      authDomain: credential.from,
      password: credential.password
    };
  }
}

class LocalStateProviderImpl implements LocalStateProvider {
  private retainedCredentials = ({} as {[key: string]: Credential});

  async isAutoSignInEnabled(authDomain: string): Promise<boolean> {
    return false;
  }

  async setAutoSignInEnabled(authDomains: string, enabled: boolean):
      Promise<void> {
    return;
  }

  async retainCredentialForSession(authDomain: string, credential: Credential):
      Promise<void> {
    this.retainedCredentials[authDomain] = credential;
  }

  async getRetainedCredential(authDomain: string): Promise<Credential> {
    if (!(authDomain in this.retainedCredentials)) {
      return null;
    }

    let credential = this.retainedCredentials[authDomain];
    delete this.retainedCredentials[authDomain];
    return credential;
  }
}
