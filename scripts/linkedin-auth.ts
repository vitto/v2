/*
  Signs the person in to LinkedIn for /v2:share-to-linkedin, once every 60 days: the OAuth 2.0
  authorization code flow of their own developer app, in their own browser, back to this machine.
  The token goes to the macOS Keychain and is never printed.

    node scripts/linkedin-auth.ts [--port=8723]
        opens LinkedIn's authorization page in the browser, waits up to 5 minutes for the redirect
        to http://localhost:<port>/callback, checks its state, exchanges the code for a token,
        reads who signed in (OpenID Connect), and keeps both in the Keychain
    node scripts/linkedin-auth.ts --status
        who is signed in and until when, from the Keychain; no network
    node scripts/linkedin-auth.ts --sign-out
        removes the token from the Keychain

  The setup, once, by the person (README, "Publishing on LinkedIn"): a developer app with the
  products "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect", the redirect URL
  http://localhost:8723/callback among its authorized ones, and its client id and secret in the
  Keychain (`security add-generic-password -s v2-linkedin -a client-id -w`, then `-a
  client-secret`). The person signs in on LinkedIn's own page: no password passes through here.

  Where each answer comes from: scripts/lib/linkedin.ts. The redirect: LinkedIn sends the browser
  back to a URL registered on the app, with `code` and the `state` it was given, or with `error`
  and `error_description`; "the authorization code has a 30-minute lifespan".
*/
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { isMain, parseArgs } from './lib/args.ts';
import {
  API,
  OAUTH,
  SCOPES,
  canPost,
  decodeToken,
  encodeToken,
  failed,
  keychain,
  localZone,
  tokenState,
  type Fetch,
  type Token,
} from './lib/linkedin.ts';

export const PORT = 8723;
const WAIT = 5 * 60 * 1000;

export const redirectOf = (port: number): string => `http://localhost:${port}/callback`;

/** The authorization page: the scope delimited by spaces, encoded as %20. */
export const authorizeUrl = (clientId: string, redirectUri: string, state: string, scopes = SCOPES): string =>
  `${OAUTH}/authorization?${[
    ['response_type', 'code'],
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['state', state],
    ['scope', scopes.join(' ')],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;

/** What the redirect says: the code, an error, or null for another path of the server. */
export const parseCallback = (url: URL, state: string): { code: string } | { error: string } | null => {
  if (url.pathname !== '/callback') return null;
  if (url.searchParams.get('state') !== state)
    return { error: 'the state of the redirect is not the one sent: start again from the script' };
  const error = url.searchParams.get('error');
  if (error) return { error: `${error}: ${url.searchParams.get('error_description') ?? 'no description'}` };
  const code = url.searchParams.get('code');
  return code ? { code } : { error: 'the redirect carries no code' };
};

/** The exchange of the code for a token: a form, with the same redirect URI. */
export const tokenRequest = (code: string, clientId: string, clientSecret: string, redirectUri: string) => ({
  url: `${OAUTH}/accessToken`,
  init: {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }).toString(),
  },
});

/** The token kept: LinkedIn's answer and who signed in. */
export const tokenOf = (
  answer: { access_token?: string; expires_in?: number; scope?: string },
  user: { sub?: string; name?: string },
  now: number,
): Token => {
  if (!answer.access_token || !answer.expires_in) throw new Error('LinkedIn gave no access token');
  if (!user.sub) throw new Error('LinkedIn did not say who signed in (no `sub` in userinfo): the app needs "Sign In with LinkedIn using OpenID Connect"');
  return {
    accessToken: answer.access_token,
    expiresAt: now + answer.expires_in * 1000,
    person: `urn:li:person:${user.sub}`,
    name: user.name ?? user.sub,
    scope: answer.scope ?? '',
  };
};

/** Exchanges the code and reads who signed in. */
export const exchange = async (
  fetchFn: Fetch,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  now = Date.now(),
): Promise<Token> => {
  const { url, init } = tokenRequest(code, clientId, clientSecret, redirectUri);
  const answer = await fetchFn(url, init);
  if (!answer.ok) throw await failed('The token exchange', answer);
  const token = (await answer.json()) as { access_token?: string; expires_in?: number; scope?: string };
  const user = await fetchFn(`${API}/v2/userinfo`, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!user.ok) throw await failed('Who signed in (userinfo)', user);
  return tokenOf(token, (await user.json()) as { sub?: string; name?: string }, now);
};

const page = (title: string, text: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:18px/1.5 system-ui;margin:4rem auto;max-width:36rem"><h1>${title}</h1><p>${text}</p>`;

/** Waits for the redirect on both loopback addresses `localhost` may name. */
const waitForCode = (port: number, state: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const servers: Server[] = [];
    const done = (error: Error | null, code?: string) => {
      clearTimeout(timer);
      for (const server of servers) server.close(() => {});
      if (error) reject(error);
      else resolve(code!);
    };
    const timer = setTimeout(() => done(new Error('No redirect within 5 minutes: run the script again')), WAIT);
    for (const host of ['127.0.0.1', '::1']) {
      const server = createServer((request, response) => {
        const result = parseCallback(new URL(request.url ?? '/', `http://localhost:${port}`), state);
        if (!result) {
          response.writeHead(404).end();
          return;
        }
        response.writeHead('code' in result ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
        response.end(
          'code' in result
            ? page('Signed in', 'v2 can now publish the LinkedIn posts you approve. You can close this tab.')
            : page('Not signed in', result.error.replace(/[<>&]/g, '')),
        );
        done('code' in result ? null : new Error(`LinkedIn: ${result.error}`), 'code' in result ? result.code : undefined);
      });
      server.on('error', (error: NodeJS.ErrnoException) => {
        // A machine with no IPv6 loopback still has the IPv4 one.
        if (host === '::1' && error.code === 'EADDRNOTAVAIL') return;
        done(new Error(`Cannot listen on ${host}:${port}: ${error.message}`));
      });
      server.listen(port, host);
      servers.push(server);
    }
  });

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const keys = keychain();
  const zone = localZone();
  const now = Date.now();
  if (args.flag('status')) {
    console.info(tokenState(decodeToken(keys.read('token')), now, zone).state);
    return;
  }
  if (args.flag('sign-out')) {
    keys.remove('token');
    console.info('Signed out: the token is no longer in the Keychain. Revoking the app on LinkedIn is in its settings, "Permitted services".');
    return;
  }
  const clientId = keys.read('client-id');
  const clientSecret = keys.read('client-secret');
  if (!clientId || !clientSecret)
    throw new Error(
      'The client id or secret of the LinkedIn app is not in the Keychain. Once, in a terminal:\n' +
        '  security add-generic-password -s v2-linkedin -a client-id -w\n' +
        '  security add-generic-password -s v2-linkedin -a client-secret -w\n' +
        'Each asks for the value (README, "Publishing on LinkedIn").',
    );
  const port = Number(args.value('port') ?? PORT);
  const redirectUri = redirectOf(port);
  const state = randomBytes(24).toString('base64url');
  const url = authorizeUrl(clientId, redirectUri, state);
  const code = waitForCode(port, state);
  console.info(`Sign in on LinkedIn in the browser. If it does not open, open:\n${url}\n`);
  spawn('open', [url], { stdio: 'ignore', detached: true }).on('error', () => {});
  const token = await exchange(fetch, await code, clientId, clientSecret, redirectUri);
  keys.write('token', encodeToken(token));
  console.info(`Signed in: ${tokenState(token, Date.now(), zone).state}.`);
  if (!canPost(token.scope)) process.exitCode = 1;
};

if (isMain(import.meta.url)) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
