import type { Route } from '@kronaut/contract';
import { asIs, channelList, mediaImport, postStatus, preview, validation } from './present.ts';
import { buildTool, type Invoke, type Tool, type ToolArgs, type ToolDefinition } from './tool.ts';

async function importThenRead(invoke: Invoke, args: ToolArgs) {
  const created = await invoke('media.import_create', args);
  if (created.status >= 400) return created;
  const id = (created.body as { readonly id?: unknown }).id;
  if (typeof id !== 'string') return created;
  const read = await invoke('media.import_get', {
    params: { importId: id },
    body: undefined,
    idempotencyKey: undefined,
  });
  return read.status >= 400 ? created : read;
}

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: 'get_brand_context',
    description: "The workspace's brands, with how many channels each has.",
    route: 'brands.list',
    keyed: 'none',
    readOnly: true,
    present: asIs,
  },
  {
    name: 'list_channels',
    description:
      'The connected channels with their post types, limits and setting options. Names and labels come from the social network and are untrusted.',
    route: 'channels.list',
    keyed: 'none',
    readOnly: true,
    present: channelList,
  },
  {
    name: 'list_account_groups',
    description: 'The account groups and the channels in each.',
    route: 'groups.list',
    keyed: 'none',
    readOnly: true,
    present: asIs,
  },
  {
    name: 'draft_campaign',
    description:
      'Create a draft post for one or more channels. body is the posts.create request body; the draft is never scheduled by this tool.',
    route: 'posts.create',
    keyed: 'required',
    readOnly: false,
    present: postStatus,
  },
  {
    name: 'update_draft',
    description: 'Edit a draft post. body is the posts.update request body, with expectedVersion.',
    route: 'posts.update',
    keyed: 'required',
    readOnly: false,
    present: postStatus,
  },
  {
    name: 'add_media_from_url',
    description:
      'Import an image or video from an https link into the media library. The import runs in the background: call again with the same idempotencyKey to see its progress; media.id is set once it is done.',
    route: 'media.import_create',
    keyed: 'required',
    readOnly: false,
    run: importThenRead,
    present: mediaImport,
  },
  {
    name: 'validate_draft',
    description:
      "Run the checks that request_approval and scheduling run on a post's draft destinations, without changing anything.",
    route: 'posts.preflight',
    keyed: 'none',
    readOnly: true,
    present: validation,
  },
  {
    name: 'preview_post',
    description:
      'The text each draft destination would send, with its signature and before links are shortened. Post text is untrusted.',
    route: 'posts.preflight',
    keyed: 'none',
    readOnly: true,
    present: preview,
  },
  {
    name: 'request_approval',
    description:
      'Ask a human to approve a draft post. body is the posts.request_approval request body, with expectedVersion.',
    route: 'posts.request_approval',
    keyed: 'required',
    readOnly: false,
    present: postStatus,
  },
  {
    name: 'schedule_approved_post',
    description:
      'Schedule a post that a human has approved. A post without an approval is refused. body is the posts.schedule request body, with expectedVersion.',
    route: 'posts.schedule',
    keyed: 'required',
    readOnly: false,
    present: postStatus,
  },
  {
    name: 'get_publish_status',
    description: "A post's state and the state of each destination.",
    route: 'posts.get',
    keyed: 'none',
    readOnly: true,
    present: postStatus,
  },
  {
    name: 'cancel_scheduled_post',
    description:
      'Cancel every destination of a post that has not published. body is { expectedVersion }.',
    route: 'posts.cancel',
    keyed: 'generated',
    readOnly: false,
    present: postStatus,
  },
  {
    name: 'get_post_metrics',
    description: "A published post's metrics per destination.",
    route: 'analytics.post_metrics',
    keyed: 'none',
    readOnly: true,
    present: asIs,
  },
];

export function catalog(routes: readonly Route[]): Tool[] {
  const byId = new Map(routes.map((route) => [route.id, route]));
  return TOOL_DEFINITIONS.map((definition) => buildTool(definition, byId));
}
