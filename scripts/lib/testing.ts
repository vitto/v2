/*
  Helpers of the specs: real git repositories in a temporary folder, with a bare one as origin,
  so what the scripts do to git is tested on git itself. Removed when the specs end.
*/
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';

/** Runs git in a folder, without the hooks or the configuration of the person running the specs. */
export const sh = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  }).trim();

/** A temporary folder for one spec file, removed after it. */
export const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), `v2-${prefix}-`));
  after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

/** A repository whose first branch is `branch`, with origin a bare repository beside it. */
export const repository = (temp: string, name: string, branch = 'main') => {
  const origin = path.join(temp, `${name}-origin.git`);
  const repo = path.join(temp, name);
  execFileSync('git', ['init', '--quiet', '--bare', '-b', branch, origin]);
  execFileSync('git', ['init', '--quiet', '-b', branch, repo]);
  sh(repo, 'config', 'user.email', 'test@example.com');
  sh(repo, 'config', 'user.name', 'test');
  sh(repo, 'config', 'commit.gpgsign', 'false');
  sh(repo, 'remote', 'add', 'origin', origin);
  /** Commits a file on a branch, checking it out first when needed. */
  const commit = (on: string, file: string, text: string) => {
    // symbolic-ref answers on the unborn branch of a new repository too, where checkout fails
    if (sh(repo, 'symbolic-ref', '--short', 'HEAD') !== on) sh(repo, 'checkout', '--quiet', on);
    writeFileSync(path.join(repo, file), text);
    sh(repo, 'add', file);
    sh(repo, 'commit', '--quiet', '--no-verify', '-m', `${on}: ${file}`);
  };
  return { repo, origin, commit };
};
