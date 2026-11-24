/*
  The command line of a script: `--name=value` options, `--flag` switches, one number (an issue
  or a pull request) and words (a branch, a folder, a subject), in any order.
*/
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Args {
  /** The value of `--name=value`, or undefined. */
  value: (name: string) => string | undefined;
  /** Whether `--name` was passed. */
  flag: (name: string) => boolean;
  /** The first bare number, or `--<name>=<number>`; null when there is none. */
  number: (name?: string) => number | null;
  /** Every `--name=value`, by name. */
  values: Map<string, string>;
  /** The bare arguments that are not a number, joined by a space; empty when there are none. */
  words: string;
}

export const parseArgs = (argv: string[]): Args => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const bare: string[] = [];
  for (const arg of argv) {
    const option = /^--([^=]+)=(.*)$/s.exec(arg);
    if (option) values.set(option[1], option[2]);
    else if (arg.startsWith('--')) flags.add(arg.slice(2));
    else bare.push(arg);
  }
  return {
    values,
    value: (name) => values.get(name),
    flag: (name) => flags.has(name),
    number: (name) => {
      const raw = (name ? values.get(name) : undefined) ?? bare.find((arg) => /^#?\d+$/.test(arg));
      if (raw === undefined) return null;
      const n = Number(raw.replace(/^#/, ''));
      return Number.isInteger(n) && n > 0 ? n : null;
    },
    words: bare.filter((arg) => !/^#?\d+$/.test(arg)).join(' ').trim(),
  };
};

/** Whether this module is the script node was started with. */
export const isMain = (moduleUrl: string): boolean =>
  !!process.argv[1] && fileURLToPath(moduleUrl) === path.resolve(process.argv[1]);
