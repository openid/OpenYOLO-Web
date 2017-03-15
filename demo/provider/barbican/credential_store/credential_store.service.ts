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

/**
 * A stored credential. The interface here is deliberately different from that
 * in the OpenYOLO API, to demonstrate the very likely case where a credential
 * provider is storing data in a different form from what must be provided
 * via the SPI.
 */
export interface StoredCredential {
  id: string;
  display: string;
  from: string;
  password: string;
}

const credentialsKey = 'credentials';

@Injectable()
export class CredentialStoreService {
  constructor() {}

  getAllCredentials(): StoredCredential[] {
    let credentialsStr = localStorage.getItem(credentialsKey);
    if (!credentialsStr) {
      return [
        {
          id: 'alice@gmail.com',
          display: 'Alice McTesterson',
          from: 'https://www.example.com',
          password: 'alice4tw'
        },
        {
          id: '(650)555-1234',
          display: 'Bob McTesterson',
          from: 'https://www.example.com',
          password: 'bob4tw'
        }
      ];
    }

    let credentials = JSON.parse(credentialsStr);
    return credentials;
  }
}
