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

/**
 * By default, asynchronous tests that use JasmineTimeoutManager will have this
 * timeout, in milliseconds.
 */
export const DEFAULT_TIMEOUT = 250;

/**
 * Utility for use in the beforeEach / afterEach methods of jasmine test suites,
 * to override the clock and timeout duration used for tests.
 */
export class JasmineTimeoutManager {
  private lastTimeout: number;
  private timeout: number;

  constructor(desiredTimeout: number = DEFAULT_TIMEOUT) {
    this.timeout =
        this.isValidTimeout(desiredTimeout) ? desiredTimeout : DEFAULT_TIMEOUT;
  }

  install(newTimeout: number = DEFAULT_TIMEOUT) {
    this.lastTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL =
        this.isValidTimeout(newTimeout) ? newTimeout : this.timeout;
    jasmine.clock().install();
  }

  uninstall() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = this.lastTimeout;
    jasmine.clock().uninstall();
  }

  isValidTimeout(timeout?: number) {
    return (timeout && timeout > 0);
  }
}
