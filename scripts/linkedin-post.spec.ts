import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { DAY, VERSION_SUNSET, instantOf, type Token } from './lib/linkedin.ts';
import { tempDir } from './lib/testing.ts';
import {
  SNAPSHOT,
  calendarOf,
  checksOf,
  createPost,
  dueOf,
  easter,
  etagOf,
  finalizeUpload,
  fingerprint,
  holidaysOf,
  initializeUpload,
  lengthOf,
  little,
  names,
  partsOf,
  plistOf,
  postBody,
  postOf,
  quiet,
  renderPost,
  suggest,
  uploadVideo,
  waitAvailable,
  whenKey,
  type Facts,
  type Media,
  type Post,
} from './linkedin-post.ts';

const temp = tempDir('linkedin-post');
const ROME = 'Europe/Rome';
const NOW = instantOf('2026-11-09T16:00', ROME); // a Monday
const at = (local: string, zone = ROME) => instantOf(local, zone);
const token: Token = {
  accessToken: 'AQU',
  expiresAt: NOW + 50 * DAY,
  person: 'urn:li:person:782bbtaQ',
  name: 'Ada',
  scope: 'openid,profile,w_member_social',
};
const video: Media = { file: '/v.mp4', bytes: 12 * 1024 * 1024, sha256: 'a'.repeat(64), format: 'mov,mp4,m4a,3gp,3g2,mj2', codec: 'h264', width: 1080, height: 1350, duration: 32 };
const cover: Media = { file: '/c.png', bytes: 600 * 1024, sha256: 'b'.repeat(64), format: 'png_pipe', codec: 'png', width: 1080, height: 1350, duration: null };
const facts = (over: Partial<Facts> = {}): Facts => ({
  video,
  cover,
  text: 'Magma Studio is out\nTry it',
  visibility: 'PUBLIC',
  title: '',
  when: { now: true },
  token,
  now: NOW,
  zone: ROME,
  ...over,
});
const held = (f: Facts) => checksOf(f).filter((check) => check.holds).map((check) => check.what);

describe('little', () => {
  it('escapes every reserved character with a backslash', () => {
    assert.equal(little('a (b) [c] {d} <e> @f *g* _h_ ~i | \\ #'), 'a \\(b\\) \\[c\\] \\{d\\} \\<e\\> \\@f \\*g\\* \\_h\\_ \\~i \\| \\\\ \\#');
    assert.equal(little('100% done, ok? yes! "quoted" \u2192 next'), '100% done, ok? yes! "quoted" \u2192 next');
  });

  it('writes a hashtag as its template, at the start, after a space or a line', () => {
    assert.equal(little('#Magma and #design_system\n#UX'), '{hashtag|\\#|Magma} and {hashtag|\\#|design\\_system}\n{hashtag|\\#|UX}');
    assert.equal(little('issue#4'), 'issue\\#4', 'a # inside a word is plain text');
    assert.equal(little('#accessibilit\u00e0'), '{hashtag|\\#|accessibilit\u00e0}');
  });
});

describe('lengthOf', () => {
  it('counts characters as people do, an emoji as one', () => {
    assert.equal(lengthOf('\u{1F680} go'), 4);
  });
});

describe('the id of a post', () => {
  const post: Post = { author: token.person, video: video.sha256, cover: cover.sha256, text: 'hi', visibility: 'PUBLIC', title: '', when: 'now' };

  it('changes with every part the person approves', () => {
    const id = fingerprint(post);
    assert.match(id, /^[0-9a-f]{8}$/);
    for (const change of [
      { author: 'urn:li:person:other' },
      { video: 'c'.repeat(64) },
      { cover: 'c'.repeat(64) },
      { text: 'hi!' },
      { visibility: 'CONNECTIONS' },
      { title: 't' },
      { when: whenKey({ at: at('2026-11-10T10:00'), zone: ROME }) },
    ])
      assert.notEqual(fingerprint({ ...post, ...change }), id, Object.keys(change)[0]);
  });

  it('is approved only by words naming it alone', () => {
    assert.ok(names('pubblica 3f9a2c1d', '3f9a2c1d'));
    assert.ok(names('ok, publish 3F9A2C1D now', '3f9a2c1d'));
    assert.equal(names('pubblica', '3f9a2c1d'), false);
    assert.equal(names('pubblica 3f9a2c1e', '3f9a2c1d'), false);
    assert.equal(names('pubblica 3f9a2c1d e 0b1c2d3e', '3f9a2c1d'), false, 'two posts: not this one alone');
    assert.equal(names('pubblica 3f9a2c1d0', '3f9a2c1d'), false);
  });
});

describe('checksOf', () => {
  it('lets a complete post through', () => {
    assert.deepEqual(held(facts()), []);
    assert.deepEqual(held(facts({ when: { at: at('2026-11-10T10:00'), zone: ROME }, visibility: 'CONNECTIONS' })), []);
  });

  it('holds what is missing: the visibility and the time are never a default', () => {
    assert.deepEqual(held(facts({ video: null, cover: null, text: null, visibility: undefined, when: undefined })), ['Video', 'Cover', 'Text', 'Visibility', 'When']);
    assert.deepEqual(held(facts({ visibility: 'LOGGED_IN' })), ['Visibility']);
    assert.deepEqual(held(facts({ token: null })), ['Account']);
  });

  it('holds a video, a cover or a text LinkedIn would refuse', () => {
    assert.deepEqual(held(facts({ video: { ...video, duration: 2 } })), ['Video']);
    assert.deepEqual(held(facts({ video: { ...video, format: 'matroska,webm' } })), ['Video']);
    assert.deepEqual(held(facts({ video: { ...video, bytes: 600 * 1024 * 1024 } })), ['Video']);
    assert.deepEqual(held(facts({ cover: { ...cover, bytes: 3 * 1024 * 1024 } })), ['Cover']);
    assert.deepEqual(held(facts({ cover: { ...cover, width: 1920, height: 1080 } })), ['Cover']);
    assert.deepEqual(held(facts({ cover: { ...cover, codec: 'gif' } })), ['Cover']);
    assert.deepEqual(held(facts({ text: 'x'.repeat(3001) })), ['Text']);
    assert.deepEqual(held(facts({ text: '  ' })), ['Text']);
    assert.deepEqual(held(facts({ video: { file: '/v.mp4', error: 'not found' } })), ['Video']);
  });

  it('holds a time past or too close, and a token that expires before it', () => {
    assert.deepEqual(held(facts({ when: { at: NOW + 5 * 60 * 1000, zone: ROME } })), ['When']);
    assert.deepEqual(held(facts({ when: { error: 'not a time' } })), ['When']);
    assert.deepEqual(held(facts({ when: { at: NOW + 60 * DAY, zone: ROME } })), ['Account']);
  });

  it('notes a quiet hour for a post now, without holding it', () => {
    const saturday = at('2026-11-14T23:00');
    const when = checksOf(facts({ now: saturday, token: { ...token, expiresAt: saturday + 50 * DAY } })).find((c) => c.what === 'When');
    assert.equal(when?.holds, false);
    assert.match(when?.state ?? '', /quiet hour/);
  });

  it('holds every post once LinkedIn no longer answers the version', () => {
    const later = Date.parse(`${VERSION_SUNSET}T00:00:00Z`) + 1;
    assert.deepEqual(held(facts({ now: later, token: { ...token, expiresAt: later + DAY } })), ['API version']);
  });
});

describe('postOf and renderPost', () => {
  it('describe the post, its id and the words that approve it', () => {
    const f = facts();
    const post = postOf(f);
    assert.ok(post);
    assert.equal(post.when, 'now');
    const id = fingerprint(post);
    const report = renderPost(f, checksOf(f), id, suggest(NOW, ROME), []);
    assert.match(report, new RegExp(`^## LinkedIn post ${id}`));
    assert.match(report, new RegExp(`"pubblica ${id}"`));
    assert.match(report, /```text\nMagma Studio is out\nTry it\n```/);
    assert.equal(postOf(facts({ token: null })), null);
  });

  it('say what holds the post and that nothing went out', () => {
    const f = facts({ visibility: undefined });
    assert.match(renderPost(f, checksOf(f), null, [], []), /It waits: visibility\. Nothing was published\./);
  });
});

describe('suggest', () => {
  const list = (from: string, zone = ROME) =>
    suggest(at(from, zone), zone).map((m) => `${new Date(m.at).toISOString()}${m.suggested ? ' *' : ''}`);

  it('on a Monday afternoon: Tuesday morning first, then the afternoon, then Wednesday', () => {
    assert.deepEqual(list('2026-11-09T16:00'), ['2026-11-10T09:00:00.000Z *', '2026-11-10T14:00:00.000Z', '2026-11-11T09:00:00.000Z']);
  });

  it('on a Friday evening: Monday morning is offered, Tuesday is suggested', () => {
    assert.deepEqual(list('2026-11-13T20:00'), ['2026-11-16T09:00:00.000Z', '2026-11-17T09:00:00.000Z *', '2026-11-17T14:00:00.000Z']);
  });

  it("skips Italy's holidays for an audience in Europe/Rome only", () => {
    // 8 December 2026 is a Tuesday and a holiday in Italy.
    assert.equal(list('2026-12-07T16:00')[0], '2026-12-09T09:00:00.000Z *');
    assert.equal(list('2026-12-07T10:00', 'America/New_York')[0], '2026-12-08T15:00:00.000Z *');
  });

  it('keeps a moment at least ten minutes away, never on a weekend', () => {
    assert.equal(list('2026-11-10T09:55')[0], '2026-11-10T14:00:00.000Z *');
    for (const m of suggest(at('2026-11-13T20:00'), ROME)) assert.equal(quiet(m.at, ROME), false);
  });

  it('knows Easter, for Easter Monday', () => {
    assert.deepEqual(easter(2026), { month: 4, day: 5 });
    assert.deepEqual(easter(2027), { month: 3, day: 28 });
    assert.ok(holidaysOf(2026, ROME).includes('04-06'));
    assert.deepEqual(holidaysOf(2026, 'Europe/London'), []);
  });
});

describe('the requests of the Videos and Posts APIs', () => {
  it('initialize an upload with its thumbnail and finalize it with the parts in order', () => {
    assert.deepEqual(initializeUpload(token.person, 1055736), {
      initializeUploadRequest: { owner: 'urn:li:person:782bbtaQ', fileSizeBytes: 1055736, uploadCaptions: false, uploadThumbnail: true },
    });
    assert.deepEqual(finalizeUpload('urn:li:video:C5', '', ['e1', 'e2']), {
      finalizeUploadRequest: { video: 'urn:li:video:C5', uploadToken: '', uploadedPartIds: ['e1', 'e2'] },
    });
  });

  it('write the post as the Posts API takes it, the text in little text format', () => {
    assert.deepEqual(postBody({ author: token.person, text: 'Out now (beta) #Magma', visibility: 'CONNECTIONS', title: '' }, 'urn:li:video:C5'), {
      author: 'urn:li:person:782bbtaQ',
      commentary: 'Out now \\(beta\\) {hashtag|\\#|Magma}',
      visibility: 'CONNECTIONS',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: 'urn:li:video:C5' } },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
    assert.deepEqual(postBody({ author: 'a', text: 't', visibility: 'PUBLIC', title: 'Magma Studio' }, 'v').content, { media: { title: 'Magma Studio', id: 'v' } });
  });

  it('take the parts only when they cover the file once', () => {
    const part = (firstByte: number, lastByte: number) => ({ uploadUrl: `u${firstByte}`, firstByte, lastByte });
    assert.deepEqual(partsOf([part(4, 9), part(0, 3)], 10).map((p) => p.uploadUrl), ['u0', 'u4']);
    assert.throws(() => partsOf([part(0, 3), part(5, 9)], 10), /follow each other/);
    assert.throws(() => partsOf([part(0, 3)], 10), /cover 4 bytes of 10/);
  });

  it('read the ETag of a part without its quotes', () => {
    assert.equal(etagOf('"e4383924"'), 'e4383924');
    assert.equal(etagOf('/ambry-videoei/signedId/AQH.bin'), '/ambry-videoei/signedId/AQH.bin');
    assert.throws(() => etagOf(null), /no ETag/);
  });
});

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
/** A fetch of the specs: records each call, answers from a function. */
const stub = (answer: (call: Call) => Response) => {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init: RequestInit = {}) => {
    const call = { url, method: init.method ?? 'GET', headers: (init.headers ?? {}) as Record<string, string>, body: init.body };
    calls.push(call);
    return answer(call);
  };
  return { calls, fetchFn };
};

describe('uploadVideo', () => {
  it('initializes, PUTs each byte range with no token, the cover as a still image, then finalizes with the ETags', async () => {
    const file = path.join(temp, 'v.mp4');
    const image = path.join(temp, 'c.png');
    writeFileSync(file, Buffer.from('0123456789'));
    writeFileSync(image, Buffer.from('PNG'));
    const { calls, fetchFn } = stub((call) => {
      if (call.url.endsWith('action=initializeUpload'))
        return Response.json({
          value: {
            video: 'urn:li:video:C5',
            uploadToken: '',
            thumbnailUploadUrl: 'https://up/thumb',
            uploadInstructions: [
              { uploadUrl: 'https://up/1', firstByte: 0, lastByte: 3 },
              { uploadUrl: 'https://up/2', firstByte: 4, lastByte: 9 },
            ],
          },
        });
      if (call.url === 'https://up/thumb') return new Response(null, { status: 201 });
      if (call.url.startsWith('https://up/')) return new Response(null, { status: 200, headers: { etag: `"tag-${call.url.at(-1)}"` } });
      return new Response(null, { status: 200 });
    });
    const urn = await uploadVideo(fetchFn, token, { ...video, file, bytes: 10 }, { ...cover, file: image });
    assert.equal(urn, 'urn:li:video:C5');
    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.url}`),
      [
        'POST https://api.linkedin.com/rest/videos?action=initializeUpload',
        'PUT https://up/1',
        'PUT https://up/2',
        'PUT https://up/thumb',
        'POST https://api.linkedin.com/rest/videos?action=finalizeUpload',
      ],
    );
    assert.deepEqual(JSON.parse(calls[0].body as string).initializeUploadRequest, {
      owner: token.person,
      fileSizeBytes: 10,
      uploadCaptions: false,
      uploadThumbnail: true,
    });
    assert.equal(calls[0].headers['Linkedin-Version'], '202610');
    assert.deepEqual([calls[1], calls[2]].map((c) => Buffer.from(c.body as Uint8Array).toString()), ['0123', '456789']);
    for (const put of calls.slice(1, 4)) assert.equal('Authorization' in put.headers, false, put.url);
    assert.deepEqual(calls[3].headers, { 'media-type-family': 'STILLIMAGE', 'Content-Type': 'application/octet-stream' });
    assert.deepEqual(JSON.parse(calls[4].body as string).finalizeUploadRequest.uploadedPartIds, ['tag-1', 'tag-2']);
  });

  it("stops on LinkedIn's error, before uploading anything", async () => {
    const { calls, fetchFn } = stub(() => Response.json({ status: 403, message: 'Accessing this video resource is forbidden' }, { status: 403 }));
    await assert.rejects(uploadVideo(fetchFn, token, video, cover), /initializeUpload: LinkedIn answered 403, Accessing/);
    assert.equal(calls.length, 1);
  });
});

describe('waitAvailable', () => {
  it('asks for the encoded video until it is AVAILABLE', async () => {
    const states = ['WAITING_UPLOAD', 'PROCESSING', 'AVAILABLE'];
    const { calls, fetchFn } = stub(() => Response.json({ status: states.shift() }));
    await waitAvailable(fetchFn, token, 'urn:li:video:C5', { every: 1, wait: async () => {} });
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, 'https://api.linkedin.com/rest/videos/urn%3Ali%3Avideo%3AC5');
  });

  it('stops on a failed processing, with its reason, or after the timeout', async () => {
    const failed = stub(() => Response.json({ status: 'PROCESSING_FAILED', processingFailureReason: 'unsupported format' }));
    await assert.rejects(waitAvailable(failed.fetchFn, token, 'v', { wait: async () => {} }), /unsupported format/);
    const slow = stub(() => Response.json({ status: 'PROCESSING' }));
    await assert.rejects(waitAvailable(slow.fetchFn, token, 'v', { every: 10, timeout: 30, wait: async () => {} }), /still PROCESSING/);
  });
});

describe('createPost', () => {
  it('reads the post from x-restli-id and gives its address', async () => {
    const { calls, fetchFn } = stub(() => new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:6844785523593134080' } }));
    const body = postBody({ author: token.person, text: 't', visibility: 'PUBLIC', title: '' }, 'urn:li:video:C5');
    assert.deepEqual(await createPost(fetchFn, token, body), {
      urn: 'urn:li:share:6844785523593134080',
      url: 'https://www.linkedin.com/feed/update/urn:li:share:6844785523593134080/',
    });
    assert.equal(calls[0].url, 'https://api.linkedin.com/rest/posts');
    assert.deepEqual(JSON.parse(calls[0].body as string), body);
  });

  it("says LinkedIn's refusal", async () => {
    const { fetchFn } = stub(() => Response.json({ status: 422, code: 'UNPROCESSABLE_ENTITY', message: 'no' }, { status: 422 }));
    await assert.rejects(createPost(fetchFn, token, postBody({ author: 'a', text: 't', visibility: 'PUBLIC', title: '' }, 'v')), /422, UNPROCESSABLE_ENTITY: no/);
  });
});

describe('a scheduled post', () => {
  it('runs at the minute of the post on the clock of the Mac', () => {
    assert.deepEqual(calendarOf(at('2026-11-10T10:00'), ROME), { Month: 11, Day: 10, Hour: 10, Minute: 0 });
    assert.deepEqual(calendarOf(at('2026-11-10T10:00'), 'America/New_York'), { Month: 11, Day: 10, Hour: 4, Minute: 0 });
  });

  it('is a LaunchAgent that never runs at load, its arguments escaped', () => {
    const plist = plistOf('com.github.vitto.v2.linkedin.3f9a2c1d', ['/node', '/Users/a b/Library/Application Support/v2/x&y.ts', '--run=3f9a2c1d'], { Month: 11, Day: 10, Hour: 10, Minute: 0 }, '/log');
    assert.match(plist, /<key>Label<\/key><string>com\.github\.vitto\.v2\.linkedin\.3f9a2c1d<\/string>/);
    assert.match(plist, /<string>\/Users\/a b\/Library\/Application Support\/v2\/x&amp;y\.ts<\/string><string>--run=3f9a2c1d<\/string>/);
    assert.match(plist, /<key>Month<\/key><integer>11<\/integer><key>Day<\/key><integer>10<\/integer><key>Hour<\/key><integer>10<\/integer><key>Minute<\/key><integer>0<\/integer>/);
    assert.match(plist, /<key>RunAtLoad<\/key><false\/>/);
  });

  it('goes out from its minute to 30 minutes after, never later', () => {
    const due = at('2026-11-10T10:00');
    assert.equal(dueOf(due, due - 1000), 'early');
    assert.equal(dueOf(due, due), 'due');
    assert.equal(dueOf(due, due + 30 * 60 * 1000), 'due');
    assert.equal(dueOf(due, due + 30 * 60 * 1000 + 1), 'late');
  });

  it('copies all the code its job imports', () => {
    const scripts = path.dirname(fileURLToPath(import.meta.url));
    for (const file of SNAPSHOT) {
      const source = readFileSync(path.join(scripts, file), 'utf8');
      for (const [, spec] of source.matchAll(/^import [^;]*? from '(\.[^']+)';/gms)) {
        const imported = path.relative(scripts, path.resolve(path.dirname(path.join(scripts, file)), spec));
        assert.ok(SNAPSHOT.includes(imported), `${file} imports ${imported}, which the job would not have`);
      }
    }
  });
});
