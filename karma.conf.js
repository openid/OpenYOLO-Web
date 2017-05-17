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
const headless = require('./karma.headless.js');
const saucelabs = require('./karma.saucelabs.js');

module.exports = function(karma) {
  var config = Object.assign(karma_base.baseConfig, {
    autoWatch: true,
    reporters: ['verbose', 'karma-typescript', 'coverage'],
    singleRun: true
  });

  config.karmaTypescriptConfig.coverageOptions = {exclude: /_test\.ts$/};
  config.karmaTypescriptConfig.reports = {
    json: {filename: 'coverage-final.json'}
  };

  if (process.argv.includes('--use-sauce')) {
    config.customLaunchers = saucelabs.browsers;
    config.browsers = Object.keys(saucelabs.browsers);
    config.sauceLabs.testName = 'OpenYOLO Web All Unit Tests';
  } else if (process.env.TRAVIS) {
    config.customLaunchers = headless.config.customLaunchers;
    config.browsers = headless.config.browsers;
  }

  karma.set(config);
}
