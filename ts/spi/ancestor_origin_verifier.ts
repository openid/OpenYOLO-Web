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

import {createMessageListener, isPermittedOrigin, sendMessage, WindowLike} from '../protocol/comms';
import {OpenYoloInternalError} from '../protocol/errors';
import {PostMessageType, verifyPingMessage} from '../protocol/post_messages';
import {generateId, TimeoutPromiseResolver} from '../protocol/utils';

export interface MessageEventLike {
  source: WindowLike;
  data?: any;
}

const DEFAULT_TIMEOUT = 500;

/**
 * Verifies that the origin of every ancestor frame of a provider frame
 * is on a whitelist. This ensures that the requester is not itself embedded in
 * the frame of some unrelated, potentially malicious site, which is attempting
 * a redress attack or has XSS hooks into the requester frame.
 *
 * Verification is performed by sending a 'ping' message to every ancestor
 * frame containing a random nonce. Every frame must respond with an 'ack'
 * containing that same nonce within a specified timeout. This therefore
 * requires the active participation of all ancestor frames, which is in itself
 * a line of defense against potentially malicious reframing of sites.
 */
export class AncestorOriginVerifier {
  private timeoutMs: number;

  /**
   * Verifies that the parent frame's origin is contained in the provided list
   * of permitted origins, and returns the detected origin of the parent.
   *
   * If the parent is not the root frame, the returned promise is rejected.
   * If no valid response is received within the specified or default timeout,
   * the promise is rejected.
   */
  static verifyOnlyParent(
      providerFrame: WindowLike,
      permittedOrigins: string[],
      timeoutMs?: number): Promise<string> {
    return new AncestorOriginVerifier(
               providerFrame, permittedOrigins, timeoutMs)
        .verify(false)
        .then((result) => result[0]);
  }

  /**
   * Verifies that all ancestor frames have origins contained in the provided
   * list of permitted origins, and returns the detected origins for each
   * ancestor. The returned list is ordered such that the parent occurs
   * first, and the root frame occurs last.
   *
   * If any ancestor frame is not on the permitted origin list, the promise
   * is rejected. If any ancestor does not respond within the specified or
   * default timeout, the promise is rejected.
   */
  static verify(
      providerFrame: WindowLike,
      permittedOrigins: string[],
      timeoutMs?: number): Promise<string[]> {
    return new AncestorOriginVerifier(
               providerFrame, permittedOrigins, timeoutMs)
        .verify(true);
  }

  constructor(
      private providerFrame: WindowLike,
      private permittedOrigins: string[],
      timeoutMs?: number) {
    this.timeoutMs = (timeoutMs && timeoutMs > 1) ? timeoutMs : DEFAULT_TIMEOUT;
  }

  verify(allowMultipleAncestors: boolean): Promise<string[]> {
    // Ensure the provider frame is running as a child frame or a popup.
    if (this.providerFrame.parent === this.providerFrame &&
        !this.providerFrame.opener) {
      return Promise.reject(OpenYoloInternalError.illegalStateError(
          'The request should be opened in an iframe or a popup'));
    }

    let ancestorFrame: WindowLike|null = null;
    // Selects the correct "parent" window whether iframe or popup.
    if (this.providerFrame.parent !== this.providerFrame) {
      ancestorFrame = this.providerFrame.parent;
    } else {
      ancestorFrame = this.providerFrame.opener!;
    }

    if (ancestorFrame.parent !== ancestorFrame && !allowMultipleAncestors) {
      return Promise.reject(OpenYoloInternalError.parentIsNotRoot());
    }

    let promises: Array<Promise<string>> = [];
    promises.push(this.verifyAncestorOrigin(ancestorFrame, 0));

    let parentDepth = 1;
    while (ancestorFrame.parent !== ancestorFrame) {
      ancestorFrame = ancestorFrame.parent;
      promises.push(this.verifyAncestorOrigin(ancestorFrame, parentDepth));
      parentDepth++;
    }

    return Promise.all(promises);
  }

  async verifyAncestorOrigin(ancestorFrame: WindowLike, parentDepth: number):
      Promise<string> {
    let promiseResolver = new TimeoutPromiseResolver<string>(
        OpenYoloInternalError.parentVerifyTimeout(), this.timeoutMs);

    let verifyId: string = generateId();

    let listener =
        createMessageListener(PostMessageType.verifyAck, (data, type, ev) => {
          // ignore the message if it doesn't contain the correct verification
          // ID, or is from the wrong frame.
          if (data !== verifyId || ev.source !== ancestorFrame) {
            return;
          }

          // We either resolve or reject according to the origin.
          if (isPermittedOrigin(ev.origin, this.permittedOrigins)) {
            promiseResolver.resolve(ev.origin);
          } else {
            console.warn(`untrusted domain in ancestor chain: ${ev.origin}`);
            promiseResolver.reject(
                OpenYoloInternalError.untrustedOrigin(ev.origin));
          }
        });

    this.providerFrame.addEventListener('message', listener);
    sendMessage(ancestorFrame, verifyPingMessage(verifyId));
    try {
      return await promiseResolver.promise;
    } finally {
      this.providerFrame.removeEventListener('message', listener);
    }
  }
}
