/*
  Headless Chrome through the Chrome DevTools Protocol, for the scripts that look at pages: the
  recorder of /v2:share-linkedin and the screenshots of /v2:work-shots. Nothing to install: the
  Chrome of the computer, and the WebSocket of Node.

  Where each part comes from:

  - Chrome: the CHROME variable, else the usual place of Google Chrome or Chromium, else the PATH;
  - the port: Chrome picks a free one and writes it in its profile (DevToolsActivePort);
  - the session: one page target, opened on about:blank.
*/
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/** Where Chrome is: CHROME, else the usual places. */
export const findChrome = (env = process.env): string | null => {
  if (env.CHROME) return env.CHROME;
  const places = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const place of places) if (existsSync(place)) return place;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return null;
};

export interface Session {
  send: <T = any>(method: string, params?: object) => Promise<T>;
  on: (method: string, listener: (params: any) => void) => void;
  close: () => void;
}

/** A DevTools Protocol session on a page. */
export const connect = (url: string): Promise<Session> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map<number, { ok: (value: any) => void; ko: (error: Error) => void }>();
    const listeners = new Map<string, ((params: any) => void)[]>();
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const call = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) call?.ko(new Error(message.error.message));
        else call?.ok(message.result);
      } else for (const listener of listeners.get(message.method) ?? []) listener(message.params);
    };
    ws.onerror = () => reject(new Error(`No DevTools session at ${url}`));
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((ok, ko) => {
            pending.set(++id, { ok, ko });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
        close: () => ws.close(),
      });
  });

/** Chrome headless on a free port, which it writes in its profile, its window `width` x `height`. */
export const launch = async (
  chrome: string,
  profile: string,
  size: { width: number; height: number },
): Promise<{ child: ChildProcess; page: Session }> => {
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-color-profile=srgb',
      `--window-size=${size.width},${size.height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (existsSync(file)) {
      const [port] = (await readFile(file, 'utf8')).split('\n');
      if (port) {
        const target = (await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()) as {
          webSocketDebuggerUrl: string;
        };
        return { child, page: await connect(target.webSocketDebuggerUrl) };
      }
    }
    await sleep(100);
  }
  child.kill();
  throw new Error(`Chrome did not start: ${chrome}`);
};
