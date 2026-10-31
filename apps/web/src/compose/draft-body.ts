import type { PostsCreateData } from '@kronaut/sdk';
import type { ComposeContent, ComposeDestination, ComposeInput } from './submit.ts';

export type DraftBody = PostsCreateData['body'];

type DraftInput = Pick<ComposeInput, 'content' | 'variants' | 'destinations'>;

type DraftItem = DraftBody['items'][0];

function withAlt(mediaId: string, alt: string) {
  const altText = alt.trim().normalize('NFC');
  return altText === '' ? { mediaId } : { mediaId, altText };
}

function mainMedia(content: ComposeContent, ids: ReadonlyMap<string, string>) {
  const { video } = content;
  if (video !== null) return [withAlt(video.id, video.altText)];
  return content.images.map((image) => {
    const mediaId = ids.get(image.id);
    if (mediaId === undefined) throw new Error(`image ${image.id} was not uploaded`);
    return withAlt(mediaId, image.altText);
  });
}

function toItems(content: ComposeContent, ids: ReadonlyMap<string, string>): DraftItem[] {
  const main: DraftItem = { role: 'main', doc: { ...content.doc }, media: mainMedia(content, ids) };
  const replies = content.replies.map(
    (reply): DraftItem => ({ role: 'thread', doc: { ...reply.doc }, media: [] }),
  );
  const { comment } = content;
  const last: DraftItem[] =
    comment === null ? [] : [{ role: 'comment', doc: { ...comment.doc }, media: [] }];
  return [main, ...replies, ...last];
}

function toDestination(destination: ComposeDestination) {
  const { accountId, publishType, variant, settings, deliveryMode, skipSignature } = destination;
  return {
    accountId,
    publishType,
    ...(settings === undefined ? {} : { settings }),
    ...(deliveryMode === undefined ? {} : { deliveryMode }),
    ...(variant === null ? {} : { variant }),
    ...(skipSignature === undefined ? {} : { skipSignature }),
  };
}

export function draftBody(input: DraftInput, ids: ReadonlyMap<string, string>): DraftBody {
  const variants = input.variants.map((v) => ({ items: toItems(v, ids) }));
  return {
    items: toItems(input.content, ids),
    ...(variants.length === 0 ? {} : { variants }),
    destinations: input.destinations.map(toDestination),
  };
}

export function formFingerprint(input: DraftInput): string {
  const images = [input.content, ...input.variants].flatMap((content) => content.images);
  return JSON.stringify(draftBody(input, new Map(images.map(({ id }) => [id, id]))));
}
