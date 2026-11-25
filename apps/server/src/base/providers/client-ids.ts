export type SecretAppProvider =
  | 'discord'
  | 'discord_bot'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'threads'
  | 'x_com'
  | 'youtube';

const META_APP_ID = /^\d{1,32}$/;
const CLIENT_IDS: Readonly<Record<SecretAppProvider, RegExp>> = {
  discord: /^\d{17,20}$/,
  discord_bot: /^\d{17,20}$/,
  facebook: META_APP_ID,
  instagram: META_APP_ID,
  linkedin: /^[A-Za-z0-9]{1,64}$/,
  pinterest: /^\d{1,32}$/,
  threads: META_APP_ID,
  x_com: /^[A-Za-z0-9_-]{1,128}$/,
  youtube: /^[0-9]{1,32}-[a-z0-9]{1,64}\.apps\.googleusercontent\.com$/,
};

export function isSecretAppProvider(provider: string): provider is SecretAppProvider {
  return Object.hasOwn(CLIENT_IDS, provider);
}

export function clientIdValid(provider: SecretAppProvider, clientId: string): boolean {
  return CLIENT_IDS[provider].test(clientId);
}
