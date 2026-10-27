export type CredentialErrorCode =
  | 'invalid_key'
  | 'unknown_kek'
  | 'decrypt_failed'
  | 'unsupported_aad_version'
  | 'invalid_aad';

const MESSAGES: Readonly<Record<CredentialErrorCode, string>> = {
  invalid_key: 'Invalid key material or key configuration',
  unknown_kek: 'Unknown key encryption key version',
  decrypt_failed: 'Credential could not be decrypted',
  unsupported_aad_version: 'Unsupported credential AAD version',
  invalid_aad: 'Invalid credential AAD',
};

export class CredentialError extends Error {
  readonly code: CredentialErrorCode;

  constructor(code: CredentialErrorCode) {
    super(MESSAGES[code]);
    this.name = 'CredentialError';
    this.code = code;
  }
}
