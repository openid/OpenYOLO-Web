/*
 * Copyright 2017 Google, Inc. All Rights Reserved.
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

exports.browsers = {
  sl_elcapitan_safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OSX 10.11',
    version: 'latest',
  },
  sl_win10_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Windows 10',
    version: 'latest',
  },
  sl_win10_edge: {
    base: 'SauceLabs',
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10',
    version: 'latest',
  },
  sl_win81_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Windows 8.1',
    version: 'latest',
  },
};
