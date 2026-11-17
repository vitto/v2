/*
  The plugin as it ships, so that CI fails on it before a merge: every skill's frontmatter parses
  (a SKILL.md whose YAML does not parse loads with empty metadata and nothing says so, as
  skills/map/SKILL.md would have before 4cc9f4d), its name is its folder, it has a description; the
  manifests are JSON, and the marketplace lists the plugin of this folder. `npm run validate`
  (`claude plugin validate .`) checks more, by hand: CI installs nothing, and the Claude Code CLI
  would be a download of hundreds of MB on every run.
*/
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { frontmatter } from './lib/frontmatter.ts';

const root = path.join(import.meta.dirname, '..');

const skills = readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe('the skills', () => {
  it('are there', () => assert.ok(skills.length > 0, 'no folder in skills/'));

  for (const name of skills) {
    it(`${name}: the frontmatter parses, its name is its folder, it has a description`, () => {
      const file = path.join('skills', name, 'SKILL.md');
      let fields: Record<string, string>;
      try {
        fields = frontmatter(readFileSync(path.join(root, file), 'utf8'));
      } catch (error) {
        // the file and the line, as an editor opens them: skills/x/SKILL.md:3
        throw new Error(`${file}:${(error as Error).message.replace(/^line /, '')}`);
      }
      assert.equal(fields.name, name, `${file}: the name is not the folder`);
      assert.ok(fields.description?.trim(), `${file}: no description`);
    });
  }
});

describe('the manifests', () => {
  const read = (file: string) => JSON.parse(readFileSync(path.join(root, '.claude-plugin', file), 'utf8'));
  const plugin = read('plugin.json');

  it('plugin.json has a name and a version x.y.z', () => {
    assert.match(plugin.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  });

  it('marketplace.json lists the plugin of this folder', () => {
    const entry = read('marketplace.json').plugins?.find((p: { name: string }) => p.name === plugin.name);
    assert.ok(entry, `marketplace.json does not list ${plugin.name}`);
    assert.equal(entry.source, './');
  });
});
