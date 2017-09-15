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

  describe('TimeoutRacer', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('does nothing if promise resolves before timeout', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      expect(timeoutRacer.hasTimedOut()).toBe(false);
      timeoutRacer.race(promiseResolver.promise).then(() => {
        expect(timeoutRacer.hasTimedOut()).toBe(false);
        done();
      });
      jasmine.clock().tick(99);
      promiseResolver.resolve();
    });

    it('does reject if timeout', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      expect(timeoutRacer.hasTimedOut()).toBe(false);
      timeoutRacer.race(promiseResolver.promise)
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                expect(error.message).toEqual('The timeout has expired.');
                expect(timeoutRacer.hasTimedOut()).toBe(true);
                done();
              });
      jasmine.clock().tick(100);
    });

    it('does allow to chain resolution', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver1 = new utils.PromiseResolver<void>();
      const promiseResolver2 = new utils.PromiseResolver<void>();
      timeoutRacer.race(promiseResolver1.promise).then(() => {
        timeoutRacer.race(promiseResolver2.promise)
            .then(
                () => {
                  done.fail('The second promise should not resolve!');
                },
                (error) => {
                  done();
                });
        jasmine.clock().tick(50);
      });
      jasmine.clock().tick(50);
      promiseResolver1.resolve();
    });

    it('rethrows the correct timeout error', (done) => {
      const timeoutRacer1 = utils.startTimeoutRacer(100);
      const timeoutRacer2 = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      let ignoredFirst = false;
      timeoutRacer1.race(promiseResolver.promise)
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                // Ignore an invalid error.
                timeoutRacer2.rethrowIfTimeoutError(error);
                ignoredFirst = true;
                timeoutRacer1.rethrowIfTimeoutError(error);
              })
          .catch((error) => {
            expect(ignoredFirst).toBe(true);
            done();
          });
      jasmine.clock().tick(100);
    });

    it('rethrows the correct error', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      timeoutRacer.race(promiseResolver.promise)
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                timeoutRacer.rethrowIfTimeoutError(error);
                done();
              });
      promiseResolver.reject(new Error('Other error.'));
    });

    it('handles the correct timeout error', (done) => {
      const timeoutRacer1 = utils.startTimeoutRacer(100);
      const timeoutRacer2 = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      let handledFirst = false;
      timeoutRacer1.race(promiseResolver.promise)
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                timeoutRacer1.rethrowUnlessTimeoutError(error);
                handledFirst = true;
                // Ignore an invalid error.
                timeoutRacer2.rethrowUnlessTimeoutError(error);
              })
          .catch((error) => {
            expect(handledFirst).toBe(true);
            done();
          });
      jasmine.clock().tick(100);
    });

    it('handles the correct error', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      timeoutRacer.race(promiseResolver.promise)
          .then(
              () => {
                done.fail('Should not resolve!');
              },
              (error) => {
                timeoutRacer.rethrowUnlessTimeoutError(error);
                done.fail('Should not reject here!');
              })
          .catch(done);
      promiseResolver.reject(new Error('Other error.'));
    });

    it('stops', (done) => {
      const timeoutRacer = utils.startTimeoutRacer(100);
      const promiseResolver = new utils.PromiseResolver<void>();
      timeoutRacer.race(promiseResolver.promise)
          .then(
              () => {
                done();
              },
              (error) => {
                done.fail('Should not reject!');
              });
      jasmine.clock().tick(99);
      timeoutRacer.stop();
      jasmine.clock().tick(Infinity);
      promiseResolver.resolve();
    });
  });
});
