import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  entry: './es6/api/exports.js',
  plugins: [nodeResolve({module: true, jsnext: true, browser: true})],
  banner: `
/**
 * @license
 * OpenYOLO for Web
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
 *
 * -----------------------------------------------------------------------------
 *
 * This file also contains code imported from tslib
 * https://github.com/Microsoft/tslib
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
  `,
  sourceMap: 'inline',
  moduleName: 'openyolo',
  targets: [
    {dest: 'es5/openyolo-api.js', format: 'cjs'},
    {dest: 'es5/openyolo-api.iife.js', format: 'iife'},
    {dest: 'es6/openyolo-api.js', format: 'es'},
  ]
};
