import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fill, globToRegExp, matchAny } from './glob.ts';

describe('globToRegExp', () => {
  it('takes any number of folders for **, one segment for * and ?', () => {
    const all = globToRegExp('src/**');
    assert.ok(all.test('src/a.ts'));
    assert.ok(all.test('src/a/b/c.ts'));
    assert.equal(all.test('srcx/a.ts'), false);
    assert.ok(globToRegExp('**/*.stories.*').test('a/b/chip.stories.tsx'));
    assert.ok(globToRegExp('**/*.stories.*').test('chip.stories.ts'));
    assert.equal(globToRegExp('src/*.ts').test('src/a/b.ts'), false);
    assert.ok(globToRegExp('file?.md').test('file1.md'));
  });

  it('reads {a,b} as alternatives and escapes the rest', () => {
    const re = globToRegExp('src/**/*.{ts,tsx}');
    assert.ok(re.test('src/x/y.tsx'));
    assert.equal(re.test('src/x/y.js'), false);
    assert.equal(globToRegExp('a.b').test('axb'), false);
    assert.ok(globToRegExp('a+(b)').test('a+(b)'));
  });
});

describe('matchAny', () => {
  it('captures a {name} across folders, the shortest text that lets the rest match', () => {
    assert.deepEqual(matchAny(['src/pages/{page}.astro'], 'src/pages/blog/post.astro')?.captures, {
      page: 'blog/post',
    });
    assert.deepEqual(
      matchAny(['src/components/{name}/**'], 'src/components/mds-chip/test/chip.spec.ts')?.captures,
      { name: 'mds-chip' },
    );
  });

  it('answers the first pattern that matches, or null', () => {
    assert.equal(matchAny(['a/**', 'b/**'], 'b/x')?.pattern, 'b/**');
    assert.equal(matchAny(['a/**'], 'c/x'), null);
  });
});

describe('fill', () => {
  it('replaces the known placeholders and keeps the others', () => {
    assert.equal(fill('/{page}', { page: 'about' }), '/about');
    assert.equal(fill('{main}-wt-{epic}', { main: '/r/x' }), '/r/x-wt-{epic}');
  });
});
