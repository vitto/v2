/*
  LinkedIn as the scripts of /v2:share-to-linkedin reach it: the API and its version, the sign-in
  of the person kept in the macOS Keychain, the clock of the audience. Pure functions, and the
  few calls to the outside (`fetch`, `security`) passed in, so the specs replace them.

  Where each answer comes from (LinkedIn's documentation on learn.microsoft.com, read on
  2026-11-09):

  - the sign-in, "Authorization Code Flow (3-legged OAuth)": the authorization page
    `https://www.linkedin.com/oauth/v2/authorization` with a scope URL-encoded and delimited by
    spaces; the token from `https://www.linkedin.com/oauth/v2/accessToken`, a form; "all access
    tokens are issued with a 60-day lifespan"; refresh tokens only for approved partners, so the
    person signs in again, which skips the consent while they are signed in to LinkedIn;
  - the member, "Sign In with LinkedIn using OpenID Connect": `sub` of
    `GET https://api.linkedin.com/v2/userinfo` (scopes `openid`, `profile`), the page "Share on
    LinkedIn" points to for the Person URN; the author of a post is `urn:li:person:{sub}`
    ("construct a Person URN in the format of urn:li:person:{id}", Posts API);
  - posting, "Share on LinkedIn": the scope `w_member_social`;
  - the versioned API, "Versioning" and "API Migration Status": every call to
    `https://api.linkedin.com/rest/...` carries `Linkedin-Version: YYYYMM` and
    `X-Restli-Protocol-Version: 2.0.0`; 202610 is the latest version, active until 2027-10-15;
  - the Keychain: `security`, generic passwords of the service `v2-linkedin`. The person writes the
    client id and secret of their app (`security add-generic-password ... -w`, which asks for the
    value); the token goes in through the standard input of `security -i`, never on a command
    line another process can read.
*/
import { spawnSync } from 'node:child_process';

export const API = 'https://api.linkedin.com';
export const OAUTH = 'https://www.linkedin.com/oauth/v2';
export const VERSION = '202610';
/** The day LinkedIn stops answering VERSION. */
export const VERSION_SUNSET = '2027-10-15';
export const SCOPES = ['openid', 'profile', 'w_member_social'];
export const SERVICE = 'v2-linkedin';
export const DAY = 24 * 60 * 60 * 1000;

/** The headers of every call to the versioned API. */
export const restHeaders = (accessToken: string, json = true): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  'Linkedin-Version': VERSION,
  'X-Restli-Protocol-Version': '2.0.0',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** A response out of 2xx, as an error with what LinkedIn said. */
export const failed = async (what: string, response: Response): Promise<Error> => {
  const text = (await response.text().catch(() => '')).trim();
  let said = text;
  try {
    // The REST API answers { code, message }, the OAuth endpoints { error, error_description }.
    const body = JSON.parse(text) as { message?: string; code?: string; error?: string; error_description?: string };
    said = [body.code ?? body.error, body.message ?? body.error_description].filter(Boolean).join(': ') || text;
  } catch {}
  return new Error(`${what}: LinkedIn answered ${response.status}${said ? `, ${said.slice(0, 500)}` : ''}`);
};

/** The sign-in of the person, as linkedin-auth.ts keeps it. */
export interface Token {
  accessToken: string;
  /** When it expires, in milliseconds since the epoch. */
  expiresAt: number;
  /** The author of the posts: `urn:li:person:{sub}`. */
  person: string;
  /** The name of the person, as LinkedIn gives it. */
  name: string;
  /** The scopes LinkedIn granted, as it wrote them. */
  scope: string;
}

/** The Keychain, as base64 of JSON: the characters `security -i` takes inside quotes. */
export const encodeToken = (token: Token): string => Buffer.from(JSON.stringify(token)).toString('base64');

export const decodeToken = (stored: string | null): Token | null => {
  if (!stored) return null;
  try {
    const token = JSON.parse(Buffer.from(stored, 'base64').toString('utf8')) as Token;
    return typeof token.accessToken === 'string' &&
      typeof token.expiresAt === 'number' &&
      /^urn:li:person:\S+$/.test(token.person)
      ? token
      : null;
  } catch {
    return null;
  }
};

/** Whether the scopes LinkedIn granted let the token post. */
export const canPost = (scope: string): boolean => scope.split(/[\s,]+/).includes('w_member_social');

/** A date as people read it: `Tue 10 Nov 2026`, or with the time `Tue 10 Nov 2026, 10:00`. */
export const dateText = (ms: number, zone: string, time = false): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  } as Intl.DateTimeFormatOptions)
    .format(new Date(ms))
    .replace(/^(\w+),? /, '$1 ')
    .replace(/ at /, ', ');

/** The state of the sign-in at `now`, and whether it lets the script post until `until`. */
export const tokenState = (
  token: Token | null,
  now: number,
  zone: string,
  until = now,
): { ok: boolean; state: string } => {
  if (!token)
    return { ok: false, state: 'not signed in: the person runs `node scripts/linkedin-auth.ts` (README, "Publishing on LinkedIn")' };
  const expires = dateText(token.expiresAt, zone, true);
  if (token.expiresAt <= now) return { ok: false, state: `the sign-in of ${token.name} expired on ${expires}: the person signs in again` };
  if (!canPost(token.scope))
    return { ok: false, state: `${token.name} is signed in without \`w_member_social\`: the app needs the product "Share on LinkedIn"` };
  // An hour of margin: an upload and a wait for LinkedIn to process the video.
  if (token.expiresAt <= until + 60 * 60 * 1000)
    return { ok: false, state: `the sign-in of ${token.name} expires on ${expires}, before the post: the person signs in again first` };
  const days = Math.floor((token.expiresAt - now) / DAY);
  return { ok: true, state: `${token.name}, signed in until ${expires}${days < 7 ? ` (${days} days: sign in again soon)` : ''}` };
};

/** The Keychain of the person, by account of the service `v2-linkedin`. */
export interface Keychain {
  read: (account: string) => string | null;
  write: (account: string, value: string) => void;
  remove: (account: string) => void;
}

/** The line `security -i` reads to write a value; only characters safe inside its quotes. */
export const writeCommand = (service: string, account: string, value: string): string => {
  for (const [what, text] of [['service', service], ['account', account], ['value', value]])
    if (!/^[A-Za-z0-9+/=._~-]+$/.test(text)) throw new Error(`the ${what} holds characters the Keychain command cannot quote`);
  return `add-generic-password -U -s ${service} -a ${account} -w "${value}"`;
};

export const keychain = (service = SERVICE): Keychain => {
  const read = (account: string) => {
    const found = spawnSync('security', ['find-generic-password', '-s', service, '-a', account, '-w'], { encoding: 'utf8' });
    return found.status === 0 ? found.stdout.replace(/\n$/, '') : null;
  };
  return {
    read,
    write: (account, value) => {
      spawnSync('security', ['-i'], { input: `${writeCommand(service, account, value)}\n`, encoding: 'utf8' });
      if (read(account) !== value) throw new Error(`the Keychain did not keep ${service}/${account}`);
    },
    remove: (account) => {
      spawnSync('security', ['delete-generic-password', '-s', service, '-a', account], { encoding: 'utf8' });
    },
  };
};

/** The time zone of this machine. */
export const localZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The wall clock of a zone at an instant; weekday 0 is Sunday. */
export const wallTime = (ms: number, zone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
  };
};

/** The instant of a wall-clock time (`YYYY-MM-DDTHH:MM`) in a zone; a time the zone skips throws. */
export const instantOf = (local: string, zone: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error(`not a time: ${local} (YYYY-MM-DDTHH:MM)`);
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const asUtc = (ms: number) => {
    const w = wallTime(ms, zone);
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  };
  let guess = target;
  for (let i = 0; i < 3; i++) guess += target - asUtc(guess);
  if (asUtc(guess) !== target) throw new Error(`${local} does not exist in ${zone}: the clocks skip it`);
  return guess;
};
