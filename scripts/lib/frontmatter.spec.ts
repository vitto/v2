import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { frontmatter } from './frontmatter.ts';

/** A SKILL.md whose frontmatter is these lines, the first of them line 2. */
const skill = (...lines: string[]): string => ['---', ...lines, '---', '', '# The skill'].join('\n');

const refused = (text: string, reason: RegExp): void => assert.throws(() => frontmatter(text), reason);

describe('frontmatter', () => {
  it('reads plain, single-quoted and double-quoted values, skipping blank lines and comments', () => {
    assert.deepEqual(
      frontmatter(
        skill(
          'name: work-map',
          '',
          '# what the menu shows',
          "description: 'The map: what the work is made of, the project''s words - a list'",
          'argument-hint: "[planned | done] \\"x\\" \\u00e8 \\\\"',
          'allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts *), Bash(gh *)',
          "model: 'opus' # a comment after the value",
          'empty:',
        ),
      ),
      {
        name: 'work-map',
        description: "The map: what the work is made of, the project's words - a list",
        'argument-hint': '[planned | done] "x" \u00e8 \\',
        'allowed-tools': 'Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/map.ts *), Bash(gh *)',
        model: 'opus',
        empty: '',
      },
    );
  });

  it('reads a block value, | keeping its lines, > joining them', () => {
    const fields = frontmatter(skill('description: >-', '  The map', '  of the work.', '', 'notes: |', '  one', '    two', 'name: x'));
    assert.equal(fields.description, 'The map of the work.');
    assert.equal(fields.notes, 'one\n  two');
    assert.equal(fields.name, 'x');
  });

  it("refuses a single quote that closes the value early, as in skills/map/SKILL.md before 4cc9f4d", () => {
    refused(
      skill('name: map', "description: 'In glossary mode, the hierarchy of the project's taxonomy register instead'"),
      /^Error: line 3: the single-quoted value closes after "of the project'", and "s taxonomy regi" follows: a quote inside it is written ''$/,
    );
    refused(skill('description: "a "quoted" word"'), /line 2: the double-quoted value closes after .*\\"$/);
  });

  it('refuses a quoted value not closed on its line, or an escape YAML does not have', () => {
    refused(skill("description: 'the map", "  of the work'"), /line 2: the single-quoted value is not closed/);
    refused(skill('description: "the map'), /line 2: the double-quoted value is not closed/);
    refused(skill('description: "C:\\work"'), /line 2: \\w is no escape/);
    refused(skill('description: "\\u12"'), /line 2: \\u12" is no character/);
  });

  it('refuses ": " and " #" in a plain value, and a value that opens something else', () => {
    refused(skill('description: The map: what the work is made of'), /line 2: a ": " in a plain value/);
    refused(skill('description: The map #1 of the work'), /line 2: a " #" in a plain value/);
    for (const value of ['[a, b]', '{a: b}', '&anchor x', '*alias', '!tag x', '- item', '`x`', '@x', '%x', '# a comment']) {
      refused(skill(`allowed-tools: ${value}`), /line 2: a value that starts with .* is not plain text/);
    }
  });

  it('refuses a key twice, an indented line, a line that is no key, a bad block header', () => {
    refused(skill('name: a', 'name: b'), /line 3: name is there twice/);
    refused(skill('metadata:', '  author: x'), /line 3: an indented line outside a block value/);
    refused(skill('name: a', 'just text'), /line 3: not a "key: value" line/);
    refused(skill('name:a'), /line 2: not a "key: value" line/);
    refused(skill('description: |x', '  a'), /line 2: "\|x" is no block header/);
    refused(skill('description: >', '    a', '  b'), /line 4: a line of the block indented less/);
  });

  it('refuses a file without its two --- lines', () => {
    refused('# The skill\n', /line 1: no frontmatter/);
    refused('---\nname: a\n', /line 1: the frontmatter has no closing --- line/);
  });
});
