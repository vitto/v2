/*
  Publishes a LinkedIn post with a native video for /v2:share-to-linkedin, now or at a time, only
  on the person's words naming that post. The only script of v2 that posts on the person's behalf.

    node scripts/linkedin-post.ts --video=<mp4> --cover=<png|jpg> --text=<file> \
        --visibility=PUBLIC|CONNECTIONS --at=now|<YYYY-MM-DDTHH:MM> [--zone=<time zone>] [--title=<text>]
        dry run: checks the post, prints it as it would go and its id; publishes nothing
    ... the same options and --approved="<the person's words>"
        checks again, then publishes (--at=now) or schedules (--at=<time>), only when the words
        name the id of this post alone and nothing holds it; prints what LinkedIn answered
    ... the same options and --rehearse
        a rehearsal against LinkedIn that publishes nothing, for a first try: the account, the
        video and its cover uploaded and processed (in no post, seen by nobody), the post printed
        as it would be sent; with a time, the job of this Mac too, which stops before the post
    node scripts/linkedin-post.ts --suggest [--zone=<time zone>] [--from=<YYYY-MM-DDTHH:MM>]
        the next good moments to post, for an audience in that time zone
    node scripts/linkedin-post.ts --queue
        the posts scheduled on this Mac and their state
    node scripts/linkedin-post.ts --cancel=<id>
        cancels a scheduled post that has not gone out
    node scripts/linkedin-post.ts --run=<id>
        the job of a scheduled post, run by launchd at its time

  The approval, as merge.ts takes it for a merge: the person approves one post, once, by naming
  its id in the conversation ("pubblica 3f9a2c1d"). The id is a fingerprint of the video, the
  cover, the text, the visibility, the title, the time and the account, so the words approve
  exactly what the dry run showed: anything changed is another post, with another id, which needs
  the person's words again. The time zone (--zone) is the audience's, the Mac's by default.

  Where each answer comes from (LinkedIn's documentation on learn.microsoft.com, version
  li-lms-2026-10, read on 2026-11-09; the version, the headers and the sign-in:
  scripts/lib/linkedin.ts):

  - the video, "Videos API": `POST /rest/videos?action=initializeUpload` with the owner, the size
    in bytes and `uploadThumbnail: true`; each part PUT to its `uploadUrl` with the bytes from
    `firstByte` to `lastByte` (4 MB a part), `Content-Type: application/octet-stream` and no
    Authorization (the URLs are signed; the Assets API it replaces says a video upload takes no
    token), each answering an ETag; the cover PUT to `thumbnailUploadUrl` with
    `media-type-family: STILLIMAGE` (201), as the page orders it, before
    `POST /rest/videos?action=finalizeUpload` with the ETags in the order of the parts; then
    `GET /rest/videos/{urn}` until AVAILABLE (PROCESSING_FAILED gives a reason), since the docs
    show no post of a video still processing;
  - the post, "Posts API" and "Posts API Schema": `POST /rest/posts` with the author, the
    commentary, the visibility (PUBLIC or CONNECTIONS, the two "Share on LinkedIn" gives a
    member), `distribution.feedDistribution: MAIN_FEED`, `content.media` with the video (its
    title optional), `lifecycleState: PUBLISHED`, "the only accepted field during creation": the
    API cannot schedule. The 201 names the post in `x-restli-id`; its address is
    `https://www.linkedin.com/feed/update/<urn>/`;
  - the text, "Little Text Format": the reserved characters | { } @ [ ] ( ) < > # \ * _ ~
    escaped with a backslash, "even if those characters are not used", a `#word` written as the
    template `{hashtag|\#|word}`; at most 3000 characters, the limit of LinkedIn's composer (the
    API names FIELD_LENGTH_TOO_LONG and no number);
  - the files, ffprobe: MP4, 3 seconds to 30 minutes, 75 KB to 500 MB (Videos API); the cover JPG
    or PNG, at most 2 MB, the ratio of the video (the thumbnail in LinkedIn's video
    specifications);
  - the moments: the studies of LinkedIn engagement of 2026 agree on working days over weekends,
    Tuesday to Thursday the steadiest and mid-morning in the audience's time zone, with the
    afternoon close behind (Sprout Social, "Best times to post on LinkedIn in 2026"; Buffer, "The
    Best Time to Post on LinkedIn in 2026: 4.8 Million Posts Analyzed"); Italy's public holidays
    are skipped for an audience in Europe/Rome. A suggestion, not a measure of the person's
    audience;
  - a scheduled post: launchd, since LinkedIn publishes at once. With the approval the video is
    uploaded and processed at once; the post, the approval and a copy of this script go to
    ~/Library/Application Support/v2/linkedin/<id>/, and a LaunchAgent runs that copy at the
    minute of the post (the Mac's clock), creates the post, then removes itself. A Mac asleep or
    off at that minute runs it when it wakes: more than 30 minutes late, it publishes nothing and
    says so (a notification, the queue). A post scheduled and cancelled, like a rehearsal, leaves
    its video uploaded in no post;
  - a rehearsal: the same calls up to the post, which is printed instead of sent. LinkedIn takes a
    video of a member only from that member ("the caller needs to match the video owner"), so a
    rehearsal also proves the author the post would have. The documentation shows no sandbox for
    a member's posts, and no draft: a post is created PUBLISHED or not at all.
*/
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { copyFile, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { isMain, parseArgs } from './lib/args.ts';
import {
  API,
  VERSION,
  VERSION_SUNSET,
  dateText,
  decodeToken,
  failed,
  instantOf,
  keychain,
  localZone,
  restHeaders,
  tokenState,
  wallTime,
  type Fetch,
  type Token,
} from './lib/linkedin.ts';
import { cell, table } from './lib/markdown.ts';

const KB = 1024;
const MB = 1024 * KB;
export const MAX_TEXT = 3000;
/** How late a scheduled post may still go out. */
export const LATE = 30 * 60 * 1000;
/** How far ahead a scheduled post must be. */
export const AHEAD = 10 * 60 * 1000;

export const VISIBILITIES: Record<string, string> = {
  PUBLIC: 'anyone, on or off LinkedIn',
  CONNECTIONS: "the person's 1st-degree connections only",
};

// ---------------------------------------------------------------------------------------------
// The text

/** The commentary in LinkedIn's little text format: reserved characters escaped, hashtags as templates. */
export const little = (text: string): string =>
  text.replace(/(^|\s)#([\p{L}\p{N}_]+)|[\\|{}@[\]()<>#*_~]/gu, (match, before: string | undefined, tag: string | undefined) =>
    tag !== undefined ? `${before}{hashtag|\\#|${tag.replace(/_/g, '\\_')}}` : `\\${match}`,
  );

/** The length of a text as people count it: characters, not UTF-16 units. */
export const lengthOf = (text: string): number => [...text].length;

// ---------------------------------------------------------------------------------------------
// The files

export interface Media {
  file: string;
  bytes: number;
  sha256: string;
  /** ffprobe's format_name: `mov,mp4,...` for an MP4, `png_pipe`, `jpeg_pipe` or `image2` for an image. */
  format: string;
  codec: string;
  width: number;
  height: number;
  /** Seconds; null for an image. */
  duration: number | null;
}
export type Probed = Media | { file: string; error: string };

/** What ffprobe says of a file, and its hash. */
export const probe = (file: string): Probed => {
  if (!existsSync(file)) return { file, error: 'not found' };
  try {
    const out = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=format_name,duration,size:stream=codec_type,codec_name,width,height', '-of', 'json', file],
        { encoding: 'utf8' },
      ),
    ) as { format: { format_name: string; duration?: string; size?: string }; streams?: { codec_type: string; codec_name?: string; width?: number; height?: number }[] };
    const stream = out.streams?.find((s) => s.codec_type === 'video');
    return {
      file,
      bytes: Number(out.format.size) || statSync(file).size,
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
      format: out.format.format_name,
      codec: stream?.codec_name ?? '',
      width: stream?.width ?? 0,
      height: stream?.height ?? 0,
      duration: Number(out.format.duration) || null,
    };
  } catch (error) {
    return { file, error: `ffprobe cannot read it (${(error as Error).message.split('\n')[0]})` };
  }
};

const isMp4 = (media: Media) => media.format.split(',').includes('mp4');
const isImage = (media: Media) => media.codec === 'png' || media.codec === 'mjpeg';
const sizeText = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.ceil(bytes / KB)} KB`);

// ---------------------------------------------------------------------------------------------
// The time

export type When = { now: true } | { at: number; zone: string };

export const whenOf = (at: string | undefined, zone: string): When | { error: string } | undefined => {
  if (at === undefined) return undefined;
  if (at === 'now') return { now: true };
  try {
    return { at: instantOf(at, zone), zone };
  } catch (error) {
    return { error: (error as Error).message };
  }
};

/** The time in the fingerprint: `now`, or the instant and the zone it was named in. */
export const whenKey = (when: When): string => ('now' in when ? 'now' : `${new Date(when.at).toISOString()} ${when.zone}`);

export const whenText = (when: When): string =>
  'now' in when ? 'now, once LinkedIn has processed the video' : `${dateText(when.at, when.zone, true)} (${when.zone})`;

export interface Moment {
  at: number;
  why: string;
  suggested: boolean;
}

/** The moments a post is suggested at, best first by rank; hours in the audience's zone. */
export const MOMENTS = [
  { days: [2, 3, 4], hour: 10, why: 'Tuesday to Thursday, mid-morning', rank: 0 },
  { days: [2, 3, 4], hour: 15, why: 'Tuesday to Thursday, mid-afternoon', rank: 1 },
  { days: [1, 5], hour: 10, why: 'Monday or Friday, mid-morning', rank: 2 },
];

/** Easter Sunday of a year (the Gregorian computus), as month and day. */
export const easter = (year: number): { month: number; day: number } => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return { month: Math.floor((h + l - 7 * m + 114) / 31), day: ((h + l - 7 * m + 114) % 31) + 1 };
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The public holidays of the audience's country, as MM-DD: Italy's for Europe/Rome, none known elsewhere. */
export const holidaysOf = (year: number, zone: string): string[] => {
  if (zone !== 'Europe/Rome') return [];
  const { month, day } = easter(year);
  const monday = new Date(Date.UTC(year, month - 1, day + 1));
  return ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26', `${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`];
};

/** The next `count` moments from `now`, at least AHEAD away; the first of the two best ranks is the suggested one. */
export const suggest = (now: number, zone: string, count = 3): Moment[] => {
  const today = wallTime(now, zone);
  const found: (Moment & { rank: number })[] = [];
  for (let d = 0; d < 21 && found.length < count; d++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + d));
    const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    if (holidaysOf(year, zone).includes(`${pad(month)}-${pad(day)}`)) continue;
    for (const moment of MOMENTS.filter((m) => m.days.includes(date.getUTCDay())).sort((a, b) => a.hour - b.hour)) {
      let at: number;
      try {
        at = instantOf(`${year}-${pad(month)}-${pad(day)}T${pad(moment.hour)}:00`, zone);
      } catch {
        continue;
      }
      if (at < now + AHEAD || found.length >= count) continue;
      found.push({ at, why: moment.why, rank: moment.rank, suggested: false });
    }
  }
  const best = found.find((m) => m.rank <= 1) ?? found[0];
  return found.map(({ at, why }) => ({ at, why, suggested: at === best?.at }));
};

/** Whether an instant falls in a quiet hour for a professional feed: a weekend, a holiday, before 8 or after 19. */
export const quiet = (ms: number, zone: string): boolean => {
  const w = wallTime(ms, zone);
  return w.weekday === 0 || w.weekday === 6 || w.hour < 8 || w.hour >= 19 || holidaysOf(w.year, zone).includes(`${pad(w.month)}-${pad(w.day)}`);
};

// ---------------------------------------------------------------------------------------------
// The post, its checks and its id

/** What the id fingerprints, and what a scheduled post keeps. */
export interface Post {
  author: string;
  /** sha256 of the video and of the cover. */
  video: string;
  cover: string;
  /** The text as people read it, before the little text format. */
  text: string;
  visibility: string;
  title: string;
  /** whenKey. */
  when: string;
}

export const fingerprint = (post: Post): string =>
  createHash('sha256')
    .update(JSON.stringify([post.author, post.video, post.cover, post.text, post.visibility, post.title, post.when]))
    .digest('hex')
    .slice(0, 8);

/** Whether the person's words name this post: its id, and no other id. */
export const names = (words: string, id: string): boolean => {
  const ids = [...words.toLowerCase().matchAll(/(?<![0-9a-z])[0-9a-f]{8}(?![0-9a-z])/g)].map((m) => m[0]);
  return ids.includes(id.toLowerCase()) && ids.every((other) => other === id.toLowerCase());
};

export interface Facts {
  video: Probed | null;
  cover: Probed | null;
  /** The text read from its file, or why it could not be. */
  text: string | { error: string } | null;
  visibility: string | undefined;
  title: string;
  when: When | { error: string } | undefined;
  token: Token | null;
  now: number;
  /** The audience's time zone. */
  zone: string;
}

export interface Check {
  what: string;
  state: string;
  holds: boolean;
}

const fileOf = (media: Probed) => path.basename(media.file);

/** Every check of the post, in the order a person reads them. */
export const checksOf = (f: Facts): Check[] => {
  const out: Check[] = [];
  const add = (what: string, state: string, problems: string[]) =>
    out.push({ what, state: [state, ...problems].join('; '), holds: problems.length > 0 });

  if (!f.video) add('Video', 'not given', ['name it: --video=<mp4>']);
  else if ('error' in f.video) add('Video', fileOf(f.video), [f.video.error]);
  else {
    const v = f.video;
    const problems: string[] = [];
    if (!isMp4(v)) problems.push('not an MP4, the format of the Videos API');
    if (v.duration === null || v.duration < 3 || v.duration > 1800) problems.push('LinkedIn takes 3 seconds to 30 minutes');
    if (v.bytes < 75 * KB || v.bytes > 500 * MB) problems.push('LinkedIn takes 75 KB to 500 MB');
    add('Video', `${fileOf(v)}: ${v.codec || 'no video stream'}, ${v.width}x${v.height}, ${v.duration?.toFixed(1) ?? '?'} s, ${sizeText(v.bytes)}`, problems);
  }

  if (!f.cover) add('Cover', 'not given', ['name it: --cover=<png or jpg>, the cover the video script wrote']);
  else if ('error' in f.cover) add('Cover', fileOf(f.cover), [f.cover.error]);
  else {
    const c = f.cover;
    const problems: string[] = [];
    if (!isImage(c)) problems.push('not a PNG or a JPG');
    if (c.bytes > 2 * MB) problems.push(`over 2 MB, the limit of a thumbnail: \`ffmpeg -i ${fileOf(c)} -q:v 2 cover.jpg\` makes a JPG`);
    if (f.video && !('error' in f.video) && f.video.height && c.height && Math.abs(c.width / c.height - f.video.width / f.video.height) > 0.01)
      problems.push(`not the ratio of the video (${f.video.width}x${f.video.height}), as LinkedIn asks`);
    add('Cover', `${fileOf(c)}: ${c.codec.replace('mjpeg', 'jpg')}, ${c.width}x${c.height}, ${sizeText(c.bytes)}`, problems);
  }

  if (f.text === null) add('Text', 'not given', ['name its file: --text=<file>']);
  else if (typeof f.text !== 'string') add('Text', 'unreadable', [f.text.error]);
  else {
    const length = lengthOf(f.text);
    const problems: string[] = [];
    if (!f.text.trim()) problems.push('empty');
    if (length > MAX_TEXT) problems.push(`over ${MAX_TEXT} characters, the limit of a post`);
    add('Text', `${length} characters, ${f.text.split('\n').length} lines; first: "${f.text.split('\n')[0].slice(0, 80)}"`, problems);
  }

  if (f.visibility === undefined)
    add('Visibility', 'not given', ['the person chooses it: --visibility=PUBLIC (anyone, on or off LinkedIn) or CONNECTIONS (their 1st-degree connections)']);
  else if (!(f.visibility in VISIBILITIES)) add('Visibility', f.visibility, ['PUBLIC or CONNECTIONS']);
  else add('Visibility', `${f.visibility}: ${VISIBILITIES[f.visibility]}`, []);

  if (f.when === undefined) add('When', 'not given', ['--at=now, or --at=<YYYY-MM-DDTHH:MM> (the moments below)']);
  else if ('error' in f.when) add('When', 'not a time', [f.when.error]);
  else if ('now' in f.when)
    add('When', `now: ${dateText(f.now, f.zone, true)} in ${f.zone}${quiet(f.now, f.zone) ? ', a quiet hour for a professional feed (the moments below)' : ''}`, []);
  else
    add('When', whenText(f.when), f.when.at < f.now + AHEAD ? [`at least ${AHEAD / 60000} minutes ahead: it is ${dateText(f.now, f.zone, true)}`] : []);

  const until = f.when && !('error' in f.when) && !('now' in f.when) ? f.when.at : f.now;
  const account = tokenState(f.token, f.now, f.zone, until);
  add('Account', account.state, account.ok ? [] : ['sign in first']);

  const sunset = Date.parse(`${VERSION_SUNSET}T00:00:00Z`);
  add(
    'API version',
    `${VERSION}, answered until ${dateText(sunset, 'UTC')}`,
    f.now >= sunset ? ['no longer answered: move VERSION in scripts/lib/linkedin.ts to the latest LinkedIn lists'] : [],
  );
  return out;
};

/** The post the checks describe, when every part of it is there. */
export const postOf = (f: Facts): Post | null => {
  if (!f.video || 'error' in f.video || !f.cover || 'error' in f.cover) return null;
  if (typeof f.text !== 'string' || !f.visibility || !f.when || 'error' in f.when || !f.token) return null;
  return {
    author: f.token.person,
    video: f.video.sha256,
    cover: f.cover.sha256,
    text: f.text,
    visibility: f.visibility,
    title: f.title,
    when: whenKey(f.when),
  };
};

export const momentsTable = (moments: Moment[], zone: string): string[] =>
  table(
    ['Moment', 'Why'],
    moments.map((m) => [`${m.suggested ? '**' : ''}${dateText(m.at, zone, true)}${m.suggested ? '** (suggested)' : ''}`, m.why]),
  );

/** The report: the checks, the post as it goes, the moments, what happens next. */
export const renderPost = (f: Facts, checks: Check[], id: string | null, moments: Moment[], outcome: string[]): string => {
  const held = checks.filter((check) => check.holds);
  const text = typeof f.text === 'string' ? f.text : '';
  return [
    `## LinkedIn post${id ? ` ${id}` : ''}`,
    '',
    ...table(
      ['Check', 'State', 'Result'],
      checks.map((check) => [check.what, cell(check.state), check.holds ? '**holds**' : 'ok']),
    ),
    '',
    ...(text
      ? [`**The text, as people read it** (above the video; LinkedIn cuts it at "...see more" after two or three lines)`, '', '```text', text, '```', '']
      : []),
    ...(f.title ? [`**The title of the video**: ${f.title}`, ''] : []),
    `**Moments to post** (for an audience in ${f.zone})`,
    '',
    ...momentsTable(moments, f.zone),
    '',
    '**Next action**',
    '',
    ...(outcome.length
      ? outcome
      : held.length || !id
        ? [`- It waits: ${held.map((check) => check.what.toLowerCase()).join(', ') || 'a part of the post'}. Nothing was published.`]
        : [
            `- Ready: it waits for the person's ok naming this post ("pubblica ${id}"). Then the same command with \`--approved="<their words>"\`; \`--rehearse\` tries it against LinkedIn first and publishes nothing.`,
          ]),
  ].join('\n');
};

// ---------------------------------------------------------------------------------------------
// LinkedIn

export const initializeUpload = (owner: string, bytes: number) => ({
  initializeUploadRequest: { owner, fileSizeBytes: bytes, uploadCaptions: false, uploadThumbnail: true },
});

export const finalizeUpload = (video: string, uploadToken: string, parts: string[]) => ({
  finalizeUploadRequest: { video, uploadToken, uploadedPartIds: parts },
});

export const postBody = (post: Pick<Post, 'author' | 'text' | 'visibility' | 'title'>, video: string) => ({
  author: post.author,
  commentary: little(post.text),
  visibility: post.visibility,
  distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
  content: { media: { ...(post.title ? { title: post.title } : {}), id: video } },
  lifecycleState: 'PUBLISHED',
  isReshareDisabledByAuthor: false,
});

export interface Instruction {
  uploadUrl: string;
  firstByte: number;
  lastByte: number;
}

/** The parts LinkedIn asks for, checked to cover the file once, in order. */
export const partsOf = (instructions: Instruction[], bytes: number): Instruction[] => {
  const parts = [...instructions].sort((a, b) => a.firstByte - b.firstByte);
  let next = 0;
  for (const part of parts) {
    if (part.firstByte !== next || part.lastByte < part.firstByte) throw new Error('LinkedIn gave upload parts that do not follow each other');
    next = part.lastByte + 1;
  }
  if (next !== bytes) throw new Error(`LinkedIn's upload parts cover ${next} bytes of ${bytes}`);
  return parts;
};

/** The ETag of a part as finalizeUpload takes it: without its quotes. */
export const etagOf = (header: string | null): string => {
  const tag = header?.trim().replace(/^"(.*)"$/, '$1');
  if (!tag) throw new Error('LinkedIn answered an uploaded part with no ETag');
  return tag;
};

/** Uploads the video and its cover; returns the video URN. */
export const uploadVideo = async (
  fetchFn: Fetch,
  token: Token,
  video: Media,
  cover: Media,
  log: (line: string) => void = () => {},
): Promise<string> => {
  const init = await fetchFn(`${API}/rest/videos?action=initializeUpload`, {
    method: 'POST',
    headers: restHeaders(token.accessToken),
    body: JSON.stringify(initializeUpload(token.person, video.bytes)),
  });
  if (!init.ok) throw await failed('initializeUpload', init);
  const { value } = (await init.json()) as {
    value: { video: string; uploadInstructions: Instruction[]; uploadToken?: string; thumbnailUploadUrl?: string };
  };
  const parts = partsOf(value.uploadInstructions, video.bytes);
  const etags: string[] = [];
  const handle = await open(video.file);
  try {
    for (const [i, part] of parts.entries()) {
      const length = part.lastByte - part.firstByte + 1;
      const bytes = Buffer.alloc(length);
      await handle.read(bytes, 0, length, part.firstByte);
      log(`Uploading part ${i + 1} of ${parts.length} (${sizeText(length)})`);
      const put = await fetchFn(part.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes });
      if (!put.ok) throw await failed(`The upload of part ${i + 1}`, put);
      etags.push(etagOf(put.headers.get('etag')));
    }
  } finally {
    await handle.close();
  }
  if (!value.thumbnailUploadUrl) throw new Error('LinkedIn gave no thumbnailUploadUrl for the cover');
  log('Uploading the cover');
  const thumbnail = await fetchFn(value.thumbnailUploadUrl, {
    method: 'PUT',
    headers: { 'media-type-family': 'STILLIMAGE', 'Content-Type': 'application/octet-stream' },
    body: await readFile(cover.file),
  });
  if (!thumbnail.ok) throw await failed('The upload of the cover', thumbnail);
  const finalize = await fetchFn(`${API}/rest/videos?action=finalizeUpload`, {
    method: 'POST',
    headers: restHeaders(token.accessToken),
    body: JSON.stringify(finalizeUpload(value.video, value.uploadToken ?? '', etags)),
  });
  if (!finalize.ok) throw await failed('finalizeUpload', finalize);
  return value.video;
};

/** Waits until LinkedIn has processed the video. */
export const waitAvailable = async (
  fetchFn: Fetch,
  token: Token,
  video: string,
  { every = 5000, timeout = 15 * 60 * 1000, wait = (ms: number) => sleep(ms) as Promise<unknown> } = {},
  log: (line: string) => void = () => {},
): Promise<void> => {
  for (let waited = 0; ; waited += every) {
    const got = await fetchFn(`${API}/rest/videos/${encodeURIComponent(video)}`, { headers: restHeaders(token.accessToken, false) });
    if (!got.ok) throw await failed('The state of the video', got);
    const { status, processingFailureReason } = (await got.json()) as { status?: string; processingFailureReason?: string };
    if (status === 'AVAILABLE') return;
    if (status === 'PROCESSING_FAILED') throw new Error(`LinkedIn could not process the video: ${processingFailureReason ?? 'no reason given'}`);
    if (waited >= timeout) throw new Error(`The video is still ${status} after ${timeout / 60000} minutes`);
    log(`LinkedIn is processing the video (${status})`);
    await wait(every);
  }
};

/** Creates the post; returns its URN and address. */
export const createPost = async (fetchFn: Fetch, token: Token, body: ReturnType<typeof postBody>): Promise<{ urn: string; url: string }> => {
  const created = await fetchFn(`${API}/rest/posts`, { method: 'POST', headers: restHeaders(token.accessToken), body: JSON.stringify(body) });
  if (created.status !== 201) throw await failed('The post', created);
  const urn = created.headers.get('x-restli-id');
  if (!urn) throw new Error('LinkedIn created the post and gave no x-restli-id');
  return { urn, url: `https://www.linkedin.com/feed/update/${urn}/` };
};

// ---------------------------------------------------------------------------------------------
// The posts scheduled on this Mac

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** What a scheduled post's job runs: this script and what it imports, copied with the approval. */
export const SNAPSHOT = ['linkedin-post.ts', 'lib/args.ts', 'lib/linkedin.ts', 'lib/markdown.ts'];

export const homeOf = (env: NodeJS.ProcessEnv = process.env): string =>
  env.V2_LINKEDIN_HOME ?? path.join(env.HOME ?? homedir(), 'Library', 'Application Support', 'v2', 'linkedin');
export const labelOf = (id: string): string => `com.github.vitto.v2.linkedin.${id}`;
export const agentOf = (id: string, env: NodeJS.ProcessEnv = process.env): string =>
  path.join(env.HOME ?? homedir(), 'Library', 'LaunchAgents', `${labelOf(id)}.plist`);

export interface Scheduled {
  id: string;
  /** The person's words, verbatim, and when they were given. */
  approved: string;
  approvedAt: string;
  at: number;
  zone: string;
  post: Post;
  videoUrn: string;
  state: 'scheduled' | 'posted' | 'rehearsed' | 'missed' | 'failed' | 'cancelled';
  /** A rehearsal: the job stops before the post. */
  rehearsal?: boolean;
  message?: string;
  url?: string;
}

/** A rehearsal is another post for the id: its approval can never publish the real one. */
export const rehearsalOf = (post: Post): Post => ({ ...post, when: `rehearsal ${post.when}` });

/** The time a scheduled post must carry in its fingerprint. */
export const expectedWhen = (scheduled: Pick<Scheduled, 'at' | 'zone' | 'rehearsal'>): string =>
  `${scheduled.rehearsal ? 'rehearsal ' : ''}${whenKey({ at: scheduled.at, zone: scheduled.zone })}`;

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The minute of an instant on the Mac's clock, as launchd's StartCalendarInterval takes it. */
export const calendarOf = (at: number, zone = localZone()) => {
  const w = wallTime(at, zone);
  return { Month: w.month, Day: w.day, Hour: w.hour, Minute: w.minute };
};

/** The LaunchAgent of a scheduled post: one minute of the calendar, never at load. */
export const plistOf = (label: string, program: string[], calendar: Record<string, number>, log: string): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    `  <key>Label</key><string>${xml(label)}</string>`,
    `  <key>ProgramArguments</key><array>${program.map((arg) => `<string>${xml(arg)}</string>`).join('')}</array>`,
    `  <key>StartCalendarInterval</key><dict>${Object.entries(calendar)
      .map(([key, n]) => `<key>${key}</key><integer>${n}</integer>`)
      .join('')}</dict>`,
    '  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin</string></dict>',
    `  <key>StandardOutPath</key><string>${xml(log)}</string>`,
    `  <key>StandardErrorPath</key><string>${xml(log)}</string>`,
    '  <key>RunAtLoad</key><false/>',
    '</dict>',
    '</plist>',
    '',
  ].join('\n');

/** What the job does when launchd runs it: wait for the minute, post within LATE, else nothing. */
export const dueOf = (at: number, now: number): 'early' | 'due' | 'late' => (now < at ? 'early' : now > at + LATE ? 'late' : 'due');

const uid = () => process.getuid?.() ?? 501;

const removeAgent = async (id: string) => {
  await rm(agentOf(id), { force: true });
  // Last: when the job itself runs this, launchd stops it here.
  spawnSync('launchctl', ['bootout', `gui/${uid()}/${labelOf(id)}`], { stdio: 'ignore' });
};

const notify = (message: string) =>
  spawnSync('osascript', ['-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title (item 2 of argv)', '-e', 'end run', message, 'LinkedIn post'], {
    stdio: 'ignore',
  });

const readScheduled = async (id: string): Promise<Scheduled> => {
  if (!/^[0-9a-f]{8}$/.test(id)) throw new Error(`not the id of a post: ${id}`);
  const file = path.join(homeOf(), id, 'post.json');
  if (!existsSync(file)) throw new Error(`No post ${id} scheduled on this Mac`);
  return JSON.parse(await readFile(file, 'utf8')) as Scheduled;
};

const writeScheduled = (scheduled: Scheduled) =>
  writeFile(path.join(homeOf(), scheduled.id, 'post.json'), `${JSON.stringify(scheduled, null, 2)}\n`);

/** Freezes an approved post and installs its job. */
const schedule = async (scheduled: Scheduled): Promise<void> => {
  const dir = path.join(homeOf(), scheduled.id);
  await mkdir(path.join(dir, 'bin', 'lib'), { recursive: true });
  for (const file of SNAPSHOT) await copyFile(path.join(HERE, file), path.join(dir, 'bin', file));
  await writeScheduled(scheduled);
  const agent = agentOf(scheduled.id);
  await mkdir(path.dirname(agent), { recursive: true });
  await writeFile(
    agent,
    plistOf(
      labelOf(scheduled.id),
      [process.execPath, path.join(dir, 'bin', 'linkedin-post.ts'), `--run=${scheduled.id}`],
      calendarOf(scheduled.at),
      path.join(dir, 'job.log'),
    ),
  );
  spawnSync('launchctl', ['bootout', `gui/${uid()}/${labelOf(scheduled.id)}`], { stdio: 'ignore' });
  const loaded = spawnSync('launchctl', ['bootstrap', `gui/${uid()}`, agent], { encoding: 'utf8' });
  if (loaded.status !== 0) throw new Error(`launchctl could not load the job of the post: ${loaded.stderr.trim()}`);
};

/** The job of a scheduled post. */
const runScheduled = async (id: string): Promise<void> => {
  const scheduled = await readScheduled(id);
  const zone = scheduled.zone;
  const finish = async (state: Scheduled['state'], message: string, url?: string) => {
    Object.assign(scheduled, { state, message, url });
    await writeScheduled(scheduled);
    console.info(`${new Date().toISOString()} ${state}: ${message}`);
    notify(message);
    await removeAgent(id);
  };
  if (scheduled.state !== 'scheduled') return removeAgent(id);
  if (fingerprint(scheduled.post) !== id || scheduled.post.when !== expectedWhen(scheduled))
    return finish('failed', `Post ${id} not published: what is on disk is not the post the person approved.`);
  // A job started before its minute (the Mac's time zone changed) waits for it.
  while (dueOf(scheduled.at, Date.now()) === 'early') await sleep(Math.min(60000, scheduled.at - Date.now()));
  if (dueOf(scheduled.at, Date.now()) === 'late')
    return finish(
      'missed',
      `Post ${id} not published: it was due ${dateText(scheduled.at, zone, true)} and this Mac ran it ${dateText(Date.now(), zone, true)} (asleep or off). Schedule it again.`,
    );
  const token = decodeToken(keychain().read('token'));
  const account = tokenState(token, Date.now(), zone);
  if (!token || !account.ok) return finish('failed', `Post ${id} not published: ${account.state}.`);
  if (token.person !== scheduled.post.author)
    return finish('failed', `Post ${id} not published: another LinkedIn account is signed in (${token.name}).`);
  try {
    await waitAvailable(fetch, token, scheduled.videoUrn, { timeout: 10 * 60 * 1000 });
    if (scheduled.rehearsal)
      return finish(
        'rehearsed',
        `Rehearsal ${id} done, nothing published: at ${dateText(Date.now(), zone, true)} ${token.name} was signed in and the video was ready on LinkedIn.`,
      );
    const { url } = await createPost(fetch, token, postBody(scheduled.post, scheduled.videoUrn));
    await finish('posted', `Post ${id} published on LinkedIn: ${url}`, url);
  } catch (error) {
    await finish('failed', `Post ${id} not published: ${(error as Error).message}`);
  }
};

const queueReport = (): string => {
  const home = homeOf();
  const posts = existsSync(home)
    ? readdirSync(home)
        .filter((name) => existsSync(path.join(home, name, 'post.json')))
        .map((name) => JSON.parse(readFileSync(path.join(home, name, 'post.json'), 'utf8')) as Scheduled)
        .sort((a, b) => a.at - b.at)
    : [];
  if (!posts.length) return 'No post scheduled on this Mac.';
  return [
    '## LinkedIn posts scheduled on this Mac',
    '',
    ...table(
      ['Post', 'When', 'State', 'Job', 'Note'],
      posts.map((p) => [
        p.id,
        cell(dateText(p.at, p.zone, true)),
        p.rehearsal ? `${p.state} (rehearsal)` : p.state,
        existsSync(agentOf(p.id)) ? 'waiting' : 'none',
        cell(p.url ?? p.message ?? `"${p.post.text.split('\n')[0].slice(0, 60)}"`),
      ]),
    ),
  ].join('\n');
};

// ---------------------------------------------------------------------------------------------

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const zone = args.value('zone') ?? localZone();
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
  } catch {
    throw new Error(`not a time zone: ${zone} (Europe/Rome, America/New_York, ...)`);
  }
  const run = args.value('run');
  if (run) return runScheduled(run);
  if (args.flag('queue')) {
    console.info(queueReport());
    return;
  }
  const cancel = args.value('cancel');
  if (cancel) {
    const scheduled = await readScheduled(cancel);
    if (scheduled.state !== 'scheduled') throw new Error(`Post ${cancel} is ${scheduled.state}: nothing to cancel`);
    await removeAgent(cancel);
    Object.assign(scheduled, { state: 'cancelled', message: `Cancelled on ${dateText(Date.now(), scheduled.zone, true)}; its video stays uploaded, in no post.` });
    await writeScheduled(scheduled);
    console.info(`Post ${cancel} cancelled: it will not go out.`);
    return;
  }
  const now = Date.now();
  if (args.flag('suggest')) {
    const from = args.value('from');
    console.info([`**Moments to post** (for an audience in ${zone})`, '', ...momentsTable(suggest(from ? instantOf(from, zone) : now, zone), zone)].join('\n'));
    return;
  }

  const textFile = args.value('text');
  let text: Facts['text'] = null;
  if (textFile)
    try {
      text = readFileSync(textFile, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '');
    } catch (error) {
      text = { error: (error as Error).message };
    }
  const videoFile = args.value('video');
  const coverFile = args.value('cover');
  const facts: Facts = {
    video: videoFile ? probe(videoFile) : null,
    cover: coverFile ? probe(coverFile) : null,
    text,
    visibility: args.value('visibility')?.toUpperCase(),
    title: args.value('title') ?? '',
    when: whenOf(args.value('at'), zone),
    token: decodeToken(keychain().read('token')),
    now,
    zone,
  };
  const checks = checksOf(facts);
  const post = postOf(facts);
  const id = post && !checks.some((check) => check.holds) ? fingerprint(post) : null;
  const approved = args.value('approved');
  const rehearse = args.flag('rehearse');
  if (rehearse && approved !== undefined) throw new Error('--rehearse publishes nothing: it takes no --approved');
  const holding = checks.filter((c) => c.holds).map((c) => c.what.toLowerCase());
  const holdsIt = `${holding.join(', ')} ${holding.length === 1 ? 'holds' : 'hold'} it`;
  const outcome: string[] = [];
  /** The video and its cover on LinkedIn, processed. */
  const upload = async () => {
    const log = (line: string) => console.error(line);
    const urn = await uploadVideo(fetch, facts.token as Token, facts.video as Media, facts.cover as Media, log);
    await waitAvailable(fetch, facts.token as Token, urn, {}, log);
    return urn;
  };
  if (rehearse) {
    if (!id || !post) {
      outcome.push(`- No rehearsal: ${holdsIt}.`);
      process.exitCode = 1;
    } else {
      const when = facts.when as When;
      const urn = await upload();
      if ('now' in when)
        outcome.push(
          `- Rehearsal, nothing published: ${(facts.token as Token).name} is signed in, and LinkedIn took the video and its cover as theirs and processed them (\`${urn}\`, in no post, seen by nobody).`,
          '- The post `--approved` would create (`POST /rest/posts`), the text in little text format:',
          '',
          '```json',
          JSON.stringify(postBody(post, urn), null, 2),
          '```',
        );
      else {
        const rehearsal = rehearsalOf(post);
        const rid = fingerprint(rehearsal);
        await schedule({ id: rid, approved: '(a rehearsal: no approval)', approvedAt: new Date().toISOString(), at: when.at, zone: when.zone, post: rehearsal, videoUrn: urn, state: 'scheduled', rehearsal: true });
        outcome.push(
          `- Rehearsal ${rid} scheduled for ${whenText(when)}, nothing will be published: the video is on LinkedIn (in no post). At that minute the job of this Mac checks the account and the video and stops before the post; a notification says how it went.`,
          `- \`--queue\` shows it; \`--cancel=${rid}\` removes it.`,
        );
      }
    }
  } else if (approved !== undefined) {
    if (!id || !post) {
      outcome.push(`- Not published, though approved ("${cell(approved)}"): ${holdsIt}.`);
      process.exitCode = 1;
    } else if (!names(approved, id)) {
      outcome.push(
        `- Not published: the words "${cell(approved)}" do not name post ${id} alone. A post goes out only on the person's ok naming its id; anything changed since the dry run makes another id.`,
      );
      process.exitCode = 1;
    } else {
      const when = facts.when as When;
      const urn = await upload();
      if ('now' in when) {
        const { url } = await createPost(fetch, facts.token as Token, postBody(post, urn));
        outcome.push(`- Approved ("${cell(approved)}") and published: ${url}`);
      } else {
        await schedule({ id, approved, approvedAt: new Date().toISOString(), at: when.at, zone: when.zone, post, videoUrn: urn, state: 'scheduled' });
        outcome.push(
          `- Approved ("${cell(approved)}") and scheduled for ${whenText(when)}: the video is on LinkedIn, the post goes out at that minute if this Mac is on and awake (up to ${LATE / 60000} minutes late, else nothing goes out and a notification says so).`,
          `- \`--queue\` shows it; \`--cancel=${id}\` cancels it.`,
        );
      }
    }
  }
  console.info(renderPost(facts, checks, id, suggest(now, zone), outcome));
};

if (isMain(import.meta.url)) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

