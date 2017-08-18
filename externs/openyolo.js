/**
 * @fileoverview Hand-rolled externs for the OpenYOLO Web service provider
 * interface. Must be maintained to match those from the external library.
 *
 * @externs
 */

/**
 * @typedef {{
 *   id: string,
 *   authMethod: string,
 *   authDomain: (string|undefined),
 *   password: (string|undefined),
 *   displayName: (string|undefined),
 *   profilePicture: (string|undefined),
 *   exchangeToken: (string|undefined),
 *   idToken: (string|undefined),
 *   generatedPassword: (string|undefined),
 *   proxiedAuthRequired: (boolean|undefined)
 * }}
 */
let Credential;

/**
 * @typedef {{
 *   count: number,
 *   chars: string
 * }}
 */
let RequiredCharacterSet;

/**
 * @typedef {{
 *   minLength: number,
 *   maxLength: number,
 *   requiredCharSets: !Array<!RequiredCharacterSet>,
 *   allowsChars: string
 * }}
 */
let PasswordSpecification;

/**
 * Not as strict as the TypeScript version which required a "uri" property, but
 * sufficient for our usage.
 * @typedef {!Object<string, string>}
 */
let TokenProvider;

/**
 * @typedef {{
 *   supportedAuthMethods: !Array<string>,
 *   supportedIdTokenProviders: (!Array<!TokenProvider>|undefined),
 *   context: (string|undefined)
 * }}
 */
let CredentialRequestOptions;

/**
 * @typedef {{
 *   supportedAuthMethods: !Array<string>,
 *   supportedIdTokenProviders: (!Array<!TokenProvider>|undefined),
 *   showAddAccount: (boolean|undefined),
 *   passwordSpec: (!PasswordSpecification|undefined),
 *   context: (string|undefined)
 * }}
 */
let CredentialHintOptions;

/**
 * @typedef {{
 *   statusCode: number,
 *   responseText: string
 * }}
 */
let ProxyLoginResponse;

/**
 * @typedef {{
 *   code: string,
 *   message: string,
 *   info: (?Object<string, string>|undefined)
 * }}
 */
let OpenYoloErrorData;

// -----------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   ack: boolean,
 *   args: (?Object|string|boolean|undefined)
 * }}
 */
let RpcMessageData;

/**
 * @typedef {{
 *   type: string,
 *   data: RpcMessageData
 * }}
 */
let RpcMessage;

/**
 * @typedef {{
 *   type: string,
 *   data: (string|!OpenYoloErrorData)
 * }}
 */
let PostMessage;

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let ProviderFrame = function() {};

/**
 * @return {void}
 * @export
 */
ProviderFrame.prototype.dispose = function() {};

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let AffiliationProvider = function() {};

/**
 * @param {string} authDomain
 * @return {!Promise<!Array<string>>}
 * @export
 */
AffiliationProvider.prototype.getEquivalentDomains = function(authDomain) {};

// -----------------------------------------------------------------------------

/**
 * @typedef {{
 *   apiEnabled: (boolean|undefined),
 *   requireProxyLogin: (boolean|undefined),
 *   allowNestedFrameRequests: (boolean|undefined),
 *   authenticationEndpoint: (string|undefined)
 * }}
 */
let PrimaryClientConfiguration;

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let ClientConfigurationProvider = function() {};

/**
 * @param {string} authDomain
 * @return {!Promise<!PrimaryClientConfiguration>}
 * @export
 */
ClientConfigurationProvider.prototype.getConfiguration = function(authDomain) {
};

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let CredentialDataProvider = function() {};

/**
 * @param {!Array<string>} authDomains
 * @param {!CredentialRequestOptions} options
 * @return {!Promise<!Array<!Credential>>}
 * @export
 */
CredentialDataProvider.prototype.getAllCredentials = function(
    authDomains, options) {};

/**
 * @param {!CredentialHintOptions} options
 * @return {!Promise<!Array<!Credential>>}
 * @export
 */
CredentialDataProvider.prototype.getAllHints = function(options) {};

/**
 * @param {!Credential} credential
 * @param {!Credential=} original
 * @return {!Promise<!Credential>}
 * @export
 */
CredentialDataProvider.prototype.upsertCredential = function(
    credential, original) {};

/**
 * @param {!Credential} credential
 * @return {!Promise<void>}
 * @export
 */
CredentialDataProvider.prototype.deleteCredential = function(credential) {};

// -----------------------------------------------------------------------------

/**
 * @typedef {{
 *   height: (number|undefined),
 *   width: (number|undefined)
 * }}
 */
let DisplayOptions;

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let DisplayCallbacks = function() {};

/**
 * @param {!DisplayOptions} options
 * @return {!Promise<void>}
 * @export
 */
DisplayCallbacks.prototype.requestDisplayOptions = function(options) {};

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let InteractionProvider = function() {};

/**
 * @param {!Credential} credential
 * @param {!DisplayCallbacks} displayCallbacks
 * @return {!Promise<undefined>}
 * @export
 */
InteractionProvider.prototype.showAutoSignIn = function(
    credential, displayCallbacks) {};

/**
 * @param {!Array<!Credential>} credentials
 * @param {!CredentialRequestOptions} options
 * @param {!DisplayCallbacks} displayCallbacks
 * @return {!Promise<!Credential>}
 * @export
 */
InteractionProvider.prototype.showCredentialPicker = function(
    credentials, options, displayCallbacks) {};

/**
 * @param {!Array<!Credential>} hints
 * @param {!CredentialHintOptions} options
 * @param {!DisplayCallbacks} displayCallbacks
 * @return {!Promise<!Credential>}
 * @export
 */
InteractionProvider.prototype.showHintPicker = function(
    hints, options, displayCallbacks) {};

/**
 * @param {!Credential} credential
 * @return {!Promise<boolean>}
 * @export
 */
InteractionProvider.prototype.showSaveConfirmation = function(credential) {};

/**
 * @return {void}
 * @export
 */
InteractionProvider.prototype.dispose = function() {};

// -----------------------------------------------------------------------------

/**
 * @interface
 * @export
 */
let LocalStateProvider = function() {};

/**
 * @param {string} authDomain
 * @return {!Promise<boolean>}
 * @export
 */
LocalStateProvider.prototype.isAutoSignInEnabled = function(authDomain) {};

/**
 * @param {string} authDomain
 * @param {boolean} enabled
 * @return {!Promise<void>}
 * @export
 */
LocalStateProvider.prototype.setAutoSignInEnabled = function(
    authDomain, enabled) {};

/**
 * @param {string} authDomain
 * @param {!Credential} credential
 * @return {!Promise<void>}
 * @export
 */
LocalStateProvider.prototype.retainCredentialForSession = function(
    authDomain, credential) {};

/**
 * @param {string} authDomain
 * @return {!Promise<!Credential>}
 * @export
 */
LocalStateProvider.prototype.getRetainedCredential = function(authDomain) {};

// -----------------------------------------------------------------------------

/**
 * @typedef {{
 *   clientAuthDomain: string,
 *   clientNonce: string,
 *   window: Object,
 *   affiliationProvider: AffiliationProvider,
 *   clientConfigurationProvider: ClientConfigurationProvider,
 *   credentialDataProvider: CredentialDataProvider,
 *   interactionProvider: InteractionProvider,
 *   localStateProvider: LocalStateProvider,
 *   allowDirectAuth: boolean
 * }}
 */
let ProviderConfig;
