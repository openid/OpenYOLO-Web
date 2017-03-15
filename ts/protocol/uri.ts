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
 * captures 4 components of a URI: scheme, hierarchical part, query and
 * fragement.
 */
const URI_REGEX =
    /^(?:([^:/?#]+):)((?:\/\/)?[^?#]*)(?:\\?([^#]*))?(?:#([^?]*))?$/;

export interface Uri {
  scheme: string;
  hierPart: string;
  query?: string;
  fragment?: string;
}

export function parseUri(value: string): Uri|null {
  let match = URI_REGEX.exec(value);
  if (!match) {
    return null;
  }

  let result: Uri = {scheme: match[1], hierPart: match[2]};

  if (match[3]) {
    result.query = match[3];
  }

  if (match[4]) {
    result.fragment = match[4];
  }

  return result;
}

export function isHierarchical(uri: Uri) {
  return uri.hierPart.startsWith('//');
}

export function getPath(uri: Uri): string|null {
  let pathSearchStart = (uri.hierPart.startsWith('//')) ? 2 : 0;
  let pathIndex = uri.hierPart.indexOf('/', pathSearchStart);
  if (pathIndex < 0) {
    return null;
  }

  return uri.hierPart.substring(pathIndex);
}
