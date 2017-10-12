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
export interface OpenYoloCredential {
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
 * Encapsulates the response from the authentication system to a proxy login.
 */
export interface OpenYoloProxyLoginResponse {
  statusCode: number;
  responseText: string;
}

/**
 * The set of parameters passed from the client for a credential retrieval
 * request.
 */
export interface OpenYoloCredentialRequestOptions {
  /**
   * The supported authentication methods supported by the origin, described
   * as a list of absolute, hierarchical URLs with no path. See
   * `AuthenticationMethods` for common values.
   */
  supportedAuthMethods: string[];

  /**
   * The OpenID Connect ID token providers that the client supports, with
   * optional client/provider specific configuration parameters.
   */
  supportedIdTokenProviders?: TokenProvider[];

  /**
   * Specifies the context of the request (account creating, login, etc.).
   */
  context?: RequestContext;
}

/**
 * Defines a token provider by its canonical base URI.
 */
export interface TokenProvider {
  /**
   * The URI of the token provider. See `TOKEN_PROVIDERS` for some common
   * values.
   */
  uri: string;

  /**
   * The optional OpenID Connect client ID for this app, in the context of this
   * token provider.
   */
  clientId?: string;

  /**
   * The optional nonce value to include in any generated ID token.
   */
  nonce?: string;
}

/**
 * The set of parameters passed from the client for a hint retrieval request.
 */
export interface OpenYoloCredentialHintOptions {
  /**
   * The supported authentication methods supported by the origin, described
   * as a list of absolute, hierarchical URLs with no path. See
   * `AuthenticationMethods` for common values.
   */
  supportedAuthMethods: string[];

  /**
   * The OpenID Connect ID token providers that the client supports, with
   * optional client/provider specific configuration parameters.
   */
  supportedIdTokenProviders?: TokenProvider[];

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

  /**
   * Specifies the context of the request (account creating, login, etc.).
   */
  context?: RequestContext;
}

/**
 * The defined rendering modes that the client can pass to the provider:
 *
 * - bottomSheet: The provider is rendered to an area that partially fills the
 *   bottom of the screen, with a fixed width. The rendering area is either
 *   equal to the width of the client frame, or 480px, whichever is smaller.
 *
 * - navPopout: The provider is rendered in a pop-up style at the top of the
 *   screen, with a fixed width. The
 *
 * A const enum is required as string enums in TypeScript get compiled with
 * properties in quotes. For instance, the following RenderMode would be:
 *
 * RenderMode = {
 *   'bottomSheet': 'bottomSheet',
 *   'navPopout': 'navPopout',
 *   'fullScreen': 'fullScreen'
 * }
 *
 * The issue is that the references to this enum are made WITHOUT bracket
 * notations, so the Closure Compiler does not link the reference to the
 * definition.
 */
export const enum RenderMode {
  bottomSheet = 'bottomSheet',
  navPopout = 'navPopout',
  fullScreen = 'fullScreen',
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
  YAHOO: boxEnum('https://login.yahoo.com'),
});

/**
 * The set of commonly-used OpenID Connect token providers. This list is not
 * intended to be an exhaustive enumeration of all token providers.  When
 * referencing a token provider, use the origin related to its
 * token endpoint.
 */
export const TOKEN_PROVIDERS = indexedStrEnum({
  GOOGLE: boxEnum('https://accounts.google.com'),
  MICROSOFT: boxEnum('https://login.live.com'),
});

/**
 * The set of request contexts that can be used when requesting a credential or
 * a hint. It is meant for providers to optionally change the UI according to
 * the context.
 */
export enum RequestContext {
  signIn = 'signIn',
  signUp = 'signUp',
  continue = 'continue',
  use = 'use',
}
