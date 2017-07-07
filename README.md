![OpenYOLO for Web](https://rawgit.com/openid/OpenYOLO-Web/master/openyolo_web_lockup.svg)

[![Build Status](https://travis-ci.org/openid/OpenYOLO-Web.svg?branch=master)](https://travis-ci.org/openid/OpenYOLO-Web)
[![codecov](https://codecov.io/gh/openid/OpenYOLO-Web/branch/master/graph/badge.svg)](https://codecov.io/gh/openid/OpenYOLO-Web)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/93cd22606780424fa148c3b23cf9d87d)](https://www.codacy.com/app/iainmcgin/OpenYOLO-Web?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=openid/OpenYOLO-Web&amp;utm_campaign=Badge_Grade)

# OpenYOLO for Web - Automatic credential management for modern browsers

OpenYOLO for Web is an OpenID Foundation project to provide in-context
credential exchange and management. By using this API, a requesting page
can directly retrieve existing credentials in the user's preferred credential
manager.

OpenYOLO for Web is currently _experimental_ and _not production ready_;
the specification, defined API and reference implementation are all rapidly
changing. An announcement will be made on the Account Chooser and OpenYOLO
working group
[mailing list](https://groups.google.com/forum/#!forum/oidf-account-chooser-list)
when this changes.

Feel free to experiment with the API, but we do not recommend using it in
its current form unless you are being explicitly supported in doing so by
an implementor of OpenYOLO for Web.

## Supported Browsers

OpenYOLO for Web is intended to work on the following browser and platform
combinations:

| Browser | Android | iOS | Mac OS | Linux | Windows 10 |
|---------|:-------:|:---:|:------:|:-----:|:----------:|
| Chrome  |    ☑    |  ☑  |   ☑    |   ☑   |      ☑     |
| Firefox |    ☑    |  ☑  |   ☑    |   ☑   |      ☑     |
| Safari  |    ☒    |  ☑  |   ☑    |   ☒   |      ☒     |
| Edge    |    ☒    |  ☒  |   ☒    |   ☒   |      ☑     |

The client library is not guaranteed to work on any other browser or platform;
we will only respond to issues outwith these supported combinations if loading
the library prevents a client page from operating normally.

As OpenYOLO is security sensitive, it is imperative that browsers are
frequently updated in order to ensure security vulnerabilities that may affect
the API are patched in a timely manner. OpenYOLO credential providers may, at
their discretion, *refuse to operate* on a browser that is more than two
versions older than the current stable release of the above supported browsers.
The impact of this on sites that use the API on older browsers is that all
credential requests will behave as though the user has no credential provider -
a soft failure that should otherwise not affect the functioning of the client
page.

## Using the OpenYOLO API / SPI

The OpenYOLO API is currently available
[through npm](https://www.npmjs.com/package/@openid/openyolo), so can be added as a
dependency to your own npm based project:

```
npm install @openid/openyolo --save
```

Or, when using [yarn](https://yarnpkg.com):

```
yarn add @openid/openyolo
```

When this dependency is added, the API is available as the default module
through import / require:

```js
// ES6 import:
import openyolo from '@openid/openyolo';

// ES5 CommonJS require
const openyolo = require('@openid/openyolo');
```
Once the API matures, we will provide a CDN-backed version of OpenYOLO for
inclusion in pages through a `<script>` tag.

The Service Provider Interface (SPI) for credential providers is also
available from the npm package, using a more explicit module path:

```js
// ES6 import:
import openyolo_spi from '@openid/openyolo/es6/openyolo-spi';

// ES5 CommonJS require
const openyolo_spi = require('@openid/openyolo/es5/openyolo-spi');
```

### Retrieving an existing credential

All API methods are asynchronous and promise-based. To retrieve an existing
credential that is either an email and password credential (referenced by the
authentication method URI `openyolo://id-and-password`) or a Google Sign-in
credential (`https://accounts.google.com`), do:

```js
let credentialPromise = openyolo.retrieve({
  supportedAuthMethods: [
    'openyolo://id-and-password',
    'https://accounts.google.com'
  ]
}).then((credential) => {
  if (credential) {
    // user selected credential, use it to sign in
    return signInWith(credential);
  } else {
    // no credential selected, so do the manual authentication flow
    return doManualSignIn();
  }
}, (err) => {
  // request failed, likely unrecoverable
})
```

This could of course be reformulated as ES2017 async/await:

```js
try {
  let credential = openyolo.retrieve({
    supportedAuthMethods: [
      'openyolo://id-and-password',
      'https://accounts.google.com'
    ]
  });
  if (credential) {
    return signInWith(credential);
  } else {
    return doManualSignIn();
  }
} catch (err) {
  // request failed, likely unrecoverable
}
```

### Retrieving a login hint

If there is no existing saved credential, a request can be made for a
"login hint" that can be used to discover an existing account, or create
a new one. To retrieve a login hintthat is either an email and password
credential or Facebook Sign-in, do:

```js
let hintPromise = openyolo.hint({
  supportedAuthMethods: [
    'openyolo://id-and-password',
    'https://www.facebook.com'
  ]
});
```

Optionally, a password specification can be provided to notify the credential
provider the format of passwords that are supported, to aid correct password
generation. For instance, to specify that a password must be between 8 and
24 characters, and must contain at least one number and one symbol:

```js
let hintPromise = openyolo.hint({
  supportedAuthMethods: [/*...*/],
  passwordSpec: {
    minLength: 8,
    maxLength: 24,
    allowedChars: 'abcdef...',
    requiredCharSets: [
      { count: 1, chars: '0123456789' },
      { count: 1, chars: '!@#$%^&*()_-=+' },
    ],
  }
});
```

If no password specification is provided, a broadly compatible default is
used.

### Saving a credential

```js
let savePromise = openyolo.save({
  id: 'jdoe@example.com',
  authMethod: 'openyolo://id-and-password',
  displayName: 'Jane Doe',
  password: 'correctH0rseBatteryStapl3',
  profilePicture: 'https://robohash.org/694ea0904ceaf766c6738166ed89bafb'
});
```

## Contributor setup instructions

We use yarn as a package manager, and all our scripts are currently configured
with this assumption (in the future, we plan to generify this to support
the npm cli too).

1. Clone the repository:
   `git clone git@github.com:openid/OpenYOLO-Web.git openyolo_web`
2. Install the package: `yarn install` / `npm install`.
3. Compile the development version of the code and demos: `yarn run compile`.

### Editor setup

We recommend that you use [Visual Studio Code](https://code.visualstudio.com)
when editing TypeScript files within this project. If you do so, please
also install the following plugins:

- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [TSLint](https://marketplace.visualstudio.com/items?itemName=eg2.tslint)
- [Clang-Format](https://marketplace.visualstudio.com/items?itemName=xaver.clang-format)

If the root folder of the repository is opened in VSCode, your editor will be automatically configured to match the formatting and lint settings used by
the core maintainers.

Other editors are fine; [EditorConfig](http://editorconfig.org) plugins are
available for many other editors that will ensure basic consistency with
the core maintainers. Lint problems can be detected (and often automatically
fixed) by running `yarn run lint-all-fix`.

### Common operations:

All of the common operations are defined as scripts within `package.json`
and can be run by executing `yarn run $TASK`, where `$TASK` is one of
the following:

| Task                                | Description                            |
|-------------------------------------|----------------------------------------|
| `compile`                           | Build all development sources          |
| `test`                              | Run all tests, in Chrome               |
| `test -- --browsers Firefox`        | Run all tests, in Firefox              |
| `test -- --browsers safari`         | Run all tests, in Safari               |
| `check`                             | Lint code and run all tests            |
| `demo-provider-barbican`            | Run the demo credential provider       |
| `demo-client-apitester`             | Run the API testing client             |

### Testing on Sauce Labs

In order to get better test coverage of different browser environments,
it is possible to run all tests using Sauce Labs. This requires a Sauce Labs
account, which is not free. Tests will be run on Sauce Labs automatically when
a pull request is created, but to run locally you will need your own account.

To run the tests, ensure that you set the `SAUCE_USERNAME` and
`SAUCE_ACCESS_KEY` environment variables to the appropriate values for your
Sauce Labs account, and then run: `yarn run test -- --use-sauce`.

### Precommit checks

Precommit checks are automatically applied on running `git commit`, that ensure
code is correctly formatted, styled, and that all tests pass. We _require_
these checks to pass before we will review or accept pull requests.

If you wish to run these checks before a commit, then run `yarn run check`.

If you wish to skip these checks for local temporary commits during
development, you can pass the `--no-verify` flag to git.
