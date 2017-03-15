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
 * A TypeScript utility for producing a string enumeration, retaining enough
 * string literal type information to be usable for static checking.
 *
 * The function produces an object, where for each string value _s_ provided as
 * an argument, the key s maps to the value s, with string literal type s.
 * For example, `animals = strEnum('cat', 'dog', 'pig')` produces the object
 * `{cat: 'cat', dog: 'dog', 'pig': pig}`, where `typeof animals.cat === 'cat'`.
 */
export function strEnum<T extends string>(...enumValues: T[]):
    Readonly<{[K in T]: K}> {
  let result = enumValues.reduce((res, key) => {
    res[key] = key;
    return res;
  }, Object.create(null));
  return Object.freeze(result);
}

export type StringKeyedObject = {
  [key: string]: any
};

export function indexedStrEnum<O extends StringKeyedObject>(
    values: {[K in keyof O]: {v: O[K]}}): O&{readonly [key: string]: any} {
  let result = Object.keys(values).reduce((res, key) => {
    res[key] = values[key].v;
    return res;
  }, Object.create(null));
  return Object.freeze(result);
}

export function boxEnum<T extends string>(val: T): {readonly v: T} {
  return {v: val};
}
