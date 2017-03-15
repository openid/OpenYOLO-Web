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

import {boxEnum, indexedStrEnum} from './enums';
import {PasswordSpecification} from './password_spec';

/**
 * @file Definitions of the data types exchanged between a client and a
 * credential provider.
 */

/**
 * Represents a credential which may be usable to sign in.
 */
export interface Credential {
  /**
   * The unique identifier for the credential within the scope of the
   * authentication system. This is typically an email address, phone number
   * or user name, though any printable ASCII string may be used.
   */
  id: string;

  /**
   * The authentication method for this credential. Authentication methods
   * are absolute, hierarchical URLs with no path, query or fragment.
   * See `AuthenticationMethods` for common values.
   */
  authMethod: string;

  /**
   * The authentication domain where this credential was last saved.
   * Authentication domains are URIs of form "scheme://authority". This cannot
   * be directly altered by clients; any value set by the client must be
   * ignored by providers.
   */
  authDomain?: string;

  /**
   * The optional password for this credential. This value will only be set
   * for retrieved credentials (not hints), `authMethod` has value
   * `Authentication.ID_AND_PASSWORD`, and `proxyLoginRequired` is `false`.
   */
  password?: string;

  /**
   * The optional display name for this credential, which the user should be
   * able to recognise as a more human readable substitute for the identifier.
   * Typically, this will be the user's actual name.
   */
  displayName?: string;

  /**
   * An optional URL for a profile picture associated with this credential.
   */
  profilePicture?: string;

  /**
   * A JSON Web Token from the credential provider that verifiably asserts
   * where a credential came from. This can be sent to token providers, who
   * may provide an ID token in exchange.
   */
  exchangeToken?: string;

  /**
   * An optional ID token, which provides additional "proof of access" to
   * the account identifier. For email or phone based identifiers, this
   * typically means that a user is present that can access emails or messages
   * sent to that identifier.
   */
  idToken?: string;

  /**
   * An optional generated password for the credential. This is only provided
   * for credential hints.
   */
  generatedPassword?: string;

  /**
   * Specifies whether the credential must be dispatched via the credential
   * provider to log in. If `false`, then all information required to
   * authenticate with this credential is included and the request should
   * be directly dispatched from the requester.
   */
  proxiedAuthRequired?: boolean;
}

/**
 * A token which provides some additional verifying information related to
 * the credential, such as an verifiable assertion that the user owns the
 * email address identifier associated with a credential. Interpretation of
 * the token value is provider-specific.
 */
export interface CredentialToken {
  provider: string;
  token: string;
}

/**
 * Encapsulates the response from the authentication system to a proxy login.
 */
export interface ProxyLoginResponse {
  statusCode: number;
  responseText: string;
}

export interface CredentialRequestOptions {
  /**
   * The supported authentication methods supported by the origin, described
   * as a list of absolute, hierarchical URLs with no path. See
   * `AuthenticationMethods` for common values.
   */
  supportedAuthMethods: string[];
}

export interface CredentialHintOptions {
  /**
   * The supported authentication methods supported by the origin, described
   * as a list of absolute, hierarchical URLs with no path. See
   * `AuthenticationMethods` for common values.
   */
  supportedAuthMethods: string[];

  /**
   * Specifies whether an "add account" option should be displayed within the
   * list of displayed hints. This is `false` by default.
   */
  showAddAccount?: boolean;

  /**
   * Specifies the format of passwords that the provider may generate.
   * This specification must represent a subset of the passwords which can
   * be accepted by the authentication system. If a specification is not
   * explicitly provided, `DEFAULT_PASSWORD_GENERATION_SPEC` will be used.
   */
  passwordSpec?: PasswordSpecification;
}


/**
 * OpenYOLO client configurations must reside at './well-known/openyolo.json'
 * and may either be a "primary" configuration, containing the required
 * properties, or a "reference" configuration, which indicates that the
 * configuration can be found at another domain.
 */
export type ClientConfiguration =
    PrimaryClientConfiguration | ReferencingClientConfiguration;

/**
 * An OpenYOLO client configuration that contains the minimum set of properties
 * required
 */
export interface PrimaryClientConfiguration {
  type: 'primary';

  /**
   * Whether OpenYOLO requests should be allowed for this client.
   * Default: false.
   */
  apiEnabled?: boolean;

  /**
   * Whether usage of a credential should require proxied authentication via
   * the credential provider.
   * Default: false.
   */
  requireProxyLogin?: boolean;

  /**
   * Whether credential requests should be permitted from a context where
   * the parent frame is not the root of the window.
   * Default: false.
   */
  allowNestedFrameRequests?: boolean;

  /**
   * The authentication endpoint to which credentials should be sent, when
   * using proxied authentication.
   */
  authenticationEndpoint?: string;
}

/**
 * An OpenYOLO client configuration that refers to a configuration on another
 * domain. This other domain must be provably related to the current domain
 * though a bidirectional digital asset link association.
 */
export interface ReferencingClientConfiguration {
  type: 'reference';
  domain: string;
}

/**
 * A set of commonly-used federated authentication methods. This list is not
 * intended to be an exhaustive enumeration of all identity providers. When
 * referencing an identity provider, use the origin related to its
 * authentication / authorization page.
 */
export const AUTHENTICATION_METHODS = indexedStrEnum({
  ID_AND_PASSWORD: boxEnum('openyolo://id-and-password'),
  GOOGLE: boxEnum('https://accounts.google.com'),
  FACEBOOK: boxEnum('https://www.facebook.com'),
  LINKEDIN: boxEnum('https://www.linkedin.com'),
  MICROSOFT: boxEnum('https://login.live.com'),
  PAYPAL: boxEnum('https://www.paypal.com'),
  TWITTER: boxEnum('https://twitter.com'),
  YAHOO: boxEnum('https://login.yahoo.com')
});
