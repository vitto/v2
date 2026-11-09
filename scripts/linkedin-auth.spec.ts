import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { authorizeUrl, exchange, parseCallback, redirectOf, tokenOf, tokenRequest } from './linkedin-auth.ts';

const REDIRECT = redirectOf(8723);

describe('authorizeUrl', () => {
  it("is LinkedIn's authorization page with the scope delimited by encoded spaces", () => {
    const url = authorizeUrl('client 1', REDIRECT, 'st4te');
    assert.equal(
      url,
      'https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=client%201' +
        '&redirect_uri=http%3A%2F%2Flocalhost%3A8723%2Fcallback&state=st4te&scope=openid%20profile%20w_member_social',
    );
    assert.equal(url.includes('+'), false);
  });
});

describe('parseCallback', () => {
  const at = (query: string, pathname = '/callback') => new URL(`http://localhost:8723${pathname}?${query}`);

  it('takes the code only with the state it sent', () => {
    assert.deepEqual(parseCallback(at('code=AQT&state=s'), 's'), { code: 'AQT' });
    assert.match((parseCallback(at('code=AQT&state=other'), 's') as { error: string }).error, /state/);
    assert.match((parseCallback(at('code=AQT'), 's') as { error: string }).error, /state/);
  });

  it('names the products a scope error means', () => {
    const result = parseCallback(at('error=invalid_scope_error&error_description=The+requested+permission+scope+is+not+valid&state=s'), 's') as { error: string };
    assert.match(result.error, /^invalid_scope_error: The requested permission scope is not valid\. The app lacks a product/);
    assert.match(result.error, /"Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn"$/);
  });

  it('names the one product a refused scope needs, the entities of the description read', () => {
    const description = encodeURIComponent('Scope &quot;openid&quot; is not authorized for your application');
    assert.deepEqual(parseCallback(at(`error=unauthorized_scope_error&error_description=${description}&state=s`), 's'), {
      error:
        'unauthorized_scope_error: Scope "openid" is not authorized for your application. The app lacks the product "Sign In with LinkedIn using OpenID Connect": add it in the Products tab of the app',
    });
  });

  it("says LinkedIn's error, and ignores the other paths", () => {
    assert.deepEqual(parseCallback(at('error=user_cancelled_authorize&error_description=The+member+refused&state=s'), 's'), {
      error: 'user_cancelled_authorize: The member refused',
    });
    assert.match((parseCallback(at('state=s'), 's') as { error: string }).error, /no code/);
    assert.equal(parseCallback(at('', '/favicon.ico'), 's'), null);
  });
});

describe('tokenRequest', () => {
  it('is a form with the code, the app and the same redirect', () => {
    const { url, init } = tokenRequest('AQT', 'id', 's&cret', REDIRECT);
    assert.equal(url, 'https://www.linkedin.com/oauth/v2/accessToken');
    assert.equal(init.method, 'POST');
    assert.deepEqual(init.headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
    assert.deepEqual(Object.fromEntries(new URLSearchParams(init.body)), {
      grant_type: 'authorization_code',
      code: 'AQT',
      client_id: 'id',
      client_secret: 's&cret',
      redirect_uri: REDIRECT,
    });
  });
});

describe('tokenOf', () => {
  it('keeps the token, its expiry and the member as the author of the posts', () => {
    assert.deepEqual(tokenOf({ access_token: 'AQU', expires_in: 5184000, scope: 'openid,profile,w_member_social' }, { sub: '782bbtaQ', name: 'Ada' }, 1000), {
      accessToken: 'AQU',
      expiresAt: 1000 + 5184000 * 1000,
      person: 'urn:li:person:782bbtaQ',
      name: 'Ada',
      scope: 'openid,profile,w_member_social',
    });
  });

  it('refuses an answer with no token or no member', () => {
    assert.throws(() => tokenOf({}, { sub: 'x' }, 0), /no access token/);
    assert.throws(() => tokenOf({ access_token: 'a', expires_in: 1 }, {}, 0), /OpenID Connect/);
  });
});

describe('exchange', () => {
  it('posts the form, then reads who signed in with the new token', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.endsWith('/accessToken')
        ? Response.json({ access_token: 'AQU', expires_in: 60, scope: 'openid,profile,w_member_social' })
        : Response.json({ sub: 'abc', name: 'Ada' });
    };
    const token = await exchange(fetchFn, 'AQT', 'id', 'secret', REDIRECT, 0);
    assert.deepEqual(
      calls.map((call) => call.url),
      ['https://www.linkedin.com/oauth/v2/accessToken', 'https://api.linkedin.com/v2/userinfo'],
    );
    assert.deepEqual(calls[1].init?.headers, { Authorization: 'Bearer AQU' });
    assert.equal(token.person, 'urn:li:person:abc');
  });

  it("stops on LinkedIn's error", async () => {
    const fetchFn = async () => Response.json({ error: 'invalid_request' }, { status: 400 });
    await assert.rejects(exchange(fetchFn, 'AQT', 'id', 'secret', REDIRECT), /token exchange: LinkedIn answered 400/);
  });
});
