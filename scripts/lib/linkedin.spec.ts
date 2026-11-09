import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAY,
  VERSION,
  canPost,
  dateText,
  decodeToken,
  encodeToken,
  failed,
  instantOf,
  restHeaders,
  tokenState,
  wallTime,
  writeCommand,
  type Token,
} from './linkedin.ts';

const NOW = Date.UTC(2026, 10, 9, 15, 0);
const token = (over: Partial<Token> = {}): Token => ({
  accessToken: 'AQX-token_1.2',
  expiresAt: NOW + 30 * DAY,
  person: 'urn:li:person:782bbtaQ',
  name: 'Ada',
  scope: 'email,openid,profile,w_member_social',
  ...over,
});

describe('restHeaders', () => {
  it('carries the token, the version and the protocol of the versioned API', () => {
    assert.deepEqual(restHeaders('t'), {
      Authorization: 'Bearer t',
      'Linkedin-Version': VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    });
    assert.equal('Content-Type' in restHeaders('t', false), false);
    assert.match(VERSION, /^\d{6}$/);
  });
});

describe('failed', () => {
  it("says what failed, the status and LinkedIn's message", async () => {
    const error = await failed('The post', new Response(JSON.stringify({ message: 'Field too long', code: 'FIELD_LENGTH_TOO_LONG', status: 400 }), { status: 400 }));
    assert.equal(error.message, 'The post: LinkedIn answered 400, FIELD_LENGTH_TOO_LONG: Field too long');
    assert.equal((await failed('X', new Response('', { status: 503 }))).message, 'X: LinkedIn answered 503');
  });
});

describe('the token in the Keychain', () => {
  it('goes there as base64 of JSON and comes back the same', () => {
    const stored = encodeToken(token());
    assert.match(stored, /^[A-Za-z0-9+/=]+$/);
    assert.deepEqual(decodeToken(stored), token());
  });

  it('reads nothing from a missing or broken value', () => {
    assert.equal(decodeToken(null), null);
    assert.equal(decodeToken('not base64 json'), null);
    assert.equal(decodeToken(Buffer.from(JSON.stringify({ accessToken: 'a' })).toString('base64')), null);
  });

  it('is written through the standard input of security, only with characters its quotes take', () => {
    assert.equal(writeCommand('v2-linkedin', 'token', 'YWJj+/='), 'add-generic-password -U -s v2-linkedin -a token -w "YWJj+/="');
    assert.throws(() => writeCommand('v2-linkedin', 'token', 'a" -s other'), /cannot quote/);
    assert.throws(() => writeCommand('v2-linkedin', 'to ken', 'a'), /account/);
  });
});

describe('canPost', () => {
  it('needs w_member_social, whatever separates the scopes', () => {
    assert.ok(canPost('openid,profile,w_member_social'));
    assert.ok(canPost('openid profile w_member_social'));
    assert.equal(canPost('openid,profile'), false);
    assert.equal(canPost(''), false);
  });
});

describe('tokenState', () => {
  const zone = 'Europe/Rome';
  it('says who is signed in and until when', () => {
    const state = tokenState(token(), NOW, zone);
    assert.ok(state.ok);
    assert.match(state.state, /^Ada, signed in until Wed 9 Dec 2026, 16:00$/);
  });

  it('holds when nobody is signed in, the token expired or cannot post', () => {
    assert.equal(tokenState(null, NOW, zone).ok, false);
    assert.match(tokenState(token({ expiresAt: NOW - 1 }), NOW, zone).state, /expired/);
    assert.match(tokenState(token({ scope: 'openid,profile' }), NOW, zone).state, /Share on LinkedIn/);
  });

  it('holds when the token expires before a post, an hour of margin included', () => {
    const t = token({ expiresAt: NOW + 2 * DAY });
    assert.ok(tokenState(t, NOW, zone, NOW + DAY).ok);
    assert.match(tokenState(t, NOW, zone, NOW + 2 * DAY - 30 * 60 * 1000).state, /before the post/);
  });

  it('warns a week before it expires', () => {
    assert.match(tokenState(token({ expiresAt: NOW + 3 * DAY + 1000 }), NOW, zone).state, /3 days: sign in again soon/);
  });
});

describe('the clock of the audience', () => {
  it('reads the wall clock of a zone', () => {
    assert.deepEqual(wallTime(Date.UTC(2026, 10, 10, 9, 0), 'Europe/Rome'), { year: 2026, month: 11, day: 10, hour: 10, minute: 0, weekday: 2 });
    assert.equal(wallTime(Date.UTC(2026, 10, 10, 23, 30), 'Europe/Rome').hour, 0, 'midnight is 0, not 24');
  });

  it('turns a wall-clock time into its instant, summer and winter', () => {
    assert.equal(instantOf('2026-11-10T10:00', 'Europe/Rome'), Date.UTC(2026, 10, 10, 9, 0));
    assert.equal(instantOf('2026-07-10T10:00', 'Europe/Rome'), Date.UTC(2026, 6, 10, 8, 0));
    assert.equal(instantOf('2026-11-10T10:00', 'America/New_York'), Date.UTC(2026, 10, 10, 15, 0));
  });

  it('refuses a time the clocks skip and a malformed one', () => {
    assert.throws(() => instantOf('2026-03-29T02:30', 'Europe/Rome'), /does not exist/);
    assert.throws(() => instantOf('10 Nov 2026', 'Europe/Rome'), /not a time/);
  });

  it('writes a date as people read it', () => {
    assert.equal(dateText(Date.UTC(2026, 10, 10, 9, 0), 'Europe/Rome', true), 'Tue 10 Nov 2026, 10:00');
    assert.equal(dateText(Date.UTC(2026, 10, 10, 9, 0), 'Europe/Rome'), 'Tue 10 Nov 2026');
  });
});
