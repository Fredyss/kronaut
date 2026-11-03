import { type CliLocale, type CliMessages, cliMessages } from '@kronaut/i18n/cli';

export type CliText = (messages: CliMessages, locale: CliLocale) => string;

const ENGLISH = cliMessages('en');

class CliError extends Error {
  readonly text: CliText;

  constructor(text: CliText) {
    super(text(ENGLISH, 'en'));
    this.text = text;
  }
}

export class UsageError extends CliError {
  constructor(text: CliText) {
    super(text);
    this.name = 'UsageError';
  }
}

export class CommandError extends CliError {
  constructor(text: CliText) {
    super(text);
    this.name = 'CommandError';
  }
}
