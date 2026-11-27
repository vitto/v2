/*
  The plugin as it ships, so that CI fails on it before a merge: every skill's frontmatter parses
  (a SKILL.md whose YAML does not parse loads with empty metadata and nothing says so, as
  skills/map/SKILL.md would have before 4cc9f4d), its name is its folder, it has a description; the
  manifests are JSON, and the marketplace lists the plugin of this folder. `npm run validate`
  (`claude plugin validate .`) checks more, by hand: CI installs nothing, and the Claude Code CLI
  would be a download of hundreds of MB on every run.
*/
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { DOMAINS } from './lib/epic.ts';
import { frontmatter } from './lib/frontmatter.ts';

const root = path.join(import.meta.dirname, '..');

/** The longest description a skill in the listing may have: what it does, when, the words that call it (#67). */
const DESCRIPTION = 300;

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
      // #67: Claude Code lists every skill's description in each session within a budget of 1% of
      // the context window, shared with every plugin enabled, and drops the descriptions of the
      // skills used least when it does not fit (https://code.claude.com/docs/en/skills.md, "Skill
      // descriptions are cut short"); on 2026-11-27 share-linkedin and work-test were listed by
      // name only. A skill only the person launches is out of the listing, so out of the limit.
      if (fields['disable-model-invocation'] !== 'true')
        assert.ok(
          fields.description.length <= DESCRIPTION,
          `${file}: the description is ${fields.description.length} characters, over ${DESCRIPTION}: what the skill does, when to use it and the words that call it; the rest goes in the body`,
        );
    });

    // the person asked on 2026-11-24 to see where the answer of every skill starts
    it(`${name}: opens its answer with a horizontal rule`, () => {
      const text = readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
      assert.match(
        text,
        /^Where the answer starts: put a horizontal rule \(`---` on a line of its own, with an empty line$/m,
        `skills/${name}/SKILL.md: no rule on the horizontal rule above the answer`,
      );
    });

    // a skill reads the docs it cites at run time: a renamed or missing file fails there, silently
    it(`${name}: every file of the plugin it cites exists`, () => {
      const text = readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
      for (const [cited] of text.matchAll(/\.\.\/[\w./-]+\.md/g)) {
        const file = path.join(root, 'skills', name, cited);
        assert.ok(existsSync(file), `skills/${name}/SKILL.md cites ${cited}, which does not exist`);
      }
    });
  }

  // #51: a build that went on with the guides alone, the design system's tools not loaded, made by
  // hand what the design system had; every design skill now checks its tools, and DS1 checks the build
  it('the design skills find the design system and its tools as docs/design-system.md says', () => {
    for (const name of ['design-build', 'design-audit', 'design-reframe', 'design-interview']) {
      const text = readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
      assert.match(text, /`\.\.\/\.\.\/docs\/design-system\.md`/, `skills/${name}/SKILL.md does not cite it`);
      assert.match(text, /never silently|Never fall back to the guides silently/, `skills/${name}/SKILL.md may fall back silently`);
    }
    for (const name of ['design-build', 'design-audit']) {
      const text = readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
      assert.match(text, /\bDS1\b/, `skills/${name}/SKILL.md does not run DS1`);
    }
    const doc = readFileSync(path.join(root, 'docs', 'design-system.md'), 'utf8');
    assert.match(doc, /^\*\*DS1\*\* · must · code\./m, 'docs/design-system.md does not define DS1 as a must, code check');
  });
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

// the script prints the legend of the domains, the skill says when each applies: one list, in
// one order, since the first that applies wins (2026-11-26)
describe('work-status: the domains', () => {
  it('the table of the skill is DOMAINS, in its order', () => {
    const text = readFileSync(path.join(root, 'skills', 'work-status', 'SKILL.md'), 'utf8');
    const section = text.split(/^### The domain$/m)[1]?.split(/^#{2,3} /m)[0] ?? '';
    const names = [...section.matchAll(/^\| ([a-z]+) \| /gm)].map((match) => match[1]);
    assert.deepEqual(
      names,
      DOMAINS.map((domain) => domain.name),
      'skills/work-status/SKILL.md, "The domain": the table and scripts/lib/epic.ts DOMAINS differ',
    );
  });
});
