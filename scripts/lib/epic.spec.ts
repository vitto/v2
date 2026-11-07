import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  belongsTo,
  blockingText,
  closes,
  holds,
  mergeCommand,
  nextActions,
  report,
  rowsOf,
  type Epic,
} from './epic.ts';
import { URL, epic, part, pr } from './fixtures.ts';

const summary = (e: Epic) =>
  rowsOf(e).map((row) => [row.kind, row.pr?.number ?? null, row.parts.map((p) => p.number), row.state.join('; ')]);

describe('closes', () => {
  it('reads every keyword GitHub reads, each with its own number', () => {
    assert.deepEqual([...closes('Closes #12, closes #34')], [12, 34]);
    assert.deepEqual([...closes('Fixes: #7\nresolved #5.')], [7, 5]);
    assert.deepEqual(
      [...closes('fix #1 close #2 fixed #3 resolve #4 resolves #6 closed #8')],
      [1, 2, 3, 4, 6, 8],
    );
  });
  it('reads no reference without a keyword, nor a number that only starts the same', () => {
    assert.deepEqual([...closes('Refs #12, #34; unclosed #9')], []);
    assert.equal(closes('Closes #123').has(12), false);
  });
});

describe('belongsTo', () => {
  it('takes the closing keyword, a branch linked to the part or a branch named after it', () => {
    assert.ok(belongsTo(pr(1, { body: 'Closes #20' }), part(20)));
    assert.ok(belongsTo(pr(1, { headRefName: 'mine' }), part(20, { branches: ['mine'] })));
    assert.ok(belongsTo(pr(1, { headRefName: '20-the-part' }), part(20)));
  });
  it('leaves out a mere mention and a branch whose number only starts the same', () => {
    assert.equal(belongsTo(pr(1, { body: 'Refs #20' }), part(20)), false);
    assert.equal(belongsTo(pr(1, { headRefName: '201-other' }), part(20)), false);
  });
});

describe('rowsOf', () => {
  it('puts what landed first, by the time it landed, the open next, the parts waiting, the epic last', () => {
    const e = epic({
      parts: [
        part(20, { mentions: [pr(2, { headRefName: '20-a', state: 'MERGED', mergedAt: '2026-11-03T00:00:00Z' })] }),
        part(21, { mentions: [pr(3, { headRefName: '21-b', state: 'MERGED', mergedAt: '2026-11-02T00:00:00Z' })] }),
        part(22, { mentions: [pr(4, { headRefName: '22-c' })] }),
        part(23),
      ],
    });
    assert.deepEqual(summary(e), [
      ['landed', 3, [21], 'merged 2026-11-02'],
      ['landed', 2, [20], 'merged 2026-11-03'],
      ['open', 4, [22], 'ready'],
      ['waiting', null, [23], 'no pull request yet'],
      ['epic', null, [], 'no pull request yet'],
    ]);
  });

  it('orders the open pull requests by the declared dependencies, then first opened first', () => {
    const e = epic({
      parts: [
        part(20, { mentions: [pr(5, { headRefName: '20-a' })], blockedBy: [{ number: 21, state: 'OPEN' }] }),
        part(21, { mentions: [pr(6, { headRefName: '21-b' })] }),
        part(22, { mentions: [pr(7, { headRefName: '22-c' })] }),
      ],
    });
    assert.deepEqual(
      rowsOf(e).filter((row) => row.kind === 'open').map((row) => row.pr?.number),
      [6, 5, 7],
    );
    assert.match(rowsOf(e).find((row) => row.pr?.number === 5)?.state.join() ?? '', /blocked by #21/);
  });

  it('tells the epic own work, a landing of an earlier branch and a part outside the epic apart', () => {
    const e = epic({
      parts: [
        part(20, {
          mentions: [
            pr(30, { baseRefName: 'main', headRefName: '10-old', state: 'MERGED', mergedAt: '2026-11-01T00:00:00Z', body: 'Closes #20' }),
            pr(31, { baseRefName: 'main', headRefName: '20-straight', body: 'Closes #20' }),
          ],
        }),
      ],
      intoBranch: [pr(32, { headRefName: 'own-work', state: 'MERGED', mergedAt: '2026-11-02T00:00:00Z' })],
    });
    assert.deepEqual(summary(e), [
      ['landed', 30, [], 'landed in `main` 2026-11-01, from an earlier branch of the epic'],
      ['landed', 32, [], 'merged 2026-11-02'],
      [
        'open',
        31,
        [20],
        'it goes into `main`, not `10-epic`; outside the epic: retarget it onto the branch of the epic, or take it out of the epic (rule 2)',
      ],
      ['epic', null, [], 'no pull request yet'],
    ]);
  });

  it('leaves out a pull request closed without a merge and the pull request of the epic itself', () => {
    const e = epic({
      parts: [part(20, { mentions: [pr(40, { headRefName: '20-a', state: 'CLOSED' })] })],
      landings: [pr(41, { headRefName: '10-epic', baseRefName: 'main' })],
      intoBranch: [pr(41, { headRefName: '10-epic', baseRefName: 'main' })],
    });
    assert.deepEqual(summary(e), [
      ['waiting', null, [20], 'no pull request yet'],
      ['epic', 41, [], 'ready'],
    ]);
  });

  it('warns when two open pull requests change the same files', () => {
    const e = epic({
      parts: [
        part(20, { mentions: [pr(50, { headRefName: '20-a', files: ['a.ts', 'b.ts'] })] }),
        part(21, { mentions: [pr(51, { headRefName: '21-b', files: ['b.ts'] })] }),
      ],
    });
    assert.match(rowsOf(e)[0].state.join('; '), /same files as #51 \(1\): the one merged second syncs first/);
  });

  it('lists the parts with no pull request, the open ones first, a linked branch named', () => {
    const e = epic({ parts: [part(22, { state: 'CLOSED' }), part(21, { branches: ['21-x'] }), part(20)] });
    assert.deepEqual(summary(e).slice(0, 3), [
      ['waiting', null, [20], 'no pull request yet'],
      ['waiting', null, [21], 'branch `21-x`, no pull request yet'],
      ['waiting', null, [22], 'closed without a pull request'],
    ]);
  });
});

describe('holds', () => {
  it('names everything that keeps a pull request from merging', () => {
    assert.deepEqual(holds(pr(1), [], '10-epic'), []);
    assert.deepEqual(
      holds(
        pr(1, { baseRefName: 'main', isDraft: true, checks: 'PENDING', mergeable: 'CONFLICTING' }),
        [part(20, { blockedBy: [{ number: 21, state: 'OPEN' }, { number: 22, state: 'CLOSED' }] })],
        '10-epic',
      ),
      ['it goes into `main`, not `10-epic`', 'draft', 'checks running', 'conflicts with `main`', 'blocked by #21'],
    );
    assert.deepEqual(holds(pr(1, { checks: null, mergeable: 'UNKNOWN' }), [], '10-epic'), [
      'no checks reported',
      'mergeability not computed yet',
    ]);
    assert.deepEqual(holds(pr(1, { checks: 'FAILURE' }), [], '10-epic'), ['checks red']);
  });
});

describe('nextActions', () => {
  const rows = (e: Epic) => rowsOf(e);

  it('asks for the branch of the epic when none or several are linked', () => {
    const none = epic({ branch: null, linkedBranches: [] });
    assert.deepEqual(nextActions(none, rows(none)), [
      'Create the branch of the epic: `gh issue develop 10 --base main` (rule 2).',
    ]);
    const two = epic({ branch: null, linkedBranches: ['10-a', '10-b'] });
    assert.match(nextActions(two, rows(two))[0], /more than one is linked to #10 \(`10-a`, `10-b`\); pass `--branch=<name>`/);
  });

  it('syncs the branch of the epic first, then leaves the ready part to the person', () => {
    const e = epic({ distance: { ahead: 1, behind: 2 }, parts: [part(20, { mentions: [pr(5, { headRefName: '20-a' })] })] });
    assert.deepEqual(nextActions(e, rows(e)), [
      'Sync `10-epic` with `main` (2 commits behind) before the next merge into it (rule 2).',
      `[#5](${URL}/pull/5) is ready to merge into \`10-epic\`: it waits for your ok (then \`gh pr merge 5 --merge\`); after it, the open parts sync with \`10-epic\`.`,
    ]);
  });

  it('says why the next part waits', () => {
    const e = epic({ parts: [part(20, { mentions: [pr(5, { headRefName: '20-a', checks: 'FAILURE' })] })] });
    assert.deepEqual(nextActions(e, rows(e)), [`[#5](${URL}/pull/5) is next, and waits: checks red.`]);
  });

  it('points out a part that goes into the default branch instead of the epic', () => {
    const e = epic({ parts: [part(20, { mentions: [pr(5, { headRefName: '20-a', baseRefName: 'main' })] })] });
    assert.match(nextActions(e, rows(e))[0], /^#5 goes into `main`: retarget it onto `10-epic`, or take its part out of the epic \(rule 2\)\. A person decides which\.$/);
  });

  it('lists the parts left when none has a pull request open', () => {
    const e = epic({ parts: [part(20), part(21)] });
    assert.deepEqual(nextActions(e, rows(e)), ['No part has a pull request open; the parts left: #20, #21.']);
  });

  it('opens the pull request of the epic once every part is in, closing the open ones', () => {
    const merged = (n: number, p: number) =>
      pr(n, { headRefName: `${p}-x`, state: 'MERGED', mergedAt: `2026-11-0${n}T00:00:00Z` });
    const e = epic({
      distance: { ahead: 5, behind: 3 },
      parts: [part(20, { mentions: [merged(1, 20)] }), part(21, { mentions: [merged(2, 21)] }), part(22, { state: 'CLOSED' })],
    });
    assert.deepEqual(nextActions(e, rows(e)), [
      'Sync `10-epic` with `main` (3 commits behind) before the pull request of the epic (rule 2).',
      'Open the pull request of the epic, `10-epic` into `main`, with `Closes #20, closes #21` (rules 2, 3).',
    ]);
  });

  it('lands the epic by the method of the default branch, after the blocking workflows', () => {
    const e = epic({ landings: [pr(60, { headRefName: '10-epic', baseRefName: 'main' })] });
    assert.deepEqual(
      nextActions(e, rows(e), { method: 'queue', blocking: [{ workflow: 'publish.yml', event: 'workflow_dispatch' }] }),
      [
        `[#60](${URL}/pull/60) is ready for the merge queue of \`main\`: it waits for your ok (then \`gh pr merge 60\`, once no \`publish.yml\` (workflow_dispatch) run is in progress, rule 1).`,
      ],
    );
    assert.deepEqual(nextActions(e, rows(e)), [
      `[#60](${URL}/pull/60) is ready to merge into \`main\`: it waits for your ok (then \`gh pr merge 60 --merge\`, rule 1).`,
    ]);
  });

  it('follows the epic into the merge queue and into the default branch', () => {
    const queued = epic({ landings: [pr(60, { headRefName: '10-epic', baseRefName: 'main', isInMergeQueue: true })] });
    assert.deepEqual(nextActions(queued, rows(queued)), [`[#60](${URL}/pull/60) is in the merge queue of \`main\`.`]);
    const landed = epic({
      landings: [pr(60, { headRefName: '10-epic', baseRefName: 'main', state: 'MERGED', mergedAt: '2026-11-05T00:00:00Z' })],
    });
    assert.deepEqual(nextActions(landed, rows(landed)), [`The epic landed in \`main\` with [#60](${URL}/pull/60).`]);
  });
});

describe('blockingText and mergeCommand', () => {
  it('names each workflow with its event, and never a flag beyond --merge', () => {
    assert.equal(blockingText([]), '');
    assert.equal(
      blockingText([{ workflow: 'a.yml' }, { workflow: 'b.yml', event: 'push' }]),
      ', once no `a.yml` or `b.yml` (push) run is in progress',
    );
    assert.equal(mergeCommand(7, 'queue'), 'gh pr merge 7');
    assert.equal(mergeCommand(7, 'merge'), 'gh pr merge 7 --merge');
  });
});

describe('report', () => {
  it('writes the branch, a table whose cells keep their columns, and the next action', () => {
    const text = report(
      epic({ parts: [part(20, { title: 'a | pipe\nand a line', mentions: [pr(5, { headRefName: '20-a' })] })] }),
    );
    assert.match(text, /^## Epic \[#10\]\(https:\/\/github\.com\/o\/r\/issues\/10\): epic: the work$/m);
    assert.match(text, /^Branch of the epic: `10-epic`, 3 commits ahead of `main` and 0 behind\.$/m);
    assert.match(text, /^\| 1 \| \[#20\]\(.+\) a \\\| pipe and a line \| \[#5\]\(.+\) \| `10-epic` \| ready \|$/m);
    assert.match(text, /^\| -> \| \*\*epic \[#10\]\(.+\)\*\* \| - \| `main` \| no pull request yet \|$/m);
    assert.match(text, /\*\*Next action\*\*\n\n- \[#5\]/);
  });

  it('says when the branch is not on GitHub, the epic is closed or has no sub-issues', () => {
    const text = report(epic({ distance: null, state: 'CLOSED' }));
    assert.match(text, /The epic issue is closed\./);
    assert.match(text, /Branch of the epic: `10-epic`, not on GitHub\./);
    assert.match(text, /The epic has no sub-issues: rule 2 makes each part a sub-issue of the epic\./);
  });
});
