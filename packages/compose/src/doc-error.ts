export type DocErrorCode = 'invalid_doc' | 'unknown_schema_version';

const MESSAGES: Readonly<Record<DocErrorCode, string>> = {
  invalid_doc: 'document is not valid for its schema',
  unknown_schema_version: 'unknown document schema version',
};

export class DocError extends Error {
  readonly code: DocErrorCode;

  constructor(code: DocErrorCode, options?: ErrorOptions) {
    super(MESSAGES[code], options);
    this.name = 'DocError';
    this.code = code;
  }
}
