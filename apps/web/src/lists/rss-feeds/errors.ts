import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';

export interface FeedErrors {
  readonly url?: string;
  readonly name?: string;
  readonly template?: string;
  readonly channels: readonly string[];
  readonly form?: string;
}

type ChannelName = (index: number) => string;

const URL_ERRORS: Readonly<Record<string, () => string>> = {
  url_invalid: () => settingsText.settings_feed_url_invalid(),
  feed_unreachable: () => settingsText.settings_feed_unreachable(),
  feed_invalid: () => settingsText.settings_feed_invalid(),
};

const CHANNEL_INDEX = /^body\.channelIds\.(\d+)$/;

function channelError(code: string, channel: string): string | null {
  if (code === 'not_found') return settingsText.settings_feed_channel_gone();
  if (code === 'text_unsupported') return settingsText.settings_feed_channel_text({ channel });
  if (code === 'queue_empty') return settingsText.settings_feed_channel_queue({ channel });
  return null;
}

function fieldError(path: string, code: string): Partial<FeedErrors> | null {
  const url = Object.hasOwn(URL_ERRORS, code) ? URL_ERRORS[code] : undefined;
  if (path === 'body.url' && url !== undefined) return { url: url() };
  if (path === 'body.name' && code === 'name_invalid') {
    return { name: settingsText.settings_feed_name_invalid() };
  }
  if (path === 'body.template' && code === 'template_invalid') {
    return { template: settingsText.settings_feed_template_invalid() };
  }
  return null;
}

export function feedErrors(error: unknown, channelName: ChannelName): FeedErrors {
  const code = errorCode(error);
  if (code === 'rss_feed_limit') return { channels: [], form: settingsText.settings_feed_limit() };
  let fields: Partial<FeedErrors> = {};
  const channels: string[] = [];
  let unknown = false;
  for (const { path, code: detail } of errorDetails(error)) {
    const index = CHANNEL_INDEX.exec(path)?.[1];
    const message = index === undefined ? null : channelError(detail, channelName(Number(index)));
    const field = index === undefined ? fieldError(path, detail) : null;
    if (message !== null) channels.push(message);
    else if (field !== null) fields = { ...fields, ...field };
    else unknown = true;
  }
  const found = channels.length > 0 || Object.keys(fields).length > 0;
  return {
    ...fields,
    channels,
    ...(found && !unknown ? {} : { form: apiErrorMessage(code) }),
  };
}
