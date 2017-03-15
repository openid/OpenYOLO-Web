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

import * as lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends lint.Rules.AbstractRule {
  public static metadata: lint.IRuleMetadata = {
    ruleName: 'no-whitespace-in-empty-brackets',
    description:
        'Disallows whitespace between empty brackets (e.g. { }, [ ], ( ))',
    descriptionDetails: 'Don\'t put whitespace between empty brackets',
    optionsDescription: 'Not configurable.',
    options: null,
    optionExamples: ['true'],
    type: 'style',
    typescriptOnly: false,
  };

  public apply(sourceFile: ts.SourceFile): lint.RuleFailure[] {
    return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
  }
}

let bracketTokens = {};
bracketTokens[ts.SyntaxKind.OpenBraceToken] = ts.SyntaxKind.CloseBraceToken;
bracketTokens[ts.SyntaxKind.OpenBracketToken] = ts.SyntaxKind.CloseBracketToken;
bracketTokens[ts.SyntaxKind.OpenParenToken] = ts.SyntaxKind.CloseParenToken;

let whitespaceTokens =
    [ts.SyntaxKind.WhitespaceTrivia, ts.SyntaxKind.NewLineTrivia];

class Walker extends lint.SkippableTokenAwareRuleWalker {
  private scanner: ts.Scanner;
  private openPosition: number;
  private closingToken: ts.SyntaxKind;
  private containsWhitespace: boolean;

  constructor(sourceFile: ts.SourceFile, options: lint.IOptions) {
    super(sourceFile, options);
    this.scanner = ts.createScanner(
        ts.ScriptTarget.ES5,
        false,
        ts.LanguageVariant.Standard,
        sourceFile.text);
  }

  private reset() {
    this.openPosition = -1;
    this.closingToken = null;
    this.containsWhitespace = false;
  }

  public visitSourceFile(node: ts.SourceFile): void {
    super.visitSourceFile(node);
    this.scanner.setTextPos(0);
    this.reset();

    lint.scanAllTokens(this.scanner, (scanner: ts.Scanner) => {
      const currentPos = scanner.getStartPos();
      const tokenKind = scanner.getToken();

      if (tokenKind in bracketTokens) {
        this.openPosition = currentPos;
        this.containsWhitespace = false;
        this.closingToken = bracketTokens[tokenKind];
        return;
      }

      if (this.openPosition < 0) {
        return;
      }

      if (tokenKind === ts.SyntaxKind.WhitespaceTrivia ||
          tokenKind === ts.SyntaxKind.NewLineTrivia) {
        this.containsWhitespace = true;
        return;
      }

      if (tokenKind === this.closingToken) {
        if (this.containsWhitespace) {
          let width = scanner.getStartPos() - this.openPosition + 1;
          this.addFailure(this.createFailure(
              this.openPosition,
              width,
              'Empty brackets should not contain whitespace',
              this.createWhitespaceFix(currentPos)));
        }
      }

      this.reset();
    });
  }

  createWhitespaceFix(closePosition: number): lint.Fix {
    return new lint.Fix(
        Rule.metadata.ruleName,
        [this.deleteText(
            this.openPosition + 1, closePosition - this.openPosition - 1)]);
  }
}
