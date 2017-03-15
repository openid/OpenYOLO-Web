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

const karma_base = require('./karma_base');
const saucelabs = require('./karma.saucelabs.js');

module.exports = function(karma) {
  let config = Object.assign(karma_base.baseConfig, {
    autoWatch: true,
    preprocessors: {
      '**/*.ts': ['karma-typescript', 'coverage'],
    },
    reporters: ['verbose', 'karma-typescript', 'coverage'],
    coverageReporter: {type: 'lcov', dir: 'coverage/'},
    sauceLabs: {testName: 'OpenYOLO Web'},
    singleRun: true,
  });

  if (process.argv.includes('--use-sauce')) {
    config.customLaunchers = saucelabs.browsers;
    config.browsers = Object.keys(saucelabs.browsers);
    config.sauceLabs.testName = 'OpenYOLO Web All Unit Tests';
  }

  karma.set(config);
}
