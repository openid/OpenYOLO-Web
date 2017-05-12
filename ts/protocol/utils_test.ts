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

import * as utils from './utils';

interface WindowWithTextEncoder extends Window {
  TextEncoder: any;
}

describe('utils', () => {
  describe('generateId', () => {
    it('should generate a random string ID', () => {
      expect(utils.generateId()).not.toBeNull();
    });
  });

  describe('sha256', () => {
    const str = 'This is not a string.';
    it('works with native TextEncoder', async function(done) {
      if (typeof TextEncoder === 'undefined') done();
      const hash = await utils.sha256(str);
      expect(hash).toBeTruthy();
      done();
    });

    it('works without native TextEncoder', async function(done) {
      const textEncoderImpl = TextEncoder;
      delete (window as WindowWithTextEncoder).TextEncoder;
      const hash = await utils.sha256(str);
      expect(hash).toBeTruthy();
      (window as WindowWithTextEncoder).TextEncoder = textEncoderImpl;
      if (typeof TextEncoder !== 'undefined') {
        // Compare with native computation.
        const hash2 = await utils.sha256(str);
        expect(hash).toEqual(hash2);
      }
      done();
    });

    it('fallbacks to returning the string if insecure origin',
       async function(done) {
         spyOn(window.crypto.subtle, 'digest')
             .and.throwError('Insecure Origin!');
         const hash = await utils.sha256(str);
         expect(hash).toEqual(str);
         done();
       });
  });
});
