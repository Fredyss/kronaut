import nodemailer from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';

export const SMTP_TLS_MODES = ['starttls', 'tls', 'none'] as const;
export type SmtpTls = (typeof SMTP_TLS_MODES)[number];

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string | null;
  readonly password: string | null;
  readonly from: string;
  readonly tls: SmtpTls;
}

export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export type SendResult = 'sent' | 'rejected' | 'transient';

export interface SmtpFailure {
  readonly code: string | null;
  readonly responseCode: number | null;
  readonly command: string | null;
}

export interface Mailer {
  send(message: MailMessage): Promise<SendResult>;
  close(): void;
}

export interface OutgoingMail extends MailMessage {
  readonly from: string;
}

export interface MailTransport {
  sendMail(mail: OutgoingMail): Promise<{ readonly rejected?: readonly unknown[] }>;
  close(): void;
}

export interface MailerOptions {
  readonly transport?: MailTransport;
  readonly onFailure?: (failure: SmtpFailure) => void;
}

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 30_000;
const MAX_ADDRESS_LENGTH = 254;
const ADDRESS =
  /^[^\s@<>()[\]\\,;:"]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z0-9-]{2,63}$/;
const RECIPIENT_CODES: ReadonlySet<string> = new Set(['EENVELOPE', 'EMESSAGE']);

export function isMailAddress(value: string): boolean {
  return value.length <= MAX_ADDRESS_LENGTH && ADDRESS.test(value);
}

export function transportOptions(config: SmtpConfig): SMTPPool.Options {
  return {
    pool: true,
    host: config.host,
    port: config.port,
    secure: config.tls === 'tls',
    requireTLS: config.tls === 'starttls',
    ignoreTLS: config.tls === 'none',
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
    ...(config.user === null ? {} : { auth: { user: config.user, pass: config.password ?? '' } }),
  };
}

function field(error: object, name: string): unknown {
  return name in error ? (error as Record<string, unknown>)[name] : undefined;
}

export function smtpFailure(error: unknown): SmtpFailure {
  if (typeof error !== 'object' || error === null) {
    return { code: null, responseCode: null, command: null };
  }
  const code = field(error, 'code');
  const responseCode = field(error, 'responseCode');
  const command = field(error, 'command');
  return {
    code: typeof code === 'string' ? code : null,
    responseCode: typeof responseCode === 'number' ? responseCode : null,
    command: typeof command === 'string' ? command : null,
  };
}

export function classifySmtpError(error: unknown): SendResult {
  const { code, responseCode, command } = smtpFailure(error);
  if (code === null || !RECIPIENT_CODES.has(code)) return 'transient';
  if (command !== null && /^MAIL FROM\b/i.test(command)) return 'transient';
  if (responseCode === null) return code === 'EENVELOPE' ? 'rejected' : 'transient';
  return responseCode >= 500 && responseCode < 600 ? 'rejected' : 'transient';
}

export function createMailer(config: SmtpConfig, options: MailerOptions = {}): Mailer {
  const transport: MailTransport =
    options.transport ?? nodemailer.createTransport(transportOptions(config));
  return {
    async send(message) {
      if (!isMailAddress(message.to)) return 'rejected';
      try {
        const info = await transport.sendMail({
          from: config.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
        });
        return (info.rejected?.length ?? 0) > 0 ? 'rejected' : 'sent';
      } catch (error) {
        options.onFailure?.(smtpFailure(error));
        return classifySmtpError(error);
      }
    },
    close() {
      transport.close();
    },
  };
}
