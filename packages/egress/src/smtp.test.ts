import nodemailer from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import {
  classifySmtpError,
  createMailer,
  isMailAddress,
  type MailTransport,
  type SmtpConfig,
  type SmtpFailure,
  transportOptions,
} from './smtp.ts';

const CONFIG: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  user: null,
  password: null,
  from: 'kronaut@example.com',
  tls: 'starttls',
};

const MESSAGE = { to: 'someone@example.com', subject: 'Subject', text: 'Body' };

function smtpError(fields: Record<string, unknown>): Error {
  return Object.assign(new Error('smtp said no to someone@example.com'), fields);
}

function failingTransport(error: unknown): MailTransport {
  return { sendMail: () => Promise.reject(error), close: () => {} };
}

describe('transportOptions', () => {
  it('pools one transport with the fixed timeouts and verified certificates', () => {
    const options = transportOptions(CONFIG);
    expect(options).toMatchObject({
      pool: true,
      host: 'smtp.example.com',
      port: 587,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      tls: { rejectUnauthorized: true },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    expect(options.auth).toBeUndefined();
  });

  it('requires STARTTLS by default, implicit TLS for tls and no TLS only for none', () => {
    expect(transportOptions(CONFIG)).toMatchObject({
      secure: false,
      requireTLS: true,
      ignoreTLS: false,
    });
    expect(transportOptions({ ...CONFIG, port: 465, tls: 'tls' })).toMatchObject({
      secure: true,
      requireTLS: false,
      ignoreTLS: false,
    });
    expect(transportOptions({ ...CONFIG, tls: 'none' })).toMatchObject({
      secure: false,
      requireTLS: false,
      ignoreTLS: true,
    });
  });

  it('authenticates only when a user is configured', () => {
    const options = transportOptions({ ...CONFIG, user: 'mailer', password: 'pw' });
    expect(options.auth).toEqual({ user: 'mailer', pass: 'pw' });
  });
});

describe('classifySmtpError', () => {
  it.each([
    [{ code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' }, 'rejected'],
    [{ code: 'EENVELOPE', responseCode: 553, command: 'RCPT TO' }, 'rejected'],
    [{ code: 'EENVELOPE' }, 'rejected'],
    [{ code: 'EMESSAGE', responseCode: 554, command: 'DATA' }, 'rejected'],
    [{ code: 'EENVELOPE', responseCode: 450, command: 'RCPT TO' }, 'transient'],
    [{ code: 'EENVELOPE', responseCode: 550, command: 'MAIL FROM' }, 'transient'],
    [{ code: 'EMESSAGE', responseCode: 451, command: 'DATA' }, 'transient'],
    [{ code: 'EMESSAGE' }, 'transient'],
    [{ code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' }, 'transient'],
    [{ code: 'ECONNECTION' }, 'transient'],
    [{ code: 'ETIMEDOUT' }, 'transient'],
    [{ code: 'ESOCKET' }, 'transient'],
    [{ code: 'ETLS' }, 'transient'],
    [{ code: 'EDNS' }, 'transient'],
    [{}, 'transient'],
  ] as const)('maps %o to %s', (fields, expected) => {
    expect(classifySmtpError(smtpError(fields))).toBe(expected);
  });

  it('treats anything that is not an error object as transient', () => {
    expect(classifySmtpError('boom')).toBe('transient');
    expect(classifySmtpError(null)).toBe('transient');
  });
});

describe('isMailAddress', () => {
  it('accepts plain addresses and refuses anything that could carry a header', () => {
    expect(isMailAddress('someone@example.com')).toBe(true);
    expect(isMailAddress('first.last+tag@mail.example.co')).toBe(true);
    expect(isMailAddress('someone@example')).toBe(false);
    expect(isMailAddress('Someone <someone@example.com>')).toBe(false);
    expect(isMailAddress('someone@example.com\r\nBcc: x@example.com')).toBe(false);
    expect(isMailAddress('a,b@example.com')).toBe(false);
    expect(isMailAddress('')).toBe(false);
  });
});

describe('createMailer', () => {
  it('sends from the configured address', async () => {
    const sendMail = vi.fn(() => Promise.resolve({ rejected: [] }));
    const mailer = createMailer(CONFIG, { transport: { sendMail, close: () => {} } });
    expect(await mailer.send(MESSAGE)).toBe('sent');
    expect(sendMail).toHaveBeenCalledWith({ from: 'kronaut@example.com', ...MESSAGE });
  });

  it('rejects an invalid address without touching the transport', async () => {
    const sendMail = vi.fn(() => Promise.resolve({}));
    const mailer = createMailer(CONFIG, { transport: { sendMail, close: () => {} } });
    expect(await mailer.send({ ...MESSAGE, to: 'not an address' })).toBe('rejected');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('reports a recipient the server refused after accepting the message as rejected', async () => {
    const transport = { sendMail: () => Promise.resolve({ rejected: [MESSAGE.to] }), close() {} };
    expect(await createMailer(CONFIG, { transport }).send(MESSAGE)).toBe('rejected');
  });

  it('never throws and reports only codes, not the server text', async () => {
    const failures: SmtpFailure[] = [];
    const mailer = createMailer(CONFIG, {
      transport: failingTransport(smtpError({ code: 'ECONNECTION' })),
      onFailure: (failure) => failures.push(failure),
    });
    expect(await mailer.send(MESSAGE)).toBe('transient');
    expect(failures).toEqual([{ code: 'ECONNECTION', responseCode: null, command: null }]);
    expect(JSON.stringify(failures)).not.toContain('someone@example.com');

    const rejected = createMailer(CONFIG, {
      transport: failingTransport(smtpError({ code: 'EENVELOPE', responseCode: 550 })),
    });
    expect(await rejected.send(MESSAGE)).toBe('rejected');
  });

  it('closes the pooled transport', () => {
    const close = vi.fn();
    createMailer(CONFIG, { transport: { sendMail: () => Promise.resolve({}), close } }).close();
    expect(close).toHaveBeenCalledOnce();
  });

  it('builds a plain-text UTF-8 message through nodemailer', async () => {
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true });
    let raw = '';
    const transport: MailTransport = {
      sendMail: async (mail) => {
        const info = await stream.sendMail(mail);
        raw = info.message.toString('utf8');
        return { rejected: [] };
      },
      close: () => stream.close(),
    };
    const mailer = createMailer(CONFIG, { transport });
    expect(
      await mailer.send({ ...MESSAGE, subject: 'Nepodarilo sa', text: 'Príspevok čaká' }),
    ).toBe('sent');
    expect(raw).toMatch(/^Content-Type: text\/plain; charset=utf-8/im);
    expect(raw).not.toMatch(/text\/html/i);
    expect(raw).toMatch(/^From: kronaut@example\.com/im);
  });
});
