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

import {getPath, isHierarchical, parseUri} from './uri';

export type DataValidator = (data?: any) => boolean;

export function isUndefined(value?: any): boolean {
  return typeof value === 'undefined';
}

export function isObject(value?: any): boolean {
  return !!value && typeof value === 'object';
}

export function isNonEmptyString(value?: any): boolean {
  return typeof value === 'string' && value.length > 0;
}

export function isBoolean(value?: any): boolean {
  return typeof value === 'boolean';
}

export function isWebUrl(value?: any): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  let uri = parseUri(value);
  if (!uri || (uri.scheme !== 'http' && uri.scheme !== 'https') ||
      !uri.hierPart.startsWith('//')) {
    return false;
  }

  return !!uri;
}

/**
 * Checks that the provided value is of form "scheme://authority", specifically
 * such that it is an absolute, hierarchical URI with no path, query or
 * fragment.
 */
export function isSchemeAndAuthorityOnlyUrl(value: any): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  let uri = parseUri(value);
  if (!uri || uri.query || uri.fragment || !isHierarchical(uri) ||
      getPath(uri)) {
    return false;
  }

  return true;
}

export function isValidCredential(value: any): boolean {
  if (!isObject(value) || !isNonEmptyString(value['id']) ||
      !isSchemeAndAuthorityOnlyUrl(value['authMethod'])) {
    return false;
  }

  if ('authDomain' in value &&
      !isSchemeAndAuthorityOnlyUrl(value['authDomain'])) {
    return false;
  }

  if ('password' in value && !isNonEmptyString(value['password'])) {
    return false;
  }

  if ('displayName' in value && !isNonEmptyString(value['displayName'])) {
    return false;
  }

  if ('profilePicture' in value && !isWebUrl(value['profilePicture'])) {
    return false;
  }

  if ('exchangeToken' in value && !isNonEmptyString(value['exchangeToken'])) {
    return false;
  }

  if ('idToken' in value && !isNonEmptyString(value['idToken'])) {
    return false;
  }

  if ('generatedPassword' in value &&
      !isNonEmptyString(value['generatedPassword'])) {
    return false;
  }

  if ('proxiedAuthRequired' in value &&
      !isBoolean(value['proxiedAuthRequired'])) {
    return false;
  }

  return true;
}

export function isValidRequestOptions(value: any): boolean {
  // TODO: implement
  return true;
}

export function isValidHintOptions(value: any): boolean {
  // TODO: implement
  return true;
}

export function isValidProxyLoginResponse(value: any): boolean {
  // TODO: implement
  return true;
}

export function isValidError(value: any): boolean {
  // TODO: implement
  return true;
}

export function isValidDisplayOptions(value: any): boolean {
  // TODO: implement
  return true;
}
