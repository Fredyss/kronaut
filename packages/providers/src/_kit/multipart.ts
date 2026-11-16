import { randomBytes } from 'node:crypto';

export interface FilePart {
  readonly name: string;
  readonly filename: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
}

export interface MultipartBody {
  readonly type: string;
  readonly body: Uint8Array;
}

const encoder = new TextEncoder();

export function multipartFiles(
  fields: Readonly<Record<string, string>>,
  files: readonly FilePart[],
): MultipartBody {
  const boundary = `kronaut-${randomBytes(16).toString('hex')}`;
  const head = Object.entries(fields)
    .map(
      ([name, value]) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    )
    .join('');
  const parts: Uint8Array[] = [encoder.encode(head)];
  for (const file of files) {
    parts.push(
      encoder.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.mime}\r\n\r\n`,
      ),
      file.bytes,
      encoder.encode('\r\n'),
    );
  }
  parts.push(encoder.encode(`--${boundary}--\r\n`));
  const body = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  return { type: `multipart/form-data; boundary=${boundary}`, body };
}

export function multipart(fields: Readonly<Record<string, string>>, file: FilePart): MultipartBody {
  return multipartFiles(fields, [file]);
}
