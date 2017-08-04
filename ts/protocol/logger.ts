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

import {LogLevel} from './data';
import {OpenYoloInternalError} from './errors';

// default log level
// only log errors
export const DEFAULT_LOG_LEVEL = LogLevel.WARNING;

// the current log level
let LOG_LEVEL = DEFAULT_LOG_LEVEL;

// enforcing a slightly stricter contract than console
type Logger = (message: string, ...args: any[]) => void;

// enforce exhaustive checks on log levels
function shouldNeverHappen(level: never): never {
  throw OpenYoloInternalError.requestFailed('Invalid log level');
}

function getLogger(level: LogLevel): Logger {
  switch (level) {
    case LogLevel.DEBUG:
      return console.log.bind(console);
    case LogLevel.INFO:
      return console.info.bind(console);
    case LogLevel.WARNING:
      return console.warn.bind(console);
    case LogLevel.ERROR:
      return console.error.bind(console);
    default:
      return shouldNeverHappen(level);
  }
}

function isLoggable(level: LogLevel): boolean {
  return level <= LOG_LEVEL;
}

export function setLogLevel(level: LogLevel) {
  LOG_LEVEL = level;
}

export function log(level: LogLevel, message: string, ...args: any[]) {
  if (!isLoggable(level)) {
    return;
  }

  const length = args ? args.length : 0;
  if (length > 0) {
    getLogger(level)(message, ...args);
  } else {
    getLogger(level)(message);
  }
}
