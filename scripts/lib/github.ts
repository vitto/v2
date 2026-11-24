/*
  What the scripts of v2 read from GitHub, through `gh` as the person running them is signed in.
  Only reads: nothing here changes GitHub (scripts/merge.ts is the one place that merges).

  Where each answer comes from:

  - the repository, its default branch (`defaultBranchRef`), whether it takes merge commits
    (`mergeCommitAllowed`) and whether a branch has a merge queue (`mergeQueue(branch:)`): the
    GraphQL API;
  - an epic: its sub-issues, their linked branches, their "blocked by" dependencies, the pull
    requests in their timelines (cross references, the first 100 of each part), the pull requests
    into the branch of the epic (first 100) and from it into the default branch (first 10):
    the GraphQL API; the distance of the branch of the epic from the default branch: the REST
    compare API; the files of the open pull requests (first 100 each): the GraphQL API;
  - the open epics: the advanced issue search (`ISSUE_ADVANCED`; the plain one ignores the
    qualifier) for `has:sub-issue`, newest first (first 50), then each read with the fields of
    one epic, ten per query (`readEpics`), the distance through `Ref.compare` of the GraphQL API,
    the files of the pull requests not read;
  - the open issues: the GraphQL API, newest first (first 100), with their parent, the count of
    their sub-issues, their labels and their linked branches;
  - the open pull requests of the repository: the GraphQL API, oldest first (first 100);
  - one number (`readItem`): `issueOrPullRequest` of the GraphQL API, an issue with its parent,
    its linked branches and the pull requests of its timeline (first 100); one branch
    (`readBranch`): its ref and the open and merged pull requests from it (first 20);
  - the runs of a workflow that are not finished: `gh run list` (the last 20 runs);
  - checks: the status rollup of the last commit of a pull request (none reported is not green).
*/
import type { BlockingWorkflow } from './config.ts';
import type { Checks, Epic, Part, PullRequest } from './epic.ts';
import { gh, graphql, graphqlPartial, type Repo } from './run.ts';

export const PR_FIELDS = `fragment pr on PullRequest {
  number title url state isDraft baseRefName headRefName createdAt mergedAt body mergeable isInMergeQueue
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

export interface RawPullRequest extends Omit<PullRequest, 'checks' | 'files'> {
  commits: { nodes: { commit: { statusCheckRollup: { state: Checks } | null } }[] };
}

export const toPullRequest = (raw: RawPullRequest): PullRequest => ({
  number: raw.number,
  title: raw.title,
  url: raw.url,
  state: raw.state,
  isDraft: raw.isDraft,
  baseRefName: raw.baseRefName,
  headRefName: raw.headRefName,
  createdAt: raw.createdAt,
  mergedAt: raw.mergedAt,
  body: raw.body ?? '',
  mergeable: raw.mergeable,
  isInMergeQueue: raw.isInMergeQueue,
  checks: raw.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
  files: [],
});

const isPullRequest = (node: unknown): node is RawPullRequest =>
  typeof node === 'object' && node !== null && 'headRefName' in node;

type Branches = { nodes: { ref: { name: string } | null }[] };

const names = (branches: Branches): string[] =>
  branches.nodes.map((node) => node.ref?.name).filter((name): name is string => !!name);

/** The commits a branch has past the default branch, and those it misses; null when it is not on GitHub. */
export const distanceOf = (
  repo: Repo,
  base: string,
  head: string,
): { ahead: number; behind: number } | null => {
  try {
    return JSON.parse(
      gh([
        'api',
        `repos/${repo.owner}/${repo.name}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
        '--jq',
        '{ahead: .ahead_by, behind: .behind_by}',
      ]),
    ) as { ahead: number; behind: number };
  } catch {
    return null;
  }
};

/** Fills in the files of the open pull requests among `prs` (one query for all of them). */
export const readFiles = (repo: Repo, prs: PullRequest[]): void => {
  const open = new Map<number, PullRequest[]>();
  for (const pr of prs)
    if (pr.state === 'OPEN') open.set(pr.number, [...(open.get(pr.number) ?? []), pr]);
  if (!open.size) return;
  const aliases = [...open.keys()].map(
    (n) => `p${n}: pullRequest(number: ${n}) { files(first: 100) { nodes { path } } }`,
  );
  const files = graphql<{
    repository: Record<string, { files: { nodes: { path: string }[] } } | null>;
  }>(
    `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${aliases.join('\n')} } }`,
    { owner: repo.owner, name: repo.name },
  );
  for (const [n, copies] of open) {
    const paths = files.repository[`p${n}`]?.files.nodes.map((node) => node.path) ?? [];
    for (const pr of copies) pr.files = paths;
  }
};

/** The fields of an epic issue its report reads: its linked branches and its parts (first 50); needs PR_FIELDS. */
export const EPIC_FIELDS = `fragment epic on Issue {
  number title url state
  linkedBranches(first: 10) { nodes { ref { name } } }
  subIssues(first: 50) {
    nodes {
      number title url state
      linkedBranches(first: 10) { nodes { ref { name } } }
      blockedBy(first: 20) { nodes { number state } }
      timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes { ... on CrossReferencedEvent { source { ...pr } } }
      }
    }
  }
}`;

type RawIssue = {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED';
  linkedBranches: Branches;
};

type RawEpic = RawIssue & {
  subIssues: {
    nodes: (RawIssue & {
      blockedBy: { nodes: { number: number; state: 'OPEN' | 'CLOSED' }[] };
      timelineItems: { nodes: { source?: unknown }[] };
    })[];
  };
};

/** The parts of an epic, from the fields of EPIC_FIELDS. */
const partsOf = (issue: RawEpic): Part[] =>
  issue.subIssues.nodes.map((sub) => ({
    number: sub.number,
    title: sub.title,
    url: sub.url,
    state: sub.state,
    branches: names(sub.linkedBranches),
    blockedBy: sub.blockedBy.nodes,
    mentions: sub.timelineItems.nodes
      .map((node) => node.source)
      .filter(isPullRequest)
      .map(toPullRequest),
  }));

/** Reads an epic, and whether its default branch has a merge queue. */
export const readEpic = (
  repo: Repo,
  number: number,
  branchOption?: string,
): { epic: Epic; mergeQueue: boolean } => {
  const vars = { owner: repo.owner, name: repo.name };
  const first = graphql<{
    repository: { defaultBranchRef: { name: string }; issue: RawEpic | null };
  }>(
    `
      ${PR_FIELDS}
      ${EPIC_FIELDS}
      query ($owner: String!, $name: String!, $n: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          issue(number: $n) { ...epic }
        }
      }
    `,
    { ...vars, n: number },
  );
  const issue = first.repository.issue;
  if (!issue) throw new Error(`#${number} is not an issue of ${repo.owner}/${repo.name}`);
  const defaultBranch = first.repository.defaultBranchRef.name;
  const linkedBranches = names(issue.linkedBranches);
  const branch = branchOption ?? (linkedBranches.length === 1 ? linkedBranches[0] : null);
  const parts = partsOf(issue);

  let intoBranch: PullRequest[] = [];
  let landings: PullRequest[] = [];
  let distance: Epic['distance'] = null;
  let mergeQueue = false;
  const second = graphql<{
    repository: {
      queue: { url: string } | null;
      into?: { nodes: RawPullRequest[] };
      landings?: { nodes: RawPullRequest[] };
    };
  }>(
    branch
      ? `
        ${PR_FIELDS}
        query ($owner: String!, $name: String!, $branch: String!, $base: String!) {
          repository(owner: $owner, name: $name) {
            queue: mergeQueue(branch: $base) { url }
            into: pullRequests(baseRefName: $branch, first: 100, states: [OPEN, MERGED]) {
              nodes { ...pr }
            }
            landings: pullRequests(headRefName: $branch, baseRefName: $base, first: 10, states: [OPEN, MERGED]) {
              nodes { ...pr }
            }
          }
        }
      `
      : `
        query ($owner: String!, $name: String!, $base: String!) {
          repository(owner: $owner, name: $name) { queue: mergeQueue(branch: $base) { url } }
        }
      `,
    branch ? { ...vars, branch, base: defaultBranch } : { ...vars, base: defaultBranch },
  );
  mergeQueue = !!second.repository.queue;
  if (branch) {
    intoBranch = (second.repository.into?.nodes ?? []).map(toPullRequest);
    landings = (second.repository.landings?.nodes ?? []).map(toPullRequest);
    distance = distanceOf(repo, defaultBranch, branch);
  }

  // The files of the open pull requests, for the shared-files warning.
  readFiles(repo, [...parts.flatMap((part) => part.mentions), ...intoBranch, ...landings]);

  return {
    epic: {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      defaultBranch,
      branch,
      linkedBranches,
      parts,
      intoBranch,
      landings,
      distance,
    },
    mergeQueue,
  };
};

/**
 * How many epics one query of `readEpics` reads. An epic costs about 12,000 nodes (50 parts with
 * 100 cross references each, 110 pull requests of its branch), so ten stay far below the 500,000
 * nodes GitHub allows a GraphQL query ("Rate limits and query limits for the GraphQL API").
 */
const EPICS_PER_QUERY = 10;

/**
 * The open epics in full, with the fields `readEpic` reads for one: its parts, the pull requests
 * into its branch and from it into the default branch, how far its branch is from the default
 * branch (`Ref.compare`). The branch of an epic is its one linked branch, as in `readEpic`. The
 * files of the pull requests are not read: the overview shows no shared-files warning.
 */
export const readEpics = (
  repo: Repo,
  epics: { number: number; branches: string[] }[],
  defaultBranch: string,
): Epic[] => {
  const out: Epic[] = [];
  for (let i = 0; i < epics.length; i += EPICS_PER_QUERY) {
    const chunk = epics
      .slice(i, i + EPICS_PER_QUERY)
      .map((epic) => ({ ...epic, branch: epic.branches.length === 1 ? epic.branches[0] : null }));
    const branched = chunk.filter((epic) => epic.branch);
    const declared = branched.length
      ? `, $base: String!, $qualified: String!${branched.map((e) => `, $b${e.number}: String!`).join('')}`
      : '';
    const fields = chunk.map(({ number, branch }) =>
      [
        `e${number}: issue(number: ${number}) { ...epic }`,
        ...(branch
          ? [
              `i${number}: pullRequests(baseRefName: $b${number}, first: 100, states: [OPEN, MERGED]) { nodes { ...pr } }`,
              `l${number}: pullRequests(headRefName: $b${number}, baseRefName: $base, first: 10, states: [OPEN, MERGED]) { nodes { ...pr } }`,
              `d${number}: ref(qualifiedName: $qualified) { compare(headRef: $b${number}) { aheadBy behindBy } }`,
            ]
          : []),
      ].join('\n'),
    );
    const vars: Record<string, string> = { owner: repo.owner, name: repo.name };
    if (branched.length) {
      vars.base = defaultBranch;
      vars.qualified = `refs/heads/${defaultBranch}`;
      for (const epic of branched) vars[`b${epic.number}`] = epic.branch as string;
    }
    // A branch deleted between the two reads fails its own fields only (graphqlPartial).
    const data = graphqlPartial<{ repository: Record<string, unknown> }>(
      `
        ${PR_FIELDS}
        ${EPIC_FIELDS}
        query ($owner: String!, $name: String!${declared}) {
          repository(owner: $owner, name: $name) { ${fields.join('\n')} }
        }
      `,
      vars,
    ).repository;
    for (const { number, branch } of chunk) {
      const issue = data[`e${number}`] as RawEpic | null;
      if (!issue) continue;
      const prs = (alias: string) =>
        ((data[alias] as { nodes: RawPullRequest[] } | null)?.nodes ?? []).map(toPullRequest);
      const compare = (data[`d${number}`] as { compare: { aheadBy: number; behindBy: number } | null } | null)
        ?.compare;
      out.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        state: issue.state,
        defaultBranch,
        branch,
        linkedBranches: names(issue.linkedBranches),
        parts: partsOf(issue),
        intoBranch: branch ? prs(`i${number}`) : [],
        landings: branch ? prs(`l${number}`) : [],
        distance: compare ? { ahead: compare.aheadBy, behind: compare.behindBy } : null,
      });
    }
  }
  return out;
};

/** An open issue outside the open epics: a part with its labels. */
export interface OpenIssue extends Part {
  labels: string[];
}

export interface RawOpenIssue extends RawIssue {
  parent: { number: number } | null;
  subIssuesSummary: { total: number };
  labels: { nodes: { name: string }[] };
}

/**
 * The open issues outside the open epics: neither an epic (an issue with sub-issues) nor a part
 * of one of `epics`. A part of a closed epic, or of an epic the search did not return, is outside.
 */
export const outsideEpics = (issues: RawOpenIssue[], epics: Set<number>): OpenIssue[] =>
  issues
    .filter((issue) => issue.subIssuesSummary.total === 0 && !(issue.parent && epics.has(issue.parent.number)))
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      branches: names(issue.linkedBranches),
      blockedBy: [],
      mentions: [],
      labels: issue.labels.nodes.map((label) => label.name),
    }));

export interface Overview {
  defaultBranch: string;
  mergeQueue: boolean;
  /** The open epics, newest first, read as the report of one epic reads them. */
  epics: Epic[];
  /** The open issues outside the open epics, newest first. */
  issues: OpenIssue[];
  /** The open issues past the first 100, not read. */
  unread: number;
  pulls: PullRequest[];
}

/** The open epics, the open issues outside them and the open pull requests of a repository. */
export const readOverview = (repo: Repo): Overview => {
  const data = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      pullRequests: { nodes: RawPullRequest[] };
      issues: { totalCount: number; nodes: RawOpenIssue[] };
    };
    search: {
      nodes: ({
        number: number;
        subIssuesSummary: { total: number };
        linkedBranches: Branches;
      } | Record<string, never>)[];
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $q: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          pullRequests(states: [OPEN], first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
            nodes { ...pr }
          }
          issues(states: [OPEN], first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
            totalCount
            nodes {
              number title url state
              parent { number }
              subIssuesSummary { total }
              labels(first: 10) { nodes { name } }
              linkedBranches(first: 10) { nodes { ref { name } } }
            }
          }
        }
        search(query: $q, type: ISSUE_ADVANCED, first: 50) {
          nodes {
            ... on Issue {
              number
              subIssuesSummary { total }
              linkedBranches(first: 10) { nodes { ref { name } } }
            }
          }
        }
      }
    `,
    {
      owner: repo.owner,
      name: repo.name,
      q: `repo:${repo.owner}/${repo.name} is:issue is:open has:sub-issue`,
    },
  );
  const defaultBranch = data.repository.defaultBranchRef.name;
  const queue = graphql<{ repository: { mergeQueue: { url: string } | null } }>(
    `query ($owner: String!, $name: String!, $base: String!) {
      repository(owner: $owner, name: $name) { mergeQueue(branch: $base) { url } }
    }`,
    { owner: repo.owner, name: repo.name, base: defaultBranch },
  );
  const pulls = data.repository.pullRequests.nodes.map(toPullRequest);
  readFiles(repo, pulls);
  const found = data.search.nodes
    .filter((node): node is Exclude<typeof node, Record<string, never>> => 'number' in node)
    .filter((node) => node.subIssuesSummary.total > 0)
    .sort((a, b) => b.number - a.number)
    .map((node) => ({ number: node.number, branches: names(node.linkedBranches) }));
  const { issues } = data.repository;
  return {
    defaultBranch,
    mergeQueue: !!queue.repository.mergeQueue,
    epics: readEpics(repo, found, defaultBranch),
    issues: outsideEpics(issues.nodes, new Set(found.map((epic) => epic.number))),
    unread: Math.max(0, issues.totalCount - issues.nodes.length),
    pulls,
  };
};

/** The default branch of the repository (`defaultBranchRef`). */
export const readDefaultBranch = (repo: Repo): string =>
  graphql<{ repository: { defaultBranchRef: { name: string } } }>(
    `query ($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { defaultBranchRef { name } } }`,
    { owner: repo.owner, name: repo.name },
  ).repository.defaultBranchRef.name;

/** Whether a branch of the repository has a merge queue. */
export const hasMergeQueue = (repo: Repo, branch: string): boolean =>
  !!graphql<{ repository: { mergeQueue: { url: string } | null } }>(
    `query ($owner: String!, $name: String!, $base: String!) {
      repository(owner: $owner, name: $name) { mergeQueue(branch: $base) { url } }
    }`,
    { owner: repo.owner, name: repo.name, base: branch },
  ).repository.mergeQueue;

/** What one number of a repository is: an epic (an issue with sub-issues), an issue, a pull request, or nothing. */
export type Item =
  | { kind: 'epic'; number: number; title: string; url: string; branches: string[] }
  | { kind: 'issue'; issue: Part; parent: { number: number; state: 'OPEN' | 'CLOSED' } | null }
  | { kind: 'pull'; pr: PullRequest }
  | { kind: 'none' };

type RawItem =
  | (RawIssue & {
      __typename: 'Issue';
      parent: { number: number; state: 'OPEN' | 'CLOSED' } | null;
      subIssuesSummary: { total: number };
      timelineItems: { nodes: { source?: unknown }[] };
    })
  | (RawPullRequest & { __typename: 'PullRequest' });

/**
 * Reads one number: `issueOrPullRequest` of the GraphQL API, an issue with its parent, its linked
 * branches and the pull requests in its timeline (cross references, first 100), as a part of an
 * epic is read. A number that is neither comes back as `none`.
 */
export const readItem = (repo: Repo, number: number): { item: Item; defaultBranch: string } => {
  const data = graphqlPartial<{
    repository: { defaultBranchRef: { name: string }; item: RawItem | null };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $n: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          item: issueOrPullRequest(number: $n) {
            __typename
            ... on Issue {
              number title url state
              parent { number state }
              subIssuesSummary { total }
              linkedBranches(first: 10) { nodes { ref { name } } }
              timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
                nodes { ... on CrossReferencedEvent { source { ...pr } } }
              }
            }
            ...pr
          }
        }
      }
    `,
    { owner: repo.owner, name: repo.name, n: number },
  );
  const raw = data.repository.item;
  const defaultBranch = data.repository.defaultBranchRef.name;
  if (!raw) return { item: { kind: 'none' }, defaultBranch };
  if (raw.__typename === 'PullRequest') return { item: { kind: 'pull', pr: toPullRequest(raw) }, defaultBranch };
  if (raw.subIssuesSummary.total > 0)
    return {
      item: { kind: 'epic', number: raw.number, title: raw.title, url: raw.url, branches: names(raw.linkedBranches) },
      defaultBranch,
    };
  return {
    item: {
      kind: 'issue',
      parent: raw.parent,
      issue: {
        number: raw.number,
        title: raw.title,
        url: raw.url,
        state: raw.state,
        branches: names(raw.linkedBranches),
        blockedBy: [],
        mentions: raw.timelineItems.nodes
          .map((node) => node.source)
          .filter(isPullRequest)
          .map(toPullRequest),
      },
    },
    defaultBranch,
  };
};

/** Whether a branch is on GitHub, and the open and merged pull requests from it (first 20, oldest first). */
export const readBranch = (
  repo: Repo,
  branch: string,
): { exists: boolean; pulls: PullRequest[]; defaultBranch: string } => {
  const data = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      ref: { name: string } | null;
      pullRequests: { nodes: RawPullRequest[] };
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $b: String!, $q: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          ref(qualifiedName: $q) { name }
          pullRequests(headRefName: $b, first: 20, states: [OPEN, MERGED], orderBy: { field: CREATED_AT, direction: ASC }) {
            nodes { ...pr }
          }
        }
      }
    `,
    { owner: repo.owner, name: repo.name, b: branch, q: `refs/heads/${branch}` },
  );
  const pulls = data.repository.pullRequests.nodes.map(toPullRequest);
  return { exists: !!data.repository.ref || pulls.length > 0, pulls, defaultBranch: data.repository.defaultBranchRef.name };
};

export interface MergeFacts {
  pr: PullRequest & {
    headRefOid: string;
    isCrossRepository: boolean;
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
    mergeStateStatus: string;
  };
  defaultBranch: string;
  mergeCommitAllowed: boolean;
  /** Whether the base branch of the pull request has a merge queue. */
  baseQueue: boolean;
  /** How far the base is behind the default branch, when the base is not the default branch. */
  baseDistance: { ahead: number; behind: number } | null;
}

/** What a merge needs to know about a pull request and its repository. */
export const readMergeFacts = (repo: Repo, number: number): MergeFacts => {
  const data = graphql<{
    repository: {
      defaultBranchRef: { name: string };
      mergeCommitAllowed: boolean;
      pullRequest:
        | (RawPullRequest & {
            headRefOid: string;
            isCrossRepository: boolean;
            reviewDecision: MergeFacts['pr']['reviewDecision'];
            mergeStateStatus: string;
          })
        | null;
    };
  }>(
    `
      ${PR_FIELDS}
      query ($owner: String!, $name: String!, $n: Int!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          mergeCommitAllowed
          pullRequest(number: $n) {
            ...pr
            headRefOid isCrossRepository reviewDecision mergeStateStatus
          }
        }
      }
    `,
    { owner: repo.owner, name: repo.name, n: number },
  );
  const raw = data.repository.pullRequest;
  if (!raw) throw new Error(`#${number} is not a pull request of ${repo.owner}/${repo.name}`);
  const defaultBranch = data.repository.defaultBranchRef.name;
  const queue = graphql<{ repository: { mergeQueue: { url: string } | null } }>(
    `query ($owner: String!, $name: String!, $base: String!) {
      repository(owner: $owner, name: $name) { mergeQueue(branch: $base) { url } }
    }`,
    { owner: repo.owner, name: repo.name, base: raw.baseRefName },
  );
  return {
    pr: {
      ...toPullRequest(raw),
      headRefOid: raw.headRefOid,
      isCrossRepository: raw.isCrossRepository,
      reviewDecision: raw.reviewDecision,
      mergeStateStatus: raw.mergeStateStatus,
    },
    defaultBranch,
    mergeCommitAllowed: data.repository.mergeCommitAllowed,
    baseQueue: !!queue.repository.mergeQueue,
    baseDistance:
      raw.baseRefName === defaultBranch ? null : distanceOf(repo, defaultBranch, raw.baseRefName),
  };
};

export interface Run {
  workflow: string;
  event: string;
  status: string;
  url: string;
}

/** The runs of the blocking workflows that are not finished (queued, waiting for an approval, running). */
export const unfinishedRuns = (repo: Repo, blocking: BlockingWorkflow[]): Run[] =>
  blocking.flatMap((workflow) => {
    const args = [
      'run',
      'list',
      '-R',
      `${repo.owner}/${repo.name}`,
      '--workflow',
      workflow.workflow,
      '--limit',
      '20',
      '--json',
      'status,event,url,workflowName',
    ];
    if (workflow.event) args.push('--event', workflow.event);
    const runs = JSON.parse(gh(args)) as {
      status: string;
      event: string;
      url: string;
      workflowName: string;
    }[];
    return runs
      .filter((one) => one.status !== 'completed')
      .map((one) => ({ workflow: workflow.workflow, event: one.event, status: one.status, url: one.url }));
  });
