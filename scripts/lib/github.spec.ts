import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { outsideEpics, type RawOpenIssue } from './github.ts';

const issue = (number: number, over: Partial<RawOpenIssue> = {}): RawOpenIssue => ({
  number,
  title: `issue ${number}`,
  url: `https://x/${number}`,
  state: 'OPEN',
  linkedBranches: { nodes: [] },
  parent: null,
  subIssuesSummary: { total: 0 },
  labels: { nodes: [] },
  ...over,
});

describe('outsideEpics', () => {
  it('leaves out the epics and the parts of the open epics, and keeps the parts of any other epic', () => {
    const kept = outsideEpics(
      [
        issue(30),
        issue(31, { subIssuesSummary: { total: 2 } }),
        issue(32, { parent: { number: 31 } }),
        issue(33, { parent: { number: 9 } }),
      ],
      new Set([31]),
    );
    assert.deepEqual(
      kept.map((one) => one.number),
      [30, 33],
    );
  });

  it('keeps the labels and the linked branches, a deleted branch left out', () => {
    const [one] = outsideEpics(
      [
        issue(30, {
          labels: { nodes: [{ name: 'bug' }, { name: 'prg-site' }] },
          linkedBranches: { nodes: [{ ref: { name: '30-fix' } }, { ref: null }] },
        }),
      ],
      new Set(),
    );
    assert.deepEqual(one, {
      number: 30,
      title: 'issue 30',
      url: 'https://x/30',
      state: 'OPEN',
      branches: ['30-fix'],
      blockedBy: [],
      mentions: [],
      labels: ['bug', 'prg-site'],
    });
  });
});
