/**
 * @fileoverview Hand-rolled externs for the CredentialManagement API specs of
 * the Credential constructors that are used within OpenYolo and apparently not
 * bundled with Closure Compiler.
 *
 * @externs
 */

/**
 * @typedef {{
 *   id: string,
 *   name: (string|undefined),
 *   iconURL: (string|undefined),
 *   password: string
 * }}
 */
let PasswordCredentialData;

/**
 * @typedef {{
 *   id: string,
 *   name: (string|undefined),
 *   iconURL: (string|undefined),
 *   provider: string,
 *   protocol: (string|undefined)
 * }}
 */
let FederatedCredentialData;

/**
 * Creates a PasswordCredential.
 * @param {!PasswordCredentialData} data
 * @constructor
 */
function PasswordCredential(data) {}

/**
 * Creates a PasswordCredential.
 * @param {!FederatedCredentialData} data
 * @constructor
 */
function FederatedCredential(data) {}

/**
 * @interface
 */
let CredentialsContainer;

/**
 * @param {!CredentialRequestOptions=} options
 * @return {!Promise<?Credential>}
 */
CredentialsContainer.prototype.get = function(options) {};

/**
 * @param {!Credential} credential
 * @return {!Promise<!Credential>}
 */
CredentialsContainer.prototype.store = function(credential) {};

/**
 * Pre M62 API.
 * @return {!Promise<void>}
 */
CredentialsContainer.prototype.requireUserMediation = function() {};

/**
 * Post M62 API.
 * @return {!Promise<void>}
 */
CredentialsContainer.prototype.preventSilentAccess = function() {};

/**
 * @const {!CredentialsContainer}
 * @readonly
 */
Navigator.prototype.credentials;