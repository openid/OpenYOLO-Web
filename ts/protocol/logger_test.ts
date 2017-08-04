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
import {DEFAULT_LOG_LEVEL, log, setLogLevel} from './logger';

describe('Logger Tests', () => {

  let errorHandler: jasmine.Spy;
  let warnHandler: jasmine.Spy;
  let infoHandler: jasmine.Spy;
  let debugHandler: jasmine.Spy;

  beforeEach(() => {
    errorHandler = spyOn(console, 'error').and.callThrough();
    warnHandler = spyOn(console, 'warn').and.callThrough();
    infoHandler = spyOn(console, 'info').and.callThrough();
    debugHandler = spyOn(console, 'log').and.callThrough();
    setLogLevel(DEFAULT_LOG_LEVEL);
  });

  it('Should find an appropriate logger for every log level', (done) => {
    setLogLevel(LogLevel.DEBUG);
    log(LogLevel.DEBUG, 'debug');
    log(LogLevel.INFO, 'info');
    log(LogLevel.WARNING, 'warning');
    log(LogLevel.ERROR, 'error');
    expect(debugHandler).toHaveBeenCalled();
    expect(infoHandler).toHaveBeenCalled();
    expect(warnHandler).toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalled();
    done();
  });

  describe('Should log at the appropriate log levels', () => {
    it('Should only log warn|error messages at default log level', (done) => {
      log(LogLevel.DEBUG, 'debug');
      log(LogLevel.INFO, 'info');
      log(LogLevel.WARNING, 'warning');
      log(LogLevel.ERROR, 'error');
      expect(debugHandler).toHaveBeenCalledTimes(0);
      expect(infoHandler).toHaveBeenCalledTimes(0);
      expect(warnHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      done();
    });

    it('Should respect log level overrides to info', (done) => {
      setLogLevel(LogLevel.INFO);
      log(LogLevel.DEBUG, 'debug');
      log(LogLevel.INFO, 'info');
      log(LogLevel.WARNING, 'warning');
      log(LogLevel.ERROR, 'error');
      expect(debugHandler).toHaveBeenCalledTimes(0);
      expect(infoHandler).toHaveBeenCalledTimes(1);
      expect(warnHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      done();
    });

    it('Should respect log level overrides to warn', (done) => {
      setLogLevel(LogLevel.WARNING);
      log(LogLevel.DEBUG, 'debug');
      log(LogLevel.INFO, 'info');
      log(LogLevel.WARNING, 'warning');
      log(LogLevel.ERROR, 'error');
      expect(debugHandler).toHaveBeenCalledTimes(0);
      expect(infoHandler).toHaveBeenCalledTimes(0);
      expect(warnHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      done();
    });

  });
});
