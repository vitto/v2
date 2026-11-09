/*
  How the scripts of v2 talk to the outside: git on the local disk, GitHub through `gh` (as the
  person running it is signed in), and the command line of the script itself. Nothing else is
  read: no npm package, no token of its own.
*/
import { execFileSync } from 'node:child_process';

const MAX_BUFFER = 64 * 1024 * 1024;

/** Runs a program and returns its output, trimmed at the end; throws on a non-zero exit. */
export const run = (
  program: string,
  args: string[],
  options: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {},
): string =>
  execFileSync(program, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  }).trimEnd();

/** Runs git in a folder; with `allowFail`, a failure returns null instead of throwing. */
export function git(cwd: string, args: string[]): string;
export function git(cwd: string, args: string[], allowFail: true): string | null;
export function git(cwd: string, args: string[], allowFail = false): string | null {
  try {
    return run('git', ['-C', cwd, ...args]);
  } catch (error) {
    if (allowFail) return null;
    throw error;
  }
}

/** The repository on GitHub: owner and name. */
export interface Repo {
  owner: string;
  name: string;
}

/** Runs gh in a folder (gh reads the repository from the remotes of that folder). */
export const gh = (args: string[], cwd?: string): string => run('gh', args, { cwd });

/** A GraphQL query through `gh api graphql`; numbers go as typed variables (-F), the rest as strings (-f). */
export const graphql = <T>(
  query: string,
  variables: Record<string, string | number>,
  cwd?: string,
): T => {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables))
    args.push(typeof value === 'number' ? '-F' : '-f', `${key}=${value}`);
  return (JSON.parse(gh(args, cwd)) as { data: T }).data;
};

/** The repository: `--repo=owner/name` when given, otherwise the one gh reads from the folder. */
export const repoOf = (option: string | undefined, cwd?: string): Repo => {
  if (option) {
    const [owner, name, ...rest] = option.split('/');
    if (!owner || !name || rest.length) throw new Error(`--repo takes owner/name, not ${option}`);
    return { owner, name };
  }
  const repo = JSON.parse(gh(['repo', 'view', '--json', 'owner,name'], cwd)) as {
    owner: { login: string };
    name: string;
  };
  return { owner: repo.owner.login, name: repo.name };
};

/** The root of the git checkout a folder belongs to, or null outside git. */
export const rootOf = (cwd: string): string | null =>
  git(cwd, ['rev-parse', '--show-toplevel'], true);
