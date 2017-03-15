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
 * Defines a subset of the passwords an authentication system permits. The
 * specification is provided in a form that makes it easy to generate
 * conformant passwords, and to validate conformance.
 */
export interface PasswordSpecification {
  /**
   * The minimum length of a password.
   */
  minLength: number;
  /**
   * The maximum length of a password.
   */
  maxLength: number;

  /**
   * A definition of the required characters in a password. The characters sets
   * must be disjoint, and the total number of required characters must be
   * less than or equal to the minimum length of the password.
   * @type {RequiredCharacterSet}
   */
  requiredCharSets: RequiredCharacterSet[];

  /**
   * The set of allowable characters in a password, once the required character
   * set constraints have been satisifed. The string must be composed of
   * ASCII-printable characters only. Duplicate characters are ignored.
   */
  allowsChars: string;
}

export interface RequiredCharacterSet {
  /**
   * The number of characters from this set which must be found in the password.
   */
  count: number;

  /**
   * The set of characters from which the specified count of characters must
   * be drawn. The string must be composed of ASCII-printable characters only.
   * Duplicate characters are ignored.
   */
  chars: string;
}

const lowerAlpha = 'abcdefghijklmnopqrstuvwxyz';
const upperAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numerals = '1234567890';

const lowerAlphaDistinguishable = 'abcdefghijkmnopqrstxyz';
const upperAlphaDistinguishable = 'ABCDEFGHJKLMNPQRSTXY';
const numeralsDistinguishable = '3456789';

/**
 * Commonly used character sets for password generation.
 */
export const CHARACTER_SETS = Object.freeze({
  /**
   * The set of lower case ASCII characters (a-z).
   */
  LOWER_ALPHA: lowerAlpha,

  /**
   * The set of lower case ASCII characters, omitting those which are difficult
   * to distinguish from other alphanumeric characters. The omitted characters
   * are:
   *
   * - l (lima), often confused with 1 (one) and I (india, upper case)
   * - u (uniform), often confused with v (victor)
   * - v (victor), often confused with u (uniform)
   * - w (whiskey), often confused with vv (victor victor)
   */
  LOWER_ALPHA_DISTINGUISHABLE: lowerAlphaDistinguishable,

  /**
   * The set of upper case ASCII characters (A-Z).
   */
  UPPER_ALPHA: upperAlpha,

  /**
   * The set of upper case ASCII characters, omitting those which can be
   * difficult to distinguish from other alphanumeric characters. The omitted
   * characters are:
   *
   * - I (india), often confused with 1 (one) and l (lima, lower case)
   * - O (oscar), often confused with 0 (zero)
   * - U (uniform), often confused with v (victor)
   * - V (victor), often confused with u (uniform)
   * - W (whiskey), often confused with vv (victor victor)
   * - Z (zulu), often confused with 2 (two)
   */
  UPPER_ALPHA_DISTINGUISHABLE: upperAlphaDistinguishable,

  /**
   * The set of ASCII numerals (0-9).
   */
  NUMERALS: numerals,

  /**
   * The set of ASCII numerals, omitting those which can be difficult to
   * distinguish from other alphanumeric characters. The omitted characters are:
   *
   * - 0 (zero), often confused with O (oscar, upper case)
   * - 1 (one), often confused with I (india, upper case) and l (lima, lower
   *   case)
   * - 2 (two), often confused with Z (zulu, upper case)
   */
  NUMERALS_DISTINGUISHABLE: numeralsDistinguishable,

  /**
   * The set of all alpha-numeric ASCII characters (a-z, A-Z, 0-9).
   */
  ALPHANUMERIC: lowerAlpha + upperAlpha + numerals,

  /**
   * The set of all alphanumeric characters which are easily
   * distinguished. Specifically, this excludes:
   *
   * - I (india, upper case), often confused with 1 (one) and l (lima, lower
   * case)
   * - l (lima, lower case), often confused with 1 (one) and I (india, upper
   * case)
   * - O (oscar, upper case), often confused with 0 (zero)
   * - U (uniform, lower and upper case), often confused with v (victor)
   * - V (victor, lower and upper case), often confused with u (uniform)
   * - W (whiskey, lower and upper case), often confused with vv (victor victor)
   * - Z (zulu), often confused with 2 (two)
   * - 0 (zero), often confused with O (oscar, upper case)
   * - 1 (one), often confused with I (india, upper case) and l (lima, lower
   * case)
   * - 2 (two), often confused with Z (zulu, upper case)
   */
  ALPHANUMERIC_DISTINGUISHABLE: lowerAlphaDistinguishable +
      upperAlphaDistinguishable + numeralsDistinguishable,

  /**
   * The set of all printable ASCII symbols.
   */
  SYMBOLS: ' !\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',

  /**
   * The set of all symbols which are easily distinguished. Specifically,
   * this excludes:
   *
   * - space
   * - exclamation mark
   * - single and double quotation marks, back-tick
   * - forward and backward slashes
   * - comma and period
   * - colon and semi-colon
   * - pipe
   */
  SYMBOLS_DISTINGUISHABLE: '#$%&()*+-<=>?@[]^_{}~'
});

/**
 * The default password specification used for generation in hint
 * requests,
 * if no explicit alternative is provided. Represents the set of passwords
 * composed of distinguishable alphanumeric characters, between 12 and 16
 * characters long.
 */
export const DEFAULT_PASSWORD_GENERATION_SPEC = Object.freeze({
  minLength: 12,
  maxLength: 16,
  requiredCharSets: Object.freeze([
    Object.freeze(
        {chars: CHARACTER_SETS.LOWER_ALPHA_DISTINGUISHABLE, count: 1}),
    Object.freeze(
        {chars: CHARACTER_SETS.UPPER_ALPHA_DISTINGUISHABLE, count: 1}),
    Object.freeze({chars: CHARACTER_SETS.NUMERALS_DISTINGUISHABLE, count: 1})
  ]),
  allowedChars: CHARACTER_SETS.ALPHANUMERIC_DISTINGUISHABLE
});
