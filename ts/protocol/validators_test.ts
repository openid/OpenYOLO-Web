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

import {AUTHENTICATION_METHODS} from '../protocol/data';
import * as v from './validators';

const ALICE = 'alice@gmail.com';
const GOOGLE = AUTHENTICATION_METHODS.GOOGLE;
const PASSWORD = AUTHENTICATION_METHODS.ID_AND_PASSWORD;

type Validator = (value?: any) => boolean;
type ValidatorTest = [any, boolean]|[any, boolean, string];

describe('validators', () => {

  function validatorTest(validator: Validator, test: ValidatorTest) {
    let testDescription: string;
    if (test.length > 2) {
      testDescription = test[2];
    } else {
      let inputLabel = (typeof test[0] === 'string') ? `"${test[0]}"` : test[0];
      testDescription = `${inputLabel} => ${test[1]}`;
    }

    it(testDescription, () => {
      expect(validator(test[0])).toEqual(test[1]);
    });
  }

  function validatorSuite(
      validatorName: string, validator: Validator, ...tests: ValidatorTest[]) {
    describe(validatorName, () => {
      tests.forEach((test) => validatorTest(validator, test));
    });
  }

  function validatorSuiteArr(
      validatorName: string, validator: Validator, tests: ValidatorTest[]) {
    describe(validatorName, () => {
      tests.forEach((test) => validatorTest(validator, test));
    });
  }

  validatorSuite(
      'isUndefined',
      v.isUndefined,
      [undefined, true],
      [null, false],
      ['', false]);

  validatorSuite(
      'isObject',
      v.isObject,
      [undefined, false],
      [null, false],
      ['', false],
      ['abc', false],
      [0, false],
      [{}, true],
      [{a: 123}, true]);

  validatorSuite(
      'isBoolean',
      v.isBoolean,
      [undefined, false],
      [null, false],
      ['abc', false],
      [{}, false],
      [0, false],
      [false, true],
      [true, true]);

  validatorSuite(
      'isWebUrl',
      v.isWebUrl,
      [undefined, false],
      [null, false],
      ['', false],
      ['abc', false],
      [0, false],
      [{}, false],
      ['http', false],
      ['mailto:test@example.com', false],
      ['gopher://gopher', false],
      ['http://www.example.com', true],
      ['http://www.example.com/resource', true],
      ['http://www.example.com?query', true],
      ['http://www.example.com?a=b&c=d', true],
      ['https://www.example.com#fragment', true],
      ['https://www.example.com/path#fragment', true],
      ['https://www.example.com/path?query#fragment', true],
      ['http:www.example.com', false],
      ['https:/www.example.com', false]);

  validatorSuite(
      'isSchemeAndAuthorityOnlyUrl',
      v.isSchemeAndAuthorityOnlyUrl,
      [undefined, false],
      [null, false],
      ['', false],
      ['abc', false],
      [0, false],
      [{}, false],
      ['http', false],
      ['a:b', false],
      ['http://www.example.com', true],
      ['www.example.com', false],
      ['http://www.example.com/', false],
      ['http://localhost:8080', true]);

  let authMethodTests: ValidatorTest[] =
      Object.keys(AUTHENTICATION_METHODS).reduce((result, authMethodKey) => {
        result.push([AUTHENTICATION_METHODS[authMethodKey], true]);
        return result;
      }, [] as ValidatorTest[]);

  validatorSuiteArr(
      'defined authentication methods',
      v.isSchemeAndAuthorityOnlyUrl,
      authMethodTests);

  validatorSuite(
      'isValidCredential',
      v.isValidCredential,
      [undefined, false],
      [null, false],
      ['', false],
      ['abc', false],
      [0, false],
      [{}, false],
      [{id: ALICE}, false, 'missing authMethod field'],
      [{authMethod: GOOGLE}, false, 'missing id field'],
      [{id: '', authMethod: GOOGLE}, false, 'empty id field'],
      [{id: ALICE, authMethod: ''}, false, 'empty authMethod field'],
      [{id: ALICE, authMethod: 'test'}, false, 'invalid auth method'],
      [
        {id: ALICE, authMethod: 'openyolo://id-and-password'},
        true,
        'minimum valid credential'
      ],
      [
        {id: ALICE, authMethod: PASSWORD, password: ''},
        false,
        'empty password'
      ],
      [
        {id: ALICE, authMethod: PASSWORD, password: '123456'},
        true,
        'valid credential with password'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, displayName: ''},
        false,
        'empty display name'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, displayName: 'Alice'},
        true,
        'valid credential with display name'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, profilePicture: ''},
        false,
        'empty profile picture'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, profilePicture: 'not-a-url'},
        false,
        'profile picture that is not a URL'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, profilePicture: 'ftp://test/blah'},
        false,
        'profile picture that is not a web URL'
      ],
      [
        {
          id: ALICE,
          authMethod: GOOGLE,
          profilePicture: 'http://robohash.org/alice'
        },
        true,
        'profile picture that is an HTTP URL'
      ],
      [
        {
          id: ALICE,
          authMethod: GOOGLE,
          profilePicture: 'https://robohash.org/alice'
        },
        true,
        'profile picture that is an HTTPS URL'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, exchangeToken: ''},
        false,
        'empty exchange token'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, exchangeToken: 'asdf'},
        true,
        'non-empty exchange token'
      ],
      [{id: ALICE, authMethod: GOOGLE, idToken: ''}, false, 'empty ID token'],
      [
        {id: ALICE, authMethod: GOOGLE, idToken: 'asdf.asdf.asdf'},
        true,
        'non-empty ID token'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, generatedPassword: ''},
        false,
        'empty generated password'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, generatedPassword: ''},
        false,
        'non-empty generated password'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, proxiedAuthRequired: ''},
        false,
        'non-boolean proxiedAuthRequired field'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, proxiedAuthRequired: false},
        true,
        'proxied auth false'
      ],
      [
        {id: ALICE, authMethod: GOOGLE, proxiedAuthRequired: false},
        true,
        'proxied auth true'
      ], );
});
