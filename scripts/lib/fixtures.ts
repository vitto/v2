/*
  The epics, parts and pull requests of the specs: one of each with every field, changed only
  where a spec says so.
*/
import type { Epic, Part, PullRequest } from './epic.ts';

export const URL = 'https://github.com/o/r';

export const pr = (number: number, over: Partial<PullRequest> = {}): PullRequest => ({
  number,
  title: `pull request ${number}`,
  url: `${URL}/pull/${number}`,
  state: 'OPEN',
  isDraft: false,
  baseRefName: '10-epic',
  headRefName: `x-${number}`,
  createdAt: `2026-11-01T00:00:${String(number % 60).padStart(2, '0')}Z`,
  mergedAt: null,
  body: '',
  mergeable: 'MERGEABLE',
  isInMergeQueue: false,
  checks: 'SUCCESS',
  files: [],
  ...over,
});

export const part = (number: number, over: Partial<Part> = {}): Part => ({
  number,
  title: `part ${number}`,
  url: `${URL}/issues/${number}`,
  state: 'OPEN',
  branches: [],
  blockedBy: [],
  mentions: [],
  ...over,
});

export const epic = (over: Partial<Epic> = {}): Epic => ({
  number: 10,
  title: 'epic: the work',
  url: `${URL}/issues/10`,
  state: 'OPEN',
  defaultBranch: 'main',
  branch: '10-epic',
  linkedBranches: ['10-epic'],
  parts: [],
  intoBranch: [],
  landings: [],
  distance: { ahead: 3, behind: 0 },
  ...over,
});
