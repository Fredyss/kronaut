import * as cs from '#paraglide-cli/messages/cs.js';
import * as en from '#paraglide-cli/messages/en.js';
import * as sk from '#paraglide-cli/messages/sk.js';

export type CliLocale = 'en' | 'sk' | 'cs';
export type CliMessages = typeof en;

const CATALOGS: Readonly<Record<CliLocale, CliMessages>> = { en, sk, cs };
const VARIABLES = ['LC_ALL', 'LC_MESSAGES', 'LANG'] as const;

export function cliLocale(env: Readonly<Record<string, string | undefined>>): CliLocale {
  const value = VARIABLES.map((name) => env[name]).find((v) => v !== undefined && v !== '');
  const language = value?.split(/[_.@]/, 1)[0]?.toLowerCase();
  return language === 'sk' || language === 'cs' ? language : 'en';
}

export function cliMessages(locale: CliLocale): CliMessages {
  return CATALOGS[locale];
}
