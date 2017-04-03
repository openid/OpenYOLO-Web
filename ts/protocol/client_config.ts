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
