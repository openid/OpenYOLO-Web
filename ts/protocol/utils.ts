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
 * Generates a random string ID.
 */
export function generateId(): string {
  let buf = new Uint32Array(2);
  window.crypto.getRandomValues(buf);
  return buf[0].toString(16) + buf[1].toString(16);
}

export function noDataValidator(value: any) {
  return !value;
}

/**
 * Ensures that the provided value is a non-empty string.
 */
export function stringValidator(value: any): boolean {
  return !!value && typeof value === 'string' && value.length > 0;
}

/**
 * Utility to handle a promise result. It allows for more readable code
 * as this pattern is often used.
 */
export class PromiseResolver<T> {
  readonly promise: Promise<T>;
  protected resolveFn: ((result?: T) => void)|null;
  protected rejectFn: ((error: Error) => void)|null;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  resolve(result?: T): void {
    if (!this.resolveFn) throw new Error('Promise Resolver already disposed.');
    this.resolveFn(result);
    this.dispose();
  }

  reject(error: Error): void {
    if (!this.rejectFn) throw new Error('Promise Resolver already disposed.');
    this.rejectFn(error);
    this.dispose();
  }

  dispose(): void {
    this.resolveFn = null;
    this.rejectFn = null;
  }
}

/**
 * A promise resolver which automatically rejects after a specified timeout.
 */
export class TimeoutPromiseResolver<T> extends PromiseResolver<T> {
  private timeoutId: number;
  constructor(private timeoutError: Error, timeoutMs: number) {
    super();
    this.timeoutId = setTimeout(this.timeoutReject.bind(this), timeoutMs);
  }

  resolve(result?: T): void {
    super.resolve(result);
    clearTimeout(this.timeoutId);
  }

  reject(error: Error): void {
    super.reject(error);
    clearTimeout(this.timeoutId);
  }

  private timeoutReject() {
    if (!this.rejectFn) {
      return;
    }
    this.reject(this.timeoutError);
  }
}

export function timeoutPromise<T>(error: Error, timeoutMs: number): Promise<T> {
  let promiseResolver = new TimeoutPromiseResolver(error, timeoutMs);
  return promiseResolver.promise;
}
