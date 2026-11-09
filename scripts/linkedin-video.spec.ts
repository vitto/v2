import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { concatList, ease, elementOf, findChrome, lengthOf } from './linkedin-video.ts';

const frames = [0, 1, 2, 3].map((t) => ({ file: `/f${t}.jpg`, t }));
/** The files and durations of a concat list, in order. */
const read = (list: string) => {
  const lines = list.trim().split('\n');
  assert.equal(lines[0], 'ffconcat version 1.0');
  const pairs: [string, number][] = [];
  for (let i = 1; i < lines.length - 1; i += 2)
    pairs.push([lines[i].replace(/^file '(.*)'$/, '$1'), Number(lines[i + 1].replace('duration ', ''))]);
  return { pairs, closing: lines.at(-1) };
};

describe('concatList', () => {
  it('opens on the frame before the mark and lasts each frame until the next', () => {
    const { pairs, closing } = read(concatList(frames, [{ start: 0.5, end: 2.5 }]));
    assert.deepEqual(pairs, [
      ['/f0.jpg', 0.5],
      ['/f1.jpg', 1],
      ['/f2.jpg', 0.5],
    ]);
    // The concat demuxer drops the duration of the last entry: it comes again.
    assert.equal(closing, "file '/f2.jpg'");
  });

  it('cuts between segments, each opening on the page as it stands then', () => {
    const { pairs } = read(
      concatList(frames, [
        { start: 0, end: 1.5 },
        { start: 2.5, end: 3.5 },
      ]),
    );
    assert.deepEqual(pairs, [
      ['/f0.jpg', 1],
      ['/f1.jpg', 0.5],
      ['/f2.jpg', 0.5],
      ['/f3.jpg', 0.5],
    ]);
  });

  it('takes the frames in the order they were drawn, not received', () => {
    const shuffled = [frames[2], frames[0], frames[3], frames[1]];
    assert.equal(concatList(shuffled, [{ start: 0, end: 4 }]), concatList(frames, [{ start: 0, end: 4 }]));
  });

  it('skips empty segments and refuses a take with no frame', () => {
    assert.equal(
      concatList(frames, [{ start: 1, end: 1 }, { start: 0, end: 4 }]),
      concatList(frames, [{ start: 0, end: 4 }]),
    );
    assert.throws(() => concatList([], [{ start: 0, end: 1 }]), /No frame/);
  });
});

describe('lengthOf', () => {
  it('adds the segments end to end', () => {
    assert.equal(lengthOf([{ start: 0, end: 1.5 }, { start: 2.5, end: 3.5 }]), 2.5);
    assert.equal(lengthOf([{ start: 2, end: 1 }]), 0);
  });
});

describe('ease', () => {
  it('starts and ends still, halfway at the middle', () => {
    assert.equal(ease(0), 0);
    assert.equal(ease(0.5), 0.5);
    assert.equal(ease(1), 1);
    assert.ok(ease(0.25) < 0.25 && ease(0.75) > 0.75);
  });
});

describe('elementOf', () => {
  it('reads a selector with querySelector and runs an expression as it is', () => {
    assert.equal(elementOf('#a .b'), 'document.querySelector("#a .b")');
    assert.equal(elementOf({ js: 'document.body' }), '(document.body)');
  });
});

describe('findChrome', () => {
  it('takes CHROME first', () => {
    assert.equal(findChrome({ CHROME: '/opt/chrome' }), '/opt/chrome');
  });
});
